import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  coachFeedbackSchema,
  coachFollowUpRequestSchema,
  coachFollowUpResponseSchema,
  type CoachFollowUpResponse,
} from "./contracts";
import {
  coachFollowUpCanonicalRequest,
  type CoachFollowUpClientIdentity,
} from "./coach-idempotency-client";

export const COACH_FOLLOW_UP_LEASE_SECONDS = 600;
const COACH_FOLLOW_UP_MINIMUM_RUNWAY_SECONDS = 240;

export type CoachFollowUpRequestIdentity = CoachFollowUpClientIdentity;

export type CoachFollowUpReservation = {
  status: "running" | "completed" | "outcome_unknown";
  idempotencyKey: string;
  requestFingerprint: string;
  response: CoachFollowUpResponse | null;
  model: string | null;
  provider: "openai" | "gemini" | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  outcomeUnknownAt: string | null;
  isNew: boolean;
};

type RpcErrorLike = {
  code?: string | null;
};

export class CoachFollowUpReservationConfigurationError extends Error {
  constructor(message = "Coach follow-up reservation is not configured") {
    super(message);
    this.name = "CoachFollowUpReservationConfigurationError";
  }
}

export class CoachFollowUpIdempotencyConflictError extends Error {
  constructor() {
    super("Coach follow-up idempotency key was reused for another request");
    this.name = "CoachFollowUpIdempotencyConflictError";
  }
}

export class CoachFollowUpBusyError extends Error {
  readonly retryAfterSeconds: number;

  constructor(readonly leaseExpiresAt: string) {
    super("Matching coach follow-up is still running");
    this.name = "CoachFollowUpBusyError";
    const remaining = Math.ceil(
      (Date.parse(leaseExpiresAt) - Date.now()) / 1000,
    );
    this.retryAfterSeconds = Math.max(
      1,
      Math.min(60, remaining || 10),
    );
  }
}

export class CoachFollowUpLeaseInvalidError extends Error {
  constructor() {
    super("Coach follow-up lease is invalid");
    this.name = "CoachFollowUpLeaseInvalidError";
  }
}

export function coachFollowUpRequestFingerprint(
  identity: CoachFollowUpRequestIdentity,
) {
  const normalized = normalizeIdentity(identity);
  return createHash("sha256")
    .update(coachFollowUpCanonicalRequest(normalized), "utf8")
    .digest("hex");
}

export async function reserveCoachFollowUp(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    identity: CoachFollowUpRequestIdentity;
    leaseSeconds?: number;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  const identity = normalizeIdentity(input.identity);
  assertRequestFingerprint(input.requestFingerprint, identity);
  const leaseSeconds =
    input.leaseSeconds ?? COACH_FOLLOW_UP_LEASE_SECONDS;
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < COACH_FOLLOW_UP_MINIMUM_RUNWAY_SECONDS ||
    leaseSeconds > 900
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up lease must be between 240 and 900 seconds",
    );
  }

  const { data, error } = await client.rpc("reserve_coach_follow_up", {
    p_idempotency_key: input.idempotencyKey,
    p_lease_seconds: leaseSeconds,
    p_request_fingerprint: input.requestFingerprint,
  });
  if (error) throw mapCoachFollowUpRpcError(error);
  return parseCoachFollowUpReservation(data);
}

export async function completeCoachFollowUp(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    leaseToken: string;
    response: CoachFollowUpResponse;
    model: string;
    provider: "openai" | "gemini";
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  assertSha256(input.requestFingerprint);
  const parsedResponse = coachFollowUpResponseSchema.safeParse(
    input.response,
  );
  if (!parsedResponse.success) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up response is invalid",
    );
  }
  const model = normalizeModel(input.model);
  if (!model) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up model is invalid",
    );
  }

  const { data, error } = await client.rpc("complete_coach_follow_up", {
    p_idempotency_key: input.idempotencyKey,
    p_lease_token: input.leaseToken,
    p_model: model,
    p_provider: input.provider,
    p_request_fingerprint: input.requestFingerprint,
    p_response: parsedResponse.data,
  });
  if (error) throw mapCoachFollowUpRpcError(error);
  const reservation = parseCoachFollowUpReservation(data);
  if (reservation.status !== "completed") {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up completion did not become completed",
    );
  }
  return reservation;
}

export async function markCoachFollowUpDispatched(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    leaseToken: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(
    "mark_coach_follow_up_dispatched",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) throw mapCoachFollowUpRpcError(error);
  if (
    !isRecord(data) ||
    data.status !== "dispatched" ||
    nullableTimestamp(data.dispatched_at) === null
  ) {
    if (
      isRecord(data) &&
      (data.status === "lease_invalid" || data.status === "not_found")
    ) {
      throw new CoachFollowUpLeaseInvalidError();
    }
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up dispatch was not confirmed",
    );
  }
}

export async function markCoachFollowUpOutcomeUnknown(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    leaseToken: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  assertSha256(input.requestFingerprint);

  const { data, error } = await client.rpc(
    "mark_coach_follow_up_outcome_unknown",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
      p_request_fingerprint: input.requestFingerprint,
    },
  );
  if (error) throw mapCoachFollowUpRpcError(error);
  const reservation = parseCoachFollowUpReservation(data);
  if (
    reservation.status !== "completed" &&
    reservation.status !== "outcome_unknown"
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up unknown marker did not become terminal",
    );
  }
  return reservation;
}

export async function releaseCoachFollowUp(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    leaseToken: string;
  },
): Promise<
  "released" | "completed" | "outcome_unknown" | "not_found"
> {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc("release_coach_follow_up", {
    p_idempotency_key: input.idempotencyKey,
    p_lease_token: input.leaseToken,
  });
  if (error) throw mapCoachFollowUpRpcError(error);
  if (!isRecord(data) || typeof data.status !== "string") {
    throw new CoachFollowUpReservationConfigurationError(
      "Unexpected coach follow-up release response",
    );
  }
  if (
    data.status === "released" ||
    data.status === "completed" ||
    data.status === "outcome_unknown" ||
    data.status === "not_found"
  ) {
    return data.status;
  }
  if (data.status === "lease_invalid") {
    throw new CoachFollowUpLeaseInvalidError();
  }
  throw new CoachFollowUpReservationConfigurationError(
    "Unknown coach follow-up release status",
  );
}

export function parseCoachFollowUpReservation(
  data: unknown,
): CoachFollowUpReservation {
  if (!isRecord(data)) {
    throw new CoachFollowUpReservationConfigurationError(
      "Unexpected coach follow-up reservation response",
    );
  }
  if (data.status === "idempotency_conflict") {
    throw new CoachFollowUpIdempotencyConflictError();
  }
  if (data.status === "busy") {
    const leaseExpiresAt = timestamp(data.lease_expires_at);
    if (!leaseExpiresAt) {
      throw new CoachFollowUpReservationConfigurationError(
        "Busy coach follow-up is missing its lease expiry",
      );
    }
    throw new CoachFollowUpBusyError(leaseExpiresAt);
  }
  if (data.status === "lease_invalid" || data.status === "not_found") {
    throw new CoachFollowUpLeaseInvalidError();
  }
  if (
    data.status !== "running" &&
    data.status !== "completed" &&
    data.status !== "outcome_unknown"
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Unknown coach follow-up reservation status",
    );
  }

  const idempotencyKey = uuid(data.idempotency_key);
  const requestFingerprint = sha256(data.request_fingerprint);
  const parsedResponse =
    data.response === null || data.response === undefined
      ? null
      : coachFollowUpResponseSchema.safeParse(data.response);
  const model =
    data.model === null || data.model === undefined
      ? null
      : normalizeModel(data.model);
  const provider =
    data.provider === "openai" || data.provider === "gemini"
      ? data.provider
      : null;
  const leaseToken = nullableUuid(data.lease_token);
  const leaseExpiresAt = nullableTimestamp(data.lease_expires_at);
  const outcomeUnknownAt = nullableTimestamp(data.outcome_unknown_at);
  const isNew = booleanValue(data.is_new);

  if (
    !idempotencyKey ||
    !requestFingerprint ||
    (parsedResponse !== null && !parsedResponse.success) ||
    isNew === null
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up reservation identity is malformed",
    );
  }
  const response = parsedResponse?.data ?? null;
  if (
    (data.status === "running" &&
      (response !== null ||
        model !== null ||
        provider !== null ||
        leaseToken === null ||
        leaseExpiresAt === null ||
        Date.parse(leaseExpiresAt) <= Date.now() ||
        outcomeUnknownAt !== null)) ||
    (data.status === "completed" &&
      (response === null ||
        model === null ||
        provider === null ||
        leaseToken !== null ||
        leaseExpiresAt !== null ||
        outcomeUnknownAt !== null)) ||
    (data.status === "outcome_unknown" &&
      (response !== null ||
        model !== null ||
        provider !== null ||
        leaseToken !== null ||
        leaseExpiresAt !== null ||
        outcomeUnknownAt === null))
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up reservation state is malformed",
    );
  }

  return {
    status: data.status,
    idempotencyKey,
    requestFingerprint,
    response,
    model,
    provider,
    leaseToken,
    leaseExpiresAt,
    outcomeUnknownAt,
    isNew,
  };
}

export function mapCoachFollowUpRpcError(error: RpcErrorLike) {
  const missingMigrationCodes = new Set([
    "PGRST202",
    "42P01",
    "42703",
    "42883",
  ]);
  return new CoachFollowUpReservationConfigurationError(
    missingMigrationCodes.has(error.code?.trim() ?? "")
      ? "Coach follow-up reservation migration is missing"
      : "Coach follow-up reservation request failed",
  );
}

function normalizeIdentity(
  identity: CoachFollowUpRequestIdentity,
): CoachFollowUpRequestIdentity {
  if (
    typeof identity.questionVersion !== "number" ||
    !Number.isInteger(identity.questionVersion) ||
    identity.questionVersion <= 0 ||
    typeof identity.sourceRevision !== "string" ||
    !/^[a-f0-9]{64}$/.test(identity.sourceRevision)
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up request identity is invalid",
    );
  }
  const parsed = coachFollowUpRequestSchema.safeParse({
    questionId: identity.questionId,
    candidateAnswer: identity.candidateAnswer,
    feedback: identity.feedback,
    messages: identity.messages,
  });
  if (!parsed.success) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up request identity is invalid",
    );
  }
  const feedback = coachFeedbackSchema.parse(parsed.data.feedback);
  return {
    questionId: parsed.data.questionId,
    questionVersion: identity.questionVersion,
    sourceRevision: identity.sourceRevision,
    candidateAnswer: parsed.data.candidateAnswer,
    feedback,
    messages: parsed.data.messages,
  };
}

function assertRequestFingerprint(
  value: string,
  identity: CoachFollowUpRequestIdentity,
) {
  assertSha256(value);
  if (value !== coachFollowUpRequestFingerprint(identity)) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up fingerprint does not match its request",
    );
  }
}

function assertSha256(value: string) {
  if (!sha256(value)) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up fingerprint is invalid",
    );
  }
}

function assertUuid(value: string, label: string) {
  if (!uuid(value)) {
    throw new CoachFollowUpReservationConfigurationError(
      `Coach follow-up ${label} UUID is invalid`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeModel(value: unknown) {
  return typeof value === "string" &&
      value.trim() &&
      value.length <= 200
    ? value
    : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function uuid(value: unknown) {
  return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(value) &&
      value !== "00000000-0000-0000-0000-000000000000"
    ? value
    : null;
}

function nullableUuid(value: unknown) {
  return value === null || value === undefined ? null : uuid(value);
}

function sha256(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
    ? value
    : null;
}

function timestamp(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function nullableTimestamp(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = timestamp(value);
  if (!parsed) {
    throw new CoachFollowUpReservationConfigurationError(
      "Coach follow-up timestamp is malformed",
    );
  }
  return parsed;
}
