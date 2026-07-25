import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  aiDailyBudgetSnapshotFromUsageRead,
  AiMonthlyBudgetExceededError,
  mergeAiDailyBudgetSnapshot,
  reserveAiBudget,
  type AiDailyBudgetSnapshot,
  withAiBudget,
} from "./budget";

function snapshot(
  usageDate: string,
  actualUsdMicros: number,
  remainingPercent: number,
): AiDailyBudgetSnapshot {
  return {
    actualUsdMicros,
    billingUsdMicros: actualUsdMicros,
    billingSyncedAt: "2026-07-21T10:00:00.000Z",
    requestCount: 1,
    inputTokens: 100,
    outputTokens: 50,
    lastModel: "gpt-5.6-luna",
    limitUsdMicros: 166_666,
    remainingPercent,
    usageDate,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI budget snapshots", () => {
  it("does not let a stale response increase today's remaining quota", () => {
    const current = {
      ...snapshot("2026-07-21", 120_000, 28),
      requestCount: 4,
    };
    const stale = {
      ...snapshot("2026-07-21", 110_000, 34),
      requestCount: 3,
    };

    expect(mergeAiDailyBudgetSnapshot(current, stale)).toMatchObject({
      actualUsdMicros: 120_000,
      requestCount: 4,
      remainingPercent: 28,
    });
  });

  it("allows the quota to reset on a new Vietnam day", () => {
    const current = snapshot("2026-07-21", 160_000, 4);
    const tomorrow = snapshot("2026-07-22", 0, 100);

    expect(mergeAiDailyBudgetSnapshot(current, tomorrow)).toBe(tomorrow);
  });

  it("does not accept a late snapshot from an older Vietnam day", () => {
    const today = snapshot("2026-07-22", 40_000, 76);
    const yesterday = snapshot("2026-07-21", 160_000, 4);

    expect(mergeAiDailyBudgetSnapshot(today, yesterday)).toBe(today);
  });

  it("returns unavailable instead of fabricating 100% after a read error", () => {
    expect(
      aiDailyBudgetSnapshotFromUsageRead({
        row: null,
        readError: { code: "PGRST204" },
        usageDate: "2026-07-22",
      }),
    ).toBeNull();
  });

  it("returns 100% only for a confirmed successful empty daily read", () => {
    expect(
      aiDailyBudgetSnapshotFromUsageRead({
        row: null,
        usageDate: "2026-07-22",
      }),
    ).toMatchObject({
      actualUsdMicros: 0,
      remainingPercent: 100,
      usageDate: "2026-07-22",
    });
  });

  it("does not let project-wide billing or generation drain web quota", () => {
    expect(
      aiDailyBudgetSnapshotFromUsageRead({
        row: {
          actual_usd_micros: 10_000,
          provider_usd_micros: 300_000,
          provider_actual_baseline_usd_micros: 0,
          usage_floor_usd_micros: 300_000,
          provider_synced_at: "2026-07-22T10:00:00.000Z",
          request_count: 2,
        },
        usageDate: "2026-07-22",
      }),
    ).toMatchObject({
      actualUsdMicros: 10_000,
      billingUsdMicros: 300_000,
      requestCount: 2,
      remainingPercent: 94,
    });
  });
});

describe("AI daily admission", () => {
  it("prefers the web-only daily reservation RPC", async () => {
    vi.stubEnv("OPENAI_MONTHLY_BUDGET_USD", "5");
    const rpc = vi.fn(async (name: string) => {
      if (name !== "reserve_web_ai_budget") {
        throw new Error(`Unexpected RPC ${name}`);
      }
      return {
        data: {
          status: "allowed",
          usage_date: "2026-07-25",
          month_start: "2026-07-01",
        },
        error: null,
      };
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(reserveAiBudget(client, 100_000)).resolves.toMatchObject({
      usageDate: "2026-07-25",
      monthStart: "2026-07-01",
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("reserve_web_ai_budget", {
      p_daily_limit_usd_micros: 166_666,
      p_reservation_usd_micros: 100_000,
    });
  });

  it("retains a one-day concurrency window on the legacy RPC", async () => {
    vi.stubEnv("OPENAI_MONTHLY_BUDGET_USD", "5");

    const monthlyActualUsdMicros = 4_896_000;
    let monthlyReservedUsdMicros = 0;
    const rpc = vi.fn(
      async (name: string, args: Record<string, number | string | null>) => {
        if (name === "reserve_web_ai_budget") {
          return {
            data: null,
            error: {
              code: "PGRST202",
              message: "Could not find reserve_web_ai_budget",
            },
          };
        }
        if (name !== "reserve_ai_budget") {
          throw new Error(`Unexpected RPC ${name}`);
        }
        const reservation = Number(args.p_reservation_usd_micros);
        const monthlyLimit = Number(args.p_monthly_limit_usd_micros);
        const status =
          monthlyActualUsdMicros +
              monthlyReservedUsdMicros +
              reservation >
            monthlyLimit
            ? "monthly_exceeded"
            : "allowed";
        if (status === "allowed") {
          monthlyReservedUsdMicros += reservation;
        }
        return {
          data: {
            status,
            usage_date: "2026-07-25",
            month_start: "2026-07-01",
          },
          error: null,
        };
      },
    );
    const client = {
      rpc,
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { actual_usd_micros: monthlyActualUsdMicros },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(reserveAiBudget(client, 100_000)).resolves.toMatchObject({
      usageDate: "2026-07-25",
    });
    await expect(
      reserveAiBudget(client, 100_000),
    ).rejects.toBeInstanceOf(AiMonthlyBudgetExceededError);
  });

  it("does not inflate the migrated RPC during a schema-cache lag", async () => {
    vi.stubEnv("OPENAI_MONTHLY_BUDGET_USD", "5");
    const rpc = vi.fn(
      async (name: string) => {
        if (name === "reserve_web_ai_budget") {
          return {
            data: null,
            error: {
              code: "PGRST202",
              message: "Schema cache has not reloaded",
            },
          };
        }
        if (name !== "reserve_ai_budget") {
          throw new Error(`Unexpected RPC ${name}`);
        }
        return {
          data: {
            status: "allowed",
            usage_date: "2026-07-25",
            month_start: "2026-07-01",
          },
          error: null,
        };
      },
    );
    const client = {
      rpc,
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: table === "ai_usage_daily"
                ? {
                    actual_usd_micros: 10_000,
                    provider_usd_micros: 300_000,
                    provider_actual_baseline_usd_micros: 10_000,
                    usage_floor_usd_micros: 10_000,
                    provider_synced_at: "2026-07-25T01:00:00.000Z",
                  }
                : { actual_usd_micros: 4_000_000 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await reserveAiBudget(client, 100_000);

    expect(rpc).toHaveBeenLastCalledWith("reserve_ai_budget", {
      p_daily_limit_usd_micros: 166_666,
      p_monthly_limit_usd_micros: 4_166_666,
      p_reservation_usd_micros: 100_000,
    });
  });

  it("keeps OpenAI active after yesterday's quota resets", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    vi.stubEnv("OPENAI_MONTHLY_BUDGET_USD", "5");

    const usageDate = "2026-07-25";
    let monthlyActualUsdMicros = 4_896_000;
    let monthlyReservedUsdMicros = 0;
    const dailyActualUsdMicros = new Map([
      ["2026-07-24", 166_666],
      [usageDate, 0],
    ]);
    const backgroundProjectCostUsdMicros = 300_000;
    let dailyReservedUsdMicros = 0;
    let requestCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let lastModel: string | null = null;

    const rpc = vi.fn(
      async (name: string, args: Record<string, number | string | null>) => {
        if (name === "reserve_web_ai_budget") {
          return {
            data: null,
            error: {
              code: "PGRST202",
              message: "Could not find reserve_web_ai_budget",
            },
          };
        }
        if (name === "reserve_ai_budget") {
          const reservation = Number(args.p_reservation_usd_micros);
          const monthlyLimit = Number(args.p_monthly_limit_usd_micros);
          const dailyLimit = Number(args.p_daily_limit_usd_micros);
          const todayActual = dailyActualUsdMicros.get(usageDate) ?? 0;
          const status =
            monthlyActualUsdMicros +
                monthlyReservedUsdMicros +
                reservation >
              monthlyLimit
              ? "monthly_exceeded"
              : todayActual + dailyReservedUsdMicros + reservation >
                  dailyLimit
                ? "daily_exceeded"
                : "allowed";

          if (status === "allowed") {
            monthlyReservedUsdMicros += reservation;
            dailyReservedUsdMicros += reservation;
          }
          return {
            data: {
              status,
              usage_date: usageDate,
              month_start: "2026-07-01",
            },
            error: null,
          };
        }

        if (name === "finalize_ai_budget") {
          const reservation = Number(args.p_reservation_usd_micros);
          const actual = Number(args.p_actual_usd_micros);
          monthlyReservedUsdMicros = Math.max(
            0,
            monthlyReservedUsdMicros - reservation,
          );
          dailyReservedUsdMicros = Math.max(
            0,
            dailyReservedUsdMicros - reservation,
          );
          monthlyActualUsdMicros += actual;
          const finalizedUsageDate = String(args.p_usage_date);
          dailyActualUsdMicros.set(
            finalizedUsageDate,
            (dailyActualUsdMicros.get(finalizedUsageDate) ?? 0) + actual,
          );
          requestCount += 1;
          inputTokens += Number(args.p_input_tokens);
          outputTokens += Number(args.p_output_tokens);
          lastModel = String(args.p_model);
          return { data: null, error: null };
        }

        throw new Error(`Unexpected RPC ${name}`);
      },
    );
    const client = {
      rpc,
      from: (table: string) => ({
        select: () => ({
          eq: (_column: string, value: string) => ({
            maybeSingle: async () => ({
              data:
                table === "ai_usage_monthly"
                  ? {
                      actual_usd_micros: monthlyActualUsdMicros,
                    }
                  : {
                      actual_usd_micros:
                        dailyActualUsdMicros.get(value) ?? 0,
                      provider_usd_micros:
                        backgroundProjectCostUsdMicros,
                      provider_actual_baseline_usd_micros: 0,
                      usage_floor_usd_micros:
                        backgroundProjectCostUsdMicros,
                      provider_synced_at:
                        "2026-07-25T01:00:00.000Z",
                      request_count: requestCount,
                      input_tokens: inputTokens,
                      output_tokens: outputTokens,
                      last_model: lastModel,
                    },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const operation = vi.fn(async () => ({
      model: "gpt-5.6-luna",
      usage: {
        inputTokens: 500,
        outputTokens: 750,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
      },
    }));

    const first = await withAiBudget(client, 100_000, operation);
    const second = await withAiBudget(client, 100_000, operation);

    expect(first.dailyBudget?.remainingPercent).toBe(97);
    expect(second.dailyBudget?.remainingPercent).toBe(94);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(
      rpc.mock.calls
        .filter(([name]) => name === "reserve_ai_budget")
        .map(([, args]) => args.p_monthly_limit_usd_micros),
    ).toEqual([
      4_896_000 + 166_666,
      4_901_000 + 166_666,
    ]);
    expect(
      rpc.mock.calls
        .filter(([name]) => name === "reserve_ai_budget")
        .map(([, args]) => args.p_daily_limit_usd_micros),
    ).toEqual([
      backgroundProjectCostUsdMicros + 166_666,
      backgroundProjectCostUsdMicros + 166_666,
    ]);
  });
});
