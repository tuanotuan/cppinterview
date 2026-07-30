import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuestionLearningStateRow } from "./cloud";
import { isMissingHistoryResetTokenError } from "./practice-review-reader.server";

const BASE_STATE_COLUMNS = [
  "question_id",
  "question_version",
  "source_hash",
  "learning_state",
  "due_on",
  "interval_days",
  "review_count",
  "lapse_count",
  "last_rating",
  "last_reviewed_on",
  "is_suspended",
  "is_leech",
  "content_changed",
  "history_reset_on",
] as const;

export type QuestionLearningStateReadResult = {
  rows: QuestionLearningStateRow[];
  error: { code?: string | null } | null;
};

export async function readQuestionLearningStateRows(
  supabase: SupabaseClient,
  { questionId }: { questionId?: string } = {},
): Promise<QuestionLearningStateReadResult> {
  const read = async (includeHistoryResetToken: boolean) => {
    let query = supabase
      .from("user_question_states")
      .select(
        [
          ...BASE_STATE_COLUMNS,
          ...(includeHistoryResetToken
            ? ["history_reset_token"]
            : []),
        ].join(", "),
      );
    if (questionId) query = query.eq("question_id", questionId);
    return query;
  };

  let result = await read(true);
  if (
    result.error &&
    isMissingHistoryResetTokenError(result.error)
  ) {
    result = await read(false);
  }
  if (result.error) return { rows: [], error: result.error };

  return {
    rows: ((result.data ?? []) as unknown as Array<
      Omit<QuestionLearningStateRow, "history_reset_token"> & {
        history_reset_token?: string | null;
      }
    >).map((row) => ({
      ...row,
      history_reset_token: row.history_reset_token ?? null,
    })),
    error: null,
  };
}
