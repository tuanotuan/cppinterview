import { describe, expect, it } from "vitest";

import { newQuestionLearningState } from "@/lib/practice/learning-state";

import { buildWorldQuantMission } from "./mission";
import {
  createWorldQuantMissionSnapshot,
  parseWorldQuantMissionSnapshot,
  rehydrateWorldQuantMissionSnapshot,
  restoreOrBuildWorldQuantMission,
  serializeWorldQuantMissionSnapshot,
  worldQuantMissionSnapshotKeysToPrune,
  worldQuantMissionSnapshotStorageKey,
} from "./mission-snapshot";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
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

function missionFor(current: ReadinessQuestionSummary) {
  return buildWorldQuantMission({
    roleProfileId: "tick-data-platform",
    questions: [current],
    states: new Map([
      [
        current.id,
        newQuestionLearningState({
          questionId: current.id,
          questionVersion: current.version,
          sourceHash: current.sourceHash,
        }),
      ],
    ]),
    trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
    today: "2026-07-28",
    timeBudgetMinutes: 45,
    daysSinceComparableMock: 2,
  });
}

describe("WorldQuant mission snapshot", () => {
  it("round-trips and rehydrates the exact frozen mission", () => {
    const mission = missionFor(question);
    const snapshot = createWorldQuantMissionSnapshot(mission);
    const parsed = parseWorldQuantMissionSnapshot(
      serializeWorldQuantMissionSnapshot(snapshot),
    );

    expect(parsed).toEqual(snapshot);
    expect(
      rehydrateWorldQuantMissionSnapshot({
        snapshot,
        questions: [question],
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      }),
    ).toEqual(mission);
    expect(JSON.stringify(snapshot)).not.toContain(
      "candidateAnswer",
    );
  });

  it("fails closed on a stale card revision and rebuilds a new snapshot", () => {
    const oldMission = missionFor(question);
    const staleRaw = serializeWorldQuantMissionSnapshot(
      createWorldQuantMissionSnapshot(oldMission),
    );
    const revised = {
      ...question,
      version: 2,
      sourceHash: "b".repeat(64),
    };
    const rebuiltMission = missionFor(revised);
    const restored = restoreOrBuildWorldQuantMission({
      rawSnapshot: staleRaw,
      scope: {
        date: "2026-07-28",
        roleProfileId: "tick-data-platform",
        timeBudgetMinutes: 45,
      },
      questions: [revised],
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      build: () => rebuiltMission,
    });

    expect(restored.restored).toBe(false);
    expect(restored.mission).toEqual(rebuiltMission);
    expect(restored.mission.missionId).not.toBe(
      oldMission.missionId,
    );
  });

  it("scopes snapshots by account, date, role, and budget", () => {
    expect(
      worldQuantMissionSnapshotStorageKey({
        accountId: null,
        date: "2026-07-28",
        roleProfileId: "tick-data-platform",
        timeBudgetMinutes: 45,
      }),
    ).toBe(
      "recall:worldquant-mission:local:2026-07-28:tick-data-platform:45:v1",
    );
    expect(
      worldQuantMissionSnapshotStorageKey({
        accountId: "10000000-0000-4000-8000-000000000010",
        date: "2026-07-28",
        roleProfileId: "cpp-data-platform",
        timeBudgetMinutes: 60,
      }),
    ).toContain(
      "10000000-0000-4000-8000-000000000010:2026-07-28:cpp-data-platform:60",
    );
  });

  it("rejects malformed or over-budget snapshots", () => {
    expect(parseWorldQuantMissionSnapshot("not-json")).toBeNull();
    const snapshot = createWorldQuantMissionSnapshot(
      missionFor(question),
    );
    expect(
      parseWorldQuantMissionSnapshot(
        JSON.stringify({
          ...snapshot,
          plannedMinutes: snapshot.timeBudgetMinutes + 1,
        }),
      ),
    ).toBeNull();
  });

  it("bounds retention per account while always preserving the current snapshot", () => {
    const current = worldQuantMissionSnapshotStorageKey({
      accountId: null,
      date: "2026-07-25",
      roleProfileId: "tick-data-platform",
      timeBudgetMinutes: 45,
    });
    const newest = worldQuantMissionSnapshotStorageKey({
      accountId: null,
      date: "2026-07-28",
      roleProfileId: "cpp-data-platform",
      timeBudgetMinutes: 60,
    });
    const nextNewest = worldQuantMissionSnapshotStorageKey({
      accountId: null,
      date: "2026-07-27",
      roleProfileId: "tick-data-platform",
      timeBudgetMinutes: 30,
    });
    const oldest = worldQuantMissionSnapshotStorageKey({
      accountId: null,
      date: "2026-07-24",
      roleProfileId: "tick-data-platform",
      timeBudgetMinutes: 15,
    });
    const otherAccount = worldQuantMissionSnapshotStorageKey({
      accountId: "10000000-0000-4000-8000-000000000010",
      date: "2026-07-23",
      roleProfileId: "tick-data-platform",
      timeBudgetMinutes: 45,
    });
    const foreignKeys = [
      "recall:worldquant-training:local:v1",
      "recall:worldquant-mission:local:not-a-valid-snapshot",
      "recall:worldquant-mission:local:2026-07-22:tick-data-platform:45:v2",
    ];

    expect(
      worldQuantMissionSnapshotKeysToPrune(
        [
          current,
          newest,
          nextNewest,
          oldest,
          otherAccount,
          ...foreignKeys,
        ],
        current,
        2,
      ),
    ).toEqual([nextNewest, oldest]);
  });
});
