import { describe, expect, it } from "vitest";

import {
  newQuestionLearningState,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";

import { worldQuantDrillPacks } from "./drills";
import {
  buildWorldQuantMission,
  selectMissionDrill,
  worldQuantAttemptMatchesDrill,
  worldQuantMissionId,
} from "./mission";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
  type WorldQuantTrainingState,
} from "./training-state";
import type { ReadinessQuestionSummary } from "./readiness";

const question: ReadinessQuestionSummary = {
  id: "approved-lifetime-card",
  version: 1,
  sourceHash: "a".repeat(64),
  deckId: "cpp-interview",
  lessonId: "cpp-lifetime",
  estimatedMinutes: 4,
  competency: "modern_cpp",
  validation: "repository_verified",
};

const state: QuestionLearningState = newQuestionLearningState({
  questionId: question.id,
  questionVersion: 1,
  sourceHash: question.sourceHash,
});

describe("Today's WorldQuant Mission", () => {
  it("matches drill completion against the exact drill revision", () => {
    const drill = worldQuantDrillPacks[0].practice;
    expect(
      worldQuantAttemptMatchesDrill(
        { drillId: drill.id, drillVersion: drill.version },
        drill,
      ),
    ).toBe(true);
    expect(
      worldQuantAttemptMatchesDrill(
        { drillId: drill.id, drillVersion: drill.version + 1 },
        drill,
      ),
    ).toBe(false);
  });

  it("is deterministic and combines approved retrieval with a transfer drill", () => {
    const input = {
      roleProfileId: "tick-data-platform" as const,
      questions: [question],
      states: new Map([[question.id, state]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 45,
      daysSinceComparableMock: 2,
    };
    const first = buildWorldQuantMission(input);
    const second = buildWorldQuantMission(input);

    expect(first).toEqual(second);
    expect(first.items.map((item) => item.kind)).toEqual([
      "flashcards",
      "drill",
    ]);
    expect(first.primaryCompetency).toBe("modern_cpp");
  });

  it("calls missing approved cards a content gap while retaining a real guide link", () => {
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [],
      states: new Map(),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 30,
    });
    const contentGap = mission.items.find(
      (item) => item.kind === "content_gap",
    );
    expect(contentGap?.reason).toContain("phần học liệu còn thiếu");
    expect(contentGap).toHaveProperty("href");
  });

  it("does not call approved mature content a content gap when no card is due", () => {
    const matureState: QuestionLearningState = {
      ...state,
      state: "review",
      dueOn: "2026-08-28",
      intervalDays: 30,
      reviewCount: 3,
      lastRating: "good",
      lastReviewedOn: "2026-07-27",
    };
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, matureState]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 30,
    });

    expect(mission.items.some((item) => item.kind === "flashcards")).toBe(
      false,
    );
    expect(mission.items.some((item) => item.kind === "content_gap")).toBe(
      false,
    );
  });

  it("keeps a canonical content gap visible beside a due personal remediation card", () => {
    const remediationQuestion: ReadinessQuestionSummary = {
      ...question,
      id: "personal-remediation-card",
      validation: "personal_remediation",
    };
    const remediationState = newQuestionLearningState({
      questionId: remediationQuestion.id,
      questionVersion: remediationQuestion.version,
      sourceHash: remediationQuestion.sourceHash,
    });
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [remediationQuestion],
      states: new Map([[remediationQuestion.id, remediationState]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 30,
    });

    expect(mission.items.some((item) => item.kind === "flashcards")).toBe(
      true,
    );
    expect(mission.items.some((item) => item.kind === "content_gap")).toBe(
      true,
    );
  });

  it("keeps a canonical content gap visible for mature personal remediation only", () => {
    const remediationQuestion: ReadinessQuestionSummary = {
      ...question,
      id: "mature-personal-remediation-card",
      validation: "personal_remediation",
    };
    const remediationState: QuestionLearningState = {
      ...state,
      questionId: remediationQuestion.id,
      state: "review",
      dueOn: "2026-08-28",
      intervalDays: 30,
      reviewCount: 3,
      lastRating: "good",
      lastReviewedOn: "2026-07-27",
    };
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [remediationQuestion],
      states: new Map([[remediationQuestion.id, remediationState]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 30,
    });

    expect(mission.items.some((item) => item.kind === "flashcards")).toBe(
      false,
    );
    expect(mission.items.some((item) => item.kind === "content_gap")).toBe(
      true,
    );
  });

  it("binds the primary competency into the mission identity", () => {
    const base = {
      date: "2026-07-28",
      roleProfileId: "tick-data-platform" as const,
      timeBudgetMinutes: 30,
      items: [],
    };

    expect(
      worldQuantMissionId({
        ...base,
        primaryCompetency: "modern_cpp",
      }),
    ).not.toBe(
      worldQuantMissionId({
        ...base,
        primaryCompetency: "tick_market_data",
      }),
    );
  });

  it("prioritizes due repair evidence before cards", () => {
    const trainingState: WorldQuantTrainingState = {
      ...EMPTY_WORLDQUANT_TRAINING_STATE,
      repairCards: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          sourceAttemptId:
            "30000000-0000-4000-8000-000000000002",
          competency: "modern_cpp",
          conceptId: "cpp-lifetime-ownership",
          prompt: "Explain the missing ownership invariant with a new example.",
          explanation: "The previous drill missed this rubric atom.",
          createdAt: "2026-07-26T00:00:00.000Z",
          dueOn: "2026-07-27",
          resolvedAt: null,
        },
      ],
    };
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, state]]),
      trainingState,
      today: "2026-07-28",
      timeBudgetMinutes: 30,
    });
    expect(mission.items[0].kind).toBe("repair");
  });

  it("never schedules more work than the selected mission budget", () => {
    for (const timeBudgetMinutes of [15, 30, 45, 60, 120]) {
      const mission = buildWorldQuantMission({
        roleProfileId: "tick-data-platform",
        questions: [question],
        states: new Map([[question.id, state]]),
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
        today: "2026-07-28",
        timeBudgetMinutes,
        daysSinceComparableMock: 2,
      });
      expect(mission.plannedMinutes).toBeLessThanOrEqual(
        timeBudgetMinutes,
      );
      expect(
        mission.items.reduce(
          (total, item) => total + item.estimatedMinutes,
          0,
        ),
      ).toBe(mission.plannedMinutes);
    }
  });

  it("selects a fresh alternate checkpoint after the first exact revision was attempted", () => {
    const drillPack = worldQuantDrillPacks.find(
      (item) => item.competency === "modern_cpp",
    )!;
    const base: WorldQuantTrainingState = {
      ...EMPTY_WORLDQUANT_TRAINING_STATE,
      gaps: [
        {
          roleProfileId: "tick-data-platform",
          roleProfileVersion: 1,
          competency: "modern_cpp",
          status: "transfer_ready",
          openedAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          sourceKind: "drill",
          sourceId: "practice",
          sourceScore: 90,
          practiceAttemptId:
            "30000000-0000-4000-8000-000000000003",
          verificationAttemptId: null,
        },
      ],
    };
    expect(
      selectMissionDrill({
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        trainingState: base,
        today: "2026-07-28",
      })?.id,
    ).toBe(drillPack.checkpoint.id);

    const repeated: WorldQuantTrainingState = {
      ...base,
      attempts: [
        {
          attemptId:
            "30000000-0000-4000-8000-000000000004",
          drillId: drillPack.checkpoint.id,
          drillVersion: drillPack.checkpoint.version,
          variant: "checkpoint",
          competency: "modern_cpp",
          conceptIds: [...drillPack.checkpoint.conceptIds],
          startedAt: "2026-07-28T00:00:00.000Z",
          completedAt: "2026-07-28T00:10:00.000Z",
          rubricPassed: 2,
          rubricTotal: 4,
          followUpsCompleted: 2,
          confidencePercent: 80,
          hintUsed: false,
          answerPresent: true,
        },
      ],
    };
    expect(
      selectMissionDrill({
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        trainingState: repeated,
        today: "2026-07-28",
      })?.id,
    ).toBe(drillPack.checkpointRetry.id);
  });

  it("does not schedule or budget a practice drill already completed today", () => {
    const drillPack = worldQuantDrillPacks.find(
      (item) => item.competency === "modern_cpp",
    )!;
    const trainingState: WorldQuantTrainingState = {
      ...EMPTY_WORLDQUANT_TRAINING_STATE,
      attempts: [
        {
          attemptId:
            "30000000-0000-4000-8000-000000000005",
          drillId: drillPack.practice.id,
          drillVersion: drillPack.practice.version,
          variant: drillPack.practice.variant,
          competency: drillPack.practice.competency,
          conceptIds: [...drillPack.practice.conceptIds],
          startedAt: "2026-07-27T17:20:00.000Z",
          completedAt: "2026-07-27T17:30:00.000Z",
          rubricPassed: 3,
          rubricTotal: drillPack.practice.rubric.length,
          followUpsCompleted: 2,
          confidencePercent: 80,
          hintUsed: false,
          answerPresent: true,
        },
      ],
      gaps: [
        {
          roleProfileId: "tick-data-platform",
          roleProfileVersion: 1,
          competency: "modern_cpp",
          status: "learning",
          openedAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          sourceKind: "drill",
          sourceId: drillPack.practice.id,
          sourceScore: 75,
          practiceAttemptId:
            "30000000-0000-4000-8000-000000000005",
          verificationAttemptId: null,
        },
      ],
    };

    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, state]]),
      trainingState,
      today: "2026-07-28",
      timeBudgetMinutes: 45,
      daysSinceComparableMock: 2,
    });

    expect(mission.items.some((item) => item.kind === "drill")).toBe(
      false,
    );
    expect(mission.plannedMinutes).toBe(
      mission.items.reduce(
        (total, item) => total + item.estimatedMinutes,
        0,
      ),
    );
    expect(mission.plannedMinutes).toBe(4);
  });

  it("never schedules a comparable mock completed today, even when every role gap is verified", () => {
    const trainingState: WorldQuantTrainingState = {
      ...EMPTY_WORLDQUANT_TRAINING_STATE,
      gaps: [
        {
          roleProfileId: "tick-data-platform",
          roleProfileVersion: 1,
          competency: "modern_cpp",
          status: "verified",
          openedAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
          sourceKind: "drill",
          sourceId: "verified-practice",
          sourceScore: 90,
          practiceAttemptId:
            "30000000-0000-4000-8000-000000000006",
          verificationAttemptId:
            "30000000-0000-4000-8000-000000000007",
        },
      ],
    };

    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, state]]),
      trainingState,
      today: "2026-07-28",
      timeBudgetMinutes: 60,
      daysSinceComparableMock: 0,
    });

    expect(mission.items.some((item) => item.kind === "mock")).toBe(
      false,
    );
  });

  it("does not schedule an auth-gated mock in local guided mode", () => {
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, state]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 60,
      daysSinceComparableMock: null,
      mockAvailable: false,
    });

    expect(mission.items.some((item) => item.kind === "mock")).toBe(
      false,
    );
  });
});
