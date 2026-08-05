import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export const PUBLIC_AI_QUOTA_LIMIT = 3;
export const PUBLIC_AI_QUOTA_WINDOW_HOURS = 24;
export const PUBLIC_AI_DEVICE_COOKIE = "recall_public_ai_device_v1";
export const PUBLIC_AI_DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type PublicAiQuotaRequestKind =
  | "coach_evaluation"
  | "coach_follow_up";
export type PublicAiQuotaReservationStatus =
  | "reserved"
  | "dispatched"
  | "completed"
  | "released"
  | "outcome_unknown";
export type PublicAiQuotaIdentityKind = "ip" | "device" | "account";

type RpcErrorLike = {
  code?: string | null;
  message?: string | null;
};

type RecordValue = Record<string, unknown>;

export type PublicAiQuotaReservation = {
  reservationId: string | null;
  status: PublicAiQuotaReservationStatus;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  isNew: boolean;
  limit: number | null;
  remaining: number | null;
  resetsAt: string | null;
};

export class PublicAiQuotaExceededError extends Error {
  constructor(
    readonly remaining: number | null,
    readonly resetsAt: string | null,
  ) {
    super("Public AI quota reached");
    this.name = "PublicAiQuotaExceededError";
  }
}

export class PublicAiQuotaBusyError extends Error {
  constructor(readonly reservationId: string | null) {
    super("A matching public AI request is already running");
    this.name = "PublicAiQuotaBusyError";
  }
}

export class PublicAiQuotaIdempotencyConflictError extends Error {
  constructor() {
    super("Public AI idempotency key was reused with a different request");
    this.name = "PublicAiQuotaIdempotencyConflictError";
  }
}

export class PublicAiQuotaConfigurationError extends Error {
  constructor(message = "Public AI quota admission is not configured") {
    super(message);
    this.name = "PublicAiQuotaConfigurationError";
  }
}

export class PublicAiQuotaReservationNotFoundError extends Error {
  constructor() {
    super("Public AI quota reservation was not found");
    this.name = "PublicAiQuotaReservationNotFoundError";
  }
}

export function createPublicAiQuotaAdminClient() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.PUBLIC_AI_QUOTA_SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota requires its dedicated Supabase secret key",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createPublicAiDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function publicAiQuotaIdentityHash(
  kind: PublicAiQuotaIdentityKind,
  value: string,
) {
  const pepper = process.env.PUBLIC_AI_QUOTA_IDENTITY_PEPPER?.trim();
  const normalized = value.trim();
  if (!pepper || !normalized) {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota identity hashing is not configured",
    );
  }

  return createHmac("sha256", pepper)
    .update(`public-ai-quota:v1:${kind}:${normalized}`)
    .digest("hex");
}

/**
 * Vercel overwrites its forwarding header to prevent spoofing. Outside Vercel,
 * production fails closed instead of trusting a browser-controlled header.
 */
export function readPublicAiClientIp(request: Request) {
  const isVercel = process.env.VERCEL === "1";
  const isLocalDevelopment = process.env.NODE_ENV === "development";
  if (!isVercel && !isLocalDevelopment) return null;

  const raw = isVercel
    ? request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for")
    : request.headers.get("x-forwarded-for");
  if (!raw) return null;

  const candidate = raw.trim();
  return isIP(candidate) === 0 ? null : candidate;
}

export function mapPublicAiQuotaRpcError(
  error: RpcErrorLike,
): PublicAiQuotaConfigurationError {
  const code = error.code?.trim() ?? "";
  if (new Set(["PGRST202", "42P01", "42703", "42883"]).has(code)) {
    return new PublicAiQuotaConfigurationError(
      "Public AI quota migration is missing",
    );
  }
  return new PublicAiQuotaConfigurationError(
    "Public AI quota admission request failed",
  );
}

export function parsePublicAiQuotaReservation(
  data: unknown,
): PublicAiQuotaReservation {
  if (!isRecord(data)) {
    throw new PublicAiQuotaConfigurationError(
      "Unexpected public AI quota admission response",
    );
  }

  const status = readString(data.status);
  const reservationId = readNullableUuid(data.reservation_id);
  const leaseToken = readNullableUuid(data.lease_token);
  const leaseExpiresAt = readNullableTimestamp(data.lease_expires_at);
  const limit = readNullablePositiveInteger(data.limit);
  const remaining = readNullableNonNegativeInteger(data.remaining);
  const resetsAt = readNullableTimestamp(data.resets_at);

  if (status === "quota_exceeded") {
    throw new PublicAiQuotaExceededError(remaining, resetsAt);
  }
  if (status === "idempotency_conflict") {
    throw new PublicAiQuotaIdempotencyConflictError();
  }
  if (status === "not_found") {
    throw new PublicAiQuotaReservationNotFoundError();
  }
  if (status === "reserved") {
    if (!reservationId || !leaseToken || !leaseExpiresAt) {
      throw new PublicAiQuotaConfigurationError(
        "Public AI quota lease is malformed",
      );
    }
  } else if (
    status !== "dispatched" &&
    status !== "completed" &&
    status !== "released" &&
    status !== "outcome_unknown"
  ) {
    throw new PublicAiQuotaConfigurationError(
      "Unknown public AI quota reservation status",
    );
  }

  if (
    status !== "reserved" &&
    !reservationId &&
    status !== "released"
  ) {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota reservation identity is missing",
    );
  }
  if (data.is_new !== undefined && typeof data.is_new !== "boolean") {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota reservation freshness is malformed",
    );
  }
  if (
    (limit !== null && limit !== PUBLIC_AI_QUOTA_LIMIT) ||
    (remaining !== null &&
      (limit === null || remaining > limit))
  ) {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota counters are malformed",
    );
  }

  return {
    reservationId,
    status,
    leaseToken,
    leaseExpiresAt,
    isNew: data.is_new === true,
    limit,
    remaining,
    resetsAt,
  };
}

export async function reservePublicAiQuota(
  client: SupabaseClient,
  input: {
    principalHash: string;
    ipHash: string;
    deviceHash: string;
    accountHash: string | null;
    idempotencyKey: string;
    requestFingerprint: string;
    requestKind: PublicAiQuotaRequestKind;
  },
) {
  assertReservationInput(input);
  const { data, error } = await client.rpc("reserve_public_ai_quota", {
    p_principal_hash: input.principalHash,
    p_ip_hash: input.ipHash,
    p_device_hash: input.deviceHash,
    p_account_hash: input.accountHash,
    p_idempotency_key: input.idempotencyKey,
    p_request_fingerprint: input.requestFingerprint,
    p_request_kind: input.requestKind,
  });
  if (error) throw mapPublicAiQuotaRpcError(error);
  return parsePublicAiQuotaReservation(data);
}

export async function markPublicAiQuotaDispatched(
  client: SupabaseClient,
  reservationId: string,
  leaseToken: string,
) {
  return transitionPublicAiQuota(client, "mark_public_ai_quota_dispatched", {
    p_reservation_id: reservationId,
    p_lease_token: leaseToken,
  });
}

export async function completePublicAiQuota(
  client: SupabaseClient,
  reservationId: string,
) {
  return transitionPublicAiQuota(client, "complete_public_ai_quota", {
    p_reservation_id: reservationId,
  });
}

export async function markPublicAiQuotaOutcomeUnknown(
  client: SupabaseClient,
  reservationId: string,
) {
  return transitionPublicAiQuota(
    client,
    "mark_public_ai_quota_outcome_unknown",
    { p_reservation_id: reservationId },
  );
}

export async function releasePublicAiQuota(
  client: SupabaseClient,
  reservationId: string,
  leaseToken: string,
) {
  return transitionPublicAiQuota(client, "release_public_ai_quota", {
    p_reservation_id: reservationId,
    p_lease_token: leaseToken,
  });
}

async function transitionPublicAiQuota(
  client: SupabaseClient,
  name:
    | "mark_public_ai_quota_dispatched"
    | "complete_public_ai_quota"
    | "mark_public_ai_quota_outcome_unknown"
    | "release_public_ai_quota",
  args: Record<string, string>,
) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw mapPublicAiQuotaRpcError(error);
  if (!isRecord(data)) {
    throw new PublicAiQuotaConfigurationError(
      "Unexpected public AI quota transition response",
    );
  }

  const status = readString(data.status);
  if (
    status !== "dispatched" &&
    status !== "completed" &&
    status !== "released" &&
    status !== "outcome_unknown"
  ) {
    if (status === "not_found") {
      throw new PublicAiQuotaReservationNotFoundError();
    }
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota transition was rejected",
    );
  }
  return status;
}

function assertReservationInput(input: {
  principalHash: string;
  ipHash: string;
  deviceHash: string;
  accountHash: string | null;
  idempotencyKey: string;
  requestFingerprint: string;
  requestKind: PublicAiQuotaRequestKind;
}) {
  const hashes = [
    input.principalHash,
    input.ipHash,
    input.deviceHash,
    input.accountHash,
  ].filter((value): value is string => value !== null);
  if (
    hashes.some((value) => !/^[a-f0-9]{64}$/.test(value)) ||
    !isUuid(input.idempotencyKey) ||
    !/^[a-f0-9]{64}$/.test(input.requestFingerprint) ||
    (input.requestKind !== "coach_evaluation" &&
      input.requestKind !== "coach_follow_up") ||
    (input.principalHash !== input.deviceHash &&
      input.principalHash !== input.accountHash)
  ) {
    throw new PublicAiQuotaConfigurationError(
      "Public AI quota reservation input is invalid",
    );
  }
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableUuid(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" && isUuid(value) ? value : null;
}

function readNullableTimestamp(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function readNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function readNullableNonNegativeInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
