import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordGeminiFallbackUsage: vi.fn(),
}));

vi.mock("./gemini-usage", () => ({
  recordGeminiFallbackUsage: mocks.recordGeminiFallbackUsage,
}));

import {
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationOutcomeUnknownError,
} from "./budget";
import {
  AllAiQuotasExceededError,
  GeminiFallbackProviderError,
  runGeminiBudgetFallback,
} from "./fallback";

const usage = {
  inputTokens: 10,
  outputTokens: 5,
  thoughtTokens: 2,
  totalTokens: 17,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.recordGeminiFallbackUsage.mockReset();
});

describe("runGeminiBudgetFallback", () => {
  it("runs Gemini after the app daily budget is exhausted", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const operation = vi.fn().mockResolvedValue({
      data: { answer: "ok" },
      model: "gemini-test",
      usage,
    });

    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        operation,
      ),
    ).resolves.toMatchObject({ model: "gemini-test" });
    expect(operation).toHaveBeenCalledOnce();
  });

  it("runs Gemini after OpenAI reports hard quota exhaustion", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const operation = vi.fn().mockResolvedValue({
      data: { answer: "ok" },
      model: "gemini-test",
      usage,
    });
    const hardQuotaError = Object.assign(new Error("quota exhausted"), {
      status: 429,
      code: "insufficient_quota",
    });

    await expect(
      runGeminiBudgetFallback(hardQuotaError, null, operation),
    ).resolves.toMatchObject({ model: "gemini-test" });
    expect(operation).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "a transient rate limit",
      Object.assign(new Error("rate limited"), {
        status: 429,
        code: "rate_limit_exceeded",
      }),
    ],
    [
      "a 429 without a provider code",
      Object.assign(new Error("rate limited"), { status: 429 }),
    ],
    [
      "an insufficient-quota code without status 429",
      Object.assign(new Error("quota response malformed"), {
        status: 500,
        code: "insufficient_quota",
      }),
    ],
  ])("does not fallback for %s", async (_label, original) => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const operation = vi.fn();

    await expect(
      runGeminiBudgetFallback(original, null, operation),
    ).rejects.toBe(original);
    expect(operation).not.toHaveBeenCalled();
  });

  it("does not fallback for arbitrary OpenAI/provider errors", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const original = new Error("provider failed");
    const operation = vi.fn();

    await expect(
      runGeminiBudgetFallback(original, null, operation),
    ).rejects.toBe(original);
    expect(operation).not.toHaveBeenCalled();
  });

  it("respects the fallback kill switch", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_FALLBACK_ENABLED", "false");
    const original = new AiMonthlyBudgetExceededError();

    await expect(
      runGeminiBudgetFallback(original, null, vi.fn()),
    ).rejects.toBe(original);
  });

  it("reports when both OpenAI budget and Gemini quota are exhausted", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");

    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        async () => {
          throw Object.assign(new Error("rate limited"), { status: 429 });
        },
      ),
    ).rejects.toBeInstanceOf(AllAiQuotasExceededError);
  });

  it("identifies non-quota Gemini failures separately", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");

    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        async () => {
          throw Object.assign(new Error("bad request"), { status: 400 });
        },
      ),
    ).rejects.toBeInstanceOf(GeminiFallbackProviderError);
  });

  it("returns a valid Gemini result when usage logging throws", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordGeminiFallbackUsage.mockRejectedValueOnce(
      new Error("usage response lost"),
    );
    const result = {
      data: { answer: "ok" },
      model: "gemini-test",
      usage,
    };

    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        async () => result,
      ),
    ).resolves.toBe(result);
    expect(consoleError).toHaveBeenCalledWith(
      "Gemini fallback usage logging threw",
      { name: "Error" },
    );
  });

  it("preserves an ambiguous Gemini outcome for application leases", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const transportError = new Error("connection closed after dispatch");

    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        async () => {
          throw transportError;
        },
      ),
    ).rejects.toMatchObject({
      name: "AiOperationOutcomeUnknownError",
      cause: transportError,
    });
    await expect(
      runGeminiBudgetFallback(
        new AiDailyBudgetExceededError(),
        null,
        async () => {
          throw Object.assign(new Error("timeout response"), {
            status: 408,
          });
        },
      ),
    ).rejects.toBeInstanceOf(AiOperationOutcomeUnknownError);
  });
});
