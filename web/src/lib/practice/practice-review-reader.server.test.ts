import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { PracticeReviewRow } from "./cloud";
import { readAllPracticeReviewRows } from "./practice-review-reader.server";

function review(
  index: number,
  id = index + 1,
): PracticeReviewRow & { id: number } {
  return {
    id,
    question_id: `question-${index}`,
    reviewed_on: "2026-07-29",
    rating: "good",
    next_due_on: "2026-08-01",
  };
}

describe("readAllPracticeReviewRows", () => {
  it("reads every page with a stable review date and id ordering", async () => {
    const firstPage = Array.from(
      { length: 1000 },
      (_, index) => review(index, 1001 - index),
    );
    const secondPage = [review(1000, 1)];
    const pages = [firstPage, secondPage];
    const range = vi.fn(async () => ({
      data: pages.shift() ?? [],
      error: null,
    }));
    const builder = {
      select: vi.fn(),
      order: vi.fn(),
      lt: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    const result = await readAllPracticeReviewRows(supabase);

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1001);
    expect(result.rows.at(-1)?.question_id).toBe("question-1000");
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 0, 999);
    expect(range).toHaveBeenNthCalledWith(3, 0, 999);
    expect(builder.order).toHaveBeenCalledWith("id", {
      ascending: false,
    });
    expect(builder.lt).toHaveBeenNthCalledWith(1, "id", 2);
    expect(builder.lt).toHaveBeenNthCalledWith(2, "id", 1);
  });

  it("continues when the server caps each page below the requested size", async () => {
    const pages = [
      Array.from(
        { length: 500 },
        (_, index) => review(index, 1001 - index),
      ),
      Array.from(
        { length: 500 },
        (_, index) => review(index + 500, 501 - index),
      ),
      [review(1000, 1)],
      [],
    ];
    const range = vi.fn(async () => ({
      data: pages.shift() ?? [],
      error: null,
    }));
    const builder = {
      select: vi.fn(),
      order: vi.fn(),
      lt: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    const result = await readAllPracticeReviewRows(supabase);

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1001);
    expect(range).toHaveBeenCalledTimes(4);
    expect(builder.lt).toHaveBeenNthCalledWith(1, "id", 502);
    expect(builder.lt).toHaveBeenNthCalledWith(2, "id", 2);
    expect(builder.lt).toHaveBeenNthCalledWith(3, "id", 1);
  });

  it("does not expose a partial history when a later page fails", async () => {
    const firstPage = Array.from(
      { length: 1000 },
      (_, index) => review(index, 1001 - index),
    );
    const range = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "network-error" },
      });
    const builder = {
      select: vi.fn(),
      order: vi.fn(),
      lt: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    const result = await readAllPracticeReviewRows(supabase);

    expect(result).toEqual({
      rows: [],
      error: { code: "network-error" },
    });
  });

  it("falls back to the legacy projection only for a missing generation column", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "42703" },
      })
      .mockResolvedValueOnce({
        data: [review(0, 1)],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    const builder = {
      select: vi.fn(),
      order: vi.fn(),
      lt: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    const result = await readAllPracticeReviewRows(supabase);

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(builder.select.mock.calls[0]?.[0]).toContain(
      "history_reset_token",
    );
    expect(builder.select.mock.calls[1]?.[0]).not.toContain(
      "history_reset_token",
    );
  });

  it("fails closed instead of looping when a page does not advance", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: [review(0, 10)],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [review(1, 10)],
        error: null,
      });
    const builder = {
      select: vi.fn(),
      order: vi.fn(),
      lt: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    await expect(
      readAllPracticeReviewRows(supabase),
    ).resolves.toEqual({
      rows: [],
      error: { code: "invalid_review_cursor" },
    });
    expect(range).toHaveBeenCalledTimes(2);
  });
});
