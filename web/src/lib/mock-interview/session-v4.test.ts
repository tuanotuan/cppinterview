import { afterEach, describe, expect, it, vi } from "vitest";

import { WORLDQUANT_CURATED_CATALOG } from "./catalog";
import {
  advanceMockInterviewSessionV4,
  compareAndSetMockInterviewSessionSnapshotLocked,
  createMockInterviewSessionV4,
  mockInterviewSessionMatchesAccount,
  mockInterviewSessionMatchesGuidedRequest,
  mockInterviewStorageKey,
  mutateMockInterviewSessionSnapshotLocked,
  parseMockInterviewSessionV4,
  serializeMockInterviewSessionV4,
} from "./session-v4";
import { buildWorldQuantTargetedMockPlan } from "./target-plan";
import type { BrowserLockManager } from "../practice/browser-storage-lock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mock interview session v4", () => {
  const plan = buildWorldQuantTargetedMockPlan({
    profileId: "tick-data-platform",
    mode: "balanced",
    variant: 1,
    durationMinutes: 30,
    candidates: WORLDQUANT_CURATED_CATALOG.map((question) => ({
      readinessCompetency: question.readinessCompetency,
      question: {
        id: question.id,
        origin: question.origin,
        version: question.version,
        contentRevision: question.contentRevision,
        estimatedMinutes: question.estimatedMinutes,
        responseMode: question.responseMode,
        language: question.language,
        track: question.track,
        execution: question.execution,
        scenarioFamilies: [...question.scenarioFamilies],
      },
    })),
  });

  it("creates an account-scoped exact-plan session", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(mockInterviewStorageKey(accountId)).toContain(accountId);
    expect(session.questions).toEqual(
      plan.questions.map((candidate) => ({
        ...candidate.question,
        readinessCompetency: candidate.readinessCompetency,
      })),
    );
    expect(
      parseMockInterviewSessionV4(
        serializeMockInterviewSessionV4(session),
      ),
    ).toEqual(session);
  });

  it("matches a persisted session only to its owning account", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(
      mockInterviewSessionMatchesAccount(session, accountId),
    ).toBe(true);
    expect(
      mockInterviewSessionMatchesAccount(
        session,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).toBe(false);
  });

  it("allows only one writer from the same base revision", async () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const questionId = session.questions[0].id;
    const firstReplacement = {
      ...session,
      answers: {
        ...session.answers,
        [questionId]: { response: "first", explanation: "" },
      },
    };
    const staleReplacement = {
      ...session,
      answers: {
        ...session.answers,
        [questionId]: { response: "stale", explanation: "" },
      },
    };
    const storage = new MemoryStorage();
    storage.setItem(
      mockInterviewStorageKey(accountId),
      serializeMockInterviewSessionV4(session),
    );
    vi.stubGlobal("window", new BrowserWindow(storage));
    const lockNames: string[] = [];
    let queue = Promise.resolve();
    const lockManager: BrowserLockManager = {
      request: (name, _options, callback) => {
        lockNames.push(name);
        const result = queue.then(callback);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    };

    const [first, stale] = await Promise.all([
      compareAndSetMockInterviewSessionSnapshotLocked(
        accountId,
        session,
        firstReplacement,
        lockManager,
      ),
      compareAndSetMockInterviewSessionSnapshotLocked(
        accountId,
        session,
        staleReplacement,
        lockManager,
      ),
    ]);

    expect(first.applied).toBe(true);
    expect(stale.applied).toBe(false);
    expect(
      parseMockInterviewSessionV4(
        storage.getItem(mockInterviewStorageKey(accountId)),
      ),
    ).toMatchObject({
      sessionRevision: session.sessionRevision + 1,
      answers: {
        [questionId]: { response: "first", explanation: "" },
      },
    });
    expect(lockNames).toEqual([
      `recall:storage:${mockInterviewStorageKey(accountId)}`,
      `recall:storage:${mockInterviewStorageKey(accountId)}`,
    ]);
  });

  it("replaces an exact stale session with a fresh revision-one session", async () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const staleSession = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const freshSession = createMockInterviewSessionV4({
      sessionId: "33333333-3333-4333-8333-333333333333",
      accountId,
      sourceRevision: "b".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T01:00:00.000Z"),
    });
    const storage = new MemoryStorage();
    storage.setItem(
      mockInterviewStorageKey(accountId),
      serializeMockInterviewSessionV4(staleSession),
    );
    vi.stubGlobal("window", new BrowserWindow(storage));

    const result =
      await compareAndSetMockInterviewSessionSnapshotLocked(
        accountId,
        staleSession,
        freshSession,
        null,
      );

    expect(result).toEqual({ applied: true, session: freshSession });
    expect(
      parseMockInterviewSessionV4(
        storage.getItem(mockInterviewStorageKey(accountId)),
      ),
    ).toEqual(freshSession);
  });

  it("rebases two rapid answer intents without losing the later input", async () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const questionId = session.questions[0].id;
    const storage = new MemoryStorage();
    storage.setItem(
      mockInterviewStorageKey(accountId),
      serializeMockInterviewSessionV4(session),
    );
    vi.stubGlobal("window", new BrowserWindow(storage));
    let queue = Promise.resolve();
    const lockManager: BrowserLockManager = {
      request: (_name, _options, callback) => {
        const result = queue.then(callback);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    };
    const answerIntent = (response: string) =>
      mutateMockInterviewSessionSnapshotLocked(
        accountId,
        session,
        (current) => ({
          answers: {
            ...current.answers,
            [questionId]: {
              response,
              explanation:
                current.answers[questionId]?.explanation ?? "",
            },
          },
        }),
        lockManager,
      );

    const [first, second] = await Promise.all([
      answerIntent("a"),
      answerIntent("ab"),
    ]);

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(true);
    expect(
      parseMockInterviewSessionV4(
        storage.getItem(mockInterviewStorageKey(accountId)),
      ),
    ).toMatchObject({
      sessionRevision: session.sessionRevision + 2,
      answers: {
        [questionId]: { response: "ab", explanation: "" },
      },
    });
  });

  it("rejects a replacement owned by another account", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const otherSession = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "33333333-3333-4333-8333-333333333333",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(() =>
      compareAndSetMockInterviewSessionSnapshotLocked(
        accountId,
        null,
        otherSession,
        null,
      ),
    ).toThrow(
      "Replacement mock session account does not match its storage key",
    );
  });

  it("does not expose a different account's session as the current revision", async () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const expected = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const otherSession = createMockInterviewSessionV4({
      sessionId: "33333333-3333-4333-8333-333333333333",
      accountId: "44444444-4444-4444-8444-444444444444",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const storage = new MemoryStorage();
    storage.setItem(
      mockInterviewStorageKey(accountId),
      serializeMockInterviewSessionV4(otherSession),
    );
    vi.stubGlobal("window", new BrowserWindow(storage));

    const result =
      await compareAndSetMockInterviewSessionSnapshotLocked(
        accountId,
        expected,
        { ...expected, currentIndex: 1 },
        null,
      );

    expect(result).toEqual({ applied: false, session: null });
    expect(
      parseMockInterviewSessionV4(
        storage.getItem(mockInterviewStorageKey(accountId)),
      ),
    ).toEqual(otherSession);
  });

  it("increments the optimistic session revision", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const next = advanceMockInterviewSessionV4(session, {
      currentIndex: 1,
    });

    expect(next.sessionRevision).toBe(session.sessionRevision + 1);
    expect(next.currentIndex).toBe(1);
  });

  it("rejects state for a question outside the immutable plan", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(
      parseMockInterviewSessionV4(
        JSON.stringify({
          ...session,
          answers: {
            ...session.answers,
            "worldquant-not-in-plan": {
              response: "tampered",
              explanation: "",
            },
          },
        }),
      ),
    ).toBeNull();
  });

  it("persists one exact frozen submission while a report is retryable", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const idempotencyKey =
      "33333333-3333-4333-8333-333333333333";
    const pendingReportRequest = {
      schemaVersion: 4 as const,
      idempotencyKey,
      sessionId: session.sessionId,
      profileId: session.profileId,
      profileVersion: session.profileVersion,
      sourceRevision: session.sourceRevision,
      startedAt: session.startedAt,
      submittedAt: "2026-07-30T00:30:00.000Z",
      plan: session.plan,
      elapsedSeconds: 1800,
      items: session.plan.questions.map((candidate) => ({
        question: candidate,
        response: "Frozen answer",
        explanation: "",
        elapsedSeconds: 60,
      })),
    };
    const evaluating = {
      ...session,
      status: "evaluating" as const,
      reportIdempotencyKey: idempotencyKey,
      pendingReportRequest,
    };

    expect(
      parseMockInterviewSessionV4(
        serializeMockInterviewSessionV4(evaluating),
      )?.pendingReportRequest,
    ).toEqual(pendingReportRequest);
    expect(
      parseMockInterviewSessionV4(
        JSON.stringify({
          ...evaluating,
          pendingReportRequest: undefined,
        }),
      ),
    ).toBeNull();
  });

  it("only returns a completed guided mock to the Mission for today", () => {
    const request = {
      profileId: "tick-data-platform" as const,
      durationMinutes: 30 as const,
      mode: "balanced" as const,
      targetCompetency: null,
      today: "2026-07-28",
    };
    const completedSession = {
      profileId: request.profileId,
      status: "completed" as const,
      completedAt: "2026-07-27T17:00:00.000Z",
      plan: {
        durationMinutes: request.durationMinutes,
        mode: request.mode,
        targetCompetency: request.targetCompetency,
      },
    };

    expect(
      mockInterviewSessionMatchesGuidedRequest({
        session: completedSession,
        request,
      }),
    ).toBe(true);
    expect(
      mockInterviewSessionMatchesGuidedRequest({
        session: {
          ...completedSession,
          completedAt: "2026-07-27T16:59:59.000Z",
        },
        request,
      }),
    ).toBe(false);
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class BrowserWindow extends EventTarget {
  constructor(readonly localStorage: Storage) {
    super();
  }
}
