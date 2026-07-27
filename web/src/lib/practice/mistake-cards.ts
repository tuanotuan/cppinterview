import { z } from "zod";

import {
  questionDifficultySchema,
  questionResponseModeSchema,
  questionSkillSchema,
} from "@/lib/content/schema";

export const mistakeGenerationModes = ["ask", "auto", "off"] as const;
export const mistakeGenerationModeSchema = z.enum(mistakeGenerationModes);
export type MistakeGenerationMode = z.infer<
  typeof mistakeGenerationModeSchema
>;

export const mistakeCandidateStatuses = [
  "detected",
  "needs_grounding",
  "generating",
  "pending_review",
  "approved",
  "reinforce_existing",
  "dismissed",
  "failed",
  "dead_letter",
] as const;
export const mistakeCandidateStatusSchema = z.enum(
  mistakeCandidateStatuses,
);
export type MistakeCandidateStatus = z.infer<
  typeof mistakeCandidateStatusSchema
>;

export const mistakeFlashcardDraftSchema = z
  .object({
    type: questionSkillSchema,
    responseMode: questionResponseModeSchema,
    difficulty: questionDifficultySchema,
    estimatedMinutes: z.number().int().min(1).max(8),
    prompt: z.string().trim().min(10).max(1200),
    code: z.string().trim().min(1).max(4000).nullable(),
    hint: z.string().trim().min(5).max(400),
    answer: z
      .object({
        short: z.string().trim().min(10).max(700),
        detailed: z.string().trim().min(20).max(2400),
      })
      .strict(),
    rubric: z
      .object({
        required: z.array(z.string().trim().min(3).max(400)).min(1).max(5),
        bonus: z.array(z.string().trim().min(3).max(400)).max(3),
        misconceptions: z.array(z.string().trim().min(3).max(400)).max(4),
      })
      .strict(),
  })
  .strict()
  .superRefine((draft, context) => {
    if (draft.responseMode === "code" && !draft.code) {
      context.addIssue({
        code: "custom",
        path: ["code"],
        message: "Code-response remediation cards require a safe scaffold",
      });
    }
    if (draft.responseMode === "text" && draft.code && draft.code.length > 2400) {
      context.addIssue({
        code: "custom",
        path: ["code"],
        message: "Text-response remediation cards need a concise code excerpt",
      });
    }
  });

export type MistakeFlashcardDraft = z.infer<
  typeof mistakeFlashcardDraftSchema
>;

export const mistakeFlashcardDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: ["recall", "code_reasoning", "pitfall", "scenario"],
    },
    responseMode: { type: "string", enum: ["text", "code"] },
    difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
    },
    estimatedMinutes: { type: "integer", minimum: 1, maximum: 8 },
    prompt: { type: "string" },
    code: { type: ["string", "null"] },
    hint: { type: "string" },
    answer: {
      type: "object",
      additionalProperties: false,
      properties: {
        short: { type: "string" },
        detailed: { type: "string" },
      },
      required: ["short", "detailed"],
    },
    rubric: {
      type: "object",
      additionalProperties: false,
      properties: {
        required: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        bonus: { type: "array", items: { type: "string" }, maxItems: 3 },
        misconceptions: { type: "array", items: { type: "string" }, maxItems: 4 },
      },
      required: ["required", "bonus", "misconceptions"],
    },
  },
  required: [
    "type", "responseMode", "difficulty", "estimatedMinutes", "prompt",
    "code", "hint", "answer", "rubric",
  ],
} as const;

export type MistakeFlashcardCandidate = {
  id: string;
  sourceKind: "coach" | "mock_v4";
  sourceAttemptId: string;
  sourceQuestionId: string;
  sourceQuestionVersion: number;
  sourceContentRevision: string;
  lessonId: string | null;
  sourceHash: string | null;
  sourceSectionIds: string[];
  criterionKey: string;
  criterionText: string;
  competency: string | null;
  status: MistakeCandidateStatus;
  occurrenceCount: number;
  attemptCount: number;
  materializedQuestionId: string | null;
  matchedQuestionId: string | null;
  generatorProvider: string | null;
  generatorModel: string | null;
  lastErrorCode: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MistakeCandidateRow = {
  id: string;
  source_kind: "coach" | "mock_v4";
  source_attempt_id: string;
  source_question_id: string;
  source_question_version: number;
  source_content_revision: string;
  lesson_id: string | null;
  source_hash: string | null;
  source_section_ids: unknown;
  criterion_key: string;
  criterion_text: string;
  competency: string | null;
  status: MistakeCandidateStatus;
  occurrence_count: number;
  attempt_count: number;
  materialized_question_id: string | null;
  matched_question_id: string | null;
  generator_provider: string | null;
  generator_model: string | null;
  last_error: unknown;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type MistakeFunnel = {
  detected: number;
  generated: number;
  approved: number;
  firstReviewed: number;
  resolved: number;
  needsGrounding: number;
  repeated: number;
};

export function rowsToMistakeCandidates(
  rows: MistakeCandidateRow[],
): MistakeFlashcardCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    sourceKind: row.source_kind,
    sourceAttemptId: row.source_attempt_id,
    sourceQuestionId: row.source_question_id,
    sourceQuestionVersion: row.source_question_version,
    sourceContentRevision: row.source_content_revision,
    lessonId: row.lesson_id,
    sourceHash: row.source_hash,
    sourceSectionIds: stringArray(row.source_section_ids),
    criterionKey: row.criterion_key,
    criterionText: row.criterion_text,
    competency: row.competency,
    status: mistakeCandidateStatusSchema.parse(row.status),
    occurrenceCount: Number(row.occurrence_count),
    attemptCount: Number(row.attempt_count),
    materializedQuestionId: row.materialized_question_id,
    matchedQuestionId: row.matched_question_id,
    generatorProvider: row.generator_provider,
    generatorModel: row.generator_model,
    lastErrorCode: errorCode(row.last_error),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function normalizeMistakeConcept(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[`'"\u2018\u2019\u201c\u201d]/g, "")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function errorCode(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string"
  ) {
    return value.code;
  }
  return null;
}
