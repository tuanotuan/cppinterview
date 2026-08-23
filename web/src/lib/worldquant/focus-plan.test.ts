import { describe, expect, it } from "vitest";

import type { PracticeDeckId } from "@/lib/content/schema";
import type { EvidenceProjection } from "@/lib/evidence/engine";
import type { QuestionLearningState } from "@/lib/practice/learning-state";

import {
  buildWorldQuantFocusPlan,
  focusPlanSchema,
  MAX_FOCUS_QUESTION_STEPS,
} from "./focus-plan";
import type {
  ReadinessQuestionSummary,
  WorldQuantCompetencyKey,
} from "./readiness";

const TODAY = "2026-07-26";

describe("WorldQuant Focus Sprint planner", () => {
  it("builds a versioned JSON-safe plan with exact immutable question refs", () => {
    const bankQuestion = question({
      id: "modern-cpp-ref",
      version: 3,
      sourceHash: "b".repeat(64),
      deckId: "cpp-interview",
      estimatedMinutes: 7,
    });

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [bankQuestion],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "modern_cpp",
    });
    const roundTrip = JSON.parse(JSON.stringify(plan));

    expect(focusPlanSchema.parse(roundTrip)).toEqual(plan);
    expect(plan).toMatchObject({
      version: 1,
      profileId: "tick-data-platform",
      profileVersion: 2,
      createdOn: TODAY,
      focusCompetency: "modern_cpp",
      requestedMinutes: 15,
      budgetCeilingMinutes: 16,
      scheduledMinutes: 7,
    });
    expect(plan.questions).toEqual([
      {
        question: {
          id: "modern-cpp-ref",
          version: 3,
          sourceHash: "b".repeat(64),
          deckId: "cpp-interview",
          estimatedMinutes: 7,
        },
        competency: "modern_cpp",
        queueReason: "new",
        evidence: 0,
      },
    ]);
  });

  it("filters out zero-weight competencies for the selected role", () => {
    const modern = question({ id: "modern", competency: "modern_cpp" });
    const tick = question({
      id: "tick",
      competency: "tick_market_data",
    });

    const plan = buildWorldQuantFocusPlan({
      profileId: "cpp-data-platform",
      questions: [tick, modern],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 30,
    });

    expect(plan.questions.map((step) => step.question.id)).toEqual([
      "modern",
    ]);
    expect(
      plan.fallbacks.some(
        (fallback) => fallback.competency === "tick_market_data",
      ),
    ).toBe(false);
  });

  it("limits an explicit gap sprint to the requested competency", () => {
    const questions = [
      question({ id: "modern", competency: "modern_cpp" }),
      question({
        id: "performance",
        competency: "performance_latency",
      }),
    ];

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions,
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 30,
      focusCompetency: "performance_latency",
    });

    expect(plan.questions.map((step) => step.question.id)).toEqual([
      "performance",
    ]);
    expect(
      plan.fallbacks.every(
        (fallback) => fallback.competency === "performance_latency",
      ),
    ).toBe(true);
  });

  it("orders urgent work before ordinary learning and new cards", () => {
    const questions = [
      question({ id: "due-relearning", estimatedMinutes: 1 }),
      question({ id: "due-leech", estimatedMinutes: 1 }),
      question({ id: "due-review", estimatedMinutes: 1 }),
      question({ id: "relearning", estimatedMinutes: 1 }),
      question({ id: "leech", estimatedMinutes: 1 }),
      question({ id: "learning", estimatedMinutes: 1 }),
      question({ id: "new", estimatedMinutes: 1 }),
    ];
    const states = new Map<string, QuestionLearningState>([
      [
        "due-relearning",
        state({
          questionId: "due-relearning",
          state: "relearning",
          dueOn: TODAY,
        }),
      ],
      [
        "due-leech",
        state({
          questionId: "due-leech",
          state: "review",
          dueOn: "2026-07-25",
          leech: true,
        }),
      ],
      [
        "due-review",
        state({
          questionId: "due-review",
          state: "review",
          dueOn: "2026-07-24",
        }),
      ],
      [
        "relearning",
        state({
          questionId: "relearning",
          state: "relearning",
          dueOn: "2026-07-27",
        }),
      ],
      [
        "leech",
        state({
          questionId: "leech",
          state: "review",
          dueOn: "2026-07-27",
          leech: true,
        }),
      ],
      [
        "learning",
        state({
          questionId: "learning",
          state: "learning",
          dueOn: "2026-07-27",
        }),
      ],
      ["new", state({ questionId: "new", state: "new", dueOn: null })],
    ]);

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions,
      states,
      today: TODAY,
      timeBudgetMinutes: 30,
      focusCompetency: "modern_cpp",
    });

    expect(plan.questions.map((step) => step.queueReason)).toEqual([
      "due_relearning",
      "due_leech",
      "due",
      "relearning",
      "leech",
      "learning",
      "new",
    ]);
  });

  it("skips suspended, reviewed-today, and healthy future review cards", () => {
    const questions = [
      question({ id: "suspended" }),
      question({ id: "reviewed-today" }),
      question({ id: "future-review" }),
      question({ id: "available-new" }),
    ];
    const states = new Map<string, QuestionLearningState>([
      [
        "suspended",
        state({
          questionId: "suspended",
          state: "learning",
          suspended: true,
        }),
      ],
      [
        "reviewed-today",
        state({
          questionId: "reviewed-today",
          state: "review",
          dueOn: TODAY,
          lastReviewedOn: TODAY,
        }),
      ],
      [
        "future-review",
        state({
          questionId: "future-review",
          state: "review",
          dueOn: "2026-08-01",
        }),
      ],
      [
        "available-new",
        state({
          questionId: "available-new",
          state: "new",
          dueOn: null,
        }),
      ],
    ]);

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions,
      states,
      today: TODAY,
      timeBudgetMinutes: 30,
      focusCompetency: "modern_cpp",
    });

    expect(plan.questions.map((step) => step.question.id)).toEqual([
      "available-new",
    ]);
  });

  it("promotes the exact question recommended by durable evidence", () => {
    const repairQuestion = question({ id: "repair-this" });
    const healthyQuestion = question({ id: "leave-healthy" });
    const futureReview = (questionId: string) =>
      state({
        questionId,
        state: "review",
        intervalDays: 30,
        dueOn: "2026-09-01",
      });

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [healthyQuestion, repairQuestion],
      states: new Map([
        [repairQuestion.id, futureReview(repairQuestion.id)],
        [healthyQuestion.id, futureReview(healthyQuestion.id)],
      ]),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "modern_cpp",
      attemptEvidence: evidenceProjection({
        nextAction: "repair",
        recommendedQuestionIds: [repairQuestion.id],
      }),
    });

    expect(plan.questions).toEqual([
      expect.objectContaining({
        question: expect.objectContaining({ id: repairQuestion.id }),
        queueReason: "evidence_repair",
      }),
    ]);
  });

  it("never exceeds 110% of the time budget or twenty question steps", () => {
    const manyQuestions = Array.from({ length: 30 }, (_, index) =>
      question({
        id: `question-${String(index).padStart(2, "0")}`,
        estimatedMinutes: 1,
      }),
    );
    const capped = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: manyQuestions,
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 100,
      focusCompetency: "modern_cpp",
    });

    expect(capped.questions).toHaveLength(MAX_FOCUS_QUESTION_STEPS);
    expect(capped.scheduledMinutes).toBe(20);

    const packed = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [
        question({ id: "a-eight", estimatedMinutes: 8 }),
        question({ id: "b-four", estimatedMinutes: 4 }),
        question({ id: "c-three", estimatedMinutes: 3 }),
      ],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 10,
      focusCompetency: "modern_cpp",
    });

    expect(packed.budgetCeilingMinutes).toBe(11);
    expect(packed.scheduledMinutes).toBe(11);
    expect(packed.questions.map((step) => step.question.id)).toEqual([
      "a-eight",
      "c-three",
    ]);
    expect(packed.scheduledMinutes).toBeLessThanOrEqual(
      packed.requestedMinutes * 1.1,
    );
  });

  it("adds an honest guide fallback for content and mixed gaps", () => {
    const tick = question({
      id: "tick-card",
      competency: "tick_market_data",
    });
    const contentPlan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [tick],
      states: new Map([
        [
          tick.id,
          state({
            questionId: tick.id,
            state: "review",
            intervalDays: 30,
            dueOn: "2026-08-01",
          }),
        ],
      ]),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "tick_market_data",
    });

    expect(contentPlan.questions).toEqual([]);
    expect(contentPlan.fallbacks).toEqual([
      {
        kind: "guide",
        competency: "tick_market_data",
        gapKind: "content",
        href: "/learn/tick-data-order-book",
        label: "Học dữ liệu tick",
      },
    ]);

    const mixedPlan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [tick],
      states: new Map([
        [
          tick.id,
          state({ questionId: tick.id, state: "new", dueOn: null }),
        ],
      ]),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "tick_market_data",
    });

    expect(mixedPlan.questions).toHaveLength(1);
    expect(mixedPlan.fallbacks[0]).toMatchObject({
      kind: "guide",
      gapKind: "mixed",
    });
  });

  it("marks uncovered competencies without a guide as a content gap", () => {
    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "ownership_communication",
    });

    expect(plan.questions).toEqual([]);
    expect(plan.fallbacks).toEqual([
      {
        kind: "content_gap",
        competency: "ownership_communication",
        gapKind: "content",
        href: null,
        label:
          "Kho câu hỏi chưa đủ học liệu cho Làm chủ công việc",
      },
    ]);
  });

  it("does not claim a content fallback when coverage is complete", () => {
    const questions = Array.from({ length: 6 }, (_, index) =>
      question({
        id: `modern-${index}`,
        lessonId: `modern-lesson-${Math.floor(index / 2)}`,
      }),
    );
    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions,
      states: new Map(
        questions.map((item) => [
          item.id,
          state({ questionId: item.id, state: "new", dueOn: null }),
        ]),
      ),
      today: TODAY,
      timeBudgetMinutes: 30,
      focusCompetency: "modern_cpp",
    });

    expect(plan.fallbacks).toEqual([]);
  });

  it("is deterministic across question and state insertion order", () => {
    const questions = [
      question({ id: "z-card", competency: "tick_market_data" }),
      question({ id: "a-card", competency: "modern_cpp" }),
      question({ id: "m-card", competency: "modern_cpp" }),
    ];
    const stateEntries = questions.map(
      (item) =>
        [
          item.id,
          state({ questionId: item.id, state: "new", dueOn: null }),
        ] as const,
    );
    const input = {
      profileId: "tick-data-platform" as const,
      today: TODAY,
      timeBudgetMinutes: 30,
    };

    const first = buildWorldQuantFocusPlan({
      ...input,
      questions,
      states: new Map(stateEntries),
    });
    const reversed = buildWorldQuantFocusPlan({
      ...input,
      questions: [...questions].reverse(),
      states: new Map([...stateEntries].reverse()),
    });

    expect(reversed).toEqual(first);
    expect(first.questions.map((step) => step.question.id)).toEqual([
      "a-card",
      "m-card",
      "z-card",
    ]);
  });

  it("never promotes mock-session question IDs into the bank queue", () => {
    const bankQuestion = question({ id: "bank-question" });
    const mockState = state({
      questionId: "mock-round-question",
      state: "relearning",
      dueOn: TODAY,
    });

    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [bankQuestion],
      states: new Map([
        ["mock-round-question", mockState],
        ["bank-question", mockState],
      ]),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "modern_cpp",
    });

    expect(plan.questions).toHaveLength(1);
    expect(plan.questions[0]).toMatchObject({
      question: { id: "bank-question" },
      queueReason: "new",
    });
    expect(
      plan.questions.some(
        (step) => step.question.id === "mock-round-question",
      ),
    ).toBe(false);
  });

  it("rejects tampered totals and duplicate question refs at parse time", () => {
    const questionItem = question({ id: "stable-card" });
    const plan = buildWorldQuantFocusPlan({
      profileId: "tick-data-platform",
      questions: [questionItem],
      states: new Map(),
      today: TODAY,
      timeBudgetMinutes: 15,
      focusCompetency: "modern_cpp",
    });

    expect(
      focusPlanSchema.safeParse({
        ...plan,
        scheduledMinutes: plan.scheduledMinutes + 1,
      }).success,
    ).toBe(false);
    expect(
      focusPlanSchema.safeParse({
        ...plan,
        questions: [...plan.questions, ...plan.questions],
        scheduledMinutes: plan.scheduledMinutes * 2,
      }).success,
    ).toBe(false);
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

function state(
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
    historyResetToken: null,
    ...overrides,
  };
}

function evidenceProjection({
  nextAction,
  recommendedQuestionIds,
}: {
  nextAction: "repair" | "refresh";
  recommendedQuestionIds: string[];
}): EvidenceProjection {
  return {
    version: 1,
    asOf: "2026-07-26T00:00:00.000Z",
    competencies: [
      {
        key: "modern_cpp",
        status: nextAction === "repair" ? "learning" : "stale",
        content: "available",
        gapKind: "learner",
        nextAction,
        score: 60,
        assessmentCount: 1,
        successfulAttemptCount: 0,
        latestEvidenceAt: "2026-07-25T00:00:00.000Z",
        supportingArtifactIds: [],
        contradictingArtifactIds: ["coach:1:repair-this"],
        recommendedQuestionIds,
      },
    ],
  };
}
