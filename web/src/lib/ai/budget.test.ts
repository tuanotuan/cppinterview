import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  aiDailyBudgetSnapshotFromUsageRead,
  AiBudgetConfigurationError,
  AiDailyBudgetExceededError,
  AiOperationNotStartedError,
  mergeAiDailyBudgetSnapshot,
  releaseAiBudget,
  reserveAiBudget,
  type AiDailyBudgetSnapshot,
  withAiBudget,
} from "./budget";

const USAGE_DATE = "2026-07-30";
const MONTH_START = "2026-07-01";

type LedgerStatus = "running" | "finalized" | "released";
type LedgerRow = {
  id: string;
  requested: number;
  actual: number | null;
  status: LedgerStatus;
  dispatched: boolean;
};

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

function createLedgerClient({
  loseResponses = {},
}: {
  loseResponses?: Partial<Record<string, number>>;
} = {}) {
  const rows = new Map<string, LedgerRow>();
  const state = {
    actual: 0,
    inputTokens: 0,
    outputTokens: 0,
    requestCount: 0,
    reserved: 0,
  };
  const remainingLosses = new Map(Object.entries(loseResponses));

  const maybeLose = (name: string) => {
    const remaining = remainingLosses.get(name) ?? 0;
    if (remaining <= 0) return;
    remainingLosses.set(name, remaining - 1);
    throw new Error(`${name} response lost`);
  };

  const result = (row: LedgerRow) => ({
    status: row.status,
    reservation_id: row.id,
    requested_usd_micros: row.requested,
    actual_usd_micros: row.actual,
    usage_date: USAGE_DATE,
    month_start: MONTH_START,
    dispatched: row.dispatched,
  });

  const rpc = vi.fn(
    async (name: string, args: Record<string, number | string>) => {
      const id = String(args.p_reservation_id ?? "");

      if (name === "reserve_ai_budget_reservation") {
        const existing = rows.get(id);
        if (existing) {
          maybeLose(name);
          return { data: result(existing), error: null };
        }
        const requested = Number(args.p_reservation_usd_micros);
        const dailyLimit = Number(args.p_daily_limit_usd_micros);
        if (state.actual + state.reserved + requested > dailyLimit) {
          return {
            data: {
              status: "daily_exceeded",
              usage_date: USAGE_DATE,
              month_start: MONTH_START,
            },
            error: null,
          };
        }
        const row: LedgerRow = {
          id,
          requested,
          actual: null,
          status: "running",
          dispatched: false,
        };
        rows.set(id, row);
        state.reserved += requested;
        maybeLose(name);
        return { data: result(row), error: null };
      }

      const row = rows.get(id);
      if (!row) {
        return {
          data: null,
          error: { code: "P0002", message: "Reservation not found" },
        };
      }

      if (name === "mark_ai_budget_reservation_dispatched") {
        if (row.status === "running") row.dispatched = true;
        maybeLose(name);
        return { data: result(row), error: null };
      }

      if (name === "finalize_ai_budget_reservation") {
        if (row.status === "running") {
          if (!row.dispatched) {
            return {
              data: null,
              error: { code: "P0001", message: "Not dispatched" },
            };
          }
          row.status = "finalized";
          row.actual = Number(args.p_actual_usd_micros);
          state.reserved = Math.max(0, state.reserved - row.requested);
          state.actual += row.actual;
          state.requestCount += 1;
          state.inputTokens += Number(args.p_input_tokens);
          state.outputTokens += Number(args.p_output_tokens);
        }
        maybeLose(name);
        return { data: result(row), error: null };
      }

      if (name === "release_ai_budget_reservation") {
        if (row.status === "running") {
          row.status = "released";
          state.reserved = Math.max(0, state.reserved - row.requested);
        }
        maybeLose(name);
        return { data: result(row), error: null };
      }

      throw new Error(`Unexpected RPC ${name}`);
    },
  );

  const client = {
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              actual_usd_micros: state.actual,
              provider_usd_micros: 0,
              provider_actual_baseline_usd_micros: 0,
              usage_floor_usd_micros: state.actual,
              provider_synced_at: null,
              request_count: state.requestCount,
              input_tokens: state.inputTokens,
              output_tokens: state.outputTokens,
              last_model: state.requestCount > 0 ? "gpt-5.6-luna" : null,
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  return { client, rows, rpc, state };
}

function successfulOperation() {
  return Promise.resolve({
    model: "gpt-5.6-luna",
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
    },
  });
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

  it("keeps project-wide billing out of the interactive web allowance", () => {
    expect(
      aiDailyBudgetSnapshotFromUsageRead({
        row: {
          actual_usd_micros: 10_000,
          provider_usd_micros: 300_000,
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

describe("AI budget reservation ledger", () => {
  it("retries a lost reserve response with the same UUID and reserves once", async () => {
    const { client, rows, rpc, state } = createLedgerClient({
      loseResponses: { reserve_ai_budget_reservation: 1 },
    });

    const reservation = await reserveAiBudget(client, 80_000);

    const reserveCalls = rpc.mock.calls.filter(
      ([name]) => name === "reserve_ai_budget_reservation",
    );
    expect(reserveCalls).toHaveLength(2);
    expect(reserveCalls[0]?.[1].p_reservation_id).toBe(
      reserveCalls[1]?.[1].p_reservation_id,
    );
    expect(reservation.reservationId).toBe(
      reserveCalls[0]?.[1].p_reservation_id,
    );
    expect(rows).toHaveLength(1);
    expect(state.reserved).toBe(80_000);
  });

  it("releases an unconfirmed admission by exact UUID before failing", async () => {
    const { client, rpc, state } = createLedgerClient({
      loseResponses: { reserve_ai_budget_reservation: 2 },
    });

    await expect(reserveAiBudget(client, 80_000)).rejects.toBeInstanceOf(
      AiBudgetConfigurationError,
    );

    const reserveId = rpc.mock.calls.find(
      ([name]) => name === "reserve_ai_budget_reservation",
    )?.[1].p_reservation_id;
    expect(rpc).toHaveBeenCalledWith("release_ai_budget_reservation", {
      p_reservation_id: reserveId,
    });
    expect(state.reserved).toBe(0);
  });

  it("serializes concurrent admissions through distinct reservation IDs", async () => {
    const { client, rpc, state } = createLedgerClient();

    const outcomes = await Promise.allSettled([
      reserveAiBudget(client, 100_000),
      reserveAiBudget(client, 100_000),
    ]);

    expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(
      1,
    );
    expect(
      (outcomes.find(({ status }) => status === "rejected") as PromiseRejectedResult)
        .reason,
    ).toBeInstanceOf(AiDailyBudgetExceededError);
    const ids = rpc.mock.calls
      .filter(([name]) => name === "reserve_ai_budget_reservation")
      .map(([, args]) => args.p_reservation_id);
    expect(new Set(ids).size).toBe(2);
    expect(state.reserved).toBe(100_000);
  });

  it("fails closed before provider dispatch when the ledger RPC is missing", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "PGRST202", message: "Function is missing" },
    }));
    const beforeProviderDispatch = vi.fn(async () => {});
    const operation = vi.fn(successfulOperation);
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch,
        invokeProvider: operation,
      }),
    ).rejects.toBeInstanceOf(AiBudgetConfigurationError);

    expect(beforeProviderDispatch).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).not.toHaveBeenCalledWith(
      "reserve_web_ai_budget",
      expect.anything(),
    );
  });

  it("confirms dispatch before invoking the provider after a lost response", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc } = createLedgerClient({
      loseResponses: { mark_ai_budget_reservation_dispatched: 1 },
    });
    const beforeProviderDispatch = vi.fn(async () => {});
    const operation = vi.fn(successfulOperation);

    await withAiBudget(client, 80_000, {
      beforeProviderDispatch,
      invokeProvider: operation,
    });

    const dispatchCalls = rpc.mock.calls.filter(
      ([name]) => name === "mark_ai_budget_reservation_dispatched",
    );
    const dispatchCallIndexes = rpc.mock.calls.flatMap(([name], index) =>
      name === "mark_ai_budget_reservation_dispatched" ? [index] : [],
    );
    expect(dispatchCalls).toHaveLength(2);
    expect(dispatchCalls[0]?.[1]).toEqual(dispatchCalls[1]?.[1]);
    expect(
      beforeProviderDispatch.mock.invocationCallOrder[0],
    ).toBeLessThan(
      rpc.mock.invocationCallOrder[dispatchCallIndexes[0] ?? -1] ?? 0,
    );
    expect(
      rpc.mock.invocationCallOrder[dispatchCallIndexes.at(-1) ?? -1],
    ).toBeLessThan(operation.mock.invocationCallOrder[0] ?? 0);
    expect(beforeProviderDispatch).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });

  it("releases the exact reservation when application preflight fails", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc, state } = createLedgerClient();
    const preflightError = new Error("application marker unavailable");
    const beforeProviderDispatch = vi.fn(async () => {
      throw preflightError;
    });
    const operation = vi.fn(successfulOperation);

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch,
        invokeProvider: operation,
      }),
    ).rejects.toBe(preflightError);

    const reserveId = rpc.mock.calls.find(
      ([name]) => name === "reserve_ai_budget_reservation",
    )?.[1].p_reservation_id;
    expect(beforeProviderDispatch).toHaveBeenCalledOnce();
    expect(operation).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith(
      "mark_ai_budget_reservation_dispatched",
      expect.anything(),
    );
    expect(rpc).toHaveBeenCalledWith("release_ai_budget_reservation", {
      p_reservation_id: reserveId,
    });
    expect(state).toMatchObject({
      actual: 0,
      requestCount: 0,
      reserved: 0,
    });
  });

  it("releases the exact reservation when dispatch cannot be confirmed", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc, state } = createLedgerClient({
      loseResponses: { mark_ai_budget_reservation_dispatched: 2 },
    });
    const beforeProviderDispatch = vi.fn(async () => {});
    const operation = vi.fn(successfulOperation);

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch,
        invokeProvider: operation,
      }),
    ).rejects.toBeInstanceOf(AiBudgetConfigurationError);

    const dispatchId = rpc.mock.calls.find(
      ([name]) => name === "mark_ai_budget_reservation_dispatched",
    )?.[1].p_reservation_id;
    expect(beforeProviderDispatch).toHaveBeenCalledOnce();
    expect(operation).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("release_ai_budget_reservation", {
      p_reservation_id: dispatchId,
    });
    expect(state.reserved).toBe(0);
  });

  it("finalizes once when the first terminal response is lost", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc, state } = createLedgerClient({
      loseResponses: { finalize_ai_budget_reservation: 1 },
    });
    const operation = vi.fn(successfulOperation);

    const response = await withAiBudget(client, 80_000, {
      beforeProviderDispatch: async () => {},
      invokeProvider: operation,
    });

    expect(response.dailyBudget).not.toBeNull();
    expect(operation).toHaveBeenCalledOnce();
    expect(
      rpc.mock.calls.filter(
        ([name]) => name === "finalize_ai_budget_reservation",
      ),
    ).toHaveLength(2);
    expect(state).toMatchObject({
      reserved: 0,
      requestCount: 1,
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(state.actual).toBeGreaterThan(0);
  });

  it("returns the paid result when both finalization responses are lost", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, state } = createLedgerClient({
      loseResponses: { finalize_ai_budget_reservation: 2 },
    });
    const operation = vi.fn(successfulOperation);

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch: async () => {},
        invokeProvider: operation,
      }),
    ).resolves.toMatchObject({
      result: { model: "gpt-5.6-luna" },
      dailyBudget: null,
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(state.requestCount).toBe(1);
    expect(state.reserved).toBe(0);
  });

  it("releases once after a confirmed provider rejection and lost response", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc, state } = createLedgerClient({
      loseResponses: { release_ai_budget_reservation: 1 },
    });
    const rejection = Object.assign(new Error("rate limited"), { status: 429 });

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch: async () => {},
        invokeProvider: async () => {
          throw rejection;
        },
      }),
    ).rejects.toBe(rejection);

    const releaseCalls = rpc.mock.calls.filter(
      ([name]) => name === "release_ai_budget_reservation",
    );
    expect(releaseCalls).toHaveLength(2);
    expect(releaseCalls[0]?.[1]).toEqual(releaseCalls[1]?.[1]);
    expect(releaseCalls[0]?.[1]).toEqual({
      p_reservation_id: expect.any(String),
    });
    expect(state).toMatchObject({
      actual: 0,
      requestCount: 0,
      reserved: 0,
    });
  });

  it("charges one exact reservation for an ambiguous provider outcome", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, rpc, state } = createLedgerClient({
      loseResponses: { finalize_ai_budget_reservation: 1 },
    });
    const transportError = new Error("connection closed after dispatch");

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch: async () => {},
        invokeProvider: async () => {
          throw transportError;
        },
      }),
    ).rejects.toMatchObject({
      name: "AiOperationOutcomeUnknownError",
      cause: transportError,
    });

    const finalizeCalls = rpc.mock.calls.filter(
      ([name]) => name === "finalize_ai_budget_reservation",
    );
    expect(finalizeCalls).toHaveLength(2);
    expect(finalizeCalls[0]?.[1].p_reservation_id).toBe(
      finalizeCalls[1]?.[1].p_reservation_id,
    );
    expect(finalizeCalls[0]?.[1].p_actual_usd_micros).toBe(80_000);
    expect(state).toMatchObject({
      actual: 80_000,
      requestCount: 1,
      reserved: 0,
    });
  });

  it("releases configuration failures that occur before provider start", async () => {
    vi.stubEnv("OPENAI_ADMIN_KEY", "");
    vi.stubEnv("OPENAI_PROJECT_ID", "");
    const { client, state } = createLedgerClient();

    await expect(
      withAiBudget(client, 80_000, {
        beforeProviderDispatch: async () => {},
        invokeProvider: async () => {
          throw new AiOperationNotStartedError("missing provider key");
        },
      }),
    ).rejects.toBeInstanceOf(AiOperationNotStartedError);

    expect(state).toMatchObject({
      actual: 0,
      requestCount: 0,
      reserved: 0,
    });
  });

  it("makes a repeated direct release a cached no-op", async () => {
    const { client, state } = createLedgerClient();
    const reservation = await reserveAiBudget(client, 80_000);

    await releaseAiBudget(reservation);
    await releaseAiBudget(reservation);

    expect(state.reserved).toBe(0);
    expect(state.actual).toBe(0);
  });
});
