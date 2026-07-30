import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readReviewEvents } from "./profile-activity.server";

describe("profile activity pagination", () => {
  it("continues when Supabase caps pages below the requested size", async () => {
    const pages = [
      [
        { id: 1, reviewed_on: "2026-07-28" },
        { id: 2, reviewed_on: "2026-07-29" },
      ],
      [{ id: 3, reviewed_on: "2026-07-30" }],
      [],
    ];
    const range = vi.fn(async () => ({
      data: pages.shift() ?? [],
      error: null,
    }));
    const builder = {
      select: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.gte.mockReturnValue(builder);
    builder.lte.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    await expect(
      readReviewEvents(
        supabase,
        "2026-07-01",
        "2026-07-30",
      ),
    ).resolves.toEqual({
      events: [
        { occurredOn: "2026-07-28", source: "review" },
        { occurredOn: "2026-07-29", source: "review" },
        { occurredOn: "2026-07-30", source: "review" },
      ],
      error: null,
    });
    expect(range.mock.calls).toEqual([
      [0, 999],
      [2, 1001],
      [3, 1002],
    ]);
  });
});
