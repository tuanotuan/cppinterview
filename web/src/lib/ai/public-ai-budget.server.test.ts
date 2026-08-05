import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./budget", () => ({
  AiOperationOutcomeUnknownError: class extends Error {
    constructor(readonly cause: unknown) {
      super("outcome unknown");
    }
  },
  isAiOperationSafeToRetry: (error: unknown) =>
    error instanceof Error && error.message === "safe",
}));

vi.mock("./usage", () => ({
  dailyBudgetUsdMicros: () => 100,
  monthlyBudgetUsdMicros: () => 500,
  usageCostUsdMicros: () => 7,
}));

import {
  PublicAiSiteBudgetExceededError,
  withPublicAiSiteBudget,
} from "./public-ai-budget.server";

const reservationId = "123e4567-e89b-42d3-a456-426614174000";
function client({ dailyExceeded = false } = {}) {
  return {
    rpc: vi.fn(async (name: string) => {
      if (name === "reserve_public_ai_site_budget") {
        return {
          data: dailyExceeded
            ? { status: "daily_exceeded" }
            : {
                status: "reserved",
                reservation_id: reservationId,
                requested_usd_micros: 20,
                dispatched: false,
              },
          error: null,
        };
      }
      if (name === "mark_public_ai_admission_dispatched") {
        return { data: { status: "dispatched" }, error: null };
      }
      if (name === "finalize_public_ai_site_budget") {
        return { data: { status: "finalized" }, error: null };
      }
      if (name === "release_public_ai_site_budget") {
        return { data: { status: "released" }, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    }),
  };
}

describe("public AI site budget", () => {
  it("reserves, dispatches, and finalizes one Luna call", async () => {
    const supabase = client();
    const beforeProviderDispatch = vi.fn(async () => undefined);
    const invokeProvider = vi.fn(async () => ({
      model: "gpt-5.6-luna",
      usage: {
        inputTokens: 10,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 5,
      },
    }));

    const result = await withPublicAiSiteBudget(supabase as never, reservationId, 20, {
      beforeProviderDispatch,
      invokeProvider,
    });

    expect(result.model).toBe("gpt-5.6-luna");
    expect(beforeProviderDispatch).toHaveBeenCalledOnce();
    expect(invokeProvider).toHaveBeenCalledOnce();
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "reserve_public_ai_site_budget",
      expect.objectContaining({ p_reservation_id: reservationId }),
    );
    expect(supabase.rpc).toHaveBeenLastCalledWith(
      "finalize_public_ai_site_budget",
      expect.objectContaining({
        p_reservation_id: reservationId,
        p_actual_usd_micros: 7,
      }),
    );
  });

  it("fails before dispatch when the public daily spend cap is exhausted", async () => {
    const supabase = client({ dailyExceeded: true });
    const invokeProvider = vi.fn();

    await expect(
      withPublicAiSiteBudget(supabase as never, reservationId, 20, {
        beforeProviderDispatch: async () => undefined,
        invokeProvider,
      }),
    ).rejects.toEqual(expect.objectContaining({ period: "daily" }));
    await expect(
      withPublicAiSiteBudget(client({ dailyExceeded: true }) as never, reservationId, 20, {
        beforeProviderDispatch: async () => undefined,
        invokeProvider,
      }),
    ).rejects.toBeInstanceOf(PublicAiSiteBudgetExceededError);
    expect(invokeProvider).not.toHaveBeenCalled();
  });
});
