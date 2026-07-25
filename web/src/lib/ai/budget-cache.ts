import type { AiDailyBudgetSnapshot } from "./budget";
import { vietnamUsageDate } from "./usage";

// v2 discards same-day v1 snapshots whose percentage included project-wide
// background generation instead of web-only AI requests.
const STORAGE_PREFIX = "cpp-recall:ai-daily-budget:v2";

export function aiDailyBudgetStorageKey(accountId: string) {
  return `${STORAGE_PREFIX}:${accountId}`;
}

export function parseCurrentAiDailyBudgetSnapshot(
  raw: string | null,
  now = new Date(),
): AiDailyBudgetSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AiDailyBudgetSnapshot>;
    if (
      value.usageDate !== vietnamUsageDate(now) ||
      !isNonNegativeNumber(value.actualUsdMicros) ||
      !isNullableNonNegativeNumber(value.billingUsdMicros) ||
      !isNullableString(value.billingSyncedAt) ||
      !isNonNegativeInteger(value.requestCount) ||
      !isNonNegativeInteger(value.inputTokens) ||
      !isNonNegativeInteger(value.outputTokens) ||
      !isNullableString(value.lastModel) ||
      !isPositiveNumber(value.limitUsdMicros) ||
      !isPercent(value.remainingPercent)
    ) {
      return null;
    }
    return value as AiDailyBudgetSnapshot;
  } catch {
    return null;
  }
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
  return value === null || isNonNegativeNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPercent(value: unknown): value is number {
  return isNonNegativeNumber(value) && value <= 100;
}
