import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MockHistoryBusyError,
  MockHistoryConfigurationError,
  MockHistoryIdempotencyConflictError,
  MockHistoryLeaseInvalidError,
  MockHistorySessionConflictError,
  abortMockInterviewAttempt,
  completeMockInterviewAttempt,
  createMockHistoryAdminClient,
  listMockInterviewAttempts,
  mapMockHistoryRpcError,
  parseMockHistoryAttempt,
  releaseMockInterviewAttempt,
  reserveMockInterviewAttempt,
} from "./history.server";

const attemptId = "4a72364d-7209-4fa4-802b-d99cf5224f8c";
const sessionId = "866c9819-b77f-43ef-aa04-fbddeca40012";
const userId = "d92b7048-7df0-4562-bf4d-3b3057f7282c";
const idempotencyKey = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";

afterEach(() => {
  vi.unstubAllEnvs();
});

const reservedAttempt = {
  attempt_id: attemptId,
  session_id: sessionId,
  idempotency_key: idempotencyKey,
  request_fingerprint: "a".repeat(64),
  profile_id: "worldquant-interview-loop",
  profile_version: 4,
  role_profile_id: "tick-data-platform",
  role_profile_version: 1,
  blueprint_id: "targeted-tick-data",
  blueprint_version: 1,
  blueprint_fingerprint: "b".repeat(64),
  duration_minutes: 45,
  public_attempt: {
    questionRefs: [
      {
        id: "book-sequence-gap",
        version: 2,
        contentRevision: "c".repeat(64),
      },
    ],
    answers: { "book-sequence-gap": "Candidate answer" },
  },
  status: "reserved",
  report: null,
  failure: null,
  lease_token: leaseToken,
  lease_expires_at: "2026-07-30T12:20:00Z",
  lease_attempt: 1,
  is_new: true,
  lease_renewed: false,
  created_at: "2026-07-30T12:00:00Z",
  updated_at: "2026-07-30T12:00:00Z",
  completed_at: null,
};

describe("mock interview history response mapping", () => {
  it("maps a leased reservation with exact versioned identities", () => {
    expect(
      parseMockHistoryAttempt(reservedAttempt, {
        requireLeaseToken: true,
      }),
    ).toMatchObject({
      attemptId,
      sessionId,
      status: "reserved",
      roleProfileId: "tick-data-platform",
      blueprintVersion: 1,
      leaseToken,
      isNew: true,
    });
  });

  it("maps a cached completed report without returning a lease", () => {
    expect(
      parseMockHistoryAttempt({
        ...reservedAttempt,
        status: "completed",
        report: { overallScore: 72, assessedCoverage: 0.6 },
        lease_token: null,
        lease_expires_at: null,
        completed_at: "2026-07-30T12:05:00Z",
        is_new: false,
      }),
    ).toMatchObject({
      status: "completed",
      report: { overallScore: 72, assessedCoverage: 0.6 },
      leaseToken: null,
      isNew: false,
    });
  });

  it("maps conflict and expired-lease decisions to domain errors", () => {
    expect(() =>
      parseMockHistoryAttempt({
        status: "idempotency_conflict",
      }),
    ).toThrow(MockHistoryIdempotencyConflictError);
    expect(() =>
      parseMockHistoryAttempt({
        status: "session_conflict",
      }),
    ).toThrow(MockHistorySessionConflictError);
    expect(() =>
      parseMockHistoryAttempt({
        attempt_id: attemptId,
        status: "busy",
        lease_expires_at: "2026-07-30T12:20:00Z",
      }),
    ).toThrow(MockHistoryBusyError);
    expect(() =>
      parseMockHistoryAttempt({
        status: "lease_invalid",
      }),
    ).toThrow(MockHistoryLeaseInvalidError);
  });

  it("fails closed on private evaluation material at any depth", () => {
    expect(() =>
      parseMockHistoryAttempt({
        ...reservedAttempt,
        public_attempt: {
          questions: [
            {
              id: "book-sequence-gap",
              evaluationGuide: "This must never enter history.",
            },
          ],
        },
      }),
    ).toThrow("private evaluation data");

    expect(() =>
      parseMockHistoryAttempt({
        ...reservedAttempt,
        status: "completed",
        report: {
          overallScore: 72,
          hidden_tests: [{ source: "secret" }],
        },
        lease_token: null,
        lease_expires_at: null,
        completed_at: "2026-07-30T12:05:00Z",
      }),
    ).toThrow("private evaluation data");

    expect(() =>
      parseMockHistoryAttempt({
        ...reservedAttempt,
        status: "completed",
        report: {
          executionResults: [{ diagnostics: "hidden compiler output" }],
        },
        lease_token: null,
        lease_expires_at: null,
        completed_at: "2026-07-30T12:05:00Z",
      }),
    ).toThrow("private evaluation data");
  });

  it("fails closed on malformed terminal state", () => {
    expect(() =>
      parseMockHistoryAttempt({
        ...reservedAttempt,
        status: "completed",
        report: null,
        lease_token: null,
        lease_expires_at: null,
        completed_at: "2026-07-30T12:05:00Z",
      }),
    ).toThrow(MockHistoryConfigurationError);
  });
});

describe("mock interview history RPC calls", () => {
  it("reserves a safe snapshot against exact session and blueprint hashes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockResolvedValueOnce({
        data: reservedAttempt,
        error: null,
      });
    const client = {
      rpc,
    } as unknown as Parameters<typeof reserveMockInterviewAttempt>[0];

    await reserveMockInterviewAttempt(client, {
      userId,
      sessionId,
      idempotencyKey,
      requestFingerprint: "a".repeat(64),
      profileId: "worldquant-interview-loop",
      profileVersion: 4,
      roleProfileId: "tick-data-platform",
      roleProfileVersion: 1,
      blueprintId: "targeted-tick-data",
      blueprintVersion: 1,
      blueprintFingerprint: "b".repeat(64),
      durationMinutes: 45,
      publicAttempt: reservedAttempt.public_attempt,
    });

    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "mock_interview_retry_protocol_version",
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "reserve_mock_interview_attempt",
      expect.objectContaining({
        p_user_id: userId,
        p_session_id: sessionId,
        p_idempotency_key: idempotencyKey,
        p_request_fingerprint: "a".repeat(64),
        p_blueprint_fingerprint: "b".repeat(64),
        p_public_attempt: reservedAttempt.public_attempt,
        p_lease_seconds: 1200,
      }),
    );
  });

  it("fails before reservation when retry protocol 2 is unavailable", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202" },
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof reserveMockInterviewAttempt>[0];

    await expect(
      reserveMockInterviewAttempt(client, {
        userId,
        sessionId,
        idempotencyKey,
        requestFingerprint: "a".repeat(64),
        profileId: "worldquant-interview-loop",
        profileVersion: 4,
        roleProfileId: "tick-data-platform",
        roleProfileVersion: 1,
        blueprintId: "targeted-tick-data",
        blueprintVersion: 1,
        blueprintFingerprint: "b".repeat(64),
        durationMinutes: 45,
        publicAttempt: reservedAttempt.public_attempt,
      }),
    ).rejects.toBeInstanceOf(MockHistoryConfigurationError);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects private material before making a reservation RPC", async () => {
    const rpc = vi.fn();
    const client = {
      rpc,
    } as unknown as Parameters<typeof reserveMockInterviewAttempt>[0];

    await expect(
      reserveMockInterviewAttempt(client, {
        userId,
        sessionId,
        idempotencyKey,
        requestFingerprint: "a".repeat(64),
        profileId: "worldquant-interview-loop",
        profileVersion: 4,
        roleProfileId: "tick-data-platform",
        roleProfileVersion: 1,
        blueprintId: "targeted-tick-data",
        blueprintVersion: 1,
        blueprintFingerprint: "b".repeat(64),
        durationMinutes: 45,
        publicAttempt: {
          question: {
            canonicalAnswer: "private",
          },
        },
      }),
    ).rejects.toThrow("private evaluation data");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("completes only the leased owner attempt with a normalized report", async () => {
    const report = { overallScore: 72, assessedCoverage: 0.6 };
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ...reservedAttempt,
        status: "completed",
        report,
        lease_token: null,
        lease_expires_at: null,
        completed_at: "2026-07-30T12:05:00Z",
      },
      error: null,
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof completeMockInterviewAttempt>[0];

    await completeMockInterviewAttempt(client, {
      userId,
      attemptId,
      leaseToken,
      report,
    });

    expect(rpc).toHaveBeenCalledWith(
      "complete_mock_interview_attempt",
      {
        p_attempt_id: attemptId,
        p_lease_token: leaseToken,
        p_report: report,
        p_user_id: userId,
      },
    );
  });

  it("releases only the current lease so the same frozen request can renew", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { attempt_id: attemptId, status: "released" },
      error: null,
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof releaseMockInterviewAttempt>[0];

    await expect(
      releaseMockInterviewAttempt(client, {
        userId,
        attemptId,
        leaseToken,
      }),
    ).resolves.toBe("released");
    expect(rpc).toHaveBeenCalledWith(
      "release_mock_interview_attempt",
      {
        p_attempt_id: attemptId,
        p_lease_token: leaseToken,
        p_user_id: userId,
      },
    );
  });

  it("aborts only a token-owned reservation before rotating the downstream key", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { attempt_id: attemptId, status: "aborted" },
      error: null,
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof abortMockInterviewAttempt>[0];

    await expect(
      abortMockInterviewAttempt(client, {
        userId,
        attemptId,
        leaseToken,
      }),
    ).resolves.toBe("aborted");
  });

  it("rejects a stale lease token during release", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { attempt_id: attemptId, status: "lease_invalid" },
      error: null,
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof releaseMockInterviewAttempt>[0];

    await expect(
      releaseMockInterviewAttempt(client, {
        userId,
        attemptId,
        leaseToken,
      }),
    ).rejects.toThrow(MockHistoryLeaseInvalidError);
  });

  it("returns a stable keyset cursor from a bounded history page", async () => {
    const completedAttempt = {
      ...reservedAttempt,
      status: "completed",
      report: { overallScore: 72 },
      lease_token: null,
      lease_expires_at: null,
      completed_at: "2026-07-30T12:05:00Z",
    };
    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [completedAttempt],
        has_more: true,
      },
      error: null,
    });
    const client = {
      rpc,
    } as unknown as Parameters<typeof listMockInterviewAttempts>[0];

    await expect(
      listMockInterviewAttempts(client, {
        userId,
        limit: 10,
        roleProfileId: "tick-data-platform",
      }),
    ).resolves.toMatchObject({
      hasMore: true,
      nextCursor: {
        createdAt: "2026-07-30T12:00:00Z",
        attemptId,
      },
    });
    expect(rpc).toHaveBeenCalledWith(
      "list_mock_interview_attempts",
      {
        p_before_created_at: null,
        p_before_id: null,
        p_limit: 10,
        p_role_profile_id: "tick-data-platform",
        p_user_id: userId,
      },
    );
  });
});

describe("mock interview history RPC errors", () => {
  it("requires the dedicated history secret without falling back", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("MOCK_HISTORY_SUPABASE_SECRET_KEY", "");
    vi.stubEnv("CODE_RUNNER_SUPABASE_SECRET_KEY", "runner-secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "content-sync-secret");

    expect(() => createMockHistoryAdminClient()).toThrow(
      "dedicated Supabase secret key",
    );
  });

  it.each(["PGRST202", "42P01", "42703", "42883"])(
    "maps missing migration code %s without leaking details",
    (code) => {
      expect(mapMockHistoryRpcError({ code }).message).toContain(
        "migration is missing",
      );
    },
  );

  it("does not expose database error details", () => {
    expect(
      mapMockHistoryRpcError({
        code: "XX000",
        message: "sensitive database detail",
      }).message,
    ).toBe("Mock interview history request failed");
  });
});
