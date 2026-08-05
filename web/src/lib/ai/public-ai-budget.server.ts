import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AiOperationOutcomeUnknownError,
  isAiOperationSafeToRetry,
} from "./budget";
import {
  dailyBudgetUsdMicros,
  monthlyBudgetUsdMicros,
  type AiTokenUsage,
  usageCostUsdMicros,
} from "./usage";

export class PublicAiSiteBudgetExceededError extends Error {
  constructor(readonly period: "daily" | "monthly") {
    super(`Public AI ${period} budget reached`);
    this.name = "PublicAiSiteBudgetExceededError";
  }
}

export class PublicAiSiteBudgetConfigurationError extends Error {
  constructor(message = "Public AI site budget is not configured") {
    super(message);
    this.name = "PublicAiSiteBudgetConfigurationError";
  }
}

export type PublicAiBudgetedOperation<
  T extends { model: string; usage: AiTokenUsage },
> = {
  beforeProviderDispatch: () => Promise<void>;
  invokeProvider: () => Promise<T>;
};

export async function withPublicAiSiteBudget<
  T extends { model: string; usage: AiTokenUsage },
>(
  client: SupabaseClient,
  reservationId: string,
  reservedUsdMicros: number,
  operation: PublicAiBudgetedOperation<T>,
) {
  await reservePublicAiSiteBudget(client, reservationId, reservedUsdMicros);

  try {
    await operation.beforeProviderDispatch();
  } catch (error) {
    await releasePublicAiSiteBudget(client, reservationId);
    throw error;
  }

  let result: T;
  try {
    result = await operation.invokeProvider();
  } catch (error) {
    if (isAiOperationSafeToRetry(error)) {
      await releasePublicAiSiteBudget(client, reservationId);
      throw error;
    }
    await conservativelyFinalizePublicAiSiteBudget(
      client,
      reservationId,
      reservedUsdMicros,
    );
    throw new AiOperationOutcomeUnknownError(error);
  }

  try {
    await finalizePublicAiSiteBudget(
      client,
      reservationId,
      result.model,
      result.usage,
    );
  } catch (error) {
    // A valid paid result may be shown without retrying the provider. A running
    // dispatched reservation will be finalized conservatively by the next
    // admission if this exact finalization remains unavailable.
    console.error("Public AI budget finalization could not be confirmed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return result;
}

export async function reservePublicAiSiteBudget(
  client: SupabaseClient,
  reservationId: string,
  reservedUsdMicros: number,
) {
  assertReservationInput(reservationId, reservedUsdMicros);
  const { data, error } = await client.rpc("reserve_public_ai_site_budget", {
    p_reservation_id: reservationId,
    p_reservation_usd_micros: reservedUsdMicros,
    p_daily_limit_usd_micros: dailyBudgetUsdMicros(),
    p_monthly_limit_usd_micros: monthlyBudgetUsdMicros(),
  });
  if (error) throw mapPublicAiSiteBudgetRpcError(error);
  const decision = parsePublicAiSiteBudgetDecision(data, reservationId);
  if (decision === "daily_exceeded") {
    throw new PublicAiSiteBudgetExceededError("daily");
  }
  if (decision === "monthly_exceeded") {
    throw new PublicAiSiteBudgetExceededError("monthly");
  }
  if (decision !== "reserved") {
    throw new PublicAiSiteBudgetConfigurationError(
      "Public AI budget reservation is already terminal",
    );
  }
}

export async function markPublicAiAdmissionDispatched(
  client: SupabaseClient,
  reservationId: string,
  leaseToken: string,
) {
  assertUuid(reservationId, "reservation");
  assertUuid(leaseToken, "lease");
  const { data, error } = await client.rpc(
    "mark_public_ai_admission_dispatched",
    {
      p_reservation_id: reservationId,
      p_lease_token: leaseToken,
    },
  );
  if (error) throw mapPublicAiSiteBudgetRpcError(error);
  if (!isRecord(data) || data.status !== "dispatched") {
    throw new PublicAiSiteBudgetConfigurationError(
      "Public AI admission dispatch was not confirmed",
    );
  }
}

export async function finalizePublicAiSiteBudget(
  client: SupabaseClient,
  reservationId: string,
  model: string,
  usage: AiTokenUsage,
) {
  assertUuid(reservationId, "reservation");
  const actualUsdMicros = usageCostUsdMicros(model, usage);
  const { data, error } = await client.rpc("finalize_public_ai_site_budget", {
    p_reservation_id: reservationId,
    p_actual_usd_micros: actualUsdMicros,
    p_model: model,
    p_input_tokens: usage.inputTokens,
    p_cached_input_tokens: usage.cachedInputTokens,
    p_cache_write_tokens: usage.cacheWriteTokens,
    p_output_tokens: usage.outputTokens,
  });
  if (error) throw mapPublicAiSiteBudgetRpcError(error);
  if (!isRecord(data) || data.status !== "finalized") {
    throw new PublicAiSiteBudgetConfigurationError(
      "Public AI budget finalization was not confirmed",
    );
  }
}

export async function releasePublicAiSiteBudget(
  client: SupabaseClient,
  reservationId: string,
) {
  assertUuid(reservationId, "reservation");
  try {
    const { data, error } = await client.rpc("release_public_ai_site_budget", {
      p_reservation_id: reservationId,
    });
    if (error) throw mapPublicAiSiteBudgetRpcError(error);
    if (
      !isRecord(data) ||
      (data.status !== "released" &&
        data.status !== "finalized" &&
        data.status !== "not_found")
    ) {
      throw new PublicAiSiteBudgetConfigurationError(
        "Public AI budget release was not confirmed",
      );
    }
  } catch (error) {
    console.error("Public AI budget release failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export function mapPublicAiSiteBudgetRpcError(error: {
  code?: string | null;
}) {
  if (new Set(["PGRST202", "42P01", "42703", "42883"]).has(error.code ?? "")) {
    return new PublicAiSiteBudgetConfigurationError(
      "Public AI site budget migration is missing",
    );
  }
  return new PublicAiSiteBudgetConfigurationError(
    "Public AI site budget request failed",
  );
}

function parsePublicAiSiteBudgetDecision(data: unknown, reservationId: string) {
  if (!isRecord(data)) {
    throw new PublicAiSiteBudgetConfigurationError(
      "Unexpected public AI site budget response",
    );
  }
  if (data.status === "daily_exceeded" || data.status === "monthly_exceeded") {
    return data.status;
  }
  if (
    data.status !== "reserved" ||
    data.reservation_id !== reservationId ||
    typeof data.requested_usd_micros !== "number" ||
    !Number.isSafeInteger(data.requested_usd_micros) ||
    data.dispatched !== false
  ) {
    throw new PublicAiSiteBudgetConfigurationError(
      "Public AI site budget reservation is malformed",
    );
  }
  return "reserved";
}

async function conservativelyFinalizePublicAiSiteBudget(
  client: SupabaseClient,
  reservationId: string,
  reservedUsdMicros: number,
) {
  try {
    const { data, error } = await client.rpc("finalize_public_ai_site_budget", {
      p_reservation_id: reservationId,
      p_actual_usd_micros: reservedUsdMicros,
      p_model: "unknown-openai-request",
      p_input_tokens: 0,
      p_cached_input_tokens: 0,
      p_cache_write_tokens: 0,
      p_output_tokens: 0,
    });
    if (error || !isRecord(data) || data.status !== "finalized") {
      throw mapPublicAiSiteBudgetRpcError(error ?? {});
    }
  } catch (error) {
    console.error("Public AI budget unknown-outcome finalization failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

function assertReservationInput(reservationId: string, reservedUsdMicros: number) {
  assertUuid(reservationId, "reservation");
  if (
    !Number.isSafeInteger(reservedUsdMicros) ||
    reservedUsdMicros < 1 ||
    reservedUsdMicros > 500_000
  ) {
    throw new PublicAiSiteBudgetConfigurationError(
      "Public AI budget reservation amount is invalid",
    );
  }
}

function assertUuid(value: string, label: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ) || value === "00000000-0000-0000-0000-000000000000"
  ) {
    throw new PublicAiSiteBudgetConfigurationError(
      `Public AI ${label} UUID is invalid`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
