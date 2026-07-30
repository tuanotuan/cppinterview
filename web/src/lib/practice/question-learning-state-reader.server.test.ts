import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { readQuestionLearningStateRows } from "./question-learning-state-reader.server";

function legacyStateRow() {
  return {
    question_id: "cpp11-auto-001",
    question_version: 1,
    source_hash: "a".repeat(64),
    learning_state: "new",
    due_on: null,
    interval_days: 0,
    review_count: 0,
    lapse_count: 0,
    last_rating: null,
    last_reviewed_on: null,
    is_suspended: false,
    is_leech: false,
    content_changed: false,
    history_reset_on: null,
  };
}

describe("readQuestionLearningStateRows", () => {
  it("falls back before the history-generation expansion is migrated", async () => {
    const results = [
      { data: null, error: { code: "42703" } },
      { data: [legacyStateRow()], error: null },
    ];
    const select = vi.fn();
    const eq = vi.fn();
    const builder = {
      select,
      eq,
      then: (
        resolve: (value: (typeof results)[number]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(results.shift()!).then(resolve, reject),
    };
    select.mockReturnValue(builder);
    eq.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    const result = await readQuestionLearningStateRows(
      supabase,
      { questionId: "cpp11-auto-001" },
    );

    expect(result.error).toBeNull();
    expect(result.rows[0]?.history_reset_token).toBeNull();
    expect(select.mock.calls[0]?.[0]).toContain(
      "history_reset_token",
    );
    expect(select.mock.calls[1]?.[0]).not.toContain(
      "history_reset_token",
    );
    expect(eq).toHaveBeenCalledTimes(2);
  });

  it("does not hide unrelated database failures", async () => {
    const result = { data: null, error: { code: "network-error" } };
    const builder = {
      select: vi.fn(),
      then: (
        resolve: (value: typeof result) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    builder.select.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    await expect(
      readQuestionLearningStateRows(supabase),
    ).resolves.toEqual({
      rows: [],
      error: { code: "network-error" },
    });
  });
});
