import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  lessonAssistantRequestSchema,
  lessonAssistantResponseSchema,
  type LessonAssistantResponse,
} from "./lesson-assistant";
import {
  lessonAssistantCanonicalRequest,
  type LessonAssistantRequestIdentity,
} from "./lesson-assistant-idempotency-client";

export const LESSON_ASSISTANT_LEASE_SECONDS = 600;
const LESSON_ASSISTANT_MINIMUM_RUNWAY_SECONDS = 240;

export type LessonAssistantReservation = {
  status: "running" | "completed" | "outcome_unknown";
  idempotencyKey: string;
  requestFingerprint: string;
  response: LessonAssistantResponse | null;
  model: string | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  outcomeUnknownAt: string | null;
  isNew: boolean;
};

type RpcErrorLike = {
  code?: string | null;
};

export class LessonAssistantReservationConfigurationError extends Error {
  constructor(message = "Lesson assistant reservation is not configured") {
    super(message);
    this.name = "LessonAssistantReservationConfigurationError";
  }
}

export class LessonAssistantIdempotencyConflictError extends Error {
  constructor() {
    super("Lesson assistant idempotency key was reused for another request");
    this.name = "LessonAssistantIdempotencyConflictError";
  }
}

export class LessonAssistantBusyError extends Error {
  readonly retryAfterSeconds: number;

  constructor(readonly leaseExpiresAt: string) {
    super("A matching lesson assistant request is still running");
    this.name = "LessonAssistantBusyError";
    const remaining = Math.ceil(
      (Date.parse(leaseExpiresAt) - Date.now()) / 1_000,
    );
    this.retryAfterSeconds = Math.max(1, Math.min(60, remaining || 10));
  }
}

export class LessonAssistantLeaseInvalidError extends Error {
  constructor() {
    super("Lesson assistant lease is invalid");
    this.name = "LessonAssistantLeaseInvalidError";
  }
}

export function lessonAssistantRequestFingerprint(
  identity: LessonAssistantRequestIdentity,
) {
  const normalized = normalizeIdentity(identity);
  return createHash("sha256")
    .update(lessonAssistantCanonicalRequest(normalized), "utf8")
    .digest("hex");
}

export async function reserveLessonAssistantResponse(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    identity: LessonAssistantRequestIdentity;
    leaseSeconds?: number;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  const identity = normalizeIdentity(input.identity);
  assertRequestFingerprint(input.requestFingerprint, identity);
  const leaseSeconds = input.leaseSeconds ?? LESSON_ASSISTANT_LEASE_SECONDS;
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < LESSON_ASSISTANT_MINIMUM_RUNWAY_SECONDS ||
    leaseSeconds > 900
  ) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant lease must be between 240 and 900 seconds",
    );
  }

  const { data, error } = await client.rpc(
    "reserve_lesson_ai_response",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_seconds: leaseSeconds,
      p_request_fingerprint: input.requestFingerprint,
    },
  );
  if (error) throw mapLessonAssistantRpcError(error);
  return parseLessonAssistantReservation(data);
}

export async function completeLessonAssistantResponse(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    leaseToken: string;
    response: LessonAssistantResponse;
    model: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  assertSha256(input.requestFingerprint);
  const parsedResponse = lessonAssistantResponseSchema.safeParse(
    input.response,
  );
  if (!parsedResponse.success) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant response is invalid",
    );
  }
  const model = normalizeModel(input.model);
  if (!model) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant model is invalid",
    );
  }

  const { data, error } = await client.rpc(
    "complete_lesson_ai_response",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
      p_model: model,
      p_request_fingerprint: input.requestFingerprint,
      p_response: parsedResponse.data,
    },
  );
  if (error) throw mapLessonAssistantRpcError(error);
  const reservation = parseLessonAssistantReservation(data);
  if (reservation.status !== "completed") {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant completion did not become completed",
    );
  }
  return reservation;
}

export async function markLessonAssistantDispatched(
  client: SupabaseClient,
  input: { idempotencyKey: string; leaseToken: string },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(
    "mark_lesson_ai_response_dispatched",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) throw mapLessonAssistantRpcError(error);
  if (
    !isRecord(data) ||
    data.status !== "dispatched" ||
    nullableTimestamp(data.dispatched_at) === null
  ) {
    if (
      isRecord(data) &&
      (data.status === "lease_invalid" || data.status === "not_found")
    ) {
      throw new LessonAssistantLeaseInvalidError();
    }
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant dispatch was not confirmed",
    );
  }
}

export async function markLessonAssistantOutcomeUnknown(
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
    "mark_lesson_ai_response_outcome_unknown",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
      p_request_fingerprint: input.requestFingerprint,
    },
  );
  if (error) throw mapLessonAssistantRpcError(error);
  const reservation = parseLessonAssistantReservation(data);
  if (
    reservation.status !== "completed" &&
    reservation.status !== "outcome_unknown"
  ) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant unknown marker did not become terminal",
    );
  }
  return reservation;
}

export async function releaseLessonAssistantResponse(
  client: SupabaseClient,
  input: { idempotencyKey: string; leaseToken: string },
): Promise<"released" | "completed" | "outcome_unknown" | "not_found"> {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(
    "release_lesson_ai_response",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) throw mapLessonAssistantRpcError(error);
  if (!isRecord(data) || typeof data.status !== "string") {
    throw new LessonAssistantReservationConfigurationError(
      "Unexpected lesson assistant release response",
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
    throw new LessonAssistantLeaseInvalidError();
  }
  throw new LessonAssistantReservationConfigurationError(
    "Unknown lesson assistant release status",
  );
}

export function parseLessonAssistantReservation(
  data: unknown,
): LessonAssistantReservation {
  if (!isRecord(data)) {
    throw new LessonAssistantReservationConfigurationError(
      "Unexpected lesson assistant reservation response",
    );
  }
  if (data.status === "idempotency_conflict") {
    throw new LessonAssistantIdempotencyConflictError();
  }
  if (data.status === "busy") {
    const leaseExpiresAt = timestamp(data.lease_expires_at);
    if (!leaseExpiresAt) {
      throw new LessonAssistantReservationConfigurationError(
        "Busy lesson assistant request is missing its lease expiry",
      );
    }
    throw new LessonAssistantBusyError(leaseExpiresAt);
  }
  if (data.status === "lease_invalid" || data.status === "not_found") {
    throw new LessonAssistantLeaseInvalidError();
  }
  if (
    data.status !== "running" &&
    data.status !== "completed" &&
    data.status !== "outcome_unknown"
  ) {
    throw new LessonAssistantReservationConfigurationError(
      "Unknown lesson assistant reservation status",
    );
  }

  const idempotencyKey = uuid(data.idempotency_key);
  const requestFingerprint = sha256(data.request_fingerprint);
  const parsedResponse =
    data.response === null || data.response === undefined
      ? null
      : lessonAssistantResponseSchema.safeParse(data.response);
  const model =
    data.model === null || data.model === undefined
      ? null
      : normalizeModel(data.model);
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
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant reservation identity is malformed",
    );
  }
  const response = parsedResponse?.data ?? null;
  if (
    (data.status === "running" &&
      (response !== null ||
        model !== null ||
        leaseToken === null ||
        leaseExpiresAt === null ||
        Date.parse(leaseExpiresAt) <= Date.now() ||
        outcomeUnknownAt !== null)) ||
    (data.status === "completed" &&
      (response === null ||
        model === null ||
        leaseToken !== null ||
        leaseExpiresAt !== null ||
        outcomeUnknownAt !== null)) ||
    (data.status === "outcome_unknown" &&
      (response !== null ||
        model !== null ||
        leaseToken !== null ||
        leaseExpiresAt !== null ||
        outcomeUnknownAt === null))
  ) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant reservation state is malformed",
    );
  }

  return {
    status: data.status,
    idempotencyKey,
    requestFingerprint,
    response,
    model,
    leaseToken,
    leaseExpiresAt,
    outcomeUnknownAt,
    isNew,
  };
}

export function mapLessonAssistantRpcError(error: RpcErrorLike) {
  const missingMigrationCodes = new Set([
    "PGRST202",
    "42P01",
    "42703",
    "42883",
  ]);
  return new LessonAssistantReservationConfigurationError(
    missingMigrationCodes.has(error.code?.trim() ?? "")
      ? "Lesson assistant reservation migration is missing"
      : "Lesson assistant reservation request failed",
  );
}

function normalizeIdentity(
  identity: LessonAssistantRequestIdentity,
): LessonAssistantRequestIdentity {
  if (!sha256(identity.contextHash)) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant request identity is invalid",
    );
  }
  const parsed = lessonAssistantRequestSchema.safeParse({
    lessonId: identity.lessonId,
    messages: identity.messages,
    responseLocale: identity.responseLocale ?? "vi",
  });
  if (!parsed.success) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant request identity is invalid",
    );
  }
  return {
    lessonId: parsed.data.lessonId,
    contextHash: identity.contextHash,
    messages: parsed.data.messages,
    responseLocale: parsed.data.responseLocale,
  };
}

function assertRequestFingerprint(
  value: string,
  identity: LessonAssistantRequestIdentity,
) {
  assertSha256(value);
  if (value !== lessonAssistantRequestFingerprint(identity)) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant fingerprint does not match its request",
    );
  }
}

function assertSha256(value: string) {
  if (!sha256(value)) {
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant fingerprint is invalid",
    );
  }
}

function assertUuid(value: string, label: string) {
  if (!uuid(value)) {
    throw new LessonAssistantReservationConfigurationError(
      `Lesson assistant ${label} UUID is invalid`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeModel(value: unknown) {
  return typeof value === "string" && value.trim() && value.length <= 200
    ? value
    : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function uuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ) &&
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
    throw new LessonAssistantReservationConfigurationError(
      "Lesson assistant timestamp is malformed",
    );
  }
  return parsed;
}
