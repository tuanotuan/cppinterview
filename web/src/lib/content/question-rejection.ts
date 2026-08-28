import { z } from "zod";

import type { ContentManifest } from "./schema";

export const rejectQueuedQuestionSchema = z.object({
  questionId: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(160),
  questionVersion: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type RejectQueuedQuestion = z.infer<
  typeof rejectQueuedQuestionSchema
>;

export const rejectQueuedQuestionResultSchema = z.object({
  status: z.enum([
    "rejected",
    "already_rejected",
    "not_found",
    "version_conflict",
    "not_pending",
  ]),
  questionId: z.string().optional(),
});

export function withoutRejectedQuestions(
  manifest: ContentManifest,
  rejectedQuestionIds: ReadonlySet<string>,
): ContentManifest {
  if (!rejectedQuestionIds.size) return manifest;
  return {
    ...manifest,
    questions: manifest.questions.filter(
      (question) => !rejectedQuestionIds.has(question.id),
    ),
  };
}

export function isMissingQuestionRejectionMigration(
  error: { code?: string | null },
) {
  return new Set([
    "42P01",
    "42883",
    "PGRST202",
    "PGRST205",
  ]).has(error.code ?? "");
}
