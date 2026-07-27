import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export const MOCK_HISTORY_PUBLIC_ATTEMPT_MAX_BYTES = 512 * 1024;
export const MOCK_HISTORY_REPORT_MAX_BYTES = 256 * 1024;
export const MOCK_HISTORY_DEFAULT_LEASE_SECONDS = 20 * 60;

export type MockHistoryStatus = "reserved" | "completed" | "failed";

export type MockHistoryFailure = {
  code: string;
  retryable: boolean;
};

export type MockHistoryAttempt = {
  attemptId: string;
  sessionId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  profileId: string;
  profileVersion: number;
  roleProfileId: string;
  roleProfileVersion: number;
  blueprintId: string;
  blueprintVersion: number;
  blueprintFingerprint: string;
  durationMinutes: 30 | 45 | 60;
  publicAttempt: Record<string, unknown>;
  status: MockHistoryStatus;
  report: Record<string, unknown> | null;
  failure: MockHistoryFailure | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  leaseAttempt: number;
  isNew: boolean;
  leaseRenewed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type MockHistoryCursor = {
  createdAt: string;
  attemptId: string;
};

export type MockHistoryPage = {
  items: MockHistoryAttempt[];
  hasMore: boolean;
  nextCursor: MockHistoryCursor | null;
};

type RpcErrorLike = {
  code?: string | null;
  message?: string | null;
};

export class MockHistoryConfigurationError extends Error {
  constructor(message = "Mock interview history is not configured") {
    super(message);
    this.name = "MockHistoryConfigurationError";
  }
}

export class MockHistoryIdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was reused for a different mock attempt");
    this.name = "MockHistoryIdempotencyConflictError";
  }
}

export class MockHistorySessionConflictError extends Error {
  constructor() {
    super("Mock session was already reserved with another idempotency key");
    this.name = "MockHistorySessionConflictError";
  }
}

export class MockHistoryBusyError extends Error {
  constructor(
    readonly attemptId: string | null,
    readonly leaseExpiresAt: string | null,
  ) {
    super("Matching mock report is still being generated");
    this.name = "MockHistoryBusyError";
  }
}

export class MockHistoryLeaseInvalidError extends Error {
  constructor() {
    super("Mock history lease is invalid or expired");
    this.name = "MockHistoryLeaseInvalidError";
  }
}

export class MockHistoryAttemptNotFoundError extends Error {
  constructor() {
    super("Mock interview attempt was not found");
    this.name = "MockHistoryAttemptNotFoundError";
  }
}

export function createMockHistoryAdminClient() {
  const url =
    process.env.SUPABASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.MOCK_HISTORY_SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) {
    throw new MockHistoryConfigurationError(
      "Mock history requires its dedicated Supabase secret key",
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

export function mapMockHistoryRpcError(
  error: RpcErrorLike,
): MockHistoryConfigurationError {
  const code = error.code?.trim() ?? "";
  const missingMigrationCodes = new Set([
    "PGRST202",
    "42P01",
    "42703",
    "42883",
  ]);
  if (missingMigrationCodes.has(code)) {
    return new MockHistoryConfigurationError(
      "Mock interview history migration is missing",
    );
  }
  return new MockHistoryConfigurationError(
    "Mock interview history request failed",
  );
}

export async function reserveMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    sessionId: string;
    idempotencyKey: string;
    requestFingerprint: string;
    profileId: string;
    profileVersion: number;
    roleProfileId: string;
    roleProfileVersion: number;
    blueprintId: string;
    blueprintVersion: number;
    blueprintFingerprint: string;
    durationMinutes: 30 | 45 | 60;
    publicAttempt: Record<string, unknown>;
    leaseSeconds?: number;
  },
): Promise<MockHistoryAttempt> {
  assertUuid(input.userId, "user");
  assertUuid(input.sessionId, "session");
  assertUuid(input.idempotencyKey, "idempotency");
  assertSha256(input.requestFingerprint, "request");
  assertSlug(input.profileId, "profile");
  assertPositiveInteger(input.profileVersion, "profile version");
  assertSlug(input.roleProfileId, "role profile");
  assertPositiveInteger(input.roleProfileVersion, "role profile version");
  assertSlug(input.blueprintId, "blueprint");
  assertPositiveInteger(input.blueprintVersion, "blueprint version");
  assertSha256(input.blueprintFingerprint, "blueprint");
  assertDuration(input.durationMinutes);
  assertSafeJsonRecord(
    input.publicAttempt,
    MOCK_HISTORY_PUBLIC_ATTEMPT_MAX_BYTES,
    "Public mock attempt",
  );
  const leaseSeconds =
    input.leaseSeconds ?? MOCK_HISTORY_DEFAULT_LEASE_SECONDS;
  if (
    !Number.isInteger(leaseSeconds)
    || leaseSeconds < 120
    || leaseSeconds > 3600
  ) {
    throw new MockHistoryConfigurationError(
      "Mock history lease must be between 120 and 3600 seconds",
    );
  }

  const { data, error } = await client.rpc(
    "reserve_mock_interview_attempt",
    {
      p_blueprint_fingerprint: input.blueprintFingerprint,
      p_blueprint_id: input.blueprintId,
      p_blueprint_version: input.blueprintVersion,
      p_duration_minutes: input.durationMinutes,
      p_idempotency_key: input.idempotencyKey,
      p_lease_seconds: leaseSeconds,
      p_profile_id: input.profileId,
      p_profile_version: input.profileVersion,
      p_public_attempt: input.publicAttempt,
      p_request_fingerprint: input.requestFingerprint,
      p_role_profile_id: input.roleProfileId,
      p_role_profile_version: input.roleProfileVersion,
      p_session_id: input.sessionId,
      p_user_id: input.userId,
    },
  );
  if (error) throw mapMockHistoryRpcError(error);
  return parseMockHistoryAttempt(data, { requireLeaseToken: true });
}

export async function completeMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
    leaseToken: string;
    report: Record<string, unknown>;
  },
): Promise<MockHistoryAttempt> {
  assertUuid(input.userId, "user");
  assertUuid(input.attemptId, "attempt");
  assertUuid(input.leaseToken, "lease");
  assertSafeJsonRecord(
    input.report,
    MOCK_HISTORY_REPORT_MAX_BYTES,
    "Normalized mock report",
  );

  const { data, error } = await client.rpc(
    "complete_mock_interview_attempt",
    {
      p_attempt_id: input.attemptId,
      p_lease_token: input.leaseToken,
      p_report: input.report,
      p_user_id: input.userId,
    },
  );
  if (error) throw mapMockHistoryRpcError(error);
  return parseMockHistoryAttempt(data);
}

export async function failMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
    leaseToken: string;
    failure: MockHistoryFailure;
  },
): Promise<MockHistoryAttempt> {
  assertUuid(input.userId, "user");
  assertUuid(input.attemptId, "attempt");
  assertUuid(input.leaseToken, "lease");
  assertFailure(input.failure);

  const { data, error } = await client.rpc("fail_mock_interview_attempt", {
    p_attempt_id: input.attemptId,
    p_failure: input.failure,
    p_lease_token: input.leaseToken,
    p_user_id: input.userId,
  });
  if (error) throw mapMockHistoryRpcError(error);
  return parseMockHistoryAttempt(data);
}

export async function releaseMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
    leaseToken: string;
  },
): Promise<"released" | "terminal"> {
  return transitionMockInterviewReservation(client, {
    ...input,
    rpc: "release_mock_interview_attempt",
    expectedStatus: "released",
  });
}

export async function abortMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
    leaseToken: string;
  },
): Promise<"aborted"> {
  const result = await transitionMockInterviewReservation(client, {
    ...input,
    rpc: "abort_mock_interview_attempt",
    expectedStatus: "aborted",
  });
  if (result !== "aborted") {
    throw new MockHistoryConfigurationError(
      "Terminal mock history cannot be aborted",
    );
  }
  return result;
}

export async function readMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
  },
): Promise<MockHistoryAttempt | null> {
  assertUuid(input.userId, "user");
  assertUuid(input.attemptId, "attempt");

  const { data, error } = await client.rpc("read_mock_interview_attempt", {
    p_attempt_id: input.attemptId,
    p_user_id: input.userId,
  });
  if (error) throw mapMockHistoryRpcError(error);
  return data === null ? null : parseMockHistoryAttempt(data);
}

export async function listMockInterviewAttempts(
  client: SupabaseClient,
  input: {
    userId: string;
    limit?: number;
    cursor?: MockHistoryCursor | null;
    roleProfileId?: string | null;
  },
): Promise<MockHistoryPage> {
  assertUuid(input.userId, "user");
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new MockHistoryConfigurationError(
      "Mock history page size must be between 1 and 50",
    );
  }
  if (input.cursor) {
    assertTimestamp(input.cursor.createdAt, "history cursor");
    assertUuid(input.cursor.attemptId, "history cursor attempt");
  }
  if (input.roleProfileId) {
    assertSlug(input.roleProfileId, "role profile");
  }

  const { data, error } = await client.rpc(
    "list_mock_interview_attempts",
    {
      p_before_created_at: input.cursor?.createdAt ?? null,
      p_before_id: input.cursor?.attemptId ?? null,
      p_limit: limit,
      p_role_profile_id: input.roleProfileId ?? null,
      p_user_id: input.userId,
    },
  );
  if (error) throw mapMockHistoryRpcError(error);
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new MockHistoryConfigurationError(
      "Unexpected mock history list response",
    );
  }
  if (typeof data.has_more !== "boolean") {
    throw new MockHistoryConfigurationError(
      "Unexpected mock history pagination response",
    );
  }

  const items = data.items.map((item) => parseMockHistoryAttempt(item));
  const last = items.at(-1);
  return {
    items,
    hasMore: data.has_more,
    nextCursor:
      data.has_more && last
        ? { createdAt: last.createdAt, attemptId: last.attemptId }
        : null,
  };
}

export async function deleteMockInterviewAttempt(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
  },
): Promise<boolean> {
  assertUuid(input.userId, "user");
  assertUuid(input.attemptId, "attempt");

  const { data, error } = await client.rpc("delete_mock_interview_attempt", {
    p_attempt_id: input.attemptId,
    p_user_id: input.userId,
  });
  if (error) throw mapMockHistoryRpcError(error);
  if (!isRecord(data) || typeof data.deleted !== "boolean") {
    throw new MockHistoryConfigurationError(
      "Unexpected mock history delete response",
    );
  }
  return data.deleted;
}

async function transitionMockInterviewReservation<
  TStatus extends "released" | "aborted",
>(
  client: SupabaseClient,
  input: {
    userId: string;
    attemptId: string;
    leaseToken: string;
    rpc:
      | "release_mock_interview_attempt"
      | "abort_mock_interview_attempt";
    expectedStatus: TStatus;
  },
): Promise<TStatus | "terminal"> {
  assertUuid(input.userId, "user");
  assertUuid(input.attemptId, "attempt");
  assertUuid(input.leaseToken, "lease");
  const { data, error } = await client.rpc(input.rpc, {
    p_attempt_id: input.attemptId,
    p_lease_token: input.leaseToken,
    p_user_id: input.userId,
  });
  if (error) throw mapMockHistoryRpcError(error);
  if (!isRecord(data) || typeof data.status !== "string") {
    throw new MockHistoryConfigurationError(
      "Unexpected mock history transition response",
    );
  }
  if (data.status === input.expectedStatus) {
    return input.expectedStatus;
  }
  if (data.status === "lease_invalid") {
    throw new MockHistoryLeaseInvalidError();
  }
  if (data.status === "not_found") {
    throw new MockHistoryAttemptNotFoundError();
  }
  if (data.status === "completed" || data.status === "failed") {
    return "terminal";
  }
  throw new MockHistoryConfigurationError(
    "Unexpected mock history transition status",
  );
}

export function parseMockHistoryAttempt(
  data: unknown,
  options: { requireLeaseToken?: boolean } = {},
): MockHistoryAttempt {
  if (!isRecord(data)) {
    throw new MockHistoryConfigurationError(
      "Unexpected mock history response",
    );
  }
  const status = readString(data.status);
  if (status === "idempotency_conflict") {
    throw new MockHistoryIdempotencyConflictError();
  }
  if (status === "session_conflict") {
    throw new MockHistorySessionConflictError();
  }
  if (status === "busy") {
    throw new MockHistoryBusyError(
      readUuid(data.attempt_id),
      readNullableTimestamp(data.lease_expires_at),
    );
  }
  if (status === "lease_invalid") {
    throw new MockHistoryLeaseInvalidError();
  }
  if (status === "not_found") {
    throw new MockHistoryAttemptNotFoundError();
  }
  if (
    status !== "reserved"
    && status !== "completed"
    && status !== "failed"
  ) {
    throw new MockHistoryConfigurationError(
      "Unknown mock history status",
    );
  }

  const attemptId = readUuid(data.attempt_id);
  const sessionId = readUuid(data.session_id);
  const idempotencyKey = readUuid(data.idempotency_key);
  const requestFingerprint = readSha256(data.request_fingerprint);
  const profileId = readSlug(data.profile_id);
  const profileVersion = readPositiveInteger(data.profile_version);
  const roleProfileId = readSlug(data.role_profile_id);
  const roleProfileVersion = readPositiveInteger(data.role_profile_version);
  const blueprintId = readSlug(data.blueprint_id);
  const blueprintVersion = readPositiveInteger(data.blueprint_version);
  const blueprintFingerprint = readSha256(data.blueprint_fingerprint);
  const durationMinutes = readDuration(data.duration_minutes);
  const publicAttempt = readRecord(data.public_attempt);
  const report = readNullableRecord(data.report);
  const failure = readNullableFailure(data.failure);
  const leaseToken = readNullableUuid(data.lease_token);
  const leaseExpiresAt = readNullableTimestamp(data.lease_expires_at);
  const leaseAttempt = readPositiveInteger(data.lease_attempt);
  const createdAt = readTimestamp(data.created_at);
  const updatedAt = readTimestamp(data.updated_at);
  const completedAt = readNullableTimestamp(data.completed_at);
  const isNew =
    data.is_new === undefined ? false : readBoolean(data.is_new);
  const leaseRenewed =
    data.lease_renewed === undefined
      ? false
      : readBoolean(data.lease_renewed);

  if (
    !attemptId
    || !sessionId
    || !idempotencyKey
    || !requestFingerprint
    || !profileId
    || profileVersion === null
    || !roleProfileId
    || roleProfileVersion === null
    || !blueprintId
    || blueprintVersion === null
    || !blueprintFingerprint
    || durationMinutes === null
    || !publicAttempt
    || leaseAttempt === null
    || isNew === null
    || leaseRenewed === null
    || !createdAt
    || !updatedAt
  ) {
    throw new MockHistoryConfigurationError(
      "Mock history identity is malformed",
    );
  }
  assertSafeJsonRecord(
    publicAttempt,
    MOCK_HISTORY_PUBLIC_ATTEMPT_MAX_BYTES,
    "Public mock attempt",
  );

  if (
    (
      status === "reserved"
      && (
        report !== null
        || failure !== null
        || leaseExpiresAt === null
        || completedAt !== null
        || (options.requireLeaseToken && leaseToken === null)
      )
    )
    || (
      status === "completed"
      && (
        report === null
        || failure !== null
        || leaseToken !== null
        || leaseExpiresAt !== null
        || completedAt === null
      )
    )
    || (
      status === "failed"
      && (
        report !== null
        || failure === null
        || leaseToken !== null
        || leaseExpiresAt !== null
        || completedAt === null
      )
    )
  ) {
    throw new MockHistoryConfigurationError(
      "Mock history state is malformed",
    );
  }
  if (report) {
    assertSafeJsonRecord(
      report,
      MOCK_HISTORY_REPORT_MAX_BYTES,
      "Normalized mock report",
    );
  }

  return {
    attemptId,
    sessionId,
    idempotencyKey,
    requestFingerprint,
    profileId,
    profileVersion,
    roleProfileId,
    roleProfileVersion,
    blueprintId,
    blueprintVersion,
    blueprintFingerprint,
    durationMinutes,
    publicAttempt,
    status,
    report,
    failure,
    leaseToken,
    leaseExpiresAt,
    leaseAttempt,
    isNew,
    leaseRenewed,
    createdAt,
    updatedAt,
    completedAt,
  };
}

function assertSafeJsonRecord(
  value: unknown,
  maxBytes: number,
  label: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new MockHistoryConfigurationError(
      `${label} must be a JSON object`,
    );
  }
  let nodeCount = 0;
  validateJsonValue(value, 0, () => {
    nodeCount += 1;
    if (nodeCount > 10_000) {
      throw new MockHistoryConfigurationError(`${label} is too complex`);
    }
  });

  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new MockHistoryConfigurationError(`${label} exceeds its size limit`);
  }
}

function validateJsonValue(
  value: unknown,
  depth: number,
  visit: () => void,
) {
  visit();
  if (depth > 32) {
    throw new MockHistoryConfigurationError(
      "Mock history JSON nesting is too deep",
    );
  }
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new MockHistoryConfigurationError(
        "Mock history JSON contains a non-finite number",
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => validateJsonValue(item, depth + 1, visit));
    return;
  }
  if (!isRecord(value)) {
    throw new MockHistoryConfigurationError(
      "Mock history payload must contain only JSON values",
    );
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_HISTORY_KEYS.has(normalizeKey(key))) {
      throw new MockHistoryConfigurationError(
        "Mock history payload contains private evaluation data",
      );
    }
    validateJsonValue(child, depth + 1, visit);
  }
}

const FORBIDDEN_HISTORY_KEYS = new Set([
  "bonuscriteria",
  "candidateanswer",
  "candidateanswers",
  "canonicalanswer",
  "canonicalresponse",
  "cases",
  "diagnostics",
  "evaluationcriteria",
  "evaluationguide",
  "hiddendiagnostic",
  "hiddendiagnostics",
  "hiddenexecution",
  "hiddeninput",
  "hiddeninputs",
  "hiddenoutput",
  "hiddenoutputs",
  "hiddentest",
  "hiddentests",
  "knownmisconceptions",
  "modelanswer",
  "output",
  "requiredcriteria",
  "rubric",
  "rubriccriteria",
]);

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertFailure(value: MockHistoryFailure) {
  if (
    !isRecord(value)
    || Object.keys(value).some(
      (key) => key !== "code" && key !== "retryable",
    )
    || typeof value.code !== "string"
    || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value.code)
    || value.code.length > 80
    || typeof value.retryable !== "boolean"
  ) {
    throw new MockHistoryConfigurationError(
      "Mock failure must contain only a safe code and retryable flag",
    );
  }
}

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) {
    throw new MockHistoryConfigurationError(
      `A valid ${label} UUID is required`,
    );
  }
}

function assertSha256(value: string, label: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new MockHistoryConfigurationError(
      `A SHA-256 ${label} fingerprint is required`,
    );
  }
}

function assertSlug(value: string, label: string) {
  if (
    value.length < 1
    || value.length > 120
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new MockHistoryConfigurationError(
      `A valid ${label} ID is required`,
    );
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new MockHistoryConfigurationError(
      `A positive ${label} is required`,
    );
  }
}

function assertDuration(value: number) {
  if (value !== 30 && value !== 45 && value !== 60) {
    throw new MockHistoryConfigurationError(
      "Mock duration must be 30, 45, or 60 minutes",
    );
  }
}

function assertTimestamp(value: string, label: string) {
  if (!isTimestamp(value)) {
    throw new MockHistoryConfigurationError(
      `A valid ${label} timestamp is required`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function readNullableRecord(value: unknown) {
  return value === null || value === undefined ? null : readRecord(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readUuid(value: unknown) {
  return typeof value === "string" && isUuid(value) ? value : null;
}

function readNullableUuid(value: unknown) {
  return value === null || value === undefined ? null : readUuid(value);
}

function readSha256(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
    ? value
    : null;
}

function readSlug(value: unknown) {
  return typeof value === "string"
    && value.length <= 120
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : null;
}

function readPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function readDuration(value: unknown): 30 | 45 | 60 | null {
  return value === 30 || value === 45 || value === 60 ? value : null;
}

function readTimestamp(value: unknown) {
  return typeof value === "string" && isTimestamp(value) ? value : null;
}

function readNullableTimestamp(value: unknown) {
  return value === null || value === undefined ? null : readTimestamp(value);
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readNullableFailure(value: unknown): MockHistoryFailure | null {
  if (value === null || value === undefined) return null;
  assertFailure(value as MockHistoryFailure);
  return value as MockHistoryFailure;
}

function isTimestamp(value: string) {
  return (
    value.length <= 40
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
      .test(value)
    && !Number.isNaN(Date.parse(value))
  );
}

function isUuid(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
    && value !== "00000000-0000-0000-0000-000000000000"
  );
}
