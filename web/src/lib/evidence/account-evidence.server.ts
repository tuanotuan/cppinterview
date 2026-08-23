import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { coachFeedbackSchema } from "@/lib/ai/contracts";

import { coachFeedbackRecordToAttemptArtifact } from "./adapters";
import type { AttemptArtifact } from "./contracts";

const coachAttemptRowSchema = z
  .object({
    id: z.number().int().positive(),
    question_id: z.string().trim().min(1).max(180),
    question_version: z.number().int().positive(),
    source_commit_sha: z.string().trim().min(1).max(128),
    feedback: coachFeedbackSchema,
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();

export type AccountEvidenceQuestion = {
  id: string;
  version: number;
  sourceRevision: string;
  responseMode: "text" | "code";
  competency: string;
};

export type AccountCoachEvidenceRead = {
  artifacts: AttemptArtifact[];
  discardedCount: number;
  error: { code?: string | null } | null;
};

export async function readAccountCoachEvidenceArtifacts(
  supabase: SupabaseClient,
  {
    userId,
    questions,
    limit = 250,
  }: {
    userId: string;
    questions: readonly AccountEvidenceQuestion[];
    limit?: number;
  },
): Promise<AccountCoachEvidenceRead> {
  const parsedUserId = z.string().uuid().safeParse(userId);
  if (!parsedUserId.success) {
    return {
      artifacts: [],
      discardedCount: 0,
      error: { code: "invalid_user_id" },
    };
  }
  const boundedLimit = Math.min(500, Math.max(1, Math.floor(limit)));
  const { data, error } = await supabase
    .from("coach_attempts")
    .select(
      "id, question_id, question_version, source_commit_sha, feedback, created_at",
    )
    // RLS is mandatory; the explicit predicate also enables the account index.
    .eq("user_id", parsedUserId.data)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);
  if (error) {
    return { artifacts: [], discardedCount: 0, error: { code: error.code } };
  }

  const converted = coachRowsToAttemptArtifacts(data ?? [], questions);
  return { ...converted, error: null };
}

export function coachRowsToAttemptArtifacts(
  rows: readonly unknown[],
  questions: readonly AccountEvidenceQuestion[],
): Pick<AccountCoachEvidenceRead, "artifacts" | "discardedCount"> {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const artifacts: AttemptArtifact[] = [];
  let discardedCount = 0;

  for (const value of rows) {
    const parsed = coachAttemptRowSchema.safeParse(value);
    if (!parsed.success) {
      discardedCount += 1;
      continue;
    }
    const row = parsed.data;
    const question = questionsById.get(row.question_id);
    if (!question) {
      discardedCount += 1;
      continue;
    }
    const current =
      row.question_version === question.version &&
      row.source_commit_sha === question.sourceRevision;
    artifacts.push(
      coachFeedbackRecordToAttemptArtifact({
        attemptId: String(row.id),
        occurredAt: row.created_at,
        question: {
          id: row.question_id,
          version: row.question_version,
          contentRevision: row.source_commit_sha,
          responseMode: question.responseMode,
          current,
        },
        feedback: row.feedback,
        competencies: [question.competency],
      }),
    );
  }

  return { artifacts, discardedCount };
}
