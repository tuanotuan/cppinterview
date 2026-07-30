import type { SupabaseClient } from "@supabase/supabase-js";

import type { PracticeReviewRow } from "./cloud";

const REVIEW_PAGE_SIZE = 1000;

export type PracticeReviewReadResult = {
  rows: PracticeReviewRow[];
  error: { code?: string | null } | null;
};

export async function readAllPracticeReviewRows(
  supabase: SupabaseClient,
  { questionId }: { questionId?: string } = {},
): Promise<PracticeReviewReadResult> {
  const rows: PracticeReviewRow[] = [];
  let beforeId: number | null = null;
  let includeHistoryResetToken = true;

  for (;;) {
    let query = supabase
      .from("practice_reviews")
      .select(
        [
          "id",
          "question_id",
          "reviewed_on",
          "rating",
          "next_due_on",
          "question_version",
          "source_hash",
          "learning_state_after",
          "interval_days_after",
          "lapse_count_after",
          ...(includeHistoryResetToken
            ? ["history_reset_token"]
            : []),
        ].join(", "),
      )
      .order("id", { ascending: false });
    if (questionId) {
      query = query.eq("question_id", questionId);
    }
    if (beforeId !== null) {
      query = query.lt("id", beforeId);
    }
    const { data, error } = await query.range(
      0,
      REVIEW_PAGE_SIZE - 1,
    );

    if (error) {
      if (
        includeHistoryResetToken &&
        isMissingHistoryResetTokenError(error)
      ) {
        includeHistoryResetToken = false;
        beforeId = null;
        rows.length = 0;
        continue;
      }
      return { rows: [], error };
    }

    const page = (data ?? []) as unknown as Array<
      PracticeReviewRow & { id: number }
    >;
    if (page.length === 0) {
      return { rows, error: null };
    }
    rows.push(...page);
    const nextCursor = page.at(-1)?.id;
    if (
      !Number.isSafeInteger(nextCursor) ||
      Number(nextCursor) <= 0 ||
      (beforeId !== null && Number(nextCursor) >= beforeId)
    ) {
      return { rows: [], error: { code: "invalid_review_cursor" } };
    }
    beforeId = Number(nextCursor);
  }
}

export function isMissingHistoryResetTokenError(error: {
  code?: string | null;
}) {
  return error.code === "42703" || error.code === "PGRST204";
}
