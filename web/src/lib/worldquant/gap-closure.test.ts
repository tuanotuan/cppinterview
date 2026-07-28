import { describe, expect, it } from "vitest";

import {
  completeDrillAndReconcileGap,
  openOrReconcileGapFromMock,
} from "./gap-closure";
import { worldQuantDrillPacks } from "./drills";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
  markCheckpointExposed,
  type WorldQuantDrillAttempt,
} from "./training-state";

const pack = worldQuantDrillPacks[0];
const ids = [
  "20000000-0000-4000-8000-000000000001",
  "20000000-0000-4000-8000-000000000002",
  "20000000-0000-4000-8000-000000000003",
];

function attempt(
  variant: "practice" | "checkpoint",
  attemptId: string,
  passed = true,
  unseenAtStart = false,
): WorldQuantDrillAttempt {
  const drill =
    variant === "practice" ? pack.practice : pack.checkpoint;
  return {
    attemptId,
    drillId: drill.id,
    drillVersion: 1,
    variant,
    competency: drill.competency,
    conceptIds: [...drill.conceptIds],
    startedAt: "2026-07-28T02:00:00.000Z",
    completedAt: "2026-07-28T02:15:00.000Z",
    rubricPassed: passed ? 4 : 2,
    rubricTotal: 4,
    followUpsCompleted: 2,
    confidencePercent: 70,
    hintUsed: false,
    answerPresent: true,
    ...(variant === "checkpoint" ? { unseenAtStart } : {}),
  };
}

describe("WorldQuant gap closure protocol", () => {
  it("does not turn not-assessed evidence into a gap", () => {
    const result = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-1",
        completedAt: "2026-07-28T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "not_assessed",
        score: null,
        unseen: false,
      },
    );
    expect(result.gaps).toEqual([]);
  });

  it("does not let older mock evidence overwrite newer drill state", () => {
    const current = {
      ...EMPTY_WORLDQUANT_TRAINING_STATE,
      gaps: [
        {
          roleProfileId: "tick-data-platform" as const,
          roleProfileVersion: 1 as const,
          competency: "modern_cpp" as const,
          status: "transfer_ready" as const,
          openedAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-29T00:00:00.000Z",
          sourceKind: "drill" as const,
          sourceId: "newer-drill",
          sourceScore: 90,
          practiceAttemptId:
            "30000000-0000-4000-8000-000000000011",
          verificationAttemptId: null,
        },
      ],
    };
    expect(
      openOrReconcileGapFromMock(current, {
        attemptId: "older-mock",
        completedAt: "2026-07-28T00:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 20,
        unseen: false,
      }),
    ).toEqual(current);
  });

  it("never lets mock evidence bypass the checkpoint transfer gate", () => {
    const opened = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-low",
        completedAt: "2026-07-28T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 50,
        unseen: false,
      },
    );
    const reconciled = openOrReconcileGapFromMock(opened, {
      attemptId: "mock-high",
      completedAt: "2026-07-29T02:00:00.000Z",
      roleProfileId: "tick-data-platform",
      competency: "modern_cpp",
      status: "assessed",
      score: 95,
      unseen: true,
    });

    expect(reconciled.gaps[0].status).toBe("open");
    expect(reconciled.gaps[0].verificationAttemptId).toBeNull();
  });

  it("moves open → transfer-ready → verified only through an unseen no-hint checkpoint", () => {
    const opened = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-low",
        completedAt: "2026-07-28T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 55,
        unseen: false,
      },
    );
    expect(opened.gaps[0].status).toBe("open");

    const practiced = completeDrillAndReconcileGap(opened, {
      attempt: attempt("practice", ids[0]),
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-29T02:15:00.000Z",
      today: "2026-07-29",
      createId: () => ids[2],
    });
    expect(practiced.gap?.status).toBe("transfer_ready");

    const checkpointAttempt = attempt(
      "checkpoint",
      ids[1],
      true,
      true,
    );
    const exposed = markCheckpointExposed(
      practiced.state,
      checkpointAttempt.drillId,
      checkpointAttempt.startedAt,
    );
    const verified = completeDrillAndReconcileGap(exposed, {
      attempt: checkpointAttempt,
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-30T02:15:00.000Z",
      today: "2026-07-30",
      createId: () => ids[2],
    });
    expect(verified.unseenCheckpoint).toBe(true);
    expect(verified.gap?.status).toBe("verified");
    expect(verified.gap?.verificationAttemptId).toBe(ids[1]);
  });

  it("allows a clean spaced checkpoint retest after the cooldown", () => {
    const opened = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-low",
        completedAt: "2026-07-27T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 55,
        unseen: false,
      },
    );
    const practiced = completeDrillAndReconcileGap(opened, {
      attempt: attempt("practice", ids[0]),
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-28T02:15:00.000Z",
      today: "2026-07-28",
      createId: () => ids[2],
    });
    const firstExposure = markCheckpointExposed(
      practiced.state,
      pack.checkpoint.id,
      "2026-07-28T03:00:00.000Z",
    );
    const spacedExposure = markCheckpointExposed(
      firstExposure,
      pack.checkpoint.id,
      "2026-07-29T03:00:00.000Z",
    );
    const retestAttempt = {
      ...attempt("checkpoint", ids[1]),
      startedAt: "2026-07-29T03:00:00.000Z",
      completedAt: "2026-07-29T03:15:00.000Z",
      unseenAtStart: false,
    };
    const verified = completeDrillAndReconcileGap(
      spacedExposure,
      {
        attempt: retestAttempt,
        roleProfileId: "tick-data-platform",
        failedRubricIndexes: [],
        now: retestAttempt.completedAt,
        today: "2026-07-29",
        createId: () => ids[2],
      },
    );

    expect(verified.unseenCheckpoint).toBe(false);
    expect(verified.checkpointVerificationKind).toBe(
      "spaced_retest",
    );
    expect(verified.gap?.status).toBe("verified");
  });

  it("cannot verify with hints or a repeated checkpoint", () => {
    const opened = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-low",
        completedAt: "2026-07-28T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 50,
        unseen: false,
      },
    );
    const practiced = completeDrillAndReconcileGap(opened, {
      attempt: attempt("practice", ids[0]),
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-29T02:15:00.000Z",
      today: "2026-07-29",
      createId: () => ids[2],
    });
    const checkpointAttempt = {
      ...attempt("checkpoint", ids[1], true, true),
      hintUsed: true,
    };
    const exposed = markCheckpointExposed(
      practiced.state,
      checkpointAttempt.drillId,
      checkpointAttempt.startedAt,
    );
    const hinted = completeDrillAndReconcileGap(exposed, {
      attempt: {
        ...checkpointAttempt,
        hintUsed: true,
      },
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-30T02:15:00.000Z",
      today: "2026-07-30",
      createId: () => ids[2],
    });
    expect(hinted.gap?.status).toBe("learning");

    const repeated = completeDrillAndReconcileGap(hinted.state, {
      attempt: attempt("checkpoint", ids[2]),
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-31T02:15:00.000Z",
      today: "2026-07-31",
      createId: () =>
        "20000000-0000-4000-8000-000000000004",
    });
    expect(repeated.unseenCheckpoint).toBe(false);
    expect(repeated.gap?.status).toBe("learning");
  });

  it("fails closed when unseen-at-start was not durably exposed", () => {
    const opened = openOrReconcileGapFromMock(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attemptId: "mock-low",
        completedAt: "2026-07-28T02:00:00.000Z",
        roleProfileId: "tick-data-platform",
        competency: "modern_cpp",
        status: "assessed",
        score: 50,
        unseen: false,
      },
    );
    const practiced = completeDrillAndReconcileGap(opened, {
      attempt: attempt("practice", ids[0]),
      roleProfileId: "tick-data-platform",
      failedRubricIndexes: [],
      now: "2026-07-29T02:15:00.000Z",
      today: "2026-07-29",
      createId: () => ids[2],
    });
    const unpersisted = completeDrillAndReconcileGap(
      practiced.state,
      {
        attempt: attempt("checkpoint", ids[1], true, true),
        roleProfileId: "tick-data-platform",
        failedRubricIndexes: [],
        now: "2026-07-30T02:15:00.000Z",
        today: "2026-07-30",
        createId: () => ids[2],
      },
    );

    expect(unpersisted.unseenCheckpoint).toBe(false);
    expect(unpersisted.gap?.status).toBe("learning");
    expect(unpersisted.gap?.verificationAttemptId).toBeNull();
  });

  it("creates grounded repair prompts only for failed rubric atoms", () => {
    const result = completeDrillAndReconcileGap(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      {
        attempt: attempt("practice", ids[0], false),
        roleProfileId: "tick-data-platform",
        failedRubricIndexes: [1, 3],
        now: "2026-07-28T02:15:00.000Z",
        today: "2026-07-28",
        createId: (() => {
          let index = 0;
          return () => ids[++index];
        })(),
      },
    );
    expect(result.repairCards).toHaveLength(2);
    expect(result.repairCards[0].prompt).toContain(
      pack.practice.rubric[1],
    );
    expect(result.repairCards[0]).not.toHaveProperty("candidateAnswer");
  });

  it("rejects incomplete, duplicate, or out-of-range failed rubric evidence", () => {
    const failedAttempt = attempt("practice", ids[0], false);
    const complete = (failedRubricIndexes: number[]) =>
      completeDrillAndReconcileGap(
        EMPTY_WORLDQUANT_TRAINING_STATE,
        {
          attempt: failedAttempt,
          roleProfileId: "tick-data-platform",
          failedRubricIndexes,
          now: "2026-07-28T02:15:00.000Z",
          today: "2026-07-28",
          createId: () => ids[2],
        },
      );

    expect(() => complete([1])).toThrow(/exact unchecked atoms/);
    expect(() => complete([1, 1])).toThrow(/exact unchecked atoms/);
    expect(() => complete([1, 99])).toThrow(
      /exact unchecked atoms/,
    );
  });
});
