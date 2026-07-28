import { describe, expect, it } from "vitest";

import {
  addDrillAttempt,
  addFullRoundSummary,
  EMPTY_WORLDQUANT_TRAINING_STATE,
  markCheckpointExposed,
  mergeWorldQuantTrainingStates,
  parseWorldQuantTrainingState,
  serializeWorldQuantTrainingState,
  wasCheckpointExposed,
  worldQuantTrainingStorageKey,
  type WorldQuantDrillAttempt,
  type WorldQuantTrainingState,
} from "./training-state";
import { worldQuantDrillPacks } from "./drills";
import {
  buildWorldQuantFullRound,
  worldQuantFullRoundBlueprintV1,
} from "./full-round";

const drill = worldQuantDrillPacks[0].practice;
const checkpoint = worldQuantDrillPacks[0].checkpoint;
const attempt: WorldQuantDrillAttempt = {
  attemptId: "10000000-0000-4000-8000-000000000001",
  drillId: drill.id,
  drillVersion: drill.version,
  variant: drill.variant,
  competency: drill.competency,
  conceptIds: [...drill.conceptIds],
  startedAt: "2026-07-28T02:00:00.000Z",
  completedAt: "2026-07-28T02:15:00.000Z",
  rubricPassed: 3,
  rubricTotal: 4,
  followUpsCompleted: 2,
  confidencePercent: 70,
  hintUsed: false,
  answerPresent: true,
};

describe("WorldQuant local training state", () => {
  it("round-trips versioned state and rejects corrupt input", () => {
    const state = addDrillAttempt(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      attempt,
    );
    expect(
      parseWorldQuantTrainingState(
        serializeWorldQuantTrainingState(state),
      ),
    ).toEqual(state);
    expect(parseWorldQuantTrainingState("{bad json")).toEqual(
      EMPTY_WORLDQUANT_TRAINING_STATE,
    );
  });

  it("binds attempts to exact catalog identity", () => {
    expect(() =>
      addDrillAttempt(EMPTY_WORLDQUANT_TRAINING_STATE, {
        ...attempt,
        competency: "tick_market_data",
      }),
    ).toThrow();
  });

  it("binds rubric totals to the exact catalog drill", () => {
    expect(() =>
      addDrillAttempt(EMPTY_WORLDQUANT_TRAINING_STATE, {
        ...attempt,
        rubricPassed: 1,
        rubricTotal: 1,
      }),
    ).toThrow(/exact catalog drill/);
  });

  it("does not duplicate an idempotent attempt", () => {
    const once = addDrillAttempt(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      attempt,
    );
    const twice = addDrillAttempt(once, attempt);
    expect(twice.attempts).toHaveLength(1);
  });

  it("classifies first, recent-repeat and spaced checkpoint exposure", () => {
    const firstExposure = "2026-07-28T03:00:00.000Z";
    const exposed = markCheckpointExposed(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      checkpoint.id,
      firstExposure,
    );
    const timestampCollision = markCheckpointExposed(
      exposed,
      checkpoint.id,
      firstExposure,
    );
    const recentRepeat = markCheckpointExposed(
      exposed,
      checkpoint.id,
      "2026-07-28T04:00:00.000Z",
    );
    const exposedAgain = markCheckpointExposed(
      recentRepeat,
      checkpoint.id,
      "2026-07-29T04:00:00.000Z",
    );

    expect(recentRepeat.checkpointExposures.at(-1)).toMatchObject({
      exposureCount: 2,
      verificationKind: "repeat",
    });
    expect(timestampCollision.checkpointExposures).toEqual([
      {
        drillId: checkpoint.id,
        drillVersion: checkpoint.version,
        exposedAt: firstExposure,
        exposureCount: 2,
        verificationKind: "repeat",
      },
    ]);
    expect(
      wasCheckpointExposed(
        exposedAgain,
        checkpoint.id,
        checkpoint.version,
      ),
    ).toBe(true);
    expect(exposedAgain.checkpointExposures).toHaveLength(3);
    expect(exposedAgain.checkpointExposures.at(-1)).toEqual({
      drillId: checkpoint.id,
      drillVersion: checkpoint.version,
      exposedAt: "2026-07-29T04:00:00.000Z",
      exposureCount: 3,
      verificationKind: "spaced_retest",
    });
    expect(
      parseWorldQuantTrainingState(
        serializeWorldQuantTrainingState(exposedAgain),
      ).checkpointExposures,
    ).toEqual(exposedAgain.checkpointExposures);
    const legacy = JSON.parse(
      serializeWorldQuantTrainingState(exposed),
    ) as Record<string, unknown>;
    legacy.checkpointExposures = [
      {
        drillId: checkpoint.id,
        drillVersion: checkpoint.version,
        exposedAt: firstExposure,
      },
    ];
    expect(
      parseWorldQuantTrainingState(
        JSON.stringify(legacy),
      ).checkpointExposures[0],
    ).toMatchObject({
      exposureCount: 1,
      verificationKind: "repeat",
    });
  });

  it("salvages valid slices and entries from a partially corrupt state", () => {
    const exposed = markCheckpointExposed(
      addDrillAttempt(
        EMPTY_WORLDQUANT_TRAINING_STATE,
        attempt,
      ),
      checkpoint.id,
      "2026-07-28T03:00:00.000Z",
    );
    const stored = JSON.parse(
      serializeWorldQuantTrainingState(exposed),
    ) as Record<string, unknown>;
    stored.attempts = [
      attempt,
      {
        ...attempt,
        attemptId: "10000000-0000-4000-8000-000000000099",
        rubricPassed: 1,
        rubricTotal: 1,
      },
    ];
    stored.gaps = "corrupt collection";
    stored.repairCards = { not: "an array" };
    stored.checkpointExposures = [
      ...exposed.checkpointExposures,
      {
        drillId: "unknown-checkpoint",
        drillVersion: 1,
        exposedAt: "not-a-date",
      },
    ];

    const salvaged = parseWorldQuantTrainingState(
      JSON.stringify(stored),
    );
    expect(salvaged.attempts.map((item) => item.attemptId)).toEqual([
      attempt.attemptId,
    ]);
    expect(salvaged.gaps).toEqual([]);
    expect(salvaged.repairCards).toEqual([]);
    expect(salvaged.checkpointExposures).toEqual(
      exposed.checkpointExposures,
    );
  });

  it("downgrades verified gaps whose supporting attempt is missing", () => {
    const passingPractice = { ...attempt, rubricPassed: 4 };
    const stored = {
      version: 1,
      attempts: [passingPractice],
      gaps: [
        {
          roleProfileId: "tick-data-platform",
          roleProfileVersion: 1,
          competency: drill.competency,
          status: "verified",
          openedAt: attempt.startedAt,
          updatedAt: attempt.completedAt,
          sourceKind: "drill",
          sourceId: "missing-verification",
          sourceScore: 100,
          practiceAttemptId: passingPractice.attemptId,
          verificationAttemptId:
            "10000000-0000-4000-8000-000000000099",
        },
      ],
      repairCards: [],
      missionCompletions: [],
      fullRounds: [],
      checkpointExposures: [],
    };

    expect(
      parseWorldQuantTrainingState(JSON.stringify(stored)).gaps[0],
    ).toMatchObject({
      status: "transfer_ready",
      practiceAttemptId: passingPractice.attemptId,
      verificationAttemptId: null,
    });
    const merged = mergeWorldQuantTrainingStates(
      stored as WorldQuantTrainingState,
    );
    expect(merged.gaps[0]).toMatchObject({
      status: "transfer_ready",
      verificationAttemptId: null,
    });
  });

  it("requires exact eligible exposure before retaining verified state", () => {
    const passingPractice = { ...attempt, rubricPassed: 4 };
    const checkpointAttempt: WorldQuantDrillAttempt = {
      attemptId: "10000000-0000-4000-8000-000000000098",
      drillId: checkpoint.id,
      drillVersion: checkpoint.version,
      variant: checkpoint.variant,
      competency: checkpoint.competency,
      conceptIds: [...checkpoint.conceptIds],
      startedAt: "2026-07-29T02:00:00.000Z",
      completedAt: "2026-07-29T02:15:00.000Z",
      rubricPassed: checkpoint.rubric.length,
      rubricTotal: checkpoint.rubric.length,
      followUpsCompleted: 2,
      confidencePercent: 80,
      hintUsed: false,
      answerPresent: true,
      unseenAtStart: false,
    };
    const verifiedGap = {
      roleProfileId: "tick-data-platform",
      roleProfileVersion: 1,
      competency: checkpoint.competency,
      status: "verified",
      openedAt: passingPractice.startedAt,
      updatedAt: checkpointAttempt.completedAt,
      sourceKind: "drill",
      sourceId: checkpointAttempt.attemptId,
      sourceScore: 100,
      practiceAttemptId: passingPractice.attemptId,
      verificationAttemptId: checkpointAttempt.attemptId,
    };
    const stored = {
      version: 1,
      attempts: [passingPractice, checkpointAttempt],
      gaps: [verifiedGap],
      repairCards: [],
      missionCompletions: [],
      fullRounds: [],
      checkpointExposures: [],
    };

    expect(
      parseWorldQuantTrainingState(JSON.stringify(stored)).gaps[0],
    ).toMatchObject({
      status: "transfer_ready",
      verificationAttemptId: null,
    });

    const exposed = markCheckpointExposed(
      EMPTY_WORLDQUANT_TRAINING_STATE,
      checkpoint.id,
      checkpointAttempt.startedAt,
    );
    const validStored = {
      ...stored,
      attempts: [
        passingPractice,
        { ...checkpointAttempt, unseenAtStart: true },
      ],
      checkpointExposures: exposed.checkpointExposures,
    };
    const parsedValid = parseWorldQuantTrainingState(
      JSON.stringify(validStored),
    );
    expect(parsedValid.gaps[0].status).toBe("verified");
    const laterExposure = markCheckpointExposed(
      parsedValid,
      checkpoint.id,
      "2026-07-29T03:00:00.000Z",
    );
    expect(
      laterExposure.checkpointExposures.some(
        (exposure) =>
          exposure.exposedAt === checkpointAttempt.startedAt,
      ),
    ).toBe(true);
    expect(
      parseWorldQuantTrainingState(
        serializeWorldQuantTrainingState(laterExposure),
      ).gaps[0].status,
    ).toBe("verified");
  });

  it("pins gap-supporting attempts when enforcing the history cap", () => {
    const attempts = Array.from({ length: 301 }, (_, index) => ({
      ...attempt,
      rubricPassed: 4,
      attemptId: `00000000-0000-4000-8000-${index
        .toString(16)
        .padStart(12, "0")}`,
      startedAt: new Date(
        Date.parse(attempt.startedAt) + index * 60_000,
      ).toISOString(),
      completedAt: new Date(
        Date.parse(attempt.completedAt) + index * 60_000,
      ).toISOString(),
    }));
    const pinnedAttempt = attempts[0];
    const stored = {
      version: 1,
      attempts,
      gaps: [
        {
          roleProfileId: "tick-data-platform",
          roleProfileVersion: 1,
          competency: drill.competency,
          status: "transfer_ready",
          openedAt: pinnedAttempt.startedAt,
          updatedAt: pinnedAttempt.completedAt,
          sourceKind: "drill",
          sourceId: pinnedAttempt.attemptId,
          sourceScore: 75,
          practiceAttemptId: pinnedAttempt.attemptId,
          verificationAttemptId: null,
        },
      ],
      repairCards: [],
      missionCompletions: [],
      fullRounds: [],
      checkpointExposures: [],
    };
    const parsed = parseWorldQuantTrainingState(
      JSON.stringify(stored),
    );

    expect(parsed.attempts).toHaveLength(300);
    expect(
      parsed.attempts.some(
        (item) => item.attemptId === pinnedAttempt.attemptId,
      ),
    ).toBe(true);
    expect(parsed.gaps[0].practiceAttemptId).toBe(
      pinnedAttempt.attemptId,
    );
  });

  it("binds full-round summaries to the exact ordered blueprint", () => {
    const rounds = buildWorldQuantFullRound("tick-data-platform");
    const blueprint = worldQuantFullRoundBlueprintV1(
      "tick-data-platform",
    );
    const summary = {
      sessionId: "10000000-0000-4000-8000-000000000020",
      roleProfileId: "tick-data-platform" as const,
      roleProfileVersion: blueprint.roleProfileVersion,
      fullRoundVersion: blueprint.fullRoundVersion,
      startedAt: "2026-07-28T02:00:00.000Z",
      completedAt: "2026-07-28T03:00:00.000Z",
      completedRoundIds: rounds.map((round) => round.id),
      completedRounds: blueprint.rounds,
      rubricPassed: 8,
      rubricTotal: rounds.reduce(
        (total, round) => total + round.drill.rubric.length,
        0,
      ),
      englishWordCount: 42,
      englishFillerCount: 2,
      transcriptDeleted: true as const,
    };

    expect(
      addFullRoundSummary(
        EMPTY_WORLDQUANT_TRAINING_STATE,
        summary,
      ).fullRounds,
    ).toHaveLength(1);
    expect(() =>
      addFullRoundSummary(
        EMPTY_WORLDQUANT_TRAINING_STATE,
        {
          ...summary,
          completedRoundIds: [...summary.completedRoundIds].reverse(),
        },
      ),
    ).toThrow(/exact ordered blueprint/);
    expect(() =>
      addFullRoundSummary(
        EMPTY_WORLDQUANT_TRAINING_STATE,
        {
          ...summary,
          completedRounds: summary.completedRounds.map(
            (round, index) =>
              index === 0
                ? { ...round, drillId: rounds[1].drill.id }
                : round,
          ),
        },
      ),
    ).toThrow(/exact ordered round and drill revisions/);
  });

  it("isolates local mode from account-scoped state", () => {
    expect(worldQuantTrainingStorageKey(null)).toBe(
      "recall:worldquant-training:local:v1",
    );
    expect(
      worldQuantTrainingStorageKey(
        "10000000-0000-4000-8000-000000000010",
      ),
    ).toContain("10000000-0000-4000-8000-000000000010");
  });
});
