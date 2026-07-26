import { z } from "zod";

import {
  contentLanguageSchema,
  contentTrackSchema,
  languageForTrack,
  questionResponseModeSchema,
} from "../content/schema";
import {
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfileIds,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "../worldquant/readiness";

export const WORLDQUANT_TARGETED_MOCK_PLAN_VERSION = 1 as const;
export const MAX_TARGETED_MOCK_QUESTIONS = 8;

export const targetedMockModes = ["balanced", "targeted"] as const;
export type TargetedMockMode = (typeof targetedMockModes)[number];

export const targetedMockDurations = [30, 45, 60] as const;
export type TargetedMockDuration =
  (typeof targetedMockDurations)[number];

export const targetedMockVariants = [1, 2] as const;
export type TargetedMockVariant = (typeof targetedMockVariants)[number];

const kebabIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
const competencySchema = z.enum(worldQuantCompetencyKeys);
const roleProfileSchema = z.enum(worldQuantRoleProfileIds);
const durationSchema = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);
const variantSchema = z.union([z.literal(1), z.literal(2)]);

export const targetedMockQuestionRefSchema = z
  .object({
    id: kebabIdSchema,
    origin: z.enum(["question_bank", "role_profile"]),
    version: z.number().int().positive(),
    contentRevision: z.string().trim().min(1).max(128),
    estimatedMinutes: z.number().int().min(1).max(15),
    responseMode: questionResponseModeSchema,
    language: contentLanguageSchema,
    track: contentTrackSchema,
    execution: z
      .object({
        specRevision: z.number().int().positive(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((question, context) => {
    if (languageForTrack(question.track) !== question.language) {
      context.addIssue({
        code: "custom",
        path: ["track"],
        message: "Question language and track must agree",
      });
    }
    if (question.execution && question.responseMode !== "code") {
      context.addIssue({
        code: "custom",
        path: ["execution"],
        message: "Only code questions can reference an execution spec",
      });
    }
  });

export const targetedMockCandidateSchema = z
  .object({
    question: targetedMockQuestionRefSchema,
    readinessCompetency: competencySchema,
  })
  .strict();

export const targetedMockContentGapSchema = z
  .object({
    competency: competencySchema,
    reason: z.literal("no_eligible_question"),
  })
  .strict();

export const targetedMockPlanSchema = z
  .object({
    version: z.literal(WORLDQUANT_TARGETED_MOCK_PLAN_VERSION),
    profileId: roleProfileSchema,
    profileVersion: z.literal(1),
    mode: z.enum(targetedMockModes),
    targetCompetency: competencySchema.nullable(),
    variant: variantSchema,
    durationMinutes: durationSchema,
    scheduledMinutes: z.number().int().nonnegative().max(60),
    questions: z
      .array(targetedMockCandidateSchema)
      .max(MAX_TARGETED_MOCK_QUESTIONS),
    contentGaps: z
      .array(targetedMockContentGapSchema)
      .max(worldQuantCompetencyKeys.length),
  })
  .strict()
  .superRefine((plan, context) => {
    if (
      (plan.mode === "targeted" && plan.targetCompetency === null) ||
      (plan.mode === "balanced" && plan.targetCompetency !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetCompetency"],
        message:
          "Targeted plans require one competency; balanced plans require none",
      });
    }

    const profile = worldQuantRoleProfileById(plan.profileId);
    if (
      plan.targetCompetency &&
      profile.weights[plan.targetCompetency] <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetCompetency"],
        message: "Target competency must have positive weight for the role",
      });
    }

    const scheduledMinutes = plan.questions.reduce(
      (sum, candidate) => sum + candidate.question.estimatedMinutes,
      0,
    );
    if (scheduledMinutes !== plan.scheduledMinutes) {
      context.addIssue({
        code: "custom",
        path: ["scheduledMinutes"],
        message: "Scheduled minutes must equal the ordered question total",
      });
    }
    if (scheduledMinutes > plan.durationMinutes) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Mock questions exceed the requested duration",
      });
    }

    const seen = new Set<string>();
    plan.questions.forEach((candidate, index) => {
      const identity = logicalQuestionIdentity(candidate.question);
      if (seen.has(identity)) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "question", "id"],
          message: "Mock questions must have globally unique raw IDs",
        });
      }
      seen.add(identity);

      if (profile.weights[candidate.readinessCompetency] <= 0) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "readinessCompetency"],
          message: "Question competency must have positive role weight",
        });
      }
      if (
        plan.targetCompetency &&
        candidate.readinessCompetency !== plan.targetCompetency
      ) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "readinessCompetency"],
          message: "Targeted plans may assess only their target competency",
        });
      }
    });

    const gapCompetencies = plan.contentGaps.map(
      (gap) => gap.competency,
    );
    if (new Set(gapCompetencies).size !== gapCompetencies.length) {
      context.addIssue({
        code: "custom",
        path: ["contentGaps"],
        message: "Content gaps must be unique by competency",
      });
    }
  });

export type TargetedMockQuestionRef = z.infer<
  typeof targetedMockQuestionRefSchema
>;
export type TargetedMockCandidate = z.infer<
  typeof targetedMockCandidateSchema
>;
export type TargetedMockContentGap = z.infer<
  typeof targetedMockContentGapSchema
>;
export type TargetedMockPlan = z.infer<typeof targetedMockPlanSchema>;

export function buildWorldQuantTargetedMockPlan({
  profileId,
  mode,
  targetCompetency = null,
  variant = 1,
  durationMinutes,
  candidates,
}: {
  profileId: WorldQuantRoleProfileId;
  mode: TargetedMockMode;
  targetCompetency?: WorldQuantCompetencyKey | null;
  variant?: TargetedMockVariant;
  durationMinutes: TargetedMockDuration;
  candidates: readonly TargetedMockCandidate[];
}): TargetedMockPlan {
  assertPlannerInput({
    profileId,
    mode,
    targetCompetency,
    variant,
    durationMinutes,
  });

  const profile = worldQuantRoleProfileById(profileId);
  const allowedCompetencies =
    mode === "targeted"
      ? [targetCompetency as WorldQuantCompetencyKey]
      : worldQuantCompetencyKeys.filter(
          (competency) => profile.weights[competency] > 0,
        );
  const allowedSet = new Set(allowedCompetencies);
  const eligible = canonicalCandidates(candidates).filter(
    (candidate) =>
      allowedSet.has(candidate.readinessCompetency) &&
      profile.weights[candidate.readinessCompetency] > 0,
  );
  const pools = new Map<
    WorldQuantCompetencyKey,
    TargetedMockCandidate[]
  >();

  for (const competency of allowedCompetencies) {
    const pool = eligible
      .filter(
        (candidate) =>
          candidate.readinessCompetency === competency,
      )
      .sort(compareCandidateIdentity);
    pools.set(competency, rotateVariant(pool, variant));
  }

  const selected: TargetedMockCandidate[] = [];
  const selectedCounts = new Map<WorldQuantCompetencyKey, number>();
  let scheduledMinutes = 0;

  while (selected.length < MAX_TARGETED_MOCK_QUESTIONS) {
    const remainingMinutes = durationMinutes - scheduledMinutes;
    const options = allowedCompetencies.flatMap((competency) => {
      const pool = pools.get(competency) ?? [];
      const candidateIndex = pool.findIndex(
        (candidate) =>
          candidate.question.estimatedMinutes <= remainingMinutes,
      );
      if (candidateIndex < 0) return [];
      return [{ competency, candidateIndex, candidate: pool[candidateIndex] }];
    });
    if (options.length === 0) break;

    options.sort((left, right) =>
      compareSelectionOptions({
        left,
        right,
        selectedCounts,
        weights: profile.weights,
        variant,
      }),
    );
    const next = options[0];
    selected.push(next.candidate);
    scheduledMinutes += next.candidate.question.estimatedMinutes;
    selectedCounts.set(
      next.competency,
      (selectedCounts.get(next.competency) ?? 0) + 1,
    );
    pools.get(next.competency)!.splice(next.candidateIndex, 1);
  }

  const contentGaps: TargetedMockContentGap[] = allowedCompetencies
    .filter(
      (competency) =>
        !eligible.some(
          (candidate) =>
            candidate.readinessCompetency === competency,
        ),
    )
    .sort((left, right) =>
      compareCompetencies(left, right, profile.weights, variant),
    )
    .map((competency) => ({
      competency,
      reason: "no_eligible_question",
    }));

  return targetedMockPlanSchema.parse({
    version: WORLDQUANT_TARGETED_MOCK_PLAN_VERSION,
    profileId,
    profileVersion: profile.version,
    mode,
    targetCompetency,
    variant,
    durationMinutes,
    scheduledMinutes,
    questions: selected,
    contentGaps,
  });
}

function assertPlannerInput({
  profileId,
  mode,
  targetCompetency,
  variant,
  durationMinutes,
}: {
  profileId: WorldQuantRoleProfileId;
  mode: TargetedMockMode;
  targetCompetency: WorldQuantCompetencyKey | null;
  variant: TargetedMockVariant;
  durationMinutes: TargetedMockDuration;
}): void {
  if (
    !worldQuantRoleProfileIds.includes(
      profileId as WorldQuantRoleProfileId,
    )
  ) {
    throw new RangeError(`Unknown WorldQuant role profile: ${profileId}`);
  }
  if (!targetedMockModes.includes(mode as TargetedMockMode)) {
    throw new RangeError(`Unknown mock mode: ${mode}`);
  }
  if (
    !targetedMockVariants.includes(variant as TargetedMockVariant)
  ) {
    throw new RangeError(`Unknown mock variant: ${variant}`);
  }
  if (
    !targetedMockDurations.includes(
      durationMinutes as TargetedMockDuration,
    )
  ) {
    throw new RangeError(
      `Unsupported mock duration: ${durationMinutes}`,
    );
  }
  if (mode === "balanced" && targetCompetency !== null) {
    throw new RangeError(
      "Balanced mock plans cannot specify a target competency",
    );
  }
  if (mode === "targeted" && targetCompetency === null) {
    throw new RangeError(
      "Targeted mock plans require a target competency",
    );
  }
  if (
    targetCompetency !== null &&
    !worldQuantCompetencyKeys.includes(
      targetCompetency as WorldQuantCompetencyKey,
    )
  ) {
    throw new RangeError(
      `Unknown WorldQuant competency: ${targetCompetency}`,
    );
  }

  const profile = worldQuantRoleProfileById(profileId);
  if (
    targetCompetency !== null &&
    profile.weights[targetCompetency] <= 0
  ) {
    throw new RangeError(
      `${targetCompetency} has zero weight for role ${profileId}`,
    );
  }
}

function canonicalCandidates(
  candidates: readonly TargetedMockCandidate[],
): TargetedMockCandidate[] {
  const parsed = candidates
    .map((candidate) => targetedMockCandidateSchema.parse(candidate))
    .sort(compareCandidateIdentity);
  const byIdentity = new Map<string, TargetedMockCandidate>();

  for (const candidate of parsed) {
    const identity = logicalQuestionIdentity(candidate.question);
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, candidate);
      continue;
    }
    if (candidateSignature(existing) !== candidateSignature(candidate)) {
      throw new Error(
        `Conflicting mock candidates share identity ${identity}`,
      );
    }
  }

  return [...byIdentity.values()];
}

function compareSelectionOptions({
  left,
  right,
  selectedCounts,
  weights,
  variant,
}: {
  left: {
    competency: WorldQuantCompetencyKey;
    candidate: TargetedMockCandidate;
  };
  right: {
    competency: WorldQuantCompetencyKey;
    candidate: TargetedMockCandidate;
  };
  selectedCounts: ReadonlyMap<WorldQuantCompetencyKey, number>;
  weights: Record<WorldQuantCompetencyKey, number>;
  variant: TargetedMockVariant;
}): number {
  const leftDivisor = (selectedCounts.get(left.competency) ?? 0) + 1;
  const rightDivisor =
    (selectedCounts.get(right.competency) ?? 0) + 1;
  const weightedComparison =
    weights[right.competency] * leftDivisor -
    weights[left.competency] * rightDivisor;
  if (weightedComparison !== 0) return weightedComparison;

  const competencyComparison = compareCompetencies(
    left.competency,
    right.competency,
    weights,
    variant,
  );
  if (competencyComparison !== 0) return competencyComparison;
  return compareCandidateIdentity(left.candidate, right.candidate);
}

function compareCompetencies(
  left: WorldQuantCompetencyKey,
  right: WorldQuantCompetencyKey,
  weights: Record<WorldQuantCompetencyKey, number>,
  variant: TargetedMockVariant,
): number {
  const weightComparison = weights[right] - weights[left];
  if (weightComparison !== 0) return weightComparison;

  const tieBreakOrder = rotateVariant(
    [...worldQuantCompetencyKeys],
    variant,
  );
  return tieBreakOrder.indexOf(left) - tieBreakOrder.indexOf(right);
}

function rotateVariant<T>(
  values: readonly T[],
  variant: TargetedMockVariant,
): T[] {
  if (variant === 1 || values.length < 2) return [...values];
  return [...values.slice(1), values[0]];
}

function compareCandidateIdentity(
  left: TargetedMockCandidate,
  right: TargetedMockCandidate,
): number {
  return (
    logicalQuestionIdentity(left.question).localeCompare(
      logicalQuestionIdentity(right.question),
    ) ||
    left.question.version - right.question.version ||
    left.question.contentRevision.localeCompare(
      right.question.contentRevision,
    )
  );
}

function logicalQuestionIdentity(
  question: TargetedMockQuestionRef,
): string {
  return question.id;
}

function candidateSignature(candidate: TargetedMockCandidate): string {
  return JSON.stringify([
    candidate.question.origin,
    candidate.question.id,
    candidate.question.version,
    candidate.question.contentRevision,
    candidate.question.estimatedMinutes,
    candidate.question.responseMode,
    candidate.question.language,
    candidate.question.track,
    candidate.question.execution?.specRevision ?? null,
    candidate.readinessCompetency,
  ]);
}
