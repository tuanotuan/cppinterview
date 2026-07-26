import { z } from "zod";

import {
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfileIds,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_MOCK_DEBRIEF_VERSION = 1 as const;

export const worldQuantMockPlanModes = ["balanced", "targeted"] as const;
export type WorldQuantMockPlanMode =
  (typeof worldQuantMockPlanModes)[number];

export const worldQuantMockDebriefScopes = [
  "balanced_role_evidence",
  "targeted_evidence",
] as const;
export type WorldQuantMockDebriefScope =
  (typeof worldQuantMockDebriefScopes)[number];

const questionIdSchema = z.string().trim().min(1).max(160);
const competencySchema = z.enum(worldQuantCompetencyKeys);
const roleProfileSchema = z.enum(worldQuantRoleProfileIds);

export const worldQuantMockQuestionMappingSchema = z
  .object({
    questionId: questionIdSchema,
    competency: competencySchema,
  })
  .strict();

export const normalizedWorldQuantMockQuestionScoreSchema = z
  .object({
    questionId: questionIdSchema,
    score: z.number().int().min(0).max(100),
  })
  .strict();

export type WorldQuantMockQuestionMapping = z.infer<
  typeof worldQuantMockQuestionMappingSchema
>;
export type NormalizedWorldQuantMockQuestionScore = z.infer<
  typeof normalizedWorldQuantMockQuestionScoreSchema
>;

export type WorldQuantMockDebriefPlan = {
  mode: WorldQuantMockPlanMode;
  questionMappings: readonly WorldQuantMockQuestionMapping[];
};

const competencyDebriefSchema = z
  .object({
    competency: competencySchema,
    status: z.enum(["assessed", "not_assessed"]),
    roleWeight: z.number().int().min(0).max(100),
    score: z.number().int().min(0).max(100).nullable(),
    scoreDeficit: z.number().int().min(0).max(100).nullable(),
    weightedDeficit: z.number().min(0).max(100).nullable(),
    evidenceCount: z.number().int().nonnegative(),
    evidenceQuestionIds: z.array(questionIdSchema),
  })
  .strict()
  .superRefine((item, context) => {
    const assessed = item.status === "assessed";
    if (
      assessed !==
      (item.score !== null &&
        item.scoreDeficit !== null &&
        item.weightedDeficit !== null &&
        item.evidenceCount > 0 &&
        item.evidenceQuestionIds.length === item.evidenceCount)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Assessed competency fields must agree with its exact evidence",
      });
    }
    if (
      !assessed &&
      (item.evidenceCount !== 0 ||
        item.evidenceQuestionIds.length !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Unassessed competency cannot contain evidence",
      });
    }
  });

const rankedGapSchema = z
  .object({
    rank: z.number().int().positive(),
    competency: competencySchema,
    roleWeight: z.number().int().positive().max(100),
    score: z.number().int().min(0).max(99),
    scoreDeficit: z.number().int().min(1).max(100),
    weightedDeficit: z.number().positive().max(100),
    evidenceCount: z.number().int().positive(),
    evidenceQuestionIds: z.array(questionIdSchema).min(1),
  })
  .strict();

export const worldQuantMockDebriefSchema = z
  .object({
    version: z.literal(WORLDQUANT_MOCK_DEBRIEF_VERSION),
    profileId: roleProfileSchema,
    profileVersion: z.literal(1),
    planMode: z.enum(worldQuantMockPlanModes),
    scope: z.enum(worldQuantMockDebriefScopes),
    assessedWeightPercent: z.number().int().min(0).max(100),
    roleInterviewScore: z.number().int().min(0).max(100).nullable(),
    evidenceQuestionCount: z.number().int().positive(),
    competencies: z
      .array(competencyDebriefSchema)
      .length(worldQuantCompetencyKeys.length),
    rankedGaps: z.array(rankedGapSchema),
  })
  .strict()
  .superRefine((debrief, context) => {
    const profile = worldQuantRoleProfileById(debrief.profileId);
    const expectedScope =
      debrief.planMode === "targeted"
        ? "targeted_evidence"
        : "balanced_role_evidence";
    if (debrief.scope !== expectedScope) {
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: "Debrief scope must match the server-owned plan mode",
      });
    }

    const competencyKeys = debrief.competencies.map(
      (item) => item.competency,
    );
    if (
      competencyKeys.some(
        (key, index) => key !== worldQuantCompetencyKeys[index],
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["competencies"],
        message:
          "Debrief must contain every canonical competency in stable order",
      });
    }

    debrief.competencies.forEach((competency, index) => {
      if (
        competency.roleWeight !==
        profile.weights[competency.competency]
      ) {
        context.addIssue({
          code: "custom",
          path: ["competencies", index, "roleWeight"],
          message: "Competency weight must match the versioned role profile",
        });
      }
      if (
        competency.evidenceQuestionIds.some(
          (questionId, questionIndex) =>
            questionIndex > 0 &&
            questionId.localeCompare(
              competency.evidenceQuestionIds[questionIndex - 1],
            ) <= 0,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["competencies", index, "evidenceQuestionIds"],
          message:
            "Competency evidence IDs must be unique and stably sorted",
        });
      }
      if (competency.status !== "assessed") return;

      const expectedScoreDeficit = 100 - competency.score!;
      if (competency.scoreDeficit !== expectedScoreDeficit) {
        context.addIssue({
          code: "custom",
          path: ["competencies", index, "scoreDeficit"],
          message: "Score deficit must be derived from the normalized score",
        });
      }
      if (
        competency.weightedDeficit !==
        weightedDeficit(competency.roleWeight, expectedScoreDeficit)
      ) {
        context.addIssue({
          code: "custom",
          path: ["competencies", index, "weightedDeficit"],
          message:
            "Weighted deficit must be derived from role weight and score",
        });
      }
    });

    const evidenceIds = debrief.competencies.flatMap(
      (item) => item.evidenceQuestionIds,
    );
    if (
      evidenceIds.length !== debrief.evidenceQuestionCount ||
      new Set(evidenceIds).size !== evidenceIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidenceQuestionCount"],
        message: "Debrief evidence must contain each plan question once",
      });
    }

    const assessedWeight = debrief.competencies.reduce(
      (sum, item) =>
        item.status === "assessed" ? sum + item.roleWeight : sum,
      0,
    );
    if (assessedWeight !== debrief.assessedWeightPercent) {
      context.addIssue({
        code: "custom",
        path: ["assessedWeightPercent"],
        message:
          "Assessed weight must equal the unique assessed role weights",
      });
    }

    const weightedScore = debrief.competencies.reduce(
      (sum, item) =>
        item.status === "assessed" && item.roleWeight > 0
          ? sum + item.score! * item.roleWeight
          : sum,
      0,
    );
    const expectedRoleScore =
      assessedWeight > 0
        ? Math.round(weightedScore / assessedWeight)
        : null;
    if (debrief.roleInterviewScore !== expectedRoleScore) {
      context.addIssue({
        code: "custom",
        path: ["roleInterviewScore"],
        message:
          "Role interview score must use only assessed role weight",
      });
    }

    const expectedGaps = debrief.competencies
      .filter(
        (competency) =>
          competency.status === "assessed" &&
          competency.roleWeight > 0 &&
          competency.scoreDeficit !== null &&
          competency.scoreDeficit > 0,
      )
      .sort(
        (left, right) =>
          right.roleWeight * right.scoreDeficit! -
            left.roleWeight * left.scoreDeficit! ||
          left.competency.localeCompare(right.competency),
      );
    if (expectedGaps.length !== debrief.rankedGaps.length) {
      context.addIssue({
        code: "custom",
        path: ["rankedGaps"],
        message:
          "Ranked gaps must contain every positive assessed role gap",
      });
      return;
    }
    expectedGaps.forEach((competency, index) => {
      const gap = debrief.rankedGaps[index];
      if (
        gap.rank !== index + 1 ||
        gap.competency !== competency.competency ||
        gap.roleWeight !== competency.roleWeight ||
        gap.score !== competency.score ||
        gap.scoreDeficit !== competency.scoreDeficit ||
        gap.weightedDeficit !== competency.weightedDeficit ||
        gap.evidenceCount !== competency.evidenceCount ||
        gap.evidenceQuestionIds.length !==
          competency.evidenceQuestionIds.length ||
        gap.evidenceQuestionIds.some(
          (questionId, questionIndex) =>
            questionId !==
            competency.evidenceQuestionIds[questionIndex],
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["rankedGaps", index],
          message:
            "Ranked gap must be derived from canonical competency evidence",
        });
      }
    });
  });

export type WorldQuantMockCompetencyDebrief = z.infer<
  typeof competencyDebriefSchema
>;
export type WorldQuantMockRankedGap = z.infer<typeof rankedGapSchema>;
export type WorldQuantMockDebrief = z.infer<
  typeof worldQuantMockDebriefSchema
>;

export function buildWorldQuantMockDebrief({
  profileId,
  plan,
  scores,
}: {
  profileId: WorldQuantRoleProfileId;
  plan: WorldQuantMockDebriefPlan;
  scores: readonly NormalizedWorldQuantMockQuestionScore[];
}): WorldQuantMockDebrief {
  const profile = worldQuantRoleProfileById(profileId);
  const mode = z.enum(worldQuantMockPlanModes).parse(plan.mode);
  const mappings = plan.questionMappings.map((mapping) =>
    worldQuantMockQuestionMappingSchema.parse(mapping),
  );
  const normalizedScores = scores.map((score) =>
    normalizedWorldQuantMockQuestionScoreSchema.parse(score),
  );

  assertExactQuestionSet(mappings, normalizedScores);

  const scoreByQuestionId = new Map(
    normalizedScores.map((score) => [score.questionId, score.score]),
  );
  const competencies = worldQuantCompetencyKeys.map(
    (competency): WorldQuantMockCompetencyDebrief => {
      const evidenceQuestionIds = mappings
        .filter((mapping) => mapping.competency === competency)
        .map((mapping) => mapping.questionId)
        .sort((left, right) => left.localeCompare(right));
      const roleWeight = profile.weights[competency];
      if (evidenceQuestionIds.length === 0) {
        return {
          competency,
          status: "not_assessed",
          roleWeight,
          score: null,
          scoreDeficit: null,
          weightedDeficit: null,
          evidenceCount: 0,
          evidenceQuestionIds: [],
        };
      }

      const score = Math.round(
        evidenceQuestionIds.reduce(
          (sum, questionId) => sum + scoreByQuestionId.get(questionId)!,
          0,
        ) / evidenceQuestionIds.length,
      );
      const scoreDeficit = 100 - score;
      return {
        competency,
        status: "assessed",
        roleWeight,
        score,
        scoreDeficit,
        weightedDeficit: weightedDeficit(roleWeight, scoreDeficit),
        evidenceCount: evidenceQuestionIds.length,
        evidenceQuestionIds,
      };
    },
  );
  const assessedWeightPercent = competencies.reduce(
    (sum, competency) =>
      competency.status === "assessed"
        ? sum + competency.roleWeight
        : sum,
    0,
  );
  const weightedScore = competencies.reduce(
    (sum, competency) =>
      competency.status === "assessed" && competency.roleWeight > 0
        ? sum + competency.score! * competency.roleWeight
        : sum,
    0,
  );
  const roleInterviewScore =
    assessedWeightPercent > 0
      ? Math.round(weightedScore / assessedWeightPercent)
      : null;
  const rankedGaps = competencies
    .filter(
      (
        competency,
      ): competency is WorldQuantMockCompetencyDebrief & {
        status: "assessed";
        score: number;
        scoreDeficit: number;
        weightedDeficit: number;
      } =>
        competency.status === "assessed" &&
        competency.roleWeight > 0 &&
        competency.scoreDeficit !== null &&
        competency.scoreDeficit > 0,
    )
    .sort(
      (left, right) =>
        right.roleWeight * right.scoreDeficit -
          left.roleWeight * left.scoreDeficit ||
        left.competency.localeCompare(right.competency),
    )
    .map(
      (competency, index): WorldQuantMockRankedGap => ({
        rank: index + 1,
        competency: competency.competency,
        roleWeight: competency.roleWeight,
        score: competency.score,
        scoreDeficit: competency.scoreDeficit,
        weightedDeficit: competency.weightedDeficit,
        evidenceCount: competency.evidenceCount,
        evidenceQuestionIds: competency.evidenceQuestionIds,
      }),
    );

  return worldQuantMockDebriefSchema.parse({
    version: WORLDQUANT_MOCK_DEBRIEF_VERSION,
    profileId,
    profileVersion: profile.version,
    planMode: mode,
    scope:
      mode === "targeted"
        ? "targeted_evidence"
        : "balanced_role_evidence",
    assessedWeightPercent,
    roleInterviewScore,
    evidenceQuestionCount: mappings.length,
    competencies,
    rankedGaps,
  });
}

function assertExactQuestionSet(
  mappings: readonly WorldQuantMockQuestionMapping[],
  scores: readonly NormalizedWorldQuantMockQuestionScore[],
) {
  if (mappings.length === 0) {
    throw new Error("Mock debrief requires at least one plan question");
  }

  const mappedIds = mappings.map((mapping) => mapping.questionId);
  const scoreIds = scores.map((score) => score.questionId);
  if (new Set(mappedIds).size !== mappedIds.length) {
    throw new Error("Mock debrief plan contains a duplicate question");
  }
  if (new Set(scoreIds).size !== scoreIds.length) {
    throw new Error("Mock debrief scores contain a duplicate question");
  }

  const mappedSet = new Set(mappedIds);
  if (
    scoreIds.length !== mappedIds.length ||
    scoreIds.some((questionId) => !mappedSet.has(questionId))
  ) {
    throw new Error(
      "Mock debrief scores must match the exact planned question set",
    );
  }
}

function weightedDeficit(roleWeight: number, scoreDeficit: number) {
  return Math.round(roleWeight * scoreDeficit) / 100;
}
