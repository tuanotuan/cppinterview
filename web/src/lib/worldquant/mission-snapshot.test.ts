import { afterEach, describe, expect, it, vi } from "vitest";

import type { EvidenceProjection } from "@/lib/evidence/engine";
import { newQuestionLearningState } from "@/lib/practice/learning-state";

import { buildWorldQuantMission } from "./mission";
import {
  createWorldQuantMissionSnapshot,
  parseWorldQuantMissionSnapshot,
  readWorldQuantMissionSnapshot,
  rehydrateWorldQuantMissionSnapshot,
  restoreOrBuildWorldQuantMission,
  serializeWorldQuantMissionSnapshot,
  WORLDQUANT_MISSION_SNAPSHOT_VERSION,
  worldQuantMissionSnapshotKeysToPrune,
  worldQuantMissionSnapshotStorageKey,
} from "./mission-snapshot";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
} from "./training-state";
import type { ReadinessQuestionSummary } from "./readiness";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

function missionWithMockAvailability(mockAvailable: boolean) {
  return buildWorldQuantMission({
    roleProfileId: "tick-data-platform",
    questions: [question],
    states: new Map([
      [
        question.id,
        newQuestionLearningState({
          questionId: question.id,
          questionVersion: question.version,
          sourceHash: question.sourceHash,
        }),
      ],
    ]),
    trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
    today: "2026-07-28",
    timeBudgetMinutes: 120,
    daysSinceComparableMock: null,
    mockAvailable,
  });
}

function missionForValidation(
  validation: ReadinessQuestionSummary["validation"],
) {
  const current: ReadinessQuestionSummary = {
    ...question,
    id: "validation-transition-card",
    validation,
  };
  return {
    current,
    mission: buildWorldQuantMission({
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
      timeBudgetMinutes: 30,
      daysSinceComparableMock: 2,
    }),
  };
}

describe("WorldQuant mission snapshot", () => {
  it("round-trips and rehydrates the exact frozen mission", () => {
    const mission = missionFor(question);
    const snapshot = createWorldQuantMissionSnapshot(mission);
    const parsed = parseWorldQuantMissionSnapshot(
      serializeWorldQuantMissionSnapshot(snapshot),
    );

    expect(snapshot.version).toBe(
      WORLDQUANT_MISSION_SNAPSHOT_VERSION,
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

  it("keeps legacy v2 snapshots compatible when no assessed evidence exists", () => {
    const mission = missionFor(question);
    const snapshot = createWorldQuantMissionSnapshot(mission);
    const legacyV2 = Object.fromEntries(
      Object.entries(snapshot).filter(
        ([key]) => key !== "evidenceFingerprint",
      ),
    );
    const parsed = parseWorldQuantMissionSnapshot(JSON.stringify(legacyV2));

    expect(parsed?.evidenceFingerprint).toBe("none");
    expect(
      parsed
        ? rehydrateWorldQuantMissionSnapshot({
            snapshot: parsed,
            questions: [question],
            trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
          })
        : null,
    ).toEqual(mission);
  });

  it("restores only while durable evidence still matches the frozen mission", () => {
    const evidence = repairEvidence(question.id, "coach:1");
    const changedEvidence = repairEvidence(question.id, "coach:2");
    const mission = buildWorldQuantMission({
      roleProfileId: "tick-data-platform",
      questions: [question],
      states: new Map([[question.id, newQuestionLearningState({
        questionId: question.id,
        questionVersion: question.version,
        sourceHash: question.sourceHash,
      })]]),
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      today: "2026-07-28",
      timeBudgetMinutes: 45,
      daysSinceComparableMock: 2,
      attemptEvidence: evidence,
    });
    const rawSnapshot = serializeWorldQuantMissionSnapshot(
      createWorldQuantMissionSnapshot(mission),
    );

    expect(
      restoreOrBuildWorldQuantMission({
        rawSnapshot,
        scope: {
          date: mission.date,
          roleProfileId: mission.roleProfileId,
          timeBudgetMinutes: mission.timeBudgetMinutes,
        },
        questions: [question],
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
        attemptEvidence: evidence,
        build: () => mission,
      }).restored,
    ).toBe(true);

    const rebuilt = restoreOrBuildWorldQuantMission({
      rawSnapshot,
      scope: {
        date: mission.date,
        roleProfileId: mission.roleProfileId,
        timeBudgetMinutes: mission.timeBudgetMinutes,
      },
      questions: [question],
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      attemptEvidence: changedEvidence,
      build: () => missionFor(question),
    });
    expect(rebuilt.restored).toBe(false);
    expect(rebuilt.mission.evidenceFingerprint).toBe("none");
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

  it("rejects a frozen mock when durable mock history is unavailable", () => {
    const frozenMission = missionWithMockAvailability(true);
    const rebuiltMission = missionWithMockAvailability(false);
    expect(
      frozenMission.items.some((item) => item.kind === "mock"),
    ).toBe(true);

    const restored = restoreOrBuildWorldQuantMission({
      rawSnapshot: serializeWorldQuantMissionSnapshot(
        createWorldQuantMissionSnapshot(frozenMission),
      ),
      scope: {
        date: "2026-07-28",
        roleProfileId: "tick-data-platform",
        timeBudgetMinutes: 120,
      },
      questions: [question],
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      mockAvailable: false,
      build: () => rebuiltMission,
    });

    expect(restored.restored).toBe(false);
    expect(
      restored.mission.items.some((item) => item.kind === "mock"),
    ).toBe(false);
  });

  it("round-trips personal remediation while tracking canonical content changes", () => {
    const personal = missionForValidation("personal_remediation");
    const canonical = missionForValidation("repository_verified");
    expect(
      personal.mission.items.some((item) => item.kind === "flashcards"),
    ).toBe(true);
    expect(
      personal.mission.items.some((item) => item.kind === "content_gap"),
    ).toBe(true);
    expect(
      canonical.mission.items.some((item) => item.kind === "content_gap"),
    ).toBe(false);

    expect(
      rehydrateWorldQuantMissionSnapshot({
        snapshot: createWorldQuantMissionSnapshot(personal.mission),
        questions: [personal.current],
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      }),
    ).toEqual(personal.mission);
    expect(
      rehydrateWorldQuantMissionSnapshot({
        snapshot: createWorldQuantMissionSnapshot(personal.mission),
        questions: [canonical.current],
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      }),
    ).toBeNull();
    expect(
      rehydrateWorldQuantMissionSnapshot({
        snapshot: createWorldQuantMissionSnapshot(canonical.mission),
        questions: [personal.current],
        trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      }),
    ).toBeNull();
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
      "recall:worldquant-mission:local:2026-07-28:tick-data-platform:45:v2",
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

  it("ignores a v1 snapshot and rebuilds a fresh v2 plan", () => {
    const mission = missionFor(question);
    const currentSnapshot = createWorldQuantMissionSnapshot(mission);
    const legacyRaw = JSON.stringify({
      ...currentSnapshot,
      version: 1,
    });

    expect(parseWorldQuantMissionSnapshot(legacyRaw)).toBeNull();
    const rebuilt = restoreOrBuildWorldQuantMission({
      rawSnapshot: legacyRaw,
      scope: {
        date: mission.date,
        roleProfileId: mission.roleProfileId,
        timeBudgetMinutes: mission.timeBudgetMinutes,
      },
      questions: [question],
      trainingState: EMPTY_WORLDQUANT_TRAINING_STATE,
      build: () => mission,
    });
    expect(rebuilt).toMatchObject({
      mission,
      restored: false,
      snapshot: {
        version: WORLDQUANT_MISSION_SNAPSHOT_VERSION,
      },
    });
  });

  it("does not read, migrate, or delete a legacy v1 storage entry", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const scope = {
      accountId: null,
      date: "2026-07-28",
      roleProfileId: "tick-data-platform" as const,
      timeBudgetMinutes: 45,
    };
    const currentKey = worldQuantMissionSnapshotStorageKey(scope);
    const legacyKey = currentKey.replace(/:v2$/, ":v1");
    const legacyRaw = JSON.stringify({
      ...createWorldQuantMissionSnapshot(missionFor(question)),
      version: 1,
    });
    storage.setItem(legacyKey, legacyRaw);

    expect(readWorldQuantMissionSnapshot(scope)).toBeNull();
    expect(storage.getItem(currentKey)).toBeNull();
    expect(storage.getItem(legacyKey)).toBe(legacyRaw);
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
      "recall:worldquant-mission:local:2026-07-22:tick-data-platform:45:v1",
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
    expect(
      worldQuantMissionSnapshotKeysToPrune(
        [current, newest],
        current.replace(/:v2$/, ":v1"),
        1,
      ),
    ).toEqual([]);
  });
});

function repairEvidence(
  questionId: string,
  artifactId: string,
): EvidenceProjection {
  return {
    version: 2,
    asOf: "2026-07-28T00:00:00.000Z",
    competencies: [
      {
        key: "modern_cpp",
        status: "learning",
        content: "available",
        gapKind: "learner",
        nextAction: "repair",
        score: 40,
        assessmentCount: 1,
        successfulAttemptCount: 0,
        latestEvidenceAt: "2026-07-27T00:00:00.000Z",
        supportingArtifactIds: [],
        contradictingArtifactIds: [artifactId],
        inconclusiveArtifactIds: [],
        invalidatedArtifactIds: [],
        recommendedQuestionIds: [questionId],
      },
    ],
  };
}
