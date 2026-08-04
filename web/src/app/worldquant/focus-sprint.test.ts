import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuestionLearningState } from "../../lib/practice/learning-state";
import {
  completeFocusSessionQuestion,
  focusSessionStorageKey,
  serializeFocusSession,
} from "../../lib/practice/focus-session";
import {
  buildWorldQuantFocusPlan,
  type WorldQuantFocusPlan,
} from "../../lib/worldquant/focus-plan";
import type { ReadinessQuestionSummary } from "../../lib/worldquant/readiness";

import {
  prepareFocusSprint,
  prepareFocusSprintResume,
  restoreMatchingFocusSession,
} from "./focus-sprint";

const today = "2026-07-26";
const sessionId = "fd174f4f-df63-4eb3-bca1-55aef40b2437";
const accountA = "10000000-0000-4000-8000-000000000001";
const accountB = "10000000-0000-4000-8000-000000000002";
const sourceHash = "a".repeat(64);
const question: ReadinessQuestionSummary = {
  id: "cpp20-focus-card",
  version: 2,
  sourceHash,
  deckId: "cpp-interview",
  lessonId: "cpp20-focus",
  estimatedMinutes: 6,
  competency: "modern_cpp",
  validation: "repository_verified",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function plan(
  questions: readonly ReadinessQuestionSummary[] = [question],
  states: ReadonlyMap<string, QuestionLearningState> = new Map(),
): WorldQuantFocusPlan {
  return buildWorldQuantFocusPlan({
    profileId: "tick-data-platform",
    questions,
    states,
    today,
    timeBudgetMinutes: 45,
    focusCompetency: "modern_cpp",
  });
}

describe("Focus Sprint Hub launch", () => {
  it("persists the exact session before returning the Practice URL", () => {
    const writeSession = vi.fn();
    const result = prepareFocusSprint(
      plan(),
      { accountId: accountA },
      {
        createSessionId: () => sessionId,
        now: () => "2026-07-26T02:00:00.000Z",
        writeSession,
      },
    );

    expect(result.kind).toBe("practice");
    if (result.kind !== "practice") return;
    expect(result.href).toBe(
      `/practice?deck=cpp-interview&focus=${sessionId}`,
    );
    expect(writeSession).toHaveBeenCalledOnce();
    expect(writeSession.mock.calls[0][0]).toBe(
      `recall:focus-session:${accountA}:v2`,
    );
    expect(JSON.parse(writeSession.mock.calls[0][1])).toMatchObject({
      version: 2,
      accountScope: accountA,
      sessionId,
      remainingQuestions: [
        {
          id: question.id,
          version: question.version,
          sourceHash,
          deckId: "cpp-interview",
        },
      ],
    });
  });

  it("reports storage failure and does not produce a navigation target", () => {
    const result = prepareFocusSprint(
      plan(),
      { accountId: null },
      {
        createSessionId: () => sessionId,
        now: () => "2026-07-26T02:00:00.000Z",
        writeSession: () => {
          throw new Error("blocked");
        },
      },
    );

    expect(result).toEqual({
      kind: "storage_error",
      message:
        "Không lưu được Phiên ôn tập trọng tâm trong trình duyệt. Hệ thống chưa chuyển sang phần luyện tập; hãy cho phép lưu dữ liệu trên thiết bị rồi thử lại.",
    });
  });

  it("routes an empty approved queue to its real guide", () => {
    const tickQuestion = {
      ...question,
      id: "tick-card",
      lessonId: "tick-card",
      competency: "tick_market_data" as const,
    };
    const state: QuestionLearningState = {
      questionId: tickQuestion.id,
      questionVersion: tickQuestion.version,
      sourceHash: tickQuestion.sourceHash,
      state: "review" as const,
      dueOn: "2026-08-20",
      intervalDays: 25,
      reviewCount: 3,
      lapseCount: 0,
      lastRating: "good",
      leech: false,
      suspended: false,
      lastReviewedOn: "2026-07-20",
      contentChanged: false,
      historyResetOn: null,
      historyResetToken: null,
    };
    const tickPlan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [tickQuestion],
      states: new Map([[tickQuestion.id, state]]),
      today,
      timeBudgetMinutes: 45,
      focusCompetency: "tick_market_data",
    });

    expect(
      prepareFocusSprint(tickPlan, { accountId: null }),
    ).toEqual({
      kind: "guide",
      href: "/learn/tick-data-order-book",
    });
  });

  it("only restores an active current session for the selected role", () => {
    const launched = prepareFocusSprint(
      plan(),
      { accountId: accountA },
      {
        createSessionId: () => sessionId,
        now: () => "2026-07-26T02:00:00.000Z",
        writeSession: () => undefined,
      },
    );
    if (launched.kind !== "practice") {
      throw new Error("expected a practice session");
    }
    const raw = serializeFocusSession(launched.session);

    expect(
      restoreMatchingFocusSession({
        raw,
        accountId: accountA,
        profileId: "tick-data-platform",
        questions: [question],
        now: "2026-07-26T02:05:00.000Z",
      })?.sessionId,
    ).toBe(sessionId);
    expect(
      restoreMatchingFocusSession({
        raw,
        accountId: accountA,
        profileId: "low-latency-cpp",
        questions: [question],
      }),
    ).toBeNull();
    expect(
      restoreMatchingFocusSession({
        raw,
        accountId: accountA,
        profileId: "tick-data-platform",
        questions: [{ ...question, version: 3 }],
        now: "2026-07-26T02:05:00.000Z",
      }),
    ).toBeNull();
    expect(
      restoreMatchingFocusSession({
        raw,
        accountId: accountB,
        profileId: "tick-data-platform",
        questions: [question],
      }),
    ).toBeNull();
  });

  it("resumes the latest stored revision without rewriting a stale render", async () => {
    const secondQuestion = {
      ...question,
      id: "cpp20-second-focus-card",
    };
    const launched = prepareFocusSprint(
      plan([question, secondQuestion]),
      { accountId: accountA },
      {
        createSessionId: () => sessionId,
        now: () => "2026-07-26T02:00:00.000Z",
        writeSession: () => undefined,
      },
    );
    if (launched.kind !== "practice") {
      throw new Error("expected a practice session");
    }
    const progressed = completeFocusSessionQuestion(
      launched.session,
      question.id,
      "2026-07-26T02:05:00.000Z",
    );
    const storage = new MemoryStorage();
    const storageKey = focusSessionStorageKey(accountA);
    const latestRaw = serializeFocusSession(progressed);
    storage.setItem(storageKey, latestRaw);
    vi.stubGlobal("window", new BrowserWindow(storage));

    const result = await prepareFocusSprintResume(
      launched.session,
      { accountId: accountA },
    );

    expect(result).toMatchObject({
      kind: "practice",
      session: {
        completedQuestions: [{ id: question.id }],
        remainingQuestions: [{ id: secondQuestion.id }],
      },
    });
    expect(storage.getItem(storageKey)).toBe(latestRaw);
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
