import { z } from "zod";

import {
  GENERAL_CPP_PLAN_VERSION,
  GENERAL_CPP_PROFILE_ID,
  GENERAL_CPP_PROFILE_VERSION,
  generalCppCompetencies,
  generalCppQuestionCounts,
  generalCppStandards,
  type GeneralCppCompetency,
  type GeneralCppInterviewPlan,
  type GeneralCppInterviewQuestion,
  type GeneralCppStandard,
} from "./general-catalog";
import { mockInterviewDimensionKeys } from "./contracts";

const kebabIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const standardSchema = z.enum(generalCppStandards);
const competencySchema = z.enum(generalCppCompetencies);
const durationSchema = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);

export const generalCppQuestionRefSchema = z
  .object({
    id: kebabIdSchema,
    lessonId: kebabIdSchema,
    version: z.number().int().positive(),
    contentRevision: sha256Schema,
    standard: standardSchema,
    competency: competencySchema,
    responseMode: z.enum(["text", "code"]),
    estimatedMinutes: z.number().int().min(1).max(15),
  })
  .strict();

export const generalCppInterviewPlanSchema = z
  .object({
    planVersion: z.literal(GENERAL_CPP_PLAN_VERSION),
    profileId: z.literal(GENERAL_CPP_PROFILE_ID),
    profileVersion: z.literal(GENERAL_CPP_PROFILE_VERSION),
    durationMinutes: durationSchema,
    seed: z.string().uuid(),
    catalogRevision: sha256Schema,
    questions: z.array(generalCppQuestionRefSchema).min(5).max(10),
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.questions.length !== generalCppQuestionCounts[plan.durationMinutes]) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Question count must match the selected duration",
      });
    }
    const ids = new Set(plan.questions.map((question) => question.id));
    if (ids.size !== plan.questions.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Interview plan cannot repeat a question",
      });
    }
    const standards = new Set(
      plan.questions.map((question) => question.standard),
    );
    for (const standard of generalCppStandards) {
      if (!standards.has(standard)) {
        context.addIssue({
          code: "custom",
          path: ["questions"],
          message: `Interview plan must cover ${standard}`,
        });
      }
    }
  });

const answerItemSchema = z
  .object({
    question: generalCppQuestionRefSchema,
    response: z.string().max(8_000),
    elapsedSeconds: z.number().int().min(0).max(2 * 60 * 60),
  })
  .strict();

const generalCppReviewItemSchema = z
  .object({
    questionId: kebabIdSchema,
    questionVersion: z.number().int().positive(),
    contentRevision: sha256Schema,
    standard: standardSchema,
    prompt: z.string().trim().min(1).max(4_000),
    code: z.string().max(16_000).nullable(),
    response: z.string().max(8_000),
    elapsedSeconds: z.number().int().min(0).max(2 * 60 * 60),
  })
  .strict();

export const generalCppReviewSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(generalCppReviewItemSchema).min(5).max(10),
  })
  .strict();

export const generalCppReportRequestSchema = z
  .object({
    schemaVersion: z.literal(5),
    responseLocale: z.enum(["vi", "en"]),
    idempotencyKey: z.string().uuid(),
    sessionId: z.string().uuid(),
    sourceRevision: sha256Schema,
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime(),
    elapsedSeconds: z.number().int().min(0).max(4 * 60 * 60),
    plan: generalCppInterviewPlanSchema,
    items: z.array(answerItemSchema).min(5).max(10),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.sourceRevision !== request.plan.catalogRevision ||
      request.items.length !== request.plan.questions.length ||
      request.items.some(
        (item, index) =>
          JSON.stringify(item.question) !==
          JSON.stringify(request.plan.questions[index]),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Submission must match its immutable interview plan",
      });
    }
    if (
      new Date(request.submittedAt).getTime() <
      new Date(request.startedAt).getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["submittedAt"],
        message: "Interview cannot finish before it starts",
      });
    }
  });

export const generalCppHistoryPublicAttemptSchema = z
  .object({
    schemaVersion: z.literal(5),
    responseLocale: z.enum(["vi", "en"]),
    sourceRevision: sha256Schema,
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime(),
    plan: generalCppInterviewPlanSchema,
    review: generalCppReviewSnapshotSchema,
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (
      snapshot.sourceRevision !== snapshot.plan.catalogRevision
      || !reviewSnapshotMatchesPlan(snapshot.review, snapshot.plan)
    ) {
      context.addIssue({
        code: "custom",
        path: ["review"],
        message: "Stored review must match its immutable interview plan",
      });
    }
  });

const verdictSchema = z.enum(["needs_work", "partial", "solid", "strong"]);
const assessmentStatusSchema = z.enum(["assessed", "not_assessed"]);
const competencyAssessmentSchema = z
  .object({
    status: assessmentStatusSchema,
    score: z.number().int().min(0).max(100).nullable(),
    summary: z.string().trim().min(1).max(650),
    strengths: z.array(z.string().trim().min(1).max(280)).max(3),
    gaps: z.array(z.string().trim().min(1).max(320)).max(3),
    evidenceQuestionIds: z.array(kebabIdSchema).max(10),
  })
  .strict();

const competencySetSchema = z
  .object({
    language_core: competencyAssessmentSchema,
    lifetime_ownership: competencyAssessmentSchema,
    templates_generic: competencyAssessmentSchema,
    stl_algorithms: competencyAssessmentSchema,
    concurrency_memory: competencyAssessmentSchema,
    performance_systems: competencyAssessmentSchema,
    build_quality: competencyAssessmentSchema,
  })
  .strict();

const questionAssessmentSchema = z
  .object({
    questionId: kebabIdSchema,
    score: z.number().int().min(0).max(100),
    verdict: verdictSchema,
    summary: z.string().trim().min(1).max(600),
    strengths: z.array(z.string().trim().min(1).max(280)).max(3),
    missedCriteria: z.array(z.string().trim().min(1).max(320)).max(5),
  })
  .strict();

const interviewDimensionSchema = z
  .object({
    key: z.enum(mockInterviewDimensionKeys),
    status: assessmentStatusSchema,
    score: z.number().int().min(0).max(100).nullable(),
    summary: z.string().trim().min(1).max(600),
  })
  .strict();

const interviewDimensionsSchema = z
  .array(interviewDimensionSchema)
  .length(mockInterviewDimensionKeys.length)
  .superRefine((dimensions, context) => {
    dimensions.forEach((dimension, index) => {
      if (dimension.key !== mockInterviewDimensionKeys[index]) {
        context.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "Dimensions must use the canonical order",
        });
      }
      if (
        (dimension.status === "assessed") !== (dimension.score !== null)
      ) {
        context.addIssue({
          code: "custom",
          path: [index, "score"],
          message: "Dimension status and score must agree",
        });
      }
    });
  });

const nextActionSchema = z
  .object({
    priority: z.number().int().min(1).max(3),
    title: z.string().trim().min(1).max(160),
    action: z.string().trim().min(1).max(450),
    questionIds: z.array(kebabIdSchema).min(1).max(4),
  })
  .strict();

const nextActionsSchema = z
  .array(nextActionSchema)
  .length(3)
  .superRefine((actions, context) => {
    actions.forEach((action, index) => {
      if (action.priority !== index + 1) {
        context.addIssue({
          code: "custom",
          path: [index, "priority"],
          message: "Actions must use priorities 1, 2 and 3",
        });
      }
    });
  });

/** Provider-owned fields. Scores tied to grouping are recomputed below. */
export const generalCppRawReportSchema = z
  .object({
    summary: z.string().trim().min(1).max(1_200),
    competencies: competencySetSchema,
    questionAssessments: z.array(questionAssessmentSchema).min(5).max(10),
    interviewDimensions: interviewDimensionsSchema,
    strengths: z.array(z.string().trim().min(1).max(320)).max(5),
    priorityGaps: z.array(z.string().trim().min(1).max(360)).max(5),
    nextActions: nextActionsSchema,
  })
  .strict();

const standardScoreSchema = z
  .object({
    standard: standardSchema,
    score: z.number().int().min(0).max(100),
    questionIds: z.array(kebabIdSchema).min(1).max(10),
  })
  .strict();

export const generalCppNormalizedReportSchema = generalCppRawReportSchema
  .extend({
    overallScore: z.number().int().min(0).max(100),
    readiness: z.enum([
      "needs_foundation",
      "developing",
      "interview_ready",
      "strong",
    ]),
    standardScores: z.array(standardScoreSchema).length(5),
  })
  .strict();

export const generalCppCompletedArtifactSchema = z
  .object({
    schemaVersion: z.literal(5),
    responseLocale: z.enum(["vi", "en"]),
    sessionId: z.string().uuid(),
    profileId: z.literal(GENERAL_CPP_PROFILE_ID),
    profileVersion: z.literal(GENERAL_CPP_PROFILE_VERSION),
    plan: generalCppInterviewPlanSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    report: generalCppNormalizedReportSchema,
    model: z.string().trim().min(1).max(120),
    provider: z.literal("openai"),
  })
  .strict()
  .superRefine((artifact, context) => {
    const plannedIds = new Set(
      artifact.plan.questions.map((question) => question.id),
    );
    const assessedIds = artifact.report.questionAssessments.map(
      (assessment) => assessment.questionId,
    );
    if (
      assessedIds.length !== plannedIds.size ||
      new Set(assessedIds).size !== plannedIds.size ||
      assessedIds.some((id) => !plannedIds.has(id))
    ) {
      context.addIssue({
        code: "custom",
        path: ["report", "questionAssessments"],
        message: "Completed report must assess the exact interview plan",
      });
    }
  });

export const generalCppHistoryDetailSchema = z
  .object({
    artifact: generalCppCompletedArtifactSchema,
    review: generalCppReviewSnapshotSchema.nullable(),
  })
  .strict()
  .superRefine((detail, context) => {
    if (!detail.review) return;
    if (!reviewSnapshotMatchesPlan(detail.review, detail.artifact.plan)) {
      context.addIssue({
        code: "custom",
        path: ["review", "items"],
        message: "Review snapshot must match the completed interview plan",
      });
    }
  });

export type GeneralCppReportRequest = z.infer<
  typeof generalCppReportRequestSchema
>;
export type GeneralCppRawReport = z.infer<typeof generalCppRawReportSchema>;
export type GeneralCppNormalizedReport = z.infer<
  typeof generalCppNormalizedReportSchema
>;
export type GeneralCppCompletedArtifact = z.infer<
  typeof generalCppCompletedArtifactSchema
>;
export type GeneralCppReviewSnapshot = z.infer<
  typeof generalCppReviewSnapshotSchema
>;
export type GeneralCppHistoryPublicAttempt = z.infer<
  typeof generalCppHistoryPublicAttemptSchema
>;
export type GeneralCppHistoryDetail = z.infer<
  typeof generalCppHistoryDetailSchema
>;

export function buildGeneralCppReviewSnapshot({
  request,
  catalog,
}: {
  request: GeneralCppReportRequest;
  catalog: readonly GeneralCppInterviewQuestion[];
}): GeneralCppReviewSnapshot {
  if (catalog.length !== request.plan.questions.length) {
    throw new Error("Review snapshot must cover the exact interview plan");
  }
  const items = request.plan.questions.map((planned, index) => {
    const question = catalog[index];
    const submitted = request.items[index];
    if (
      !question
      || !submitted
      || question.id !== planned.id
      || question.version !== planned.version
      || question.contentRevision !== planned.contentRevision
      || question.standard !== planned.standard
      || submitted.question.id !== planned.id
    ) {
      throw new Error("Review snapshot question identity does not match");
    }
    return {
      questionId: question.id,
      questionVersion: question.version,
      contentRevision: question.contentRevision,
      standard: question.standard,
      prompt: question.prompt,
      code: question.code ?? null,
      response: submitted.response,
      elapsedSeconds: submitted.elapsedSeconds,
    };
  });
  return generalCppReviewSnapshotSchema.parse({
    schemaVersion: 1,
    items,
  });
}

export function buildGeneralCppHistoryPublicAttempt({
  request,
  review,
}: {
  request: GeneralCppReportRequest;
  review: GeneralCppReviewSnapshot;
}): GeneralCppHistoryPublicAttempt {
  return generalCppHistoryPublicAttemptSchema.parse({
    schemaVersion: 5,
    responseLocale: request.responseLocale,
    sourceRevision: request.sourceRevision,
    startedAt: request.startedAt,
    submittedAt: request.submittedAt,
    plan: request.plan,
    review,
  });
}

export function parseGeneralCppHistoryDetail({
  artifact,
  review,
}: {
  artifact: unknown;
  review: unknown;
}): GeneralCppHistoryDetail | null {
  const parsedArtifact = generalCppCompletedArtifactSchema.safeParse(artifact);
  if (!parsedArtifact.success) return null;
  const parsedReview = generalCppReviewSnapshotSchema.safeParse(review);
  if (parsedReview.success) {
    const detail = generalCppHistoryDetailSchema.safeParse({
      artifact: parsedArtifact.data,
      review: parsedReview.data,
    });
    if (detail.success) return detail.data;
  }
  return {
    artifact: parsedArtifact.data,
    review: null,
  };
}

function reviewSnapshotMatchesPlan(
  review: GeneralCppReviewSnapshot,
  plan: GeneralCppInterviewPlan,
) {
  return (
    review.items.length === plan.questions.length
    && review.items.every((item, index) => {
      const question = plan.questions[index];
      return Boolean(
        question
        && item.questionId === question.id
        && item.questionVersion === question.version
        && item.contentRevision === question.contentRevision
        && item.standard === question.standard,
      );
    })
  );
}

export function normalizeGeneralCppReport({
  rawReport,
  plan,
}: {
  rawReport: GeneralCppRawReport;
  plan: GeneralCppInterviewPlan;
}): GeneralCppNormalizedReport {
  const parsed = generalCppRawReportSchema.parse(rawReport);
  const plannedIds = new Set(plan.questions.map((question) => question.id));
  const assessmentById = new Map(
    parsed.questionAssessments.map((assessment) => [
      assessment.questionId,
      assessment,
    ]),
  );
  if (
    assessmentById.size !== plannedIds.size ||
    [...plannedIds].some((id) => !assessmentById.has(id)) ||
    [...assessmentById.keys()].some((id) => !plannedIds.has(id))
  ) {
    throw new Error("AI report returned a mismatched question set");
  }

  const questionAssessments = plan.questions.map((question) => {
    const assessment = assessmentById.get(question.id)!;
    return {
      ...assessment,
      verdict: verdictForScore(assessment.score),
    };
  });
  const scoreById = new Map(
    questionAssessments.map((assessment) => [
      assessment.questionId,
      assessment.score,
    ]),
  );
  const overallScore = average([...scoreById.values()]);
  const competencies = { ...parsed.competencies };
  for (const competency of generalCppCompetencies) {
    const questionIds = plan.questions
      .filter((question) => question.competency === competency)
      .map((question) => question.id);
    const current = competencies[competency];
    competencies[competency] = questionIds.length
      ? {
          ...current,
          status: "assessed",
          score: average(questionIds.map((id) => scoreById.get(id)!)),
          evidenceQuestionIds: questionIds,
        }
      : {
          ...current,
          status: "not_assessed",
          score: null,
          strengths: [],
          gaps: [],
          evidenceQuestionIds: [],
        };
  }

  const standardScores = generalCppStandards.map((standard) => {
    const questionIds = plan.questions
      .filter((question) => question.standard === standard)
      .map((question) => question.id);
    return {
      standard,
      score: average(questionIds.map((id) => scoreById.get(id)!)),
      questionIds,
    };
  });
  const nextActions = parsed.nextActions.map((action) => ({
    ...action,
    questionIds: action.questionIds.filter((id) => plannedIds.has(id)),
  }));
  if (nextActions.some((action) => action.questionIds.length === 0)) {
    throw new Error("AI report action cited a question outside this interview");
  }

  return generalCppNormalizedReportSchema.parse({
    ...parsed,
    competencies,
    questionAssessments,
    nextActions,
    overallScore,
    readiness:
      overallScore >= 85
        ? "strong"
        : overallScore >= 70
          ? "interview_ready"
          : overallScore >= 45
            ? "developing"
            : "needs_foundation",
    standardScores,
  });
}

export function normalizeGeneralCppReportForSubmission({
  rawReport,
  plan,
  responses,
  locale,
}: {
  rawReport: GeneralCppRawReport;
  plan: GeneralCppInterviewPlan;
  responses: readonly string[];
  locale: "vi" | "en";
}): {
  report: GeneralCppNormalizedReport;
  usedBlankFallback: boolean;
} {
  try {
    return {
      report: normalizeGeneralCppReport({ rawReport, plan }),
      usedBlankFallback: false,
    };
  } catch (error) {
    if (!responses.length || responses.some((response) => response.trim())) {
      throw error;
    }
    return {
      report: buildBlankGeneralCppReport(plan, locale),
      usedBlankFallback: true,
    };
  }
}

function buildBlankGeneralCppReport(
  plan: GeneralCppInterviewPlan,
  locale: "vi" | "en",
): GeneralCppNormalizedReport {
  const isEnglish = locale === "en";
  const competencyQuestionIds = questionsByCompetency(plan);
  const competencies = generalCppCompetencies.reduce<
    GeneralCppRawReport["competencies"]
  >((result, competency) => {
    const questionIds = competencyQuestionIds[competency];
    result[competency] = questionIds.length
      ? {
          status: "assessed",
          score: 0,
          summary: isEnglish
            ? "No answer was provided for this competency."
            : "Chưa có câu trả lời cho nhóm năng lực này.",
          strengths: [],
          gaps: [
            isEnglish
              ? "Answer the skipped question from first principles."
              : "Hãy trả lời lại câu đã bỏ trống từ các nguyên lý nền tảng.",
          ],
          evidenceQuestionIds: questionIds,
        }
      : {
          status: "not_assessed",
          score: null,
          summary: isEnglish
            ? "This competency was not covered by the interview plan."
            : "Phiên này không có câu hỏi thuộc nhóm năng lực này.",
          strengths: [],
          gaps: [],
          evidenceQuestionIds: [],
        };
    return result;
  }, {} as GeneralCppRawReport["competencies"]);

  return normalizeGeneralCppReport({
    plan,
    rawReport: {
      summary: isEnglish
        ? "No answers were submitted, so this interview is recorded with a score of 0. The report does not infer knowledge that was not demonstrated."
        : "Bạn chưa nộp câu trả lời nào nên phiên này được ghi nhận 0 điểm. Báo cáo không suy đoán kiến thức chưa được thể hiện.",
      competencies,
      questionAssessments: plan.questions.map((question) => ({
        questionId: question.id,
        score: 0,
        verdict: "needs_work" as const,
        summary: isEnglish
          ? "No answer was provided; this question receives 0 points."
          : "Bạn chưa cung cấp câu trả lời; câu này được chấm 0 điểm.",
        strengths: [],
        missedCriteria: [
          isEnglish
            ? "No technical knowledge or reasoning was demonstrated."
            : "Chưa thể hiện kiến thức kỹ thuật hoặc lập luận cho câu hỏi.",
        ],
      })),
      interviewDimensions: mockInterviewDimensionKeys.map((key) => ({
        key,
        status: "not_assessed" as const,
        score: null,
        summary: isEnglish
          ? "There is no answer to assess this dimension."
          : "Không có câu trả lời để đánh giá tiêu chí này.",
      })),
      strengths: [],
      priorityGaps: generalCppStandards.map((standard) =>
        isEnglish
          ? `No answer was provided for ${standardLabel(standard)}.`
          : `Chưa có câu trả lời cho phần ${standardLabel(standard)}.`,
      ),
      nextActions: plan.questions.slice(0, 3).map((question, index) => ({
        priority: index + 1,
        title: isEnglish
          ? `Retry the ${standardLabel(question.standard)} question`
          : `Làm lại câu ${standardLabel(question.standard)}`,
        action: isEnglish
          ? "Write a short answer from first principles, then compare it with the lesson material."
          : "Viết một câu trả lời ngắn từ nguyên lý nền tảng, sau đó đối chiếu với nội dung bài học.",
        questionIds: [question.id],
      })),
    },
  });
}

function standardLabel(standard: GeneralCppStandard) {
  return standard.replace("cpp", "C++");
}

function average(values: readonly number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function verdictForScore(score: number): GeneralCppRawReport["questionAssessments"][number]["verdict"] {
  return score >= 85
    ? "strong"
    : score >= 65
      ? "solid"
      : score >= 40
        ? "partial"
        : "needs_work";
}

export function questionsByCompetency(
  plan: GeneralCppInterviewPlan,
): Record<GeneralCppCompetency, string[]> {
  return Object.fromEntries(
    generalCppCompetencies.map((competency) => [
      competency,
      plan.questions
        .filter((question) => question.competency === competency)
        .map((question) => question.id),
    ]),
  ) as Record<GeneralCppCompetency, string[]>;
}

export function questionsByStandard(
  plan: GeneralCppInterviewPlan,
): Record<GeneralCppStandard, string[]> {
  return Object.fromEntries(
    generalCppStandards.map((standard) => [
      standard,
      plan.questions
        .filter((question) => question.standard === standard)
        .map((question) => question.id),
    ]),
  ) as Record<GeneralCppStandard, string[]>;
}
