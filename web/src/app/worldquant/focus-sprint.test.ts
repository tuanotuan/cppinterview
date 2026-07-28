import { describe, expect, it, vi } from "vitest";

import type { QuestionLearningState } from "../../lib/practice/learning-state";
import { serializeFocusSession } from "../../lib/practice/focus-session";
import {
  buildWorldQuantFocusPlan,
  type WorldQuantFocusPlan,
} from "../../lib/worldquant/focus-plan";
import type { ReadinessQuestionSummary } from "../../lib/worldquant/readiness";

import {
  prepareFocusSprint,
  restoreMatchingFocusSession,
} from "./focus-sprint";

const today = "2026-07-26";
const sessionId = "fd174f4f-df63-4eb3-bca1-55aef40b2437";
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
    const result = prepareFocusSprint(plan(), {
      createSessionId: () => sessionId,
      now: () => "2026-07-26T02:00:00.000Z",
      writeSession,
    });

    expect(result.kind).toBe("practice");
    if (result.kind !== "practice") return;
    expect(result.href).toBe(
      `/?deck=cpp-interview&focus=${sessionId}`,
    );
    expect(writeSession).toHaveBeenCalledOnce();
    expect(JSON.parse(writeSession.mock.calls[0][1])).toMatchObject({
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
    const result = prepareFocusSprint(plan(), {
      createSessionId: () => sessionId,
      now: () => "2026-07-26T02:00:00.000Z",
      writeSession: () => {
        throw new Error("blocked");
      },
    });

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
    };
    const tickPlan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [tickQuestion],
      states: new Map([[tickQuestion.id, state]]),
      today,
      timeBudgetMinutes: 45,
      focusCompetency: "tick_market_data",
    });

    expect(prepareFocusSprint(tickPlan)).toEqual({
      kind: "guide",
      href: "/learn/tick-data-order-book",
    });
  });

  it("only restores an active current session for the selected role", () => {
    const launched = prepareFocusSprint(plan(), {
      createSessionId: () => sessionId,
      now: () => "2026-07-26T02:00:00.000Z",
      writeSession: () => undefined,
    });
    if (launched.kind !== "practice") {
      throw new Error("expected a practice session");
    }
    const raw = serializeFocusSession(launched.session);

    expect(
      restoreMatchingFocusSession({
        raw,
        profileId: "tick-data-platform",
        questions: [question],
        now: "2026-07-26T02:05:00.000Z",
      })?.sessionId,
    ).toBe(sessionId);
    expect(
      restoreMatchingFocusSession({
        raw,
        profileId: "low-latency-cpp",
        questions: [question],
      }),
    ).toBeNull();
    expect(
      restoreMatchingFocusSession({
        raw,
        profileId: "tick-data-platform",
        questions: [{ ...question, version: 3 }],
        now: "2026-07-26T02:05:00.000Z",
      }),
    ).toBeNull();
  });
});
