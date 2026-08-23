import { z } from "zod";

import { practiceDeckSchema } from "../content/schema";
import type { EvidenceProjection } from "../evidence/engine";
import type { QuestionLearningState } from "../practice/learning-state";

import {
  buildWorldQuantReadiness,
  isValidReadinessDateKey,
  learningEvidence,
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfileIds,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_FOCUS_PLAN_VERSION = 1 as const;
export const MAX_FOCUS_QUESTION_STEPS = 20;

const queueReasons = [
  "evidence_repair",
  "due_relearning",
  "due_leech",
  "due",
  "evidence_refresh",
  "relearning",
  "leech",
  "learning",
  "new",
] as const;

const competencySchema = z.enum(worldQuantCompetencyKeys);
const roleProfileSchema = z.enum(worldQuantRoleProfileIds);
const gapKindSchema = z.enum(["content", "mixed"]);

export const focusQuestionRefSchema = z
  .object({
    id: z.string().min(1).max(160),
    version: z.number().int().positive(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    deckId: practiceDeckSchema,
    estimatedMinutes: z.number().int().min(1).max(15),
  })
  .strict();

export const focusQuestionStepSchema = z
  .object({
    question: focusQuestionRefSchema,
    competency: competencySchema,
    queueReason: z.enum(queueReasons),
    evidence: z.number().min(0).max(1),
  })
  .strict();

const focusGuideFallbackSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("guide"),
      competency: competencySchema,
      gapKind: gapKindSchema,
      href: z.string().startsWith("/learn/"),
      label: z.string().min(1).max(160),
    })
    .strict(),
  z
    .object({
      kind: z.literal("content_gap"),
      competency: competencySchema,
      gapKind: gapKindSchema,
      href: z.null(),
      label: z.string().min(1).max(160),
    })
    .strict(),
]);

export const focusPlanSchema = z
  .object({
    version: z.literal(WORLDQUANT_FOCUS_PLAN_VERSION),
    profileId: roleProfileSchema,
    profileVersion: z.union([z.literal(1), z.literal(2)]),
    createdOn: z.string().refine(isValidReadinessDateKey),
    focusCompetency: competencySchema.nullable(),
    requestedMinutes: z.number().int().positive().max(480),
    budgetCeilingMinutes: z.number().int().positive().max(528),
    scheduledMinutes: z.number().int().nonnegative().max(528),
    questions: z.array(focusQuestionStepSchema).max(MAX_FOCUS_QUESTION_STEPS),
    fallbacks: z.array(focusGuideFallbackSchema).max(
      worldQuantCompetencyKeys.length,
    ),
  })
  .strict()
  .superRefine((plan, context) => {
    const expectedCeiling = focusBudgetCeiling(plan.requestedMinutes);
    if (plan.budgetCeilingMinutes !== expectedCeiling) {
      context.addIssue({
        code: "custom",
        path: ["budgetCeilingMinutes"],
        message: "Focus-plan budget ceiling must be exactly 110% rounded down",
      });
    }

    const scheduledMinutes = plan.questions.reduce(
      (sum, step) => sum + step.question.estimatedMinutes,
      0,
    );
    if (plan.scheduledMinutes !== scheduledMinutes) {
      context.addIssue({
        code: "custom",
        path: ["scheduledMinutes"],
        message: "Scheduled minutes must equal the ordered question total",
      });
    }
    if (scheduledMinutes > plan.budgetCeilingMinutes) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Focus-plan questions exceed the 110% budget ceiling",
      });
    }

    const questionIds = plan.questions.map((step) => step.question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Focus-plan questions must be unique",
      });
    }

    const fallbackKeys = plan.fallbacks.map(
      (fallback) => fallback.competency,
    );
    if (new Set(fallbackKeys).size !== fallbackKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["fallbacks"],
        message: "Focus-plan fallbacks must be unique by competency",
      });
    }

    if (
      plan.focusCompetency &&
      (plan.questions.some(
        (step) => step.competency !== plan.focusCompetency,
      ) ||
        plan.fallbacks.some(
          (fallback) => fallback.competency !== plan.focusCompetency,
        ))
    ) {
      context.addIssue({
        code: "custom",
        path: ["focusCompetency"],
        message: "An explicit focus plan must contain only that competency",
      });
    }
  });

export type FocusQuestionRef = z.infer<typeof focusQuestionRefSchema>;
export type FocusQuestionStep = z.infer<typeof focusQuestionStepSchema>;
export type FocusGuideFallback = z.infer<typeof focusGuideFallbackSchema>;
export type WorldQuantFocusPlan = z.infer<typeof focusPlanSchema>;
export type FocusQueueReason = FocusQuestionStep["queueReason"];

type FocusCandidate = FocusQuestionStep & {
  rank: number;
  gapContribution: number;
  dueOn: string | null;
};

export function buildWorldQuantFocusPlan({
  profileId,
  questions,
  states,
  today,
  timeBudgetMinutes,
  focusCompetency = null,
  attemptEvidence,
}: {
  profileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  states: ReadonlyMap<string, QuestionLearningState>;
  today: string;
  timeBudgetMinutes: number;
  focusCompetency?: WorldQuantCompetencyKey | null;
  attemptEvidence?: EvidenceProjection;
}): WorldQuantFocusPlan {
  const profile = worldQuantRoleProfileById(profileId);
  const requestedMinutes = normalizeTimeBudget(timeBudgetMinutes);
  const budgetCeilingMinutes = focusBudgetCeiling(requestedMinutes);
  const readiness = buildWorldQuantReadiness({
    profileId,
    questions,
    states,
    today,
    attemptEvidence,
  });
  const competencyReadiness = new Map(
    readiness.competencies.map((competency) => [
      competency.key,
      competency,
    ]),
  );
  const attemptEvidenceByCompetency = new Map(
    (attemptEvidence?.competencies ?? []).map((competency) => [
      competency.key,
      competency,
    ]),
  );
  const candidates = questions
    .filter(
      (question) =>
        profile.weights[question.competency] > 0 &&
        (!focusCompetency || question.competency === focusCompetency),
    )
    .flatMap((question): FocusCandidate[] => {
      const mappedState = states.get(question.id);
      const state =
        mappedState?.questionId === question.id ? mappedState : undefined;
      if (state?.suspended || state?.lastReviewedOn === today) return [];

      const competencyEvidence = attemptEvidenceByCompetency.get(
        question.competency,
      );
      const evidenceReason = competencyEvidence?.recommendedQuestionIds.includes(
        question.id,
      )
        ? competencyEvidence.nextAction === "repair"
          ? "evidence_repair"
          : competencyEvidence.nextAction === "refresh"
            ? "evidence_refresh"
            : null
        : null;
      const priority = focusPriority(state, today, evidenceReason);
      if (!priority) return [];

      return [
        {
          question: exactQuestionRef(question),
          competency: question.competency,
          queueReason: priority.reason,
          evidence: learningEvidence(state),
          rank: priority.rank,
          gapContribution:
            competencyReadiness.get(question.competency)?.gapContribution ?? 0,
          dueOn: state?.dueOn ?? null,
        },
      ];
    })
    .sort(compareFocusCandidates);

  const selected: FocusQuestionStep[] = [];
  let scheduledMinutes = 0;
  for (const candidate of candidates) {
    if (selected.length >= MAX_FOCUS_QUESTION_STEPS) break;
    if (
      scheduledMinutes + candidate.question.estimatedMinutes >
      budgetCeilingMinutes
    ) {
      continue;
    }
    const step: FocusQuestionStep = {
      question: candidate.question,
      competency: candidate.competency,
      queueReason: candidate.queueReason,
      evidence: candidate.evidence,
    };
    selected.push(step);
    scheduledMinutes += step.question.estimatedMinutes;
  }

  const fallbackCompetencies = readiness.competencies
    .filter(
      (competency) =>
        competency.weight > 0 &&
        (competency.gapKind === "content" ||
          competency.gapKind === "mixed") &&
        (!focusCompetency || competency.key === focusCompetency),
    )
    .sort(
      (left, right) =>
        right.gapContribution - left.gapContribution ||
        left.key.localeCompare(right.key),
    );
  const fallbacks: FocusGuideFallback[] = fallbackCompetencies.map(
    (competency) => {
      const definition = worldQuantCompetencies[competency.key];
      if (definition.practiceHref.startsWith("/learn/")) {
        return {
          kind: "guide",
          competency: competency.key,
          gapKind: competency.gapKind as "content" | "mixed",
          href: definition.practiceHref,
          label: definition.practiceLabel,
        };
      }
      return {
        kind: "content_gap",
        competency: competency.key,
        gapKind: competency.gapKind as "content" | "mixed",
        href: null,
        label: `Kho câu hỏi chưa đủ học liệu cho ${definition.shortLabel}`,
      };
    },
  );

  return focusPlanSchema.parse({
    version: WORLDQUANT_FOCUS_PLAN_VERSION,
    profileId,
    profileVersion: profile.version,
    createdOn: today,
    focusCompetency,
    requestedMinutes,
    budgetCeilingMinutes,
    scheduledMinutes,
    questions: selected,
    fallbacks,
  });
}

function exactQuestionRef(
  question: ReadinessQuestionSummary,
): FocusQuestionRef {
  return {
    id: question.id,
    version: question.version,
    sourceHash: question.sourceHash,
    deckId: question.deckId,
    estimatedMinutes: question.estimatedMinutes,
  };
}

function focusPriority(
  state: QuestionLearningState | undefined,
  today: string,
  evidenceReason: "evidence_repair" | "evidence_refresh" | null,
): { rank: number; reason: FocusQueueReason } | null {
  if (evidenceReason === "evidence_repair") {
    return { rank: 0, reason: evidenceReason };
  }

  const due = Boolean(state?.dueOn && state.dueOn <= today);
  if (due && state?.state === "relearning") {
    return { rank: 1, reason: "due_relearning" };
  }
  if (due && state?.leech) return { rank: 2, reason: "due_leech" };
  if (due) return { rank: 3, reason: "due" };
  if (evidenceReason === "evidence_refresh") {
    return { rank: 4, reason: evidenceReason };
  }
  if (!state || state.state === "new") return { rank: 8, reason: "new" };
  if (state.state === "relearning") {
    return { rank: 5, reason: "relearning" };
  }
  if (state.leech) return { rank: 6, reason: "leech" };
  if (state.state === "learning") {
    return { rank: 7, reason: "learning" };
  }
  return null;
}

function compareFocusCandidates(
  left: FocusCandidate,
  right: FocusCandidate,
) {
  return (
    left.rank - right.rank ||
    right.gapContribution - left.gapContribution ||
    left.evidence - right.evidence ||
    (left.dueOn ?? "9999-12-31").localeCompare(
      right.dueOn ?? "9999-12-31",
    ) ||
    left.competency.localeCompare(right.competency) ||
    left.question.id.localeCompare(right.question.id)
  );
}

function normalizeTimeBudget(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(480, Math.max(1, Math.floor(value)));
}

function focusBudgetCeiling(requestedMinutes: number) {
  return Math.floor((requestedMinutes * 11) / 10);
}
