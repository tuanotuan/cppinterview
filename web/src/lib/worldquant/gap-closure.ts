import {
  addDrillAttempt,
  addRepairCards,
  checkpointExposureForAttempt,
  gapForCompetency,
  upsertCompetencyGap,
  type WorldQuantCompetencyGap,
  type WorldQuantDrillAttempt,
  type WorldQuantRepairCard,
  type WorldQuantTrainingState,
} from "./training-state";
import { worldQuantDrillById } from "./drills";
import type {
  WorldQuantCompetencyKey,
  WorldQuantRoleProfileId,
} from "./readiness";

export const GAP_OPEN_SCORE_THRESHOLD = 70;
export const GAP_VERIFY_SCORE_THRESHOLD = 80;

export type MockGapEvidence = {
  attemptId: string;
  completedAt: string;
  roleProfileId: WorldQuantRoleProfileId;
  competency: WorldQuantCompetencyKey;
  status: "assessed" | "not_assessed";
  score: number | null;
  unseen: boolean;
};

export type DrillCompletionInput = {
  attempt: WorldQuantDrillAttempt;
  roleProfileId: WorldQuantRoleProfileId;
  failedRubricIndexes: readonly number[];
  now: string;
  today: string;
  createId: () => string;
};

export type DrillCompletionResult = {
  state: WorldQuantTrainingState;
  gap: WorldQuantCompetencyGap | null;
  repairCards: WorldQuantRepairCard[];
  passed: boolean;
  unseenCheckpoint: boolean;
  checkpointVerificationKind:
    | "unseen"
    | "spaced_retest"
    | "repeat"
    | null;
};

export function openOrReconcileGapFromMock(
  state: WorldQuantTrainingState,
  evidence: MockGapEvidence,
): WorldQuantTrainingState {
  if (
    evidence.status !== "assessed" ||
    evidence.score === null
  ) {
    return state;
  }
  const existing = gapForCompetency(
    state,
    evidence.roleProfileId,
    evidence.competency,
  );
  if (
    existing &&
    Date.parse(evidence.completedAt) <=
      Date.parse(existing.updatedAt)
  ) {
    return state;
  }
  if (evidence.score < GAP_OPEN_SCORE_THRESHOLD) {
    return upsertCompetencyGap(state, {
      roleProfileId: evidence.roleProfileId,
      roleProfileVersion: 1,
      competency: evidence.competency,
      status: "open",
      openedAt: existing?.openedAt ?? evidence.completedAt,
      updatedAt: evidence.completedAt,
      sourceKind: "mock",
      sourceId: evidence.attemptId,
      sourceScore: evidence.score,
      practiceAttemptId: null,
      verificationAttemptId: null,
    });
  }
  return state;
}

export function completeDrillAndReconcileGap(
  state: WorldQuantTrainingState,
  input: DrillCompletionInput,
): DrillCompletionResult {
  const drill = worldQuantDrillById(input.attempt.drillId);
  if (!drill) {
    throw new Error(`Unknown drill: ${input.attempt.drillId}`);
  }
  if (input.attempt.drillVersion !== drill.version) {
    throw new Error(
      `Stale drill revision: ${input.attempt.drillId}@${input.attempt.drillVersion}`,
    );
  }
  const checkpointExposure = checkpointExposureForAttempt(
    state,
    drill.id,
    drill.version,
    input.attempt.startedAt,
  );
  const checkpointVerificationKind =
    drill.variant === "checkpoint"
      ? (checkpointExposure?.verificationKind ?? null)
      : null;
  const unseenCheckpoint =
    checkpointVerificationKind === "unseen" &&
    input.attempt.unseenAtStart === true &&
    checkpointExposure?.exposedAt === input.attempt.startedAt;
  const checkpointVerificationEligible =
    unseenCheckpoint ||
    (checkpointVerificationKind === "spaced_retest" &&
      input.attempt.unseenAtStart !== true);
  const score = Math.round(
    (input.attempt.rubricPassed / input.attempt.rubricTotal) * 100,
  );
  const passed =
    score >= GAP_VERIFY_SCORE_THRESHOLD &&
    input.attempt.followUpsCompleted === 2 &&
    input.attempt.answerPresent;
  let next = addDrillAttempt(state, input.attempt);
  const existing = gapForCompetency(
    next,
    input.roleProfileId,
    drill.competency,
  );
  let gap = existing;

  if (existing) {
    const nextStatus = statusAfterDrill({
      current: existing.status,
      variant: drill.variant,
      passed,
      checkpointVerificationEligible,
      hintUsed: input.attempt.hintUsed,
    });
    gap = {
      ...existing,
      status: nextStatus,
      updatedAt: input.now,
      sourceKind: "drill",
      sourceId: input.attempt.attemptId,
      sourceScore: score,
      practiceAttemptId:
        drill.variant === "practice"
          ? input.attempt.attemptId
          : existing.practiceAttemptId,
      verificationAttemptId:
        nextStatus === "verified"
          ? existing.status === "verified"
            ? existing.verificationAttemptId
            : input.attempt.attemptId
          : null,
    };
    next = upsertCompetencyGap(next, gap);
  } else if (!passed || drill.variant === "practice") {
    gap = {
      roleProfileId: input.roleProfileId,
      roleProfileVersion: 1,
      competency: drill.competency,
      status: passed ? "transfer_ready" : "learning",
      openedAt: input.now,
      updatedAt: input.now,
      sourceKind: "drill",
      sourceId: input.attempt.attemptId,
      sourceScore: score,
      practiceAttemptId:
        drill.variant === "practice"
          ? input.attempt.attemptId
          : null,
      verificationAttemptId: null,
    };
    next = upsertCompetencyGap(next, gap);
  }

  const repairCards = buildDrillRepairCards({
    attempt: input.attempt,
    failedRubricIndexes: input.failedRubricIndexes,
    today: input.today,
    now: input.now,
    createId: input.createId,
  });
  next = addRepairCards(next, repairCards);

  return {
    state: next,
    gap,
    repairCards,
    passed,
    unseenCheckpoint,
    checkpointVerificationKind,
  };
}

export function buildDrillRepairCards({
  attempt,
  failedRubricIndexes,
  today,
  now,
  createId,
}: {
  attempt: WorldQuantDrillAttempt;
  failedRubricIndexes: readonly number[];
  today: string;
  now: string;
  createId: () => string;
}): WorldQuantRepairCard[] {
  const drill = worldQuantDrillById(attempt.drillId);
  if (!drill) throw new Error(`Unknown drill: ${attempt.drillId}`);
  const normalizedIndexes = [...new Set(failedRubricIndexes)];
  if (
    normalizedIndexes.length !== failedRubricIndexes.length ||
    normalizedIndexes.some(
      (index) =>
        !Number.isInteger(index) ||
        index < 0 ||
        index >= drill.rubric.length,
    ) ||
    normalizedIndexes.length !==
      attempt.rubricTotal - attempt.rubricPassed
  ) {
    throw new Error(
      "Failed rubric evidence must match the exact unchecked atoms",
    );
  }
  return normalizedIndexes
    .map((index, position) => ({
      id: createId(),
      sourceAttemptId: attempt.attemptId,
      competency: drill.competency,
      conceptId:
        drill.conceptIds[position % drill.conceptIds.length],
      prompt: `Tự giải thích bằng ví dụ mới: ${drill.rubric[index]}`,
      explanation: `Tiêu chí còn thiếu từ bài luyện “${drill.title}”. Không dùng lại nguyên câu trả lời cũ.`,
      createdAt: now,
      dueOn: addDays(today, position === 0 ? 1 : 2),
      resolvedAt: null,
    }));
}

function statusAfterDrill({
  current,
  variant,
  passed,
  checkpointVerificationEligible,
  hintUsed,
}: {
  current: WorldQuantCompetencyGap["status"];
  variant: WorldQuantDrillAttempt["variant"];
  passed: boolean;
  checkpointVerificationEligible: boolean;
  hintUsed: boolean;
}): WorldQuantCompetencyGap["status"] {
  if (current === "verified" && passed) return "verified";
  if (
    variant === "checkpoint" &&
    passed &&
    checkpointVerificationEligible &&
    !hintUsed &&
    current === "transfer_ready"
  ) {
    return "verified";
  }
  if (variant === "practice" && passed) return "transfer_ready";
  return "learning";
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
