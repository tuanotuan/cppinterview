import type { SupabaseClient } from "@supabase/supabase-js";

import { syncOpenAiBilling } from "./billing";
import type { AiTokenUsage } from "./usage";
import { readAiUsageRow } from "./usage-store";
import {
  dailyBudgetRemainingPercent,
  dailyBudgetUsdMicros,
  usageCostUsdMicros,
} from "./usage";

const BUDGET_RPC_ATTEMPTS = 2;

export type AiBudgetReservation = {
  client: SupabaseClient | null;
  reservationId: string | null;
  reservedUsdMicros: number;
  usageDate: string | null;
  monthStart: string | null;
};

export class AiMonthlyBudgetExceededError extends Error {}
export class AiDailyBudgetExceededError extends Error {}
export class AiBudgetConfigurationError extends Error {}
export class AiOperationNotStartedError extends Error {}
export class AiOperationOutcomeUnknownError extends Error {
  constructor(readonly cause: unknown) {
    super("The AI provider request outcome could not be confirmed");
    this.name = "AiOperationOutcomeUnknownError";
  }
}

export type AiDailyBudgetSnapshot = {
  actualUsdMicros: number;
  billingUsdMicros: number | null;
  billingSyncedAt: string | null;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  lastModel: string | null;
  limitUsdMicros: number;
  remainingPercent: number;
  usageDate: string;
};

export type AiDailyUsageRow = {
  actual_usd_micros?: unknown;
  provider_usd_micros?: unknown;
  provider_actual_baseline_usd_micros?: unknown;
  usage_floor_usd_micros?: unknown;
  provider_synced_at?: unknown;
  request_count?: unknown;
  input_tokens?: unknown;
  output_tokens?: unknown;
  last_model?: unknown;
};

export type AiBudgetedProviderOperation<
  T extends { model: string; usage: AiTokenUsage },
> = {
  // Persist the application-level lease/marker while the budget reservation is
  // still safe to release. The provider must not be called from this hook.
  beforeProviderDispatch: () => Promise<void>;
  // This function is invoked immediately after the budget dispatch marker.
  invokeProvider: () => Promise<T>;
};

type ReservationTransition = {
  status: "running" | "finalized" | "released";
  reservationId: string;
  requestedUsdMicros: number;
  actualUsdMicros: number | null;
  usageDate: string;
  monthStart: string;
  dispatched: boolean;
};

export function mergeAiDailyBudgetSnapshot(
  current: AiDailyBudgetSnapshot | null,
  incoming: AiDailyBudgetSnapshot,
): AiDailyBudgetSnapshot {
  if (!current) return incoming;
  if (current.usageDate !== incoming.usageDate) {
    return incoming.usageDate > current.usageDate ? incoming : current;
  }
  return {
    ...incoming,
    actualUsdMicros: Math.max(
      current.actualUsdMicros,
      incoming.actualUsdMicros,
    ),
    requestCount: Math.max(current.requestCount, incoming.requestCount),
    inputTokens: Math.max(current.inputTokens, incoming.inputTokens),
    outputTokens: Math.max(current.outputTokens, incoming.outputTokens),
    remainingPercent: Math.min(
      current.remainingPercent,
      incoming.remainingPercent,
    ),
  };
}

export function aiDailyBudgetSnapshotFromUsageRead({
  row,
  readError,
  usageDate,
  fallbackActualUsdMicros = 0,
}: {
  row: AiDailyUsageRow | null;
  readError?: unknown;
  usageDate: string;
  fallbackActualUsdMicros?: number;
}): AiDailyBudgetSnapshot | null {
  if (readError) return null;

  // The daily web allowance belongs only to interactive app requests recorded
  // by the reservation ledger. Provider billing is project-wide and also
  // includes background question generation, so it must not drain this limit.
  const used = nonNegativeNumber(
    row?.actual_usd_micros ?? fallbackActualUsdMicros,
  );
  const billing = typeof row?.provider_synced_at === "string"
    ? nonNegativeNumber(row.provider_usd_micros)
    : null;

  return {
    actualUsdMicros: used,
    billingUsdMicros: billing,
    billingSyncedAt:
      typeof row?.provider_synced_at === "string"
        ? row.provider_synced_at
        : null,
    requestCount: Number(row?.request_count ?? 0),
    inputTokens: Number(row?.input_tokens ?? 0),
    outputTokens: Number(row?.output_tokens ?? 0),
    lastModel: typeof row?.last_model === "string" ? row.last_model : null,
    limitUsdMicros: dailyBudgetUsdMicros(),
    remainingPercent: dailyBudgetRemainingPercent(used),
    usageDate,
  };
}

export async function withAiBudget<T extends { model: string; usage: AiTokenUsage }>(
  client: SupabaseClient | null,
  reservedUsdMicros: number,
  operation: AiBudgetedProviderOperation<T>,
) {
  if (client) await syncOpenAiBilling(client);
  const reservation = await reserveAiBudget(client, reservedUsdMicros);

  try {
    await operation.beforeProviderDispatch();
  } catch (error) {
    // The budget dispatch marker and provider call have definitely not run.
    // Releasing this exact UUID is therefore safe regardless of error shape.
    await releaseAiBudget(reservation);
    throw error;
  }

  // Keep the budget marker adjacent to the provider invocation. The
  // application marker above must be durable first so a crash cannot leave a
  // charged/reclaimable pair of reservations.
  await markAiBudgetDispatched(reservation);

  let result: T;
  try {
    result = await operation.invokeProvider();
  } catch (error) {
    if (isAiOperationSafeToRetry(error)) {
      await releaseAiBudget(reservation);
      throw error;
    }
    await conservativelyFinalizeAiBudget(reservation);
    throw new AiOperationOutcomeUnknownError(error);
  }

  try {
    const dailyBudget = await finalizeAiBudget(
      reservation,
      result.model,
      result.usage,
    );
    return { result, dailyBudget };
  } catch (error) {
    // The paid provider result is valid. Ledger transitions are idempotent and
    // already retried with the same UUID, so returning it cannot trigger
    // another provider request. An unconfirmed running row is terminalized
    // conservatively by the next admission after its dispatch lease expires.
    console.error("AI budget finalization outcome could not be confirmed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { result, dailyBudget: null };
  }
}

export async function reserveAiBudget(
  client: SupabaseClient | null,
  reservedUsdMicros: number,
): Promise<AiBudgetReservation> {
  if (!client) {
    return {
      client,
      reservationId: null,
      reservedUsdMicros: 0,
      usageDate: null,
      monthStart: null,
    };
  }
  if (!Number.isSafeInteger(reservedUsdMicros) || reservedUsdMicros <= 0) {
    throw new AiBudgetConfigurationError(
      "AI budget reservation must be a positive safe integer",
    );
  }

  // Create the identity before the first RPC. A lost response can then be
  // retried without creating another reservation or incrementing aggregates.
  const reservationId = newBudgetReservationId();
  const provisional: AiBudgetReservation = {
    client,
    reservationId,
    reservedUsdMicros,
    usageDate: null,
    monthStart: null,
  };

  let data: unknown;
  try {
    data = await callBudgetRpc(client, "reserve_ai_budget_reservation", {
      p_daily_limit_usd_micros: dailyBudgetUsdMicros(),
      p_reservation_id: reservationId,
      p_reservation_usd_micros: reservedUsdMicros,
    });
  } catch (error) {
    if (!(error instanceof AiBudgetConfigurationError)) {
      // If admission committed but both responses were lost, release this UUID.
      // The release transition is itself idempotent; expiry is the final safety
      // net if the database remains unavailable.
      await releaseAiBudget(provisional);
    }
    if (error instanceof AiBudgetConfigurationError) throw error;
    console.error("AI budget reservation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    throw new AiBudgetConfigurationError(
      "AI budget reservation could not be confirmed",
    );
  }

  const decision = parseBudgetDecision(data, reservationId, reservedUsdMicros);
  if (decision.status === "daily_exceeded") {
    throw new AiDailyBudgetExceededError("Daily AI budget reached");
  }
  if (decision.status === "monthly_exceeded") {
    throw new AiMonthlyBudgetExceededError("Monthly AI budget reached");
  }
  if (decision.status !== "allowed") {
    throw new AiBudgetConfigurationError(
      "AI budget reservation is already terminal",
    );
  }

  return {
    ...provisional,
    usageDate: decision.usageDate,
    monthStart: decision.monthStart,
  };
}

export async function finalizeAiBudget(
  reservation: AiBudgetReservation,
  model: string,
  usage: AiTokenUsage,
) {
  if (
    !reservation.client ||
    !reservation.reservationId ||
    reservation.reservedUsdMicros === 0
  ) {
    return null;
  }

  const actualUsdMicros = usageCostUsdMicros(model, usage);
  const data = await callBudgetRpc(
    reservation.client,
    "finalize_ai_budget_reservation",
    {
      p_actual_usd_micros: actualUsdMicros,
      p_cache_write_tokens: usage.cacheWriteTokens,
      p_cached_input_tokens: usage.cachedInputTokens,
      p_input_tokens: usage.inputTokens,
      p_model: model,
      p_output_tokens: usage.outputTokens,
      p_reservation_id: reservation.reservationId,
    },
  );
  const transition = parseReservationTransition(
    data,
    reservation.reservationId,
    reservation.reservedUsdMicros,
  );
  if (transition.status !== "finalized") {
    console.error("AI budget reservation was not finalized", {
      status: transition.status,
    });
    return null;
  }

  const usageDate = transition.usageDate;
  const { data: dailyRow, error: readError } = await readAiUsageRow(
    reservation.client,
    "ai_usage_daily",
    "usage_date",
    usageDate,
  );
  if (readError) {
    console.error("Daily AI budget read failed", { code: readError.code });
    return null;
  }
  const snapshot = aiDailyBudgetSnapshotFromUsageRead({
    row: dailyRow,
    usageDate,
    fallbackActualUsdMicros:
      transition.actualUsdMicros ?? actualUsdMicros,
  });
  if (!snapshot) return null;
  console.info("AI usage finalized", {
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    actualUsdMicros: transition.actualUsdMicros ?? actualUsdMicros,
    dailyActualUsdMicros: snapshot.actualUsdMicros,
    requestCount: snapshot.requestCount,
    remainingPercent: snapshot.remainingPercent,
  });
  return snapshot;
}

export async function releaseAiBudget(reservation: AiBudgetReservation) {
  if (
    !reservation.client ||
    !reservation.reservationId ||
    reservation.reservedUsdMicros === 0
  ) {
    return;
  }
  try {
    await callBudgetRpc(
      reservation.client,
      "release_ai_budget_reservation",
      { p_reservation_id: reservation.reservationId },
    );
  } catch (error) {
    // Releasing is best-effort. A retained exact reservation is safer than
    // replacing the provider error or subtracting an arbitrary aggregate.
    console.error("AI budget release request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

async function markAiBudgetDispatched(reservation: AiBudgetReservation) {
  if (
    !reservation.client ||
    !reservation.reservationId ||
    reservation.reservedUsdMicros === 0
  ) {
    return;
  }

  try {
    const data = await callBudgetRpc(
      reservation.client,
      "mark_ai_budget_reservation_dispatched",
      { p_reservation_id: reservation.reservationId },
    );
    const transition = parseReservationTransition(
      data,
      reservation.reservationId,
      reservation.reservedUsdMicros,
    );
    if (transition.status !== "running" || !transition.dispatched) {
      throw new AiBudgetConfigurationError(
        "AI budget reservation cannot be dispatched",
      );
    }
  } catch (error) {
    // No provider call has happened yet in this process, so releasing this
    // exact UUID is safe even if the dispatch marker response was lost.
    await releaseAiBudget(reservation);
    if (error instanceof AiBudgetConfigurationError) throw error;
    throw new AiBudgetConfigurationError(
      "AI budget dispatch could not be confirmed",
    );
  }
}

async function conservativelyFinalizeAiBudget(
  reservation: AiBudgetReservation,
) {
  if (
    !reservation.client ||
    !reservation.reservationId ||
    reservation.reservedUsdMicros === 0
  ) {
    return;
  }
  try {
    await callBudgetRpc(
      reservation.client,
      "finalize_ai_budget_reservation",
      {
        p_actual_usd_micros: reservation.reservedUsdMicros,
        p_cache_write_tokens: 0,
        p_cached_input_tokens: 0,
        p_input_tokens: 0,
        p_model: "unknown-openai-request",
        p_output_tokens: 0,
        p_reservation_id: reservation.reservationId,
      },
    );
  } catch (error) {
    // The exact UUID remains held and will be finalized conservatively after
    // expiry. Retrying a later request cannot double-charge this transition.
    console.error("Ambiguous AI budget finalization request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export function isAiOperationSafeToRetry(error: unknown) {
  if (error instanceof AiOperationNotStartedError) return true;
  const status = providerStatus(error);
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 408
  );
}

async function callBudgetRpc(
  client: SupabaseClient,
  name:
    | "reserve_ai_budget_reservation"
    | "mark_ai_budget_reservation_dispatched"
    | "finalize_ai_budget_reservation"
    | "release_ai_budget_reservation",
  args: Record<string, number | string>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < BUDGET_RPC_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await client.rpc(name, args);
      if (!error) return data;
      if (isMissingLedgerRpc(error)) {
        throw new AiBudgetConfigurationError(
          "AI budget ledger migration is missing",
        );
      }
      lastError = error;
    } catch (error) {
      if (error instanceof AiBudgetConfigurationError) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error(`AI budget RPC ${name} failed`);
}

function parseBudgetDecision(
  data: unknown,
  reservationId: string,
  requestedUsdMicros: number,
) {
  if (typeof data !== "object" || data === null) {
    throw new AiBudgetConfigurationError("Unexpected AI budget response");
  }
  const value = data as Record<string, unknown>;
  const status = typeof value.status === "string" ? value.status : "invalid";
  if (status === "daily_exceeded" || status === "monthly_exceeded") {
    return {
      status,
      usageDate: nullableString(value.usage_date),
      monthStart: nullableString(value.month_start),
    };
  }

  const transition = parseReservationTransition(
    data,
    reservationId,
    requestedUsdMicros,
  );
  return {
    status: transition.status === "running" ? "allowed" : transition.status,
    usageDate: transition.usageDate,
    monthStart: transition.monthStart,
  };
}

function parseReservationTransition(
  data: unknown,
  reservationId: string,
  requestedUsdMicros: number,
): ReservationTransition {
  if (typeof data !== "object" || data === null) {
    throw new AiBudgetConfigurationError("Unexpected AI budget response");
  }
  const value = data as Record<string, unknown>;
  const status = value.status;
  const responseReservationId = value.reservation_id;
  const responseRequested = Number(value.requested_usd_micros);
  const usageDate = value.usage_date;
  const monthStart = value.month_start;
  const actual = value.actual_usd_micros;
  if (
    (status !== "running" &&
      status !== "finalized" &&
      status !== "released") ||
    responseReservationId !== reservationId ||
    responseRequested !== requestedUsdMicros ||
    !Number.isSafeInteger(responseRequested) ||
    typeof usageDate !== "string" ||
    typeof monthStart !== "string" ||
    typeof value.dispatched !== "boolean"
  ) {
    throw new AiBudgetConfigurationError("Invalid AI budget reservation");
  }
  const actualUsdMicros = actual === null
    ? null
    : Number.isSafeInteger(Number(actual)) && Number(actual) >= 0
      ? Number(actual)
      : Number.NaN;
  if (Number.isNaN(actualUsdMicros)) {
    throw new AiBudgetConfigurationError(
      "Invalid AI budget reservation charge",
    );
  }
  if (
    (status === "finalized" && actualUsdMicros === null) ||
    (status !== "finalized" && actualUsdMicros !== null)
  ) {
    throw new AiBudgetConfigurationError(
      "Inconsistent AI budget reservation status",
    );
  }
  return {
    status,
    reservationId: responseReservationId,
    requestedUsdMicros: responseRequested,
    actualUsdMicros,
    usageDate,
    monthStart,
    dispatched: value.dispatched,
  };
}

function providerStatus(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

function nonNegativeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isMissingLedgerRpc(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || error.code === "42883";
}

function newBudgetReservationId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new AiBudgetConfigurationError(
      "Secure UUID generation is unavailable",
    );
  }
  return globalThis.crypto.randomUUID();
}
