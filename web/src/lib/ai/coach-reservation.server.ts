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
const LEGACY_ENGLISH_SOURCE_REVISION_DOMAIN =
  "coach-evaluation-legacy-english-source-v1";

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
  message?: string | null;
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
  return hashCoachEvaluationIdentity([
    ...coachEvaluationIdentityFields(identity),
    identity.responseLocale ?? "vi",
  ]);
}

function legacyCoachEvaluationRequestFingerprint(
  identity: CoachEvaluationRequestIdentity,
) {
  return hashCoachEvaluationIdentity(
    coachEvaluationIdentityFields(identity),
  );
}

function legacyCoachEvaluationIdempotencyKey(fingerprint: string) {
  const payload = fingerprint.slice(0, 32);
  const variant = (
    (Number.parseInt(payload.slice(16, 17), 16) & 0x3) |
    0x8
  ).toString(16);
  const hex = `${payload.slice(0, 12)}8${payload.slice(13, 16)}${variant}${payload.slice(17)}`;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function legacyCoachEvaluationCompatibility(
  identity: CoachEvaluationRequestIdentity,
) {
  const responseLocale = identity.responseLocale ?? "vi";
  const rpcIdentity = responseLocale === "en"
    ? {
        ...identity,
        // The pre-locale RPC deduplicates solely by the remaining identity
        // fields. Domain-separate English reservations through a derived
        // source revision so they can never reuse Vietnamese cached feedback.
        // This value is server-derived and is used only while the database
        // migration is rolling out; the provider still receives the canonical
        // source and candidate answer.
        sourceRevision: hashCoachEvaluationIdentity([
          LEGACY_ENGLISH_SOURCE_REVISION_DOMAIN,
          identity.sourceRevision,
        ]),
      }
    : identity;
  const requestFingerprint =
    legacyCoachEvaluationRequestFingerprint(rpcIdentity);
  return {
    rpcIdentity,
    requestFingerprint,
    idempotencyKey:
      legacyCoachEvaluationIdempotencyKey(requestFingerprint),
  };
}

function coachEvaluationIdentityFields(
  identity: CoachEvaluationRequestIdentity,
) {
  return [
    identity.questionId,
    String(identity.questionVersion),
    identity.sourceRevision,
    identity.candidateAnswer,
  ];
}

function hashCoachEvaluationIdentity(fields: string[]) {
  return createHash("sha256")
    .update(fields.join("\u001f"), "utf8")
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

  const rpcInput = {
    p_candidate_answer: input.identity.candidateAnswer,
    p_idempotency_key: input.idempotencyKey,
    p_lease_seconds: leaseSeconds,
    p_question_id: input.identity.questionId,
    p_question_version: input.identity.questionVersion,
    p_request_fingerprint: input.requestFingerprint,
    p_source_revision: input.identity.sourceRevision,
  };
  let { data, error } = await client.rpc(
    "reserve_coach_evaluation",
    rpcInput,
  );
  if (error && isLegacyFingerprintMismatch(error)) {
    const compatibility = legacyCoachEvaluationCompatibility(
      input.identity,
    );
    // Keep the compatibility identifiers and transport identity paired.
    // Reusing the locale-aware key with a legacy fingerprint would turn this
    // row into a conflict after rollout.
    ({ data, error } = await client.rpc("reserve_coach_evaluation", {
      ...rpcInput,
      p_idempotency_key: compatibility.idempotencyKey,
      p_request_fingerprint: compatibility.requestFingerprint,
      p_source_revision: compatibility.rpcIdentity.sourceRevision,
    }));
  }
  if (error) throw mapCoachEvaluationRpcError(error);
  const reservation = parseCoachEvaluationReservation(data);
  persistedCoachEvaluationRpcIdentity(
    reservation.requestFingerprint,
    reservation.idempotencyKey,
    input.identity,
  );
  return reservation;
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
  const rpcIdentity = persistedCoachEvaluationRpcIdentity(
    input.requestFingerprint,
    input.idempotencyKey,
    input.identity,
  );
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
    p_candidate_answer: rpcIdentity.candidateAnswer,
    p_feedback: feedback,
    p_idempotency_key: input.idempotencyKey,
    p_lease_token: input.leaseToken,
    p_model: model,
    p_question_id: rpcIdentity.questionId,
    p_question_version: rpcIdentity.questionVersion,
    p_request_fingerprint: input.requestFingerprint,
    p_score: feedback.score,
    p_source_revision: rpcIdentity.sourceRevision,
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

function persistedCoachEvaluationRpcIdentity(
  value: string,
  idempotencyKey: string,
  identity: CoachEvaluationRequestIdentity,
) {
  if (!sha256(value)) {
    throwCoachEvaluationFingerprintMismatch();
  }
  if (value === coachEvaluationRequestFingerprint(identity)) {
    return identity;
  }

  const responseLocale = identity.responseLocale ?? "vi";
  if (
    responseLocale === "vi" &&
    value === legacyCoachEvaluationRequestFingerprint(identity)
  ) {
    return identity;
  }

  const compatibility = legacyCoachEvaluationCompatibility(identity);
  if (
    responseLocale === "en" &&
    value === compatibility.requestFingerprint &&
    idempotencyKey === compatibility.idempotencyKey
  ) {
    return compatibility.rpcIdentity;
  }

  throwCoachEvaluationFingerprintMismatch();
}

function throwCoachEvaluationFingerprintMismatch(): never {
  throw new CoachEvaluationConfigurationError(
    "Coach evaluation fingerprint does not match its request",
  );
}

function isLegacyFingerprintMismatch(
  error: RpcErrorLike,
) {
  return (
    error.code?.trim() === "P0001" &&
    error.message?.trim() === "Coach evaluation fingerprint mismatch"
  );
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
