import { z } from "zod";

import {
  browserStorageLocksSupported,
  withBrowserStorageLock,
} from "../practice/browser-storage-lock";
import {
  worldQuantConcepts,
  type WorldQuantConceptId,
} from "./curriculum";
import { worldQuantDrillById } from "./drills";
import { worldQuantFullRoundBlueprintV1 } from "./full-round";
import {
  worldQuantCompetencyKeys,
  worldQuantRoleProfileIds,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_TRAINING_STATE_VERSION = 1 as const;
export const WORLDQUANT_TRAINING_CHANGED_EVENT =
  "recall:worldquant-training-changed";
export const CHECKPOINT_SPACED_RETEST_INTERVAL_MS =
  24 * 60 * 60 * 1000;

const conceptIdSchema = z.enum(
  worldQuantConcepts.map((concept) => concept.id) as [
    WorldQuantConceptId,
    ...WorldQuantConceptId[],
  ],
);
const competencySchema = z.enum(worldQuantCompetencyKeys);
const roleProfileSchema = z.enum(worldQuantRoleProfileIds);
const isoTimestampSchema = z.string().datetime({ offset: true });

export const drillAttemptSchema = z
  .object({
    attemptId: z.string().uuid(),
    drillId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    drillVersion: z.literal(1),
    variant: z.enum(["practice", "checkpoint"]),
    competency: competencySchema,
    conceptIds: z.array(conceptIdSchema).min(1),
    startedAt: isoTimestampSchema,
    completedAt: isoTimestampSchema,
    rubricPassed: z.number().int().nonnegative(),
    rubricTotal: z.number().int().positive(),
    followUpsCompleted: z.number().int().min(0).max(2),
    confidencePercent: z.number().int().min(0).max(100),
    hintUsed: z.boolean(),
    answerPresent: z.boolean(),
    unseenAtStart: z.boolean().optional(),
  })
  .superRefine((attempt, context) => {
    if (attempt.rubricPassed > attempt.rubricTotal) {
      context.addIssue({
        code: "custom",
        path: ["rubricPassed"],
        message: "rubricPassed cannot exceed rubricTotal",
      });
    }
    if (
      Date.parse(attempt.completedAt) <
      Date.parse(attempt.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "completedAt cannot be before startedAt",
      });
    }
    const drill = worldQuantDrillById(attempt.drillId);
    if (
      !drill ||
      drill.version !== attempt.drillVersion ||
      drill.variant !== attempt.variant ||
      drill.competency !== attempt.competency ||
      drill.conceptIds.length !== attempt.conceptIds.length ||
      drill.conceptIds.some(
        (conceptId, index) => conceptId !== attempt.conceptIds[index],
      ) ||
      drill.rubric.length !== attempt.rubricTotal
    ) {
      context.addIssue({
        code: "custom",
        path: ["drillId"],
        message: "Attempt must bind to the exact catalog drill",
      });
    }
  });

export type WorldQuantDrillAttempt = z.infer<typeof drillAttemptSchema>;

export const gapStatusSchema = z.enum([
  "open",
  "learning",
  "transfer_ready",
  "verified",
]);
export type WorldQuantGapStatus = z.infer<typeof gapStatusSchema>;

export const competencyGapSchema = z.object({
  roleProfileId: roleProfileSchema,
  roleProfileVersion: z.literal(1),
  competency: competencySchema,
  status: gapStatusSchema,
  openedAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  sourceKind: z.enum(["mock", "drill", "manual"]),
  sourceId: z.string().min(1).max(200),
  sourceScore: z.number().int().min(0).max(100).nullable(),
  practiceAttemptId: z.string().uuid().nullable(),
  verificationAttemptId: z.string().uuid().nullable(),
}).superRefine((gap, context) => {
  if (
    gap.status !== "verified" &&
    gap.verificationAttemptId !== null
  ) {
    context.addIssue({
      code: "custom",
      path: ["verificationAttemptId"],
      message: "Only a verified gap may retain verification evidence",
    });
  }
  if (Date.parse(gap.updatedAt) < Date.parse(gap.openedAt)) {
    context.addIssue({
      code: "custom",
      path: ["updatedAt"],
      message: "updatedAt cannot precede openedAt",
    });
  }
});
export type WorldQuantCompetencyGap = z.infer<
  typeof competencyGapSchema
>;

export const repairCardSchema = z.object({
  id: z.string().uuid(),
  sourceAttemptId: z.string().uuid(),
  competency: competencySchema,
  conceptId: conceptIdSchema,
  prompt: z.string().trim().min(10).max(800),
  explanation: z.string().trim().min(5).max(800),
  createdAt: isoTimestampSchema,
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resolvedAt: isoTimestampSchema.nullable(),
});
export type WorldQuantRepairCard = z.infer<typeof repairCardSchema>;

export const missionCompletionSchema = z.object({
  missionId: z.string().min(1).max(200),
  itemId: z.string().min(1).max(200),
  completedAt: isoTimestampSchema,
});
export type WorldQuantMissionCompletion = z.infer<
  typeof missionCompletionSchema
>;

const fullRoundBlueprintRoundSchema = z
  .object({
    roundId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    roundVersion: z.literal(1),
    drillId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    drillVersion: z.literal(1),
    rubricTotal: z.number().int().positive(),
  })
  .strict();

export const fullRoundSummarySchema = z
  .object({
    sessionId: z.string().uuid(),
    roleProfileId: roleProfileSchema,
    roleProfileVersion: z.literal(1),
    fullRoundVersion: z.literal(1),
    startedAt: isoTimestampSchema,
    completedAt: isoTimestampSchema,
    completedRoundIds: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
      .min(1)
      .max(10),
    completedRounds: z
      .array(fullRoundBlueprintRoundSchema)
      .min(1)
      .max(10),
    rubricPassed: z.number().int().nonnegative(),
    rubricTotal: z.number().int().positive(),
    englishWordCount: z.number().int().nonnegative(),
    englishFillerCount: z.number().int().nonnegative(),
    transcriptDeleted: z.literal(true),
  })
  .superRefine((summary, context) => {
    const expectedBlueprint = worldQuantFullRoundBlueprintV1(
      summary.roleProfileId,
    );
    const expectedRoundIds = expectedBlueprint.rounds.map(
      (round) => round.roundId,
    );
    const expectedRubricTotal = expectedBlueprint.rounds.reduce(
      (total, round) => total + round.rubricTotal,
      0,
    );
    if (
      summary.roleProfileVersion !==
        expectedBlueprint.roleProfileVersion ||
      summary.fullRoundVersion !==
        expectedBlueprint.fullRoundVersion
    ) {
      context.addIssue({
        code: "custom",
        path: ["fullRoundVersion"],
        message:
          "Full-round summary must bind the exact versioned blueprint",
      });
    }
    if (
      summary.completedRoundIds.length !==
        expectedRoundIds.length ||
      summary.completedRoundIds.some(
        (roundId, index) => roundId !== expectedRoundIds[index],
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedRoundIds"],
        message: "Full-round summary must bind the exact ordered blueprint",
      });
    }
    if (
      summary.completedRounds.length !==
        expectedBlueprint.rounds.length ||
      summary.completedRounds.some((round, index) => {
        const expected = expectedBlueprint.rounds[index];
        return (
          !expected ||
          round.roundId !== expected.roundId ||
          round.roundVersion !== expected.roundVersion ||
          round.drillId !== expected.drillId ||
          round.drillVersion !== expected.drillVersion ||
          round.rubricTotal !== expected.rubricTotal
        );
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedRounds"],
        message:
          "Full-round summary must retain exact ordered round and drill revisions",
      });
    }
    if (summary.rubricTotal !== expectedRubricTotal) {
      context.addIssue({
        code: "custom",
        path: ["rubricTotal"],
        message: "rubricTotal must match the exact full-round blueprint",
      });
    }
    if (summary.rubricPassed > summary.rubricTotal) {
      context.addIssue({
        code: "custom",
        path: ["rubricPassed"],
        message: "rubricPassed cannot exceed rubricTotal",
      });
    }
    if (
      Date.parse(summary.completedAt) <
      Date.parse(summary.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "completedAt cannot precede startedAt",
      });
    }
  });
export type WorldQuantFullRoundSummary = z.infer<
  typeof fullRoundSummarySchema
>;

const checkpointVerificationKindSchema = z.enum([
  "unseen",
  "spaced_retest",
  "repeat",
]);

export const checkpointExposureSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }
    const exposure = value as Record<string, unknown>;
    return {
      ...exposure,
      exposureCount: exposure.exposureCount ?? 1,
      verificationKind:
        exposure.verificationKind ?? "repeat",
    };
  },
  z
    .object({
      drillId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      drillVersion: z.literal(1),
      exposedAt: isoTimestampSchema,
      exposureCount: z.number().int().positive().max(10_000),
      verificationKind: checkpointVerificationKindSchema,
    })
    .superRefine((exposure, context) => {
      const drill = worldQuantDrillById(exposure.drillId);
      if (
        !drill ||
        drill.variant !== "checkpoint" ||
        drill.version !== exposure.drillVersion
      ) {
        context.addIssue({
          code: "custom",
          path: ["drillId"],
          message:
            "Exposure must bind an exact checkpoint catalog revision",
        });
      }
    }),
);
export type WorldQuantCheckpointExposure = z.infer<
  typeof checkpointExposureSchema
>;

export const worldQuantTrainingStateSchema = z.object({
  version: z.literal(WORLDQUANT_TRAINING_STATE_VERSION),
  attempts: z.array(drillAttemptSchema).max(300),
  gaps: z.array(competencyGapSchema).max(80),
  repairCards: z.array(repairCardSchema).max(200),
  missionCompletions: z.array(missionCompletionSchema).max(1000),
  fullRounds: z.array(fullRoundSummarySchema).max(100),
  checkpointExposures: z
    .array(checkpointExposureSchema)
    .max(100)
    .default([]),
});

export type WorldQuantTrainingState = z.infer<
  typeof worldQuantTrainingStateSchema
>;

export const EMPTY_WORLDQUANT_TRAINING_STATE: WorldQuantTrainingState = {
  version: WORLDQUANT_TRAINING_STATE_VERSION,
  attempts: [],
  gaps: [],
  repairCards: [],
  missionCompletions: [],
  fullRounds: [],
  checkpointExposures: [],
};

export function worldQuantTrainingStorageKey(
  accountId: string | null,
) {
  return accountId
    ? `recall:worldquant-training:${z.string().uuid().parse(accountId)}:v1`
    : "recall:worldquant-training:local:v1";
}

export function parseWorldQuantTrainingState(
  raw: string | null,
): WorldQuantTrainingState {
  if (!raw) return EMPTY_WORLDQUANT_TRAINING_STATE;
  try {
    const envelope = z
      .object({
        version: z.literal(WORLDQUANT_TRAINING_STATE_VERSION),
      })
      .passthrough()
      .safeParse(JSON.parse(raw));
    if (!envelope.success) return EMPTY_WORLDQUANT_TRAINING_STATE;
    const parsedGaps = validItems(
      unknownArray(envelope.data.gaps),
      competencyGapSchema,
    ).slice(-80);
    const attempts = retainEvidenceAttempts(
      validItems(
        unknownArray(envelope.data.attempts),
        drillAttemptSchema,
      ),
      parsedGaps,
    );
    const checkpointExposures = retainCheckpointExposures(
      validItems(
        unknownArray(envelope.data.checkpointExposures),
        checkpointExposureSchema,
      ),
      parsedGaps,
      attempts,
    );
    const gaps = reconcileGapEvidence(
      parsedGaps,
      attempts,
      checkpointExposures,
    );
    return worldQuantTrainingStateSchema.parse({
      version: WORLDQUANT_TRAINING_STATE_VERSION,
      attempts,
      gaps,
      repairCards: validItems(
        unknownArray(envelope.data.repairCards),
        repairCardSchema,
      ).slice(-200),
      missionCompletions: validItems(
        unknownArray(envelope.data.missionCompletions),
        missionCompletionSchema,
      ).slice(-1000),
      fullRounds: validItems(
        unknownArray(envelope.data.fullRounds),
        fullRoundSummarySchema,
      ).slice(-100),
      checkpointExposures,
    });
  } catch {
    return EMPTY_WORLDQUANT_TRAINING_STATE;
  }
}

export function serializeWorldQuantTrainingState(
  state: WorldQuantTrainingState,
) {
  return JSON.stringify(worldQuantTrainingStateSchema.parse(state));
}

export function addDrillAttempt(
  state: WorldQuantTrainingState,
  attempt: WorldQuantDrillAttempt,
) {
  const validated = drillAttemptSchema.parse(attempt);
  return worldQuantTrainingStateSchema.parse({
    ...state,
    attempts: retainEvidenceAttempts(
      [
        ...state.attempts.filter(
        (item) => item.attemptId !== validated.attemptId,
        ),
        validated,
      ],
      state.gaps,
    ),
  });
}

export function markCheckpointExposed(
  state: WorldQuantTrainingState,
  drillId: string,
  exposedAt: string,
  { allowVerification = true }: { allowVerification?: boolean } = {},
) {
  const drill = worldQuantDrillById(drillId);
  if (!drill || drill.variant !== "checkpoint") {
    throw new Error(`Not a checkpoint drill: ${drillId}`);
  }
  const exactExposure = state.checkpointExposures.find(
    (item) =>
      item.drillId === drill.id &&
      item.drillVersion === drill.version &&
      item.exposedAt === exposedAt,
  );
  if (exactExposure) {
    const collidedExposure = checkpointExposureSchema.parse({
      ...exactExposure,
      exposureCount: exactExposure.exposureCount + 1,
      verificationKind: "repeat",
    });
    return worldQuantTrainingStateSchema.parse({
      ...state,
      checkpointExposures: retainCheckpointExposures(
        state.checkpointExposures.map((item) =>
          item.drillId === drill.id &&
          item.drillVersion === drill.version &&
          item.exposedAt === exposedAt
            ? collidedExposure
            : item,
        ),
        state.gaps,
        state.attempts,
      ),
    });
  }
  const latestExposure = checkpointExposureFor(
    state,
    drill.id,
    drill.version,
  );
  const spacedRetest =
    latestExposure !== null &&
    isCheckpointRetestEligible(state, drill.id, exposedAt);
  const exposure = checkpointExposureSchema.parse({
    drillId,
    drillVersion: drill.version,
    exposedAt,
    exposureCount: (latestExposure?.exposureCount ?? 0) + 1,
    verificationKind: allowVerification
      ? latestExposure
        ? spacedRetest
          ? "spaced_retest"
          : "repeat"
        : "unseen"
      : "repeat",
  });
  return worldQuantTrainingStateSchema.parse({
    ...state,
    checkpointExposures: retainCheckpointExposures(
      [...state.checkpointExposures, exposure],
      state.gaps,
      state.attempts,
    ),
  });
}

export function wasCheckpointExposed(
  state: WorldQuantTrainingState,
  drillId: string,
  drillVersion = 1,
) {
  return state.checkpointExposures.some(
    (item) =>
      item.drillId === drillId &&
      item.drillVersion === drillVersion,
  );
}

export function checkpointExposureFor(
  state: WorldQuantTrainingState,
  drillId: string,
  drillVersion = 1,
) {
  return (
    state.checkpointExposures
      .filter(
        (item) =>
          item.drillId === drillId &&
          item.drillVersion === drillVersion,
      )
      .sort((left, right) =>
        right.exposedAt.localeCompare(left.exposedAt),
      )[0] ?? null
  );
}

export function checkpointExposureForAttempt(
  state: WorldQuantTrainingState,
  drillId: string,
  drillVersion: number,
  startedAt: string,
) {
  return (
    state.checkpointExposures.find(
      (item) =>
        item.drillId === drillId &&
        item.drillVersion === drillVersion &&
        item.exposedAt === startedAt,
    ) ?? null
  );
}

export function isCheckpointRetestEligible(
  state: WorldQuantTrainingState,
  drillId: string,
  at: string,
) {
  const drill = worldQuantDrillById(drillId);
  if (!drill || drill.variant !== "checkpoint") return false;
  const exposure = checkpointExposureFor(
    state,
    drill.id,
    drill.version,
  );
  if (!exposure) return false;
  const elapsed =
    Date.parse(at) - Date.parse(exposure.exposedAt);
  return (
    Number.isFinite(elapsed) &&
    elapsed >= CHECKPOINT_SPACED_RETEST_INTERVAL_MS
  );
}

export function recordCheckpointExposureLocked(
  accountId: string | null,
  drillId: string,
  exposedAt: string,
) {
  const allowVerification = browserStorageLocksSupported();
  return withBrowserStorageLock(
    worldQuantTrainingStorageKey(accountId),
    () => {
      const current = readWorldQuantTrainingState(accountId);
      const drill = worldQuantDrillById(drillId);
      if (!drill || drill.variant !== "checkpoint") {
        throw new Error(`Not a checkpoint drill: ${drillId}`);
      }
      const persisted = writeWorldQuantTrainingState(
        accountId,
        markCheckpointExposed(current, drill.id, exposedAt, {
          allowVerification,
        }),
      );
      if (!persisted) return null;
      const exposure = checkpointExposureForAttempt(
        persisted,
        drill.id,
        drill.version,
        exposedAt,
      );
      return exposure
        ? {
            state: persisted,
            unseen: exposure.verificationKind === "unseen",
            verificationKind: exposure.verificationKind,
          }
        : null;
    },
  );
}

export function upsertCompetencyGap(
  state: WorldQuantTrainingState,
  gap: WorldQuantCompetencyGap,
) {
  const validated = competencyGapSchema.parse(gap);
  return worldQuantTrainingStateSchema.parse({
    ...state,
    gaps: [
      ...state.gaps.filter(
        (item) =>
          item.roleProfileId !== validated.roleProfileId ||
          item.competency !== validated.competency,
      ),
      validated,
    ].slice(-80),
  });
}

export function addRepairCards(
  state: WorldQuantTrainingState,
  cards: readonly WorldQuantRepairCard[],
) {
  const nextById = new Map(
    state.repairCards.map((card) => [card.id, card]),
  );
  cards.forEach((card) =>
    nextById.set(card.id, repairCardSchema.parse(card)),
  );
  return worldQuantTrainingStateSchema.parse({
    ...state,
    repairCards: [...nextById.values()]
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .slice(-200),
  });
}

export function resolveRepairCard(
  state: WorldQuantTrainingState,
  cardId: string,
  resolvedAt: string,
) {
  return worldQuantTrainingStateSchema.parse({
    ...state,
    repairCards: state.repairCards.map((card) =>
      card.id === cardId
        ? { ...card, resolvedAt: isoTimestampSchema.parse(resolvedAt) }
        : card,
    ),
  });
}

export function recordMissionCompletion(
  state: WorldQuantTrainingState,
  completion: WorldQuantMissionCompletion,
) {
  const validated = missionCompletionSchema.parse(completion);
  return worldQuantTrainingStateSchema.parse({
    ...state,
    missionCompletions: [
      ...state.missionCompletions.filter(
        (item) =>
          item.missionId !== validated.missionId ||
          item.itemId !== validated.itemId,
      ),
      validated,
    ].slice(-1000),
  });
}

export function addFullRoundSummary(
  state: WorldQuantTrainingState,
  summary: WorldQuantFullRoundSummary,
) {
  const validated = fullRoundSummarySchema.parse(summary);
  return worldQuantTrainingStateSchema.parse({
    ...state,
    fullRounds: [
      ...state.fullRounds.filter(
        (item) => item.sessionId !== validated.sessionId,
      ),
      validated,
    ].slice(-100),
  });
}

export function mergeWorldQuantTrainingStates(
  ...states: readonly WorldQuantTrainingState[]
): WorldQuantTrainingState {
  const mergedAttempts = unionBy(
    states.flatMap((state) => state.attempts),
    (attempt) => attempt.attemptId,
    (left, right) =>
      left.completedAt >= right.completedAt ? left : right,
  );
  const mergedGaps = unionBy(
    states.flatMap((state) => state.gaps),
    (gap) => `${gap.roleProfileId}:${gap.competency}`,
    newerGap,
  ).slice(-80);
  const attempts = retainEvidenceAttempts(
    mergedAttempts,
    mergedGaps,
  );
  const repairCards = unionBy(
    states.flatMap((state) => state.repairCards),
    (card) => card.id,
    (left, right) => {
      if (left.resolvedAt === null) return right;
      if (right.resolvedAt === null) return left;
      return left.resolvedAt >= right.resolvedAt ? left : right;
    },
  )
    .sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    )
    .slice(-200);
  const missionCompletions = unionBy(
    states.flatMap((state) => state.missionCompletions),
    (completion) =>
      `${completion.missionId}:${completion.itemId}`,
    (left, right) =>
      left.completedAt >= right.completedAt ? left : right,
  ).slice(-1000);
  const fullRounds = unionBy(
    states.flatMap((state) => state.fullRounds),
    (round) => round.sessionId,
    (left, right) =>
      left.completedAt >= right.completedAt ? left : right,
  ).slice(-100);
  const checkpointExposures = retainCheckpointExposures(
    unionBy(
      states.flatMap((state) => state.checkpointExposures),
      checkpointExposureKey,
      (left, right) =>
        left.exposureCount >= right.exposureCount ? left : right,
    ),
    mergedGaps,
    attempts,
  );
  const gaps = reconcileGapEvidence(
    mergedGaps,
    attempts,
    checkpointExposures,
  );
  return worldQuantTrainingStateSchema.parse({
    version: WORLDQUANT_TRAINING_STATE_VERSION,
    attempts,
    gaps,
    repairCards,
    missionCompletions,
    fullRounds,
    checkpointExposures,
  });
}

export function gapForCompetency(
  state: WorldQuantTrainingState,
  roleProfileId: WorldQuantRoleProfileId,
  competency: WorldQuantCompetencyKey,
) {
  return (
    state.gaps.find(
      (gap) =>
        gap.roleProfileId === roleProfileId &&
        gap.competency === competency,
    ) ?? null
  );
}

export function readWorldQuantTrainingState(
  accountId: string | null,
) {
  if (typeof window === "undefined") {
    return EMPTY_WORLDQUANT_TRAINING_STATE;
  }
  try {
    return parseWorldQuantTrainingState(
      window.localStorage.getItem(
        worldQuantTrainingStorageKey(accountId),
      ),
    );
  } catch {
    return EMPTY_WORLDQUANT_TRAINING_STATE;
  }
}

export function readWorldQuantTrainingStateSnapshot(
  accountId: string | null,
) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(
      worldQuantTrainingStorageKey(accountId),
    );
  } catch {
    return null;
  }
}

export function writeWorldQuantTrainingState(
  accountId: string | null,
  state: WorldQuantTrainingState,
) {
  try {
    const merged = mergeWorldQuantTrainingStates(
      readWorldQuantTrainingState(accountId),
      state,
    );
    const serialized = serializeWorldQuantTrainingState(merged);
    window.localStorage.setItem(
      worldQuantTrainingStorageKey(accountId),
      serialized,
    );
    window.dispatchEvent(
      new CustomEvent(WORLDQUANT_TRAINING_CHANGED_EVENT, {
        detail: { accountId },
      }),
    );
    return merged;
  } catch {
    return null;
  }
}

export function writeWorldQuantTrainingStateLocked(
  accountId: string | null,
  state: WorldQuantTrainingState,
) {
  return withBrowserStorageLock(
    worldQuantTrainingStorageKey(accountId),
    () => writeWorldQuantTrainingState(accountId, state),
  );
}

export function mutateWorldQuantTrainingStateLocked<T>(
  accountId: string | null,
  mutation: (
    current: WorldQuantTrainingState,
  ) => { state: WorldQuantTrainingState; value: T },
) {
  return withBrowserStorageLock(
    worldQuantTrainingStorageKey(accountId),
    () => {
      const mutationResult = mutation(
        readWorldQuantTrainingState(accountId),
      );
      const persisted = writeWorldQuantTrainingState(
        accountId,
        mutationResult.state,
      );
      return persisted
        ? { state: persisted, value: mutationResult.value }
        : null;
    },
  );
}

export function subscribeToWorldQuantTrainingState(
  accountId: string | null,
  callback: () => void,
) {
  const key = worldQuantTrainingStorageKey(accountId);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) callback();
  };
  const onLocalChange = (event: Event) => {
    const detail = (event as CustomEvent<{ accountId: string | null }>)
      .detail;
    if (detail?.accountId === accountId) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(
    WORLDQUANT_TRAINING_CHANGED_EVENT,
    onLocalChange,
  );
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(
      WORLDQUANT_TRAINING_CHANGED_EVENT,
      onLocalChange,
    );
  };
}

export function competencyOfConcept(
  conceptId: WorldQuantConceptId,
): WorldQuantCompetencyKey {
  const concept = worldQuantConcepts.find(
    (item) => item.id === conceptId,
  );
  if (!concept) throw new Error(`Unknown curriculum concept: ${conceptId}`);
  return concept.competency;
}

function retainEvidenceAttempts(
  attempts: readonly WorldQuantDrillAttempt[],
  gaps: readonly WorldQuantCompetencyGap[],
) {
  const unique = unionBy(
    attempts,
    (attempt) => attempt.attemptId,
    (left, right) =>
      left.completedAt >= right.completedAt ? left : right,
  ).sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  );
  const pinnedIds = new Set(
    gaps.flatMap((gap) =>
      [gap.practiceAttemptId, gap.verificationAttemptId].filter(
        (attemptId): attemptId is string => attemptId !== null,
      ),
    ),
  );
  const pinned = unique.filter((attempt) =>
    pinnedIds.has(attempt.attemptId),
  );
  const recent = unique
    .filter((attempt) => !pinnedIds.has(attempt.attemptId))
    .slice(-(300 - pinned.length));
  return [...pinned, ...recent].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  );
}

function retainCheckpointExposures(
  exposures: readonly WorldQuantCheckpointExposure[],
  gaps: readonly WorldQuantCompetencyGap[],
  attempts: readonly WorldQuantDrillAttempt[],
) {
  const unique = unionBy(
    exposures,
    checkpointExposureKey,
    (left, right) =>
      left.exposureCount >= right.exposureCount ? left : right,
  ).sort((left, right) =>
    left.exposedAt.localeCompare(right.exposedAt),
  );
  const attemptById = new Map(
    attempts.map((attempt) => [attempt.attemptId, attempt]),
  );
  const pinnedKeys = new Set(
    gaps.flatMap((gap) => {
      const attempt = gap.verificationAttemptId
        ? attemptById.get(gap.verificationAttemptId)
        : null;
      return attempt
        ? [
            checkpointExposureKey({
              drillId: attempt.drillId,
              drillVersion: attempt.drillVersion,
              exposedAt: attempt.startedAt,
            }),
          ]
        : [];
    }),
  );
  const pinned = unique.filter((exposure) =>
    pinnedKeys.has(checkpointExposureKey(exposure)),
  );
  const recent = unique
    .filter(
      (exposure) =>
        !pinnedKeys.has(checkpointExposureKey(exposure)),
    )
    .slice(-(100 - pinned.length));
  return [...pinned, ...recent].sort((left, right) =>
    left.exposedAt.localeCompare(right.exposedAt),
  );
}

function reconcileGapEvidence(
  gaps: readonly WorldQuantCompetencyGap[],
  attempts: readonly WorldQuantDrillAttempt[],
  exposures: readonly WorldQuantCheckpointExposure[],
) {
  const attemptById = new Map(
    attempts.map((attempt) => [attempt.attemptId, attempt]),
  );
  return gaps.map((gap): WorldQuantCompetencyGap => {
    const practiceAttempt = gap.practiceAttemptId
      ? attemptById.get(gap.practiceAttemptId)
      : null;
    const practiceAttemptId =
      practiceAttempt?.variant === "practice" &&
      practiceAttempt.competency === gap.competency &&
      attemptPassedTransferGate(practiceAttempt)
        ? practiceAttempt.attemptId
        : null;
    if (gap.status !== "verified") {
      return {
        ...gap,
        status:
          gap.status === "transfer_ready" &&
          practiceAttemptId === null
            ? "learning"
            : gap.status,
        practiceAttemptId,
      };
    }

    const verificationAttempt = gap.verificationAttemptId
      ? attemptById.get(gap.verificationAttemptId)
      : null;
    const verificationExposure = verificationAttempt
      ? exposures.find(
          (exposure) =>
            exposure.drillId === verificationAttempt.drillId &&
            exposure.drillVersion ===
              verificationAttempt.drillVersion &&
            exposure.exposedAt === verificationAttempt.startedAt,
        )
      : null;
    const verificationExposureIsEligible =
      (verificationExposure?.verificationKind === "unseen" &&
        verificationAttempt?.unseenAtStart === true) ||
      (verificationExposure?.verificationKind ===
        "spaced_retest" &&
        verificationAttempt?.unseenAtStart !== true);
    const verificationIsValid =
      verificationAttempt?.variant === "checkpoint" &&
      verificationAttempt.competency === gap.competency &&
      attemptPassedTransferGate(verificationAttempt) &&
      !verificationAttempt.hintUsed &&
      verificationExposureIsEligible;
    if (verificationIsValid && practiceAttemptId !== null) {
      return {
        ...gap,
        practiceAttemptId,
      };
    }
    return {
      ...gap,
      status:
        practiceAttemptId === null ? "learning" : "transfer_ready",
      practiceAttemptId,
      verificationAttemptId: null,
    };
  });
}

function attemptPassedTransferGate(
  attempt: WorldQuantDrillAttempt,
) {
  return (
    attempt.rubricPassed * 100 >= attempt.rubricTotal * 80 &&
    attempt.followUpsCompleted === 2 &&
    attempt.answerPresent
  );
}

function checkpointExposureKey(
  exposure: Pick<
    WorldQuantCheckpointExposure,
    "drillId" | "drillVersion" | "exposedAt"
  >,
) {
  return `${exposure.drillId}:${exposure.drillVersion}:${exposure.exposedAt}`;
}

function validItems<T>(
  values: readonly unknown[],
  schema: z.ZodType<T>,
) {
  return values.flatMap((value) => {
    const parsed = schema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

function unknownArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function unionBy<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
  choose: (left: T, right: T) => T,
) {
  const result = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    const existing = result.get(key);
    result.set(key, existing ? choose(existing, value) : value);
  }
  return [...result.values()];
}

function newerGap(
  left: WorldQuantCompetencyGap,
  right: WorldQuantCompetencyGap,
) {
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt > right.updatedAt ? left : right;
  }
  const rank: Record<WorldQuantGapStatus, number> = {
    open: 0,
    learning: 1,
    transfer_ready: 2,
    verified: 3,
  };
  return rank[left.status] >= rank[right.status] ? left : right;
}
