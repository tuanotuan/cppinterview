import type { QuestionLearningState } from "@/lib/practice/learning-state";

import {
  buildWorldQuantFocusPlan,
  type WorldQuantFocusPlan,
} from "./focus-plan";
import {
  drillsForCompetency,
  worldQuantDrillById,
  worldQuantDrillPacks,
  type WorldQuantDrill,
} from "./drills";
import {
  isCheckpointRetestEligible,
  wasCheckpointExposed,
  type WorldQuantRepairCard,
  type WorldQuantTrainingState,
} from "./training-state";
import {
  worldQuantCompetencies,
  worldQuantRoleProfileById,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_MISSION_VERSION = 1 as const;

export type WorldQuantMissionItem =
  | {
      id: string;
      kind: "repair";
      competency: WorldQuantCompetencyKey;
      estimatedMinutes: number;
      reason: string;
      repairCard: WorldQuantRepairCard;
    }
  | {
      id: string;
      kind: "flashcards";
      competency: WorldQuantCompetencyKey | null;
      estimatedMinutes: number;
      reason: string;
      focusPlan: WorldQuantFocusPlan;
    }
  | {
      id: string;
      kind: "drill";
      competency: WorldQuantCompetencyKey;
      estimatedMinutes: number;
      reason: string;
      drill: WorldQuantDrill;
    }
  | {
      id: string;
      kind: "mock";
      competency: WorldQuantCompetencyKey | null;
      estimatedMinutes: number;
      reason: string;
      href: string;
      roleProfileVersion: 1;
      durationMinutes: 30;
      mode: "balanced";
      targetCompetency: null;
    }
  | {
      id: string;
      kind: "content_gap";
      competency: WorldQuantCompetencyKey;
      estimatedMinutes: 0;
      reason: string;
      href: string | null;
    };

export type WorldQuantMission = {
  version: typeof WORLDQUANT_MISSION_VERSION;
  missionId: string;
  date: string;
  roleProfileId: WorldQuantRoleProfileId;
  timeBudgetMinutes: number;
  plannedMinutes: number;
  primaryCompetency: WorldQuantCompetencyKey;
  items: WorldQuantMissionItem[];
};

export function buildWorldQuantMission({
  roleProfileId,
  questions,
  states,
  trainingState,
  today,
  timeBudgetMinutes,
  daysSinceComparableMock = null,
  mockAvailable = true,
}: {
  roleProfileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  states: ReadonlyMap<string, QuestionLearningState>;
  trainingState: WorldQuantTrainingState;
  today: string;
  timeBudgetMinutes: number;
  daysSinceComparableMock?: number | null;
  mockAvailable?: boolean;
}): WorldQuantMission {
  const budget = clamp(Math.round(timeBudgetMinutes), 15, 120);
  const profile = worldQuantRoleProfileById(roleProfileId);
  const gaps = trainingState.gaps.filter(
    (gap) =>
      gap.roleProfileId === roleProfileId &&
      gap.status !== "verified" &&
      profile.weights[gap.competency] > 0,
  );
  const primaryCompetency =
    [...gaps].sort(
      (left, right) =>
        gapPriority(left.status) - gapPriority(right.status) ||
        profile.weights[right.competency] -
          profile.weights[left.competency] ||
        left.updatedAt.localeCompare(right.updatedAt),
    )[0]?.competency ??
    selectLeastPracticedCompetency(roleProfileId, trainingState);
  const items: WorldQuantMissionItem[] = [];
  let remaining = budget;

  const dueRepairs = trainingState.repairCards
    .filter(
      (card) =>
        card.resolvedAt === null &&
        card.dueOn <= today &&
        profile.weights[card.competency] > 0,
    )
    .sort(
      (left, right) =>
        left.dueOn.localeCompare(right.dueOn) ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, Math.min(2, Math.floor(remaining / 3)));
  for (const card of dueRepairs) {
    items.push({
      id: `repair:${card.id}`,
      kind: "repair",
      competency: card.competency,
      estimatedMinutes: 3,
      reason: "Một tiêu chí chấm từng bị thiếu và đã đến lúc cần nhớ lại.",
      repairCard: card,
    });
    remaining -= 3;
  }

  const focusBudget = Math.max(
    5,
    Math.min(remaining, Math.round(budget * 0.45)),
  );
  const focusPlan = buildWorldQuantFocusPlan({
    profileId: roleProfileId,
    questions,
    states,
    today,
    timeBudgetMinutes: focusBudget,
    focusCompetency: primaryCompetency,
  });
  const missionFocusQuestions = focusPlan.questions.reduce(
    (selected, item) => {
      const selectedMinutes = selected.reduce(
        (sum, current) =>
          sum + current.question.estimatedMinutes,
        0,
      );
      return selectedMinutes + item.question.estimatedMinutes <=
        remaining
        ? [...selected, item]
        : selected;
    },
    [] as typeof focusPlan.questions,
  );
  const hasCanonicalApprovedFocusContent = questions.some(
    (question) =>
      question.competency === primaryCompetency &&
      question.validation !== "personal_remediation" &&
      profile.weights[question.competency] > 0,
  );
  if (missionFocusQuestions.length > 0) {
    const focusMinutes = missionFocusQuestions.reduce(
      (sum, item) => sum + item.question.estimatedMinutes,
      0,
    );
    const missionFocusPlan: WorldQuantFocusPlan = {
      ...focusPlan,
      scheduledMinutes: focusMinutes,
      questions: missionFocusQuestions,
    };
    items.push({
      id: `flashcards:${roleProfileId}:${today}:${primaryCompetency}`,
      kind: "flashcards",
      competency: primaryCompetency,
      estimatedMinutes: focusMinutes,
      reason:
        "Ôn đúng các thẻ đã duyệt trước khi chuyển sang bài vận dụng.",
      focusPlan: missionFocusPlan,
    });
    remaining -= focusMinutes;
  }
  if (!hasCanonicalApprovedFocusContent) {
    const definition = worldQuantCompetencies[primaryCompetency];
    items.push({
      id: `content-gap:${primaryCompetency}`,
      kind: "content_gap",
      competency: primaryCompetency,
      estimatedMinutes: 0,
      reason: `Kho câu hỏi chưa có thẻ đã duyệt phù hợp cho ${definition.shortLabel}; đây là phần học liệu còn thiếu, không phải điểm yếu cá nhân.`,
      href: definition.practiceHref,
    });
  }

  const drill = selectMissionDrill({
    roleProfileId,
    competency: primaryCompetency,
    trainingState,
    today,
  });
  if (drill && remaining >= drill.estimatedMinutes) {
    items.push({
      id: `drill:${drill.id}`,
      kind: "drill",
      competency: drill.competency,
      estimatedMinutes: drill.estimatedMinutes,
      reason:
        drill.variant === "checkpoint"
          ? "Năng lực đã sẵn sàng để xác nhận; dùng đề bài chưa từng làm để kiểm tra."
          : "Chuyển việc nhớ kiến thức thành giải thích, gỡ lỗi hoặc viết mã có câu hỏi tiếp nối.",
      drill,
    });
    remaining -= drill.estimatedMinutes;
  }

  const allRoleGapsVerified =
    trainingState.gaps.some(
      (gap) => gap.roleProfileId === roleProfileId,
    ) &&
    trainingState.gaps
      .filter((gap) => gap.roleProfileId === roleProfileId)
      .every((gap) => gap.status === "verified");
  if (
    mockAvailable &&
    daysSinceComparableMock !== 0 &&
    (daysSinceComparableMock === null ||
      daysSinceComparableMock >= 7 ||
      allRoleGapsVerified) &&
    remaining >= 30
  ) {
    items.push({
      id: `mock:${roleProfileId}:v1:balanced:30`,
      kind: "mock",
      competency: null,
      estimatedMinutes: 30,
      reason:
        "Bài kiểm tra định kỳ; kết quả phỏng vấn thử vẫn tách khỏi Chỉ số chuẩn bị.",
      href: `/mock-interview?role=${roleProfileId}&mode=balanced&duration=30`,
      roleProfileVersion: 1,
      durationMinutes: 30,
      mode: "balanced",
      targetCompetency: null,
    });
    remaining -= 30;
  }

  return {
    version: WORLDQUANT_MISSION_VERSION,
    missionId: worldQuantMissionId({
      date: today,
      roleProfileId,
      timeBudgetMinutes: budget,
      primaryCompetency,
      items,
    }),
    date: today,
    roleProfileId,
    timeBudgetMinutes: budget,
    plannedMinutes: items.reduce(
      (sum, item) => sum + item.estimatedMinutes,
      0,
    ),
    primaryCompetency,
    items,
  };
}

export function worldQuantMissionId({
  date,
  roleProfileId,
  timeBudgetMinutes,
  primaryCompetency,
  items,
}: {
  date: string;
  roleProfileId: WorldQuantRoleProfileId;
  timeBudgetMinutes: number;
  primaryCompetency: WorldQuantCompetencyKey;
  items: readonly WorldQuantMissionItem[];
}) {
  return `wq-mission-v1:${date}:${roleProfileId}:${timeBudgetMinutes}:${primaryCompetency}:${missionFingerprint(items)}`;
}

export function selectMissionDrill({
  roleProfileId,
  competency,
  trainingState,
  today,
}: {
  roleProfileId: WorldQuantRoleProfileId;
  competency: WorldQuantCompetencyKey;
  trainingState: WorldQuantTrainingState;
  today: string;
}) {
  const gap = trainingState.gaps.find(
    (item) =>
      item.roleProfileId === roleProfileId &&
      item.competency === competency,
  );
  const candidateVariant =
    gap?.status === "transfer_ready" ? "checkpoint" : "practice";
  const candidates = drillsForCompetency(competency).filter(
    (drill) => drill.variant === candidateVariant,
  );
  const availableToday = candidates.filter(
    (drill) =>
      !trainingState.attempts.some(
        (attempt) =>
          worldQuantAttemptMatchesDrill(attempt, drill) &&
          vietnamDateKey(new Date(attempt.completedAt)) === today,
      ),
  );
  const neverAttempted = availableToday.find(
    (drill) =>
      !trainingState.attempts.some(
        (attempt) => worldQuantAttemptMatchesDrill(attempt, drill),
      ) &&
      (drill.variant !== "checkpoint" ||
        !wasCheckpointExposed(
          trainingState,
          drill.id,
          drill.version,
        )),
  );
  if (neverAttempted) return neverAttempted;
  if (candidateVariant === "checkpoint") {
    const conservativeDayStart = `${today}T00:00:00+07:00`;
    return (
      availableToday.find((drill) =>
        isCheckpointRetestEligible(
          trainingState,
          drill.id,
          conservativeDayStart,
        ),
      ) ?? null
    );
  }
  return availableToday[0] ?? null;
}

function selectLeastPracticedCompetency(
  roleProfileId: WorldQuantRoleProfileId,
  trainingState: WorldQuantTrainingState,
) {
  const profile = worldQuantRoleProfileById(roleProfileId);
  return worldQuantDrillPacks
    .filter((drillPack) => profile.weights[drillPack.competency] > 0)
    .map((drillPack) => ({
      competency: drillPack.competency,
      count: trainingState.attempts.filter((attempt) => {
        const current = worldQuantDrillById(attempt.drillId);
        return (
          attempt.competency === drillPack.competency &&
          current !== null &&
          worldQuantAttemptMatchesDrill(attempt, current)
        );
      }).length,
      weight: profile.weights[drillPack.competency],
    }))
    .sort(
      (left, right) =>
        left.count - right.count ||
        right.weight - left.weight ||
        left.competency.localeCompare(right.competency),
    )[0].competency;
}

function gapPriority(status: string) {
  return {
    open: 0,
    learning: 1,
    transfer_ready: 2,
    verified: 3,
  }[status] ?? 4;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function worldQuantAttemptMatchesDrill(
  attempt: { drillId: string; drillVersion: number },
  drill: { id: string; version: number },
) {
  return (
    attempt.drillId === drill.id &&
    attempt.drillVersion === drill.version
  );
}

function vietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function missionFingerprint(items: readonly WorldQuantMissionItem[]) {
  const signature = items
    .map((item) => {
      if (item.kind === "flashcards") {
        return `${item.id}:${item.focusPlan.questions
          .map(
            (planned) =>
              `${planned.question.id}@${planned.question.version}:${planned.question.sourceHash}`,
          )
          .join(",")}`;
      }
      if (item.kind === "repair") {
        return `${item.id}:${item.repairCard.sourceAttemptId}`;
      }
      if (item.kind === "drill") {
        return `${item.id}@${item.drill.version}`;
      }
      return `${item.id}:${item.href ?? "none"}`;
    })
    .join("|");
  let hash = 2166136261;
  for (const character of signature) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
