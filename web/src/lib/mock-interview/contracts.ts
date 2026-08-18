import { z } from "zod";

import {
  matchesWorldQuantMockSet,
  mockCompetencyKeys,
  mockInterviewSetIds,
  WORLDQUANT_PROFILE_VERSION,
  type MockCompetencyKey,
} from "./profile";

const kebabIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);

export const mockInterviewReportRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  sessionId: z.string().uuid(),
  profileId: z.literal("worldquant-tick-data-engineer"),
  profileVersion: z.literal(WORLDQUANT_PROFILE_VERSION),
  setId: z.enum(mockInterviewSetIds),
  setVersion: z.number().int().positive(),
  sourceRevision: z.string().regex(/^[a-f0-9]{40,64}$/),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  elapsedSeconds: z.number().int().min(0).max(4 * 60 * 60),
  items: z
    .array(
      z.object({
        questionId: kebabIdSchema,
        origin: z.enum(["question_bank", "role_profile"]),
        version: z.number().int().positive(),
        contentRevision: z.string().trim().min(1).max(128),
        response: z.string().max(8_000),
        explanation: z.string().max(4_000),
        elapsedSeconds: z.number().int().min(0).max(2 * 60 * 60),
      }).strict(),
    )
    .min(3)
    .max(8),
}).strict().superRefine((request, context) => {
  const { items } = request;
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.questionId)) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "questionId"],
        message: "Mock interview cannot contain a duplicate question",
      });
    }
    seen.add(item.questionId);
  });
  if (
    !matchesWorldQuantMockSet({
      setId: request.setId,
      setVersion: request.setVersion,
      durationMinutes: request.durationMinutes,
      questionIds: items.map((item) => item.questionId),
    })
  ) {
    context.addIssue({
      code: "custom",
      path: ["setId"],
      message: "Mock report request does not match its versioned question set",
    });
  }
});

const mockVerdictSchema = z.enum([
  "needs_work",
  "partial",
  "solid",
  "strong",
]);

export const mockInterviewDimensionKeys = [
  "correctness",
  "complexity",
  "idiomatic_cpp",
  "lifetime_ownership",
  "testing_debugging",
  "communication",
  "requirement_clarification",
  "tradeoff_reasoning",
] as const;
export type MockInterviewDimensionKey =
  (typeof mockInterviewDimensionKeys)[number];

export const mockReportEvidenceKinds = [
  "candidate_answer",
  "candidate_code",
  "question_code",
  "test_result",
] as const;
export type MockReportEvidenceKind = (typeof mockReportEvidenceKinds)[number];

const evidenceIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]*(?::[a-z0-9][a-z0-9_-]*)+$/)
  .max(240);

export const mockReportEvidenceSchema = z
  .object({
    id: evidenceIdSchema,
    questionId: kebabIdSchema,
    kind: z.enum(mockReportEvidenceKinds),
    label: z.string().trim().min(1).max(120),
    excerpt: z.string().trim().min(1).max(420),
  })
  .strict();
export type MockReportEvidence = z.infer<typeof mockReportEvidenceSchema>;

const evidenceIdsSchema = z.array(evidenceIdSchema).min(1).max(3);
const normalizedEvidenceSchema = z
  .array(mockReportEvidenceSchema)
  .min(1)
  .max(3);

const rawReportObservationSchema = z
  .object({
    feedback: z.string().trim().min(1).max(500),
    evidenceIds: evidenceIdsSchema,
  })
  .strict();

const normalizedReportObservationSchema = z
  .object({
    feedback: z.string().trim().min(1).max(500),
    evidence: normalizedEvidenceSchema,
  })
  .strict();

const rawInterviewDimensionSchema = z
  .object({
    key: z.enum(mockInterviewDimensionKeys),
    status: z.enum(["assessed", "not_assessed"]),
    score: z.number().int().min(0).max(100).nullable(),
    summary: z.string().trim().min(1).max(650),
    evidenceIds: z.array(evidenceIdSchema).max(3),
    observations: z.array(rawReportObservationSchema).max(4),
  })
  .strict()
  .superRefine((dimension, context) => {
    const assessed = dimension.status === "assessed";
    if (
      assessed &&
      (dimension.score === null ||
        !dimension.evidenceIds.length ||
        !dimension.observations.length)
    ) {
      context.addIssue({
        code: "custom",
        message: "An assessed dimension needs a score and cited feedback",
      });
    }
    if (
      !assessed &&
      (dimension.score !== null ||
        dimension.evidenceIds.length !== 0 ||
        dimension.observations.length !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "An unassessed dimension cannot contain a score or evidence",
      });
    }
  });

const normalizedInterviewDimensionSchema = z
  .object({
    key: z.enum(mockInterviewDimensionKeys),
    status: z.enum(["assessed", "not_assessed"]),
    score: z.number().int().min(0).max(100).nullable(),
    summary: z.string().trim().min(1).max(650),
    evidence: z.array(mockReportEvidenceSchema).max(3),
    observations: z.array(normalizedReportObservationSchema).max(4),
  })
  .strict()
  .superRefine((dimension, context) => {
    const assessed = dimension.status === "assessed";
    if (
      assessed &&
      (dimension.score === null ||
        !dimension.evidence.length ||
        !dimension.observations.length)
    ) {
      context.addIssue({
        code: "custom",
        message: "An assessed dimension needs a score and cited feedback",
      });
    }
    if (
      !assessed &&
      (dimension.score !== null ||
        dimension.evidence.length !== 0 ||
        dimension.observations.length !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "An unassessed dimension cannot contain a score or evidence",
      });
    }
  });

const rawInterviewDimensionsSchema = z
  .array(rawInterviewDimensionSchema)
  .length(mockInterviewDimensionKeys.length)
  .superRefine((dimensions, context) => {
    dimensions.forEach((dimension, index) => {
      if (dimension.key !== mockInterviewDimensionKeys[index]) {
        context.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "Interview dimensions must use the canonical stable order",
        });
      }
    });
  });

export const normalizedInterviewDimensionsSchema = z
  .array(normalizedInterviewDimensionSchema)
  .length(mockInterviewDimensionKeys.length)
  .superRefine((dimensions, context) => {
    dimensions.forEach((dimension, index) => {
      if (dimension.key !== mockInterviewDimensionKeys[index]) {
        context.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "Interview dimensions must use the canonical stable order",
        });
      }
    });
  });

const rawNextPracticeActionSchema = z
  .object({
    priority: z.number().int().min(1).max(3),
    title: z.string().trim().min(1).max(180),
    action: z.string().trim().min(1).max(500),
    evidenceIds: evidenceIdsSchema,
  })
  .strict();

const normalizedNextPracticeActionSchema = z
  .object({
    priority: z.number().int().min(1).max(3),
    title: z.string().trim().min(1).max(180),
    action: z.string().trim().min(1).max(500),
    evidence: normalizedEvidenceSchema,
  })
  .strict();

function exactThreeActions<T extends { priority: number }>(
  actions: readonly T[],
  context: z.RefinementCtx,
) {
  actions.forEach((action, index) => {
    if (action.priority !== index + 1) {
      context.addIssue({
        code: "custom",
        path: [index, "priority"],
        message: "Next practice actions must be priorities 1, 2, and 3",
      });
    }
  });
}

const rawNextPracticeActionsSchema = z
  .array(rawNextPracticeActionSchema)
  .length(3)
  .superRefine(exactThreeActions);

export const normalizedNextPracticeActionsSchema = z
  .array(normalizedNextPracticeActionSchema)
  .length(3)
  .superRefine(exactThreeActions);

const competencyAssessmentSchema = z.object({
  status: z.enum(["assessed", "not_assessed"]),
  score: z.number().int().min(0).max(100).nullable(),
  summary: z.string().trim().min(1).max(700),
  strengths: z.array(z.string().trim().min(1).max(300)).max(4),
  gaps: z.array(z.string().trim().min(1).max(350)).max(4),
  evidenceQuestionIds: z.array(kebabIdSchema).max(8),
});

export const mockInterviewReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  readiness: z.enum([
    "not_ready",
    "developing",
    "interview_ready",
    "strong",
  ]),
  summary: z.string().trim().min(1).max(1200),
  hiringSignal: z.string().trim().min(1).max(700),
  competencies: z.object({
    modern_cpp: competencyAssessmentSchema,
    tick_data_order_book: competencyAssessmentSchema,
    data_pipeline_performance: competencyAssessmentSchema,
    engineering_quality: competencyAssessmentSchema,
    scripting: competencyAssessmentSchema,
    communication_ownership: competencyAssessmentSchema,
  }),
  questionAssessments: z
    .array(
      z.object({
        questionId: kebabIdSchema,
        score: z.number().int().min(0).max(100),
        verdict: mockVerdictSchema,
        summary: z.string().trim().min(1).max(600),
        strengths: z.array(z.string().trim().min(1).max(300)).max(3),
        missedCriteria: z.array(z.string().trim().min(1).max(350)).max(5),
      }),
    )
    .min(3)
    .max(8),
  interviewDimensions: rawInterviewDimensionsSchema,
  strengths: z.array(z.string().trim().min(1).max(350)).max(5),
  priorityGaps: z.array(z.string().trim().min(1).max(400)).max(5),
  studyPlan: z
    .array(
      z.object({
        priority: z.number().int().min(1).max(5),
        topic: z.string().trim().min(1).max(180),
        action: z.string().trim().min(1).max(500),
        questionIds: z.array(kebabIdSchema).max(6),
      }),
    )
    .max(5),
  nextPracticeActions: rawNextPracticeActionsSchema,
});

export type MockInterviewReportRequest = z.infer<
  typeof mockInterviewReportRequestSchema
>;
export type MockInterviewReport = z.infer<typeof mockInterviewReportSchema>;

export type NormalizedMockInterviewDimension = z.infer<
  typeof normalizedInterviewDimensionSchema
>;
export type NormalizedMockInterviewNextPracticeAction = z.infer<
  typeof normalizedNextPracticeActionSchema
>;
export type NormalizedMockInterviewReport = Omit<
  MockInterviewReport,
  "interviewDimensions" | "nextPracticeActions"
> & {
  interviewDimensions: NormalizedMockInterviewDimension[];
  nextPracticeActions: NormalizedMockInterviewNextPracticeAction[];
};

export const mockInterviewReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    readiness: {
      type: "string",
      enum: ["not_ready", "developing", "interview_ready", "strong"],
    },
    summary: { type: "string" },
    hiringSignal: { type: "string" },
    competencies: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        mockCompetencyKeys.map((key) => [
          key,
          {
            type: "object",
            additionalProperties: false,
            properties: {
              status: {
                type: "string",
                enum: ["assessed", "not_assessed"],
              },
              score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
              summary: { type: "string" },
              strengths: {
                type: "array",
                items: { type: "string" },
                maxItems: 4,
              },
              gaps: {
                type: "array",
                items: { type: "string" },
                maxItems: 4,
              },
              evidenceQuestionIds: {
                type: "array",
                items: { type: "string" },
                maxItems: 8,
              },
            },
            required: [
              "status",
              "score",
              "summary",
              "strengths",
              "gaps",
              "evidenceQuestionIds",
            ],
          },
        ]),
      ),
      required: [...mockCompetencyKeys],
    },
    questionAssessments: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          questionId: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          verdict: {
            type: "string",
            enum: ["needs_work", "partial", "solid", "strong"],
          },
          summary: { type: "string" },
          strengths: {
            type: "array",
            items: { type: "string" },
            maxItems: 3,
          },
          missedCriteria: {
            type: "array",
            items: { type: "string" },
            maxItems: 5,
          },
        },
        required: [
          "questionId",
          "score",
          "verdict",
          "summary",
          "strengths",
          "missedCriteria",
        ],
      },
    },
    interviewDimensions: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: {
            type: "string",
            enum: [...mockInterviewDimensionKeys],
          },
          status: {
            type: "string",
            enum: ["assessed", "not_assessed"],
          },
          score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
          summary: { type: "string" },
          evidenceIds: {
            type: "array",
            maxItems: 3,
            items: { type: "string" },
          },
          observations: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                feedback: { type: "string" },
                evidenceIds: {
                  type: "array",
                  minItems: 1,
                  maxItems: 3,
                  items: { type: "string" },
                },
              },
              required: ["feedback", "evidenceIds"],
            },
          },
        },
        required: [
          "key",
          "status",
          "score",
          "summary",
          "evidenceIds",
          "observations",
        ],
      },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    priorityGaps: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    studyPlan: {
      type: "array",
      maxItems: 0,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "integer", minimum: 1, maximum: 5 },
          topic: { type: "string" },
          action: { type: "string" },
          questionIds: {
            type: "array",
            items: { type: "string" },
            maxItems: 6,
          },
        },
        required: ["priority", "topic", "action", "questionIds"],
      },
    },
    nextPracticeActions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "integer", minimum: 1, maximum: 3 },
          title: { type: "string" },
          action: { type: "string" },
          evidenceIds: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" },
          },
        },
        required: ["priority", "title", "action", "evidenceIds"],
      },
    },
  },
  required: [
    "overallScore",
    "readiness",
    "summary",
    "hiringSignal",
    "competencies",
    "questionAssessments",
    "interviewDimensions",
    "strengths",
    "priorityGaps",
    "studyPlan",
    "nextPracticeActions",
  ],
} as const;

export function normalizeMockInterviewReport({
  rawReport,
  questionCompetencies,
  executionByQuestionId = {},
  evidenceCatalog,
}: {
  rawReport: MockInterviewReport;
  questionCompetencies: Record<string, MockCompetencyKey>;
  executionByQuestionId?: Record<
    string,
    | "passed"
    | "tests_failed"
    | "compile_error"
    | "runtime_error"
    | "time_limit"
    | "memory_limit"
    | "output_limit"
    | "sandbox_error"
  >;
  evidenceCatalog: readonly MockReportEvidence[];
}): NormalizedMockInterviewReport {
  const report = mockInterviewReportSchema.parse(rawReport);
  const expectedIds = Object.keys(questionCompetencies);
  const assessmentById = new Map(
    report.questionAssessments.map((assessment) => [
      assessment.questionId,
      assessment,
    ]),
  );
  if (
    assessmentById.size !== expectedIds.length ||
    expectedIds.some((questionId) => !assessmentById.has(questionId)) ||
    [...assessmentById].some(([questionId]) => !(questionId in questionCompetencies))
  ) {
    throw new Error("AI mock report returned a mismatched question set");
  }

  const questionAssessments = expectedIds.map((questionId) => {
    const assessment = assessmentById.get(questionId)!;
    const executionCap = executionScoreCap(
      executionByQuestionId[questionId],
    );
    const score =
      executionCap === null
        ? assessment.score
        : Math.min(assessment.score, executionCap);
    return {
      ...assessment,
      score,
      verdict:
        score >= 85
          ? "strong" as const
          : score >= 65
            ? "solid" as const
            : score >= 40
              ? "partial" as const
              : "needs_work" as const,
    };
  });
  const normalizedAssessmentById = new Map(
    questionAssessments.map((assessment) => [
      assessment.questionId,
      assessment,
    ]),
  );
  const competencies = { ...report.competencies };
  let weightedScore = 0;
  let assessedWeight = 0;

  for (const key of mockCompetencyKeys) {
    const evidenceQuestionIds = expectedIds.filter(
      (questionId) => questionCompetencies[questionId] === key,
    );
    if (!evidenceQuestionIds.length) {
      competencies[key] = {
        status: "not_assessed",
        score: null,
        summary: "Buổi phỏng vấn thử này chưa có câu đủ trực tiếp để đánh giá năng lực này.",
        strengths: [],
        gaps: [],
        evidenceQuestionIds: [],
      };
      continue;
    }

    const scores = evidenceQuestionIds.map(
      (questionId) => normalizedAssessmentById.get(questionId)!.score,
    );
    const score = Math.round(
      scores.reduce((sum, value) => sum + value, 0) / scores.length,
    );
    const current = competencies[key];
    competencies[key] = {
      ...current,
      status: "assessed",
      score,
      summary:
        current.status === "assessed"
          ? current.summary
          : `Đã đánh giá qua ${evidenceQuestionIds.length} câu trong buổi phỏng vấn thử.`,
      evidenceQuestionIds,
    };
    const weight = mockCompetencyWeight(key);
    weightedScore += score * weight;
    assessedWeight += weight;
  }

  const overallScore =
    assessedWeight > 0 ? Math.round(weightedScore / assessedWeight) : 0;

  const evidenceById = new Map(
    evidenceCatalog.map((evidence) => [evidence.id, evidence]),
  );
  if (evidenceById.size !== evidenceCatalog.length) {
    throw new Error("Mock report evidence catalog contains duplicate IDs");
  }
  if (
    evidenceCatalog.some(
      (evidence) => !expectedIds.includes(evidence.questionId),
    )
  ) {
    throw new Error("Mock report evidence catalog escaped this interview");
  }
  const resolveEvidence = (ids: readonly string[]) =>
    ids.map((id) => {
      const evidence = evidenceById.get(id);
      if (!evidence) {
        throw new Error("AI mock report cited evidence outside this interview");
      }
      return evidence;
    });
  const interviewDimensions = report.interviewDimensions.map((dimension) => ({
    key: dimension.key,
    status: dimension.status,
    score: dimension.score,
    summary: dimension.summary,
    evidence: resolveEvidence(dimension.evidenceIds),
    observations: dimension.observations.map((observation) => ({
      feedback: observation.feedback,
      evidence: resolveEvidence(observation.evidenceIds),
    })),
  }));
  const nextPracticeActions = report.nextPracticeActions.map((action) => ({
    priority: action.priority,
    title: action.title,
    action: action.action,
    evidence: resolveEvidence(action.evidenceIds),
  }));
  normalizedInterviewDimensionsSchema.parse(interviewDimensions);
  normalizedNextPracticeActionsSchema.parse(nextPracticeActions);

  return {
    ...report,
    overallScore,
    readiness:
      overallScore >= 85
        ? "strong"
        : overallScore >= 70
          ? "interview_ready"
          : overallScore >= 45
            ? "developing"
            : "not_ready",
    competencies,
    questionAssessments,
    interviewDimensions,
    nextPracticeActions,
    // Next-practice actions are the only actionable plan for new reports.
    // Keep the historical field empty even if a provider ignored the prompt.
    studyPlan: [],
  };
}

function executionScoreCap(
  status:
    | "passed"
    | "tests_failed"
    | "compile_error"
    | "runtime_error"
    | "time_limit"
    | "memory_limit"
    | "output_limit"
    | "sandbox_error"
    | undefined,
) {
  if (!status || status === "passed" || status === "sandbox_error") {
    return null;
  }
  if (status === "tests_failed") return 64;
  return 39;
}

export function buildMockReportEvidenceCatalog({
  items,
}: {
  items: readonly {
    questionId: string;
    responseMode: "text" | "code";
    response: string;
    explanation: string;
    questionCode?: string;
    execution?: {
      status: string;
      passedTests: number;
      totalTests: number;
      durationMs: number;
    };
  }[];
}): MockReportEvidence[] {
  return items.flatMap((item) => {
    const evidence: MockReportEvidence[] = [
      {
        id: `answer:${item.questionId}:response`,
        questionId: item.questionId,
        kind: "candidate_answer",
        label: "Câu trả lời của ứng viên",
        excerpt: excerptOrEmpty(item.response, "Ứng viên để trống câu trả lời."),
      },
    ];
    if (item.explanation.trim()) {
      evidence.push({
        id: `answer:${item.questionId}:explanation`,
        questionId: item.questionId,
        kind: "candidate_answer",
        label: "Giải thích của ứng viên",
        excerpt: excerptOrEmpty(item.explanation, ""),
      });
    }
    if (item.responseMode === "code" && item.response.trim()) {
      evidence.push({
        id: `code:${item.questionId}:submission`,
        questionId: item.questionId,
        kind: "candidate_code",
        label: "Mã ứng viên nộp",
        excerpt: excerptOrEmpty(item.response, ""),
      });
    }
    if (item.questionCode?.trim()) {
      evidence.push({
        id: `code:${item.questionId}:question`,
        questionId: item.questionId,
        kind: "question_code",
        label: "Đoạn mã trong đề",
        excerpt: excerptOrEmpty(item.questionCode, ""),
      });
    }
    if (item.execution) {
      evidence.push({
        id: `test:${item.questionId}:hidden`,
        questionId: item.questionId,
        kind: "test_result",
        label: "Kết quả kiểm thử ẩn",
        excerpt: `status=${item.execution.status}; passed=${item.execution.passedTests}/${item.execution.totalTests}; duration=${item.execution.durationMs}ms`,
      });
    }
    return evidence;
  });
}

function excerptOrEmpty(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const source = normalized || fallback;
  return source.length <= 420 ? source : `${source.slice(0, 417)}…`;
}

function mockCompetencyWeight(key: MockCompetencyKey) {
  const weights: Record<MockCompetencyKey, number> = {
    modern_cpp: 30,
    tick_data_order_book: 25,
    data_pipeline_performance: 15,
    engineering_quality: 15,
    scripting: 5,
    communication_ownership: 10,
  };
  return weights[key];
}
