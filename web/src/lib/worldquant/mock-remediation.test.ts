import { describe, expect, it } from "vitest";

import type { PracticeDeckId } from "@/lib/content/schema";
import type { QuestionLearningState } from "@/lib/practice/learning-state";

import { buildWorldQuantMockDebrief } from "./mock-debrief";
import { buildWorldQuantMockRemediation } from "./mock-remediation";
import type {
  ReadinessQuestionSummary,
  WorldQuantCompetencyKey,
} from "./readiness";

const TODAY = "2026-07-26";

describe("WorldQuant mock remediation", () => {
  it("turns ranked competency gaps into exact approved-bank focus plans", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "targeted",
        questionMappings: [
          { questionId: "mock-tick-question", competency: "tick_market_data" },
          {
            questionId: "mock-performance-question",
            competency: "performance_latency",
          },
        ],
      },
      scores: [
        { questionId: "mock-tick-question", score: 40 },
        { questionId: "mock-performance-question", score: 60 },
      ],
    });
    const result = buildWorldQuantMockRemediation({
      debrief,
      approvedQuestions: [
        question({
          id: "approved-tick-card",
          version: 3,
          sourceHash: "b".repeat(64),
          competency: "tick_market_data",
        }),
        question({
          id: "approved-performance-card",
          competency: "performance_latency",
        }),
      ],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
    });

    expect(result).toMatchObject({
      version: 1,
      debriefVersion: 1,
      profileId: "tick-data-platform",
    });
    expect(result.recommendations.map((item) => item.competency)).toEqual([
      "tick_market_data",
      "performance_latency",
    ]);
    expect(result.bestEligible).toMatchObject({
      competency: "tick_market_data",
      availability: "focus_sprint",
      plan: {
        focusCompetency: "tick_market_data",
        questions: [
          {
            question: {
              id: "approved-tick-card",
              version: 3,
              sourceHash: "b".repeat(64),
            },
          },
        ],
      },
    });
    const everyPracticeId = result.recommendations.flatMap(
      (recommendation) =>
        recommendation.plan.questions.map((step) => step.question.id),
    );
    expect(everyPracticeId).not.toContain("mock-tick-question");
    expect(everyPracticeId).not.toContain("mock-performance-question");
  });

  it("returns honest guide and content-gap remediation", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "targeted",
        questionMappings: [
          { questionId: "mock-tick", competency: "tick_market_data" },
          {
            questionId: "mock-ownership",
            competency: "ownership_communication",
          },
        ],
      },
      scores: [
        { questionId: "mock-tick", score: 20 },
        { questionId: "mock-ownership", score: 20 },
      ],
    });
    const result = buildWorldQuantMockRemediation({
      debrief,
      approvedQuestions: [],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
    });

    expect(
      result.recommendations.map((item) => ({
        competency: item.competency,
        availability: item.availability,
        fallback: item.plan.fallbacks[0],
      })),
    ).toEqual([
      {
        competency: "tick_market_data",
        availability: "guide",
        fallback: {
          kind: "guide",
          competency: "tick_market_data",
          gapKind: "content",
          href: "/learn/tick-data-order-book",
          label: "Học dữ liệu tick",
        },
      },
      {
        competency: "ownership_communication",
        availability: "content_gap",
        fallback: {
          kind: "content_gap",
          competency: "ownership_communication",
          gapKind: "content",
          href: null,
          label:
            "Kho câu hỏi chưa đủ học liệu cho Làm chủ công việc",
        },
      },
    ]);
    expect(result.bestEligible?.availability).toBe("guide");
  });

  it("skips an unavailable top gap when choosing the best eligible action", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "balanced",
        questionMappings: [
          { questionId: "mock-modern", competency: "modern_cpp" },
          { questionId: "mock-tick", competency: "tick_market_data" },
        ],
      },
      scores: [
        { questionId: "mock-modern", score: 0 },
        { questionId: "mock-tick", score: 60 },
      ],
    });
    const matureModern = Array.from({ length: 6 }, (_, index) =>
      question({
        id: `modern-${index}`,
        lessonId: `modern-lesson-${Math.floor(index / 2)}`,
      }),
    );
    const tick = question({
      id: "tick-bank-card",
      competency: "tick_market_data",
    });
    const states = new Map<string, QuestionLearningState>([
      ...matureModern.map(
        (item) =>
          [
            item.id,
            learningState({
              questionId: item.id,
              state: "review",
              intervalDays: 30,
              dueOn: "2026-08-10",
            }),
          ] as const,
      ),
    ]);

    const result = buildWorldQuantMockRemediation({
      debrief,
      approvedQuestions: [...matureModern, tick],
      states,
      today: TODAY,
      timeBudgetMinutes: 15,
    });

    expect(result.recommendations[0]).toMatchObject({
      competency: "modern_cpp",
      availability: "unavailable",
      plan: { questions: [], fallbacks: [] },
    });
    expect(result.bestEligible).toMatchObject({
      competency: "tick_market_data",
      availability: "focus_sprint",
    });
  });

  it("returns no remediation when the mock has no positive scored gap", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "targeted",
        questionMappings: [
          { questionId: "perfect", competency: "modern_cpp" },
        ],
      },
      scores: [{ questionId: "perfect", score: 100 }],
    });
    const result = buildWorldQuantMockRemediation({
      debrief,
      approvedQuestions: [question({ id: "bank-modern" })],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
    });

    expect(result.recommendations).toEqual([]);
    expect(result.bestEligible).toBeNull();
  });
});

function question({
  id,
  version = 1,
  sourceHash = "a".repeat(64),
  deckId = "cpp-interview",
  lessonId = `${id}-lesson`,
  estimatedMinutes = 5,
  competency = "modern_cpp",
}: {
  id: string;
  version?: number;
  sourceHash?: string;
  deckId?: PracticeDeckId;
  lessonId?: string;
  estimatedMinutes?: number;
  competency?: WorldQuantCompetencyKey;
}): ReadinessQuestionSummary {
  return {
    id,
    version,
    sourceHash,
    deckId,
    lessonId,
    estimatedMinutes,
    competency,
    validation: "repository_verified",
  };
}

function learningState(
  overrides: Partial<QuestionLearningState> = {},
): QuestionLearningState {
  return {
    questionId: "question",
    questionVersion: 1,
    sourceHash: "a".repeat(64),
    state: "review",
    dueOn: "2026-08-01",
    intervalDays: 3,
    reviewCount: 1,
    lapseCount: 0,
    lastRating: "good",
    lastReviewedOn: "2026-07-20",
    suspended: false,
    leech: false,
    contentChanged: false,
    historyResetOn: null,
    ...overrides,
  };
}
