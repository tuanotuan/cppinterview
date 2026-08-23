import { z } from "zod";

export const ATTEMPT_ARTIFACT_VERSION = 1 as const;

export const attemptSourceKinds = ["practice", "coach", "mock"] as const;
export const attemptEvidenceKinds = [
  "self_rating",
  "candidate_answer",
  "candidate_code",
  "coach_feedback",
  "rubric",
  "compile_result",
  "test_result",
  "sanitizer_result",
] as const;

const stableKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9_:+.-]*$/);
const evidenceIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(240)
  .regex(/^[a-z0-9][a-z0-9_:+.-]*$/);

export const attemptEvidenceSchema = z
  .object({
    id: evidenceIdSchema,
    kind: z.enum(attemptEvidenceKinds),
    label: z.string().trim().min(1).max(160),
    excerpt: z.string().trim().min(1).max(500).optional(),
    visibility: z.enum(["private", "learner"]),
  })
  .strict();

const criterionAssessmentSchema = z
  .object({
    key: stableKeySchema,
    outcome: z.enum(["met", "partial", "missed", "not_assessed"]),
    evidenceIds: z.array(evidenceIdSchema).max(8),
  })
  .strict();

export const competencyAssessmentSchema = z
  .object({
    key: stableKeySchema,
    status: z.enum(["assessed", "not_assessed"]),
    score: z.number().int().min(0).max(100).nullable(),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(evidenceIdSchema).max(16),
    criteria: z.array(criterionAssessmentSchema).max(16),
  })
  .strict()
  .superRefine((assessment, context) => {
    const assessed = assessment.status === "assessed";
    if (
      assessed &&
      (assessment.score === null || assessment.evidenceIds.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Assessed competencies require a score and cited evidence",
      });
    }
    if (
      !assessed &&
      (assessment.score !== null ||
        assessment.confidence !== 0 ||
        assessment.evidenceIds.length > 0 ||
        assessment.criteria.some(
          (criterion) => criterion.outcome !== "not_assessed",
        ))
    ) {
      context.addIssue({
        code: "custom",
        message: "Unassessed competencies cannot claim evidence",
      });
    }
  });

const executionStatusSchema = z.enum([
  "not_run",
  "passed",
  "failed",
  "infrastructure_error",
]);

export const attemptArtifactSchema = z
  .object({
    version: z.literal(ATTEMPT_ARTIFACT_VERSION),
    id: z.string().trim().min(1).max(360),
    source: z
      .object({
        kind: z.enum(attemptSourceKinds),
        attemptId: z.string().trim().min(1).max(200),
      })
      .strict(),
    occurredAt: z.string().datetime({ offset: true }),
    question: z
      .object({
        id: stableKeySchema,
        version: z.number().int().positive(),
        contentRevision: z.string().trim().min(1).max(128),
        responseMode: z.enum(["text", "code"]),
      })
      .strict(),
    response: z
      .object({
        status: z.enum(["not_captured", "not_provided", "provided"]),
        answer: z.string().max(8_000).optional(),
        code: z.string().max(64_000).optional(),
        usedHint: z.boolean(),
        revealedReference: z.boolean(),
      })
      .strict(),
    verification: z
      .object({
        compile: executionStatusSchema,
        tests: executionStatusSchema,
        sanitizers: executionStatusSchema,
      })
      .strict(),
    evidence: z.array(attemptEvidenceSchema).max(48),
    assessments: z.array(competencyAssessmentSchema).max(24),
    outcome: z
      .object({
        score: z.number().int().min(0).max(100).nullable(),
        verdict: z.enum([
          "needs_work",
          "partial",
          "solid",
          "strong",
          "not_assessed",
        ]),
        suggestedRating: z
          .enum(["again", "hard", "good", "easy"])
          .nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((artifact, context) => {
    if (
      artifact.response.status === "provided" &&
      artifact.response.answer === undefined &&
      artifact.response.code === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["response"],
        message: "Provided responses require answer or code payload",
      });
    }
    if (
      artifact.response.status !== "provided" &&
      (artifact.response.answer !== undefined ||
        artifact.response.code !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["response"],
        message: "Missing or uncaptured responses cannot contain payload",
      });
    }

    const evidenceIds = artifact.evidence.map((item) => item.id);
    const evidenceSet = new Set(evidenceIds);
    if (evidenceSet.size !== evidenceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Evidence IDs must be unique within an attempt",
      });
    }

    const assessmentKeys = artifact.assessments.map((item) => item.key);
    if (new Set(assessmentKeys).size !== assessmentKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["assessments"],
        message: "A competency can be assessed at most once per attempt",
      });
    }

    artifact.assessments.forEach((assessment, assessmentIndex) => {
      const referencedIds = [
        ...assessment.evidenceIds,
        ...assessment.criteria.flatMap((criterion) => criterion.evidenceIds),
      ];
      referencedIds.forEach((id) => {
        if (!evidenceSet.has(id)) {
          context.addIssue({
            code: "custom",
            path: ["assessments", assessmentIndex, "evidenceIds"],
            message: `Assessment references unknown evidence: ${id}`,
          });
        }
      });
    });
  });

export type AttemptArtifact = z.infer<typeof attemptArtifactSchema>;
export type AttemptEvidence = z.infer<typeof attemptEvidenceSchema>;
export type CompetencyAssessment = z.infer<
  typeof competencyAssessmentSchema
>;

export function parseAttemptArtifact(value: unknown): AttemptArtifact {
  return attemptArtifactSchema.parse(value);
}
