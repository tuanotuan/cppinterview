import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationOutcomeUnknownError,
  isAiOperationSafeToRetry,
} from "./budget";
import {
  type GeminiStructuredResult,
} from "./gemini";
import { recordGeminiFallbackUsage } from "./gemini-usage";

export class AllAiQuotasExceededError extends Error {}
export class GeminiFallbackProviderError extends Error {
  constructor(options?: ErrorOptions) {
    super("Gemini fallback request failed", options);
  }
}

export function isOpenAiAppBudgetError(error: unknown) {
  return (
    error instanceof AiDailyBudgetExceededError ||
    error instanceof AiMonthlyBudgetExceededError
  );
}

function isOpenAiProviderQuotaError(error: unknown) {
  return (
    providerStatus(error) === 429 &&
    providerCode(error) === "insufficient_quota"
  );
}

function isOpenAiFallbackEligibleError(error: unknown) {
  return (
    isOpenAiAppBudgetError(error) || isOpenAiProviderQuotaError(error)
  );
}

export async function runGeminiBudgetFallback<T>(
  openAiError: unknown,
  client: SupabaseClient | null,
  operation: () => Promise<GeminiStructuredResult<T>>,
) {
  if (
    !isOpenAiFallbackEligibleError(openAiError) ||
    !(await isGeminiFallbackEnabled(client))
  ) {
    throw openAiError;
  }

  let result: GeminiStructuredResult<T>;
  try {
    result = await operation();
  } catch (error) {
    if (providerStatus(error) === 429) {
      throw new AllAiQuotasExceededError(
        "OpenAI and Gemini quotas are exhausted",
      );
    }
    if (!isAiOperationSafeToRetry(error)) {
      throw new AiOperationOutcomeUnknownError(error);
    }
    throw new GeminiFallbackProviderError({ cause: error });
  }

  try {
    await recordGeminiFallbackUsage(client, result.model, result.usage);
  } catch (error) {
    console.error("Gemini fallback usage logging threw", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return result;
}

export async function isGeminiFallbackEnabled(client: SupabaseClient | null) {
  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_FALLBACK_ENABLED?.toLowerCase() === "false"
  ) {
    return false;
  }
  if (!client) return true;

  const { data, error } = await client
    .from("ai_provider_settings")
    .select("gemini_fallback_enabled")
    .maybeSingle();
  if (error) {
    console.error("Gemini fallback setting read failed", { code: error.code });
    return false;
  }
  return data?.gemini_fallback_enabled !== false;
}

function providerStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

function providerCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
