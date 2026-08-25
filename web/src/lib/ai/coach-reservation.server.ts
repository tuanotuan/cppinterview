import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  coachFeedbackSchema,
  type AiResponseLocale,
  type CoachFeedback,
} from "./contracts";

export const COACH_EVALUATION_LEASE_SECONDS = 600;
const COACH_EVALUATION_MINIMUM_RUNWAY_SECONDS = 240;

export type CoachEvaluationRequestIdentity = {
  questionId: string;
  questionVersion: number;
  sourceRevision: string;
  candidateAnswer: string;
  responseLocale?: AiResponseLocale;
};

export type CoachEvaluationReservation = {
  status: "running" | "completed" | "outcome_unknown";
  idempotencyKey: string;
  requestFingerprint: string;
  attemptId: number | null;
  feedback: CoachFeedback | null;
  model: string | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  leaseAttempt: number;
  isNew: boolean;
  leaseRenewed: boolean;
};

type RpcErrorLike = {
  code?: string | null;
};

export class CoachEvaluationConfigurationError extends Error {
  constructor(message = "Coach evaluation reservation is not configured") {
    super(message);
    this.name = "CoachEvaluationConfigurationError";
  }
}

export class CoachEvaluationIdempotencyConflictError extends Error {
  constructor() {
    super("Coach idempotency key was reused for another request");
    this.name = "CoachEvaluationIdempotencyConflictError";
  }
}

export class CoachEvaluationBusyError extends Error {
  readonly retryAfterSeconds: number;

  constructor(readonly leaseExpiresAt: string | null) {
    super("Matching coach evaluation is still running");
    this.name = "CoachEvaluationBusyError";
    const remaining = leaseExpiresAt
      ? Math.ceil((Date.parse(leaseExpiresAt) - Date.now()) / 1000)
      : 10;
    this.retryAfterSeconds = Math.max(1, Math.min(60, remaining || 10));
  }
}

export class CoachEvaluationLeaseInvalidError extends Error {
  constructor() {
    super("Coach evaluation lease is invalid or expired");
    this.name = "CoachEvaluationLeaseInvalidError";
  }
}

export function coachEvaluationRequestFingerprint(
  identity: CoachEvaluationRequestIdentity,
) {
  return createHash("sha256")
    .update(
      [
        identity.questionId,
        String(identity.questionVersion),
        identity.sourceRevision,
        identity.candidateAnswer,
        identity.responseLocale ?? "vi",
      ].join("\u001f"),
      "utf8",
    )
    .digest("hex");
}

export async function reserveCoachEvaluation(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    identity: CoachEvaluationRequestIdentity;
    leaseSeconds?: number;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertIdentity(input.identity);
  assertRequestFingerprint(input.requestFingerprint, input.identity);
  const leaseSeconds =
    input.leaseSeconds ?? COACH_EVALUATION_LEASE_SECONDS;
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < COACH_EVALUATION_MINIMUM_RUNWAY_SECONDS ||
    leaseSeconds > 900
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation lease must be between 240 and 900 seconds",
    );
  }

  const { data, error } = await client.rpc("reserve_coach_evaluation", {
    p_candidate_answer: input.identity.candidateAnswer,
    p_idempotency_key: input.idempotencyKey,
    p_lease_seconds: leaseSeconds,
    p_question_id: input.identity.questionId,
    p_question_version: input.identity.questionVersion,
    p_request_fingerprint: input.requestFingerprint,
    p_source_revision: input.identity.sourceRevision,
  });
  if (error) throw mapCoachEvaluationRpcError(error);
  return parseCoachEvaluationReservation(data);
}

export async function completeCoachEvaluation(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    requestFingerprint: string;
    leaseToken: string;
    identity: CoachEvaluationRequestIdentity;
    feedback: CoachFeedback;
    model: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  assertIdentity(input.identity);
  assertRequestFingerprint(input.requestFingerprint, input.identity);
  const parsedFeedback = coachFeedbackSchema.safeParse(input.feedback);
  if (!parsedFeedback.success) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation feedback is invalid",
    );
  }
  const feedback = parsedFeedback.data;
  const model = input.model.trim();
  if (!model || model.length > 200) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation model is invalid",
    );
  }

  const { data, error } = await client.rpc("complete_coach_evaluation", {
    p_candidate_answer: input.identity.candidateAnswer,
    p_feedback: feedback,
    p_idempotency_key: input.idempotencyKey,
    p_lease_token: input.leaseToken,
    p_model: model,
    p_question_id: input.identity.questionId,
    p_question_version: input.identity.questionVersion,
    p_request_fingerprint: input.requestFingerprint,
    p_score: feedback.score,
    p_source_revision: input.identity.sourceRevision,
    p_suggested_rating: feedback.suggestedRating,
    p_verdict: feedback.verdict,
  });
  if (error) throw mapCoachEvaluationRpcError(error);
  const reservation = parseCoachEvaluationReservation(data);
  if (reservation.status !== "completed") {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation completion did not become terminal",
    );
  }
  return reservation;
}

export async function markCoachEvaluationDispatched(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    leaseToken: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(
    "mark_coach_evaluation_dispatched",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) throw mapCoachEvaluationRpcError(error);
  if (
    !isRecord(data) ||
    data.status !== "dispatched" ||
    nullableTimestamp(data.dispatched_at) === null
  ) {
    if (
      isRecord(data) &&
      (data.status === "lease_invalid" || data.status === "not_found")
    ) {
      throw new CoachEvaluationLeaseInvalidError();
    }
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation dispatch was not confirmed",
    );
  }
}

export async function releaseCoachEvaluation(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    leaseToken: string;
  },
): Promise<"released" | "completed" | "outcome_unknown" | "not_found"> {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc("release_coach_evaluation", {
    p_idempotency_key: input.idempotencyKey,
    p_lease_token: input.leaseToken,
  });
  if (error) throw mapCoachEvaluationRpcError(error);
  if (!isRecord(data) || typeof data.status !== "string") {
    throw new CoachEvaluationConfigurationError(
      "Unexpected coach evaluation release response",
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
    throw new CoachEvaluationLeaseInvalidError();
  }
  throw new CoachEvaluationConfigurationError(
    "Unknown coach evaluation release status",
  );
}

export async function markCoachEvaluationOutcomeUnknown(
  client: SupabaseClient,
  input: {
    idempotencyKey: string;
    leaseToken: string;
  },
) {
  assertUuid(input.idempotencyKey, "idempotency");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(
    "mark_coach_evaluation_outcome_unknown",
    {
      p_idempotency_key: input.idempotencyKey,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) throw mapCoachEvaluationRpcError(error);
  const reservation = parseCoachEvaluationReservation(data);
  if (
    reservation.status !== "completed" &&
    reservation.status !== "outcome_unknown"
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation outcome transition did not become terminal",
    );
  }
  return reservation;
}

export function parseCoachEvaluationReservation(
  data: unknown,
): CoachEvaluationReservation {
  if (!isRecord(data)) {
    throw new CoachEvaluationConfigurationError(
      "Unexpected coach evaluation reservation response",
    );
  }
  if (data.status === "idempotency_conflict") {
    throw new CoachEvaluationIdempotencyConflictError();
  }
  if (data.status === "legacy_cache_invalid") {
    throw new CoachEvaluationConfigurationError(
      "Legacy coach evaluation cache is invalid",
    );
  }
  if (data.status === "busy") {
    const leaseExpiresAt = nullableTimestamp(data.lease_expires_at);
    if (leaseExpiresAt === null) {
      throw new CoachEvaluationConfigurationError(
        "Busy coach evaluation is missing its lease expiry",
      );
    }
    throw new CoachEvaluationBusyError(leaseExpiresAt);
  }
  if (data.status === "lease_invalid" || data.status === "not_found") {
    throw new CoachEvaluationLeaseInvalidError();
  }
  if (
    data.status !== "running" &&
    data.status !== "completed" &&
    data.status !== "outcome_unknown"
  ) {
    throw new CoachEvaluationConfigurationError(
      "Unknown coach evaluation reservation status",
    );
  }

  const idempotencyKey = uuid(data.idempotency_key);
  const requestFingerprint = sha256(data.request_fingerprint);
  const attemptId = nullablePositiveInteger(data.attempt_id);
  const feedback =
    data.feedback === null || data.feedback === undefined
      ? null
      : coachFeedbackSchema.safeParse(data.feedback);
  const model =
    data.model === null || data.model === undefined
      ? null
      : modelValue(data.model);
  const leaseToken = nullableUuid(data.lease_token);
  const leaseExpiresAt = nullableTimestamp(data.lease_expires_at);
  const leaseAttempt = positiveInteger(data.lease_attempt);
  const isNew = booleanValue(data.is_new);
  const leaseRenewed = booleanValue(data.lease_renewed);

  if (
    !idempotencyKey ||
    !requestFingerprint ||
    leaseAttempt === null ||
    isNew === null ||
    leaseRenewed === null ||
    (feedback !== null && !feedback.success)
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation reservation identity is malformed",
    );
  }
  const parsedFeedback = feedback?.data ?? null;
  if (
    (data.status === "running" &&
      (attemptId !== null ||
        parsedFeedback !== null ||
        model !== null ||
        leaseExpiresAt === null ||
        leaseToken === null ||
        Date.parse(leaseExpiresAt) <= Date.now())) ||
    (data.status === "completed" &&
      (attemptId === null ||
        parsedFeedback === null ||
        model === null ||
        leaseToken !== null ||
        leaseExpiresAt !== null)) ||
    (data.status === "outcome_unknown" &&
      (attemptId !== null ||
        parsedFeedback !== null ||
        model !== null ||
        leaseToken !== null ||
        leaseExpiresAt !== null))
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation reservation state is malformed",
    );
  }

  return {
    status: data.status,
    idempotencyKey,
    requestFingerprint,
    attemptId,
    feedback: parsedFeedback,
    model,
    leaseToken,
    leaseExpiresAt,
    leaseAttempt,
    isNew,
    leaseRenewed,
  };
}

export function mapCoachEvaluationRpcError(
  error: RpcErrorLike,
) {
  const missingMigrationCodes = new Set([
    "PGRST202",
    "42P01",
    "42703",
    "42883",
  ]);
  return new CoachEvaluationConfigurationError(
    missingMigrationCodes.has(error.code?.trim() ?? "")
      ? "Coach evaluation reservation migration is missing"
      : "Coach evaluation reservation request failed",
  );
}

function assertIdentity(identity: CoachEvaluationRequestIdentity) {
  if (
    typeof identity.questionId !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identity.questionId) ||
    identity.questionId.length > 100 ||
    !Number.isInteger(identity.questionVersion) ||
    identity.questionVersion <= 0 ||
    typeof identity.sourceRevision !== "string" ||
    !/^[a-f0-9]{64}$/.test(identity.sourceRevision) ||
    typeof identity.candidateAnswer !== "string" ||
    (identity.responseLocale !== undefined &&
      identity.responseLocale !== "vi" &&
      identity.responseLocale !== "en")
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation request identity is invalid",
    );
  }
}

function assertUuid(value: string, label: string) {
  if (!uuid(value)) {
    throw new CoachEvaluationConfigurationError(
      `Coach evaluation ${label} UUID is invalid`,
    );
  }
}

function assertRequestFingerprint(
  value: string,
  identity: CoachEvaluationRequestIdentity,
) {
  if (
    !sha256(value) ||
    value !== coachEvaluationRequestFingerprint(identity)
  ) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation fingerprint does not match its request",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modelValue(value: unknown) {
  return typeof value === "string" &&
      value.trim() &&
      value.length <= 200
    ? value
    : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function positiveInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function nullablePositiveInteger(value: unknown) {
  return value === null || value === undefined
    ? null
    : positiveInteger(value);
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

function nullableTimestamp(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new CoachEvaluationConfigurationError(
      "Coach evaluation lease timestamp is malformed",
    );
  }
  return value;
}
