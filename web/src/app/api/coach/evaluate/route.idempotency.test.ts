import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeCoachEvaluation: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  evaluateWithOpenAI: vi.fn(),
  markCoachEvaluationDispatched: vi.fn(),
  markCoachEvaluationOutcomeUnknown: vi.fn(),
  markPublicAiAdmissionDispatched: vi.fn(),
  manifest: {
    sourceRevision: "a".repeat(64),
    questions: [
      {
        id: "cpp11-auto-001",
        lessonId: "cpp11-auto",
        status: "verified",
        version: 1,
      },
    ],
    lessons: [{ id: "cpp11-auto" }],
  },
  releaseCoachEvaluation: vi.fn(),
  releasePublicAiAdmission: vi.fn(),
  reserveCoachEvaluation: vi.fn(),
  reservePublicAiAdmission: vi.fn(),
  runGeminiBudgetFallback: vi.fn(),
  completePublicAiAdmission: vi.fn(),
  isAdmin: vi.fn(),
  isPublicAiEnabled: vi.fn(),
  withAiBudget: vi.fn(),
  withPublicAiSiteBudget: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/ai/access", () => ({
  isUnmeteredLocalAiEnabled: () => false,
}));

vi.mock("@/lib/ai/budget", () => ({
  AiBudgetConfigurationError: class extends Error {},
  AiDailyBudgetExceededError: class extends Error {},
  AiMonthlyBudgetExceededError: class extends Error {},
  AiOperationNotStartedError: class extends Error {},
  AiOperationOutcomeUnknownError: class extends Error {
    constructor(readonly cause: unknown) {
      super("unknown outcome");
    }
  },
  withAiBudget: mocks.withAiBudget,
}));

vi.mock("@/lib/ai/public-ai-admission.server", () => ({
  attachPublicAiDeviceCookie: (response: Response) => response,
  completePublicAiAdmission: mocks.completePublicAiAdmission,
  isPublicAiEnabled: mocks.isPublicAiEnabled,
  markPublicAiAdmissionOutcomeUnknown: vi.fn(),
  PublicAiIdentityUnavailableError: class extends Error {},
  PublicAiRequestAlreadyCompletedError: class extends Error {},
  PublicAiRequestInProgressError: class extends Error {},
  PublicAiRequestOutcomeUnknownError: class extends Error {},
  releasePublicAiAdmission: mocks.releasePublicAiAdmission,
  reservePublicAiAdmission: mocks.reservePublicAiAdmission,
}));

vi.mock("@/lib/ai/public-ai-budget.server", () => ({
  markPublicAiAdmissionDispatched: mocks.markPublicAiAdmissionDispatched,
  PublicAiSiteBudgetConfigurationError: class extends Error {},
  PublicAiSiteBudgetExceededError: class extends Error {},
  withPublicAiSiteBudget: mocks.withPublicAiSiteBudget,
}));

vi.mock("@/lib/ai/public-ai-quota.server", () => ({
  PublicAiQuotaConfigurationError: class extends Error {},
  PublicAiQuotaExceededError: class extends Error {},
  PublicAiQuotaIdempotencyConflictError: class extends Error {},
}));

vi.mock("@/lib/ai/coach-reservation.server", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/ai/coach-reservation.server")
  >();
  return {
    ...actual,
    completeCoachEvaluation: mocks.completeCoachEvaluation,
    markCoachEvaluationDispatched:
      mocks.markCoachEvaluationDispatched,
    markCoachEvaluationOutcomeUnknown:
      mocks.markCoachEvaluationOutcomeUnknown,
    releaseCoachEvaluation: mocks.releaseCoachEvaluation,
    reserveCoachEvaluation: mocks.reserveCoachEvaluation,
  };
});

vi.mock("@/lib/ai/fallback", () => ({
  AllAiQuotasExceededError: class extends Error {},
  GeminiFallbackProviderError: class extends Error {},
  runGeminiBudgetFallback: mocks.runGeminiBudgetFallback,
}));

vi.mock("@/lib/ai/gemini", () => ({
  evaluateWithGemini: vi.fn(),
}));

vi.mock("@/lib/ai/openai", () => ({
  CoachConfigurationError: class extends Error {},
  evaluateWithOpenAI: mocks.evaluateWithOpenAI,
  safetyIdentifier: (value: string) => value,
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  consumeCoachRequest: () => ({
    allowed: true,
    retryAfterSeconds: 0,
  }),
}));

vi.mock("@/lib/ai/usage", () => ({
  COACH_RESERVATION_USD_MICROS: { luna: 1 },
}));

vi.mock("@/lib/content/question-overrides-server", () => ({
  loadQuestionOverrides: vi.fn().mockResolvedValue({
    error: null,
    overrides: [],
  }),
}));

vi.mock("@/lib/content/question-store-server", () => ({
  getRepoContentManifest: () => mocks.manifest,
  loadQuestionStoreManifest: vi.fn().mockResolvedValue(mocks.manifest),
}));

vi.mock("@/lib/supabase/authorization", () => ({
  isTuanotuanQuestionAdmin: mocks.isAdmin,
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

const noCachedAttempt = {
  eq: vi.fn(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};
noCachedAttempt.eq.mockReturnValue(noCachedAttempt);

const supabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "1bb81120-9434-4e39-89ad-d0580e768c7c" } },
      error: null,
    }),
  },
  from: vi.fn((table: string) => {
    if (table === "question_approvals") {
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    if (table === "coach_attempts") {
      return {
        select: vi.fn(() => noCachedAttempt),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import {
  CoachEvaluationBusyError,
  CoachEvaluationIdempotencyConflictError,
  coachEvaluationRequestFingerprint,
} from "@/lib/ai/coach-reservation.server";
import { AiOperationOutcomeUnknownError } from "@/lib/ai/budget";

import { POST } from "./route";

const idempotencyKey = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";
const identity = {
  questionId: "cpp11-auto-001",
  questionVersion: 1,
  sourceRevision: mocks.manifest.sourceRevision,
  candidateAnswer: "Câu trả lời thử nghiệm",
};
const fingerprint = coachEvaluationRequestFingerprint(identity);
const feedback = {
  score: 70,
  verdict: "solid" as const,
  summary: "Nắm được ý chính.",
  strengths: ["Nêu đúng vai trò."],
  coverage: [
    {
      criterion: "Giải thích được khái niệm",
      status: "met" as const,
      feedback: "Đã giải thích đúng.",
    },
  ],
  corrections: [],
  explanation: "Câu trả lời phù hợp với tài liệu.",
  nextStep: "Bổ sung ví dụ.",
  followUpQuestion: "Khi nào nên tránh dùng kiểu tự suy luận?",
  suggestedRating: "good" as const,
  sourceSectionIds: ["auto"],
};

const runningReservation = {
  status: "running" as const,
  idempotencyKey,
  requestFingerprint: fingerprint,
  attemptId: null,
  feedback: null,
  model: null,
  leaseToken,
  leaseExpiresAt: "2026-07-30T12:05:00.000Z",
  leaseAttempt: 1,
  isNew: true,
  leaseRenewed: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  noCachedAttempt.eq.mockReturnValue(noCachedAttempt);
  noCachedAttempt.maybeSingle.mockResolvedValue({ data: null, error: null });
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "1bb81120-9434-4e39-89ad-d0580e768c7c" } },
    error: null,
  });
  mocks.isAdmin.mockReturnValue(true);
  mocks.isPublicAiEnabled.mockReturnValue(true);
  supabase.from.mockImplementation((table: string) => {
    if (table === "question_approvals") {
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as never;
    }
    if (table === "coach_attempts") {
      return {
        select: vi.fn(() => noCachedAttempt),
      } as never;
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mocks.createSupabaseServerClient.mockResolvedValue(supabase);
  mocks.reserveCoachEvaluation.mockResolvedValue(runningReservation);
  mocks.reservePublicAiAdmission.mockResolvedValue({
    client: supabase,
    reservationId: "123e4567-e89b-42d3-a456-426614174000",
    leaseToken: "123e4567-e89b-42d3-a456-426614174001",
    deviceCookie: null,
    remaining: 2,
    resetsAt: "2026-08-06T08:00:00.000Z",
  });
  mocks.completePublicAiAdmission.mockResolvedValue(undefined);
  mocks.completeCoachEvaluation.mockResolvedValue({
    ...runningReservation,
    status: "completed",
    attemptId: 42,
    feedback,
    model: "gpt-5.6-luna",
    leaseToken: null,
    leaseExpiresAt: null,
  });
  mocks.releaseCoachEvaluation.mockResolvedValue("released");
  mocks.markCoachEvaluationDispatched.mockResolvedValue(undefined);
  mocks.markCoachEvaluationOutcomeUnknown.mockResolvedValue({
    ...runningReservation,
    status: "outcome_unknown",
    leaseToken: null,
    leaseExpiresAt: null,
    isNew: false,
  });
  mocks.evaluateWithOpenAI.mockResolvedValue({
    data: feedback,
    model: "gpt-5.6-luna",
  });
  mocks.withAiBudget.mockImplementation(
    async (
      _client: unknown,
      _reservation: unknown,
      operation: {
        beforeProviderDispatch: () => Promise<void>;
        invokeProvider: () => Promise<unknown>;
      },
    ) => {
      await operation.beforeProviderDispatch();
      return {
        result: await operation.invokeProvider(),
        dailyBudget: { remainingUsdMicros: 100 },
      };
    },
  );
  mocks.withPublicAiSiteBudget.mockImplementation(
    async (
      _client: unknown,
      _reservationId: unknown,
      _reserved: unknown,
      operation: {
        beforeProviderDispatch: () => Promise<void>;
        invokeProvider: () => Promise<unknown>;
      },
    ) => {
      await operation.beforeProviderDispatch();
      return operation.invokeProvider();
    },
  );
  mocks.runGeminiBudgetFallback.mockImplementation(
    async (error: unknown) => {
      throw error;
    },
  );
});

describe("POST /api/coach/evaluate idempotency", () => {
  it("returns a completed reservation without running another provider", async () => {
    mocks.reserveCoachEvaluation.mockResolvedValueOnce({
      ...runningReservation,
      status: "completed",
      attemptId: 41,
      feedback,
      model: "gpt-5.6-luna",
      leaseToken: null,
      leaseExpiresAt: null,
      isNew: false,
    });

    const response = await sendRequest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      attemptId: 41,
      cached: true,
    });
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
  });

  it("never reruns a request whose prior provider outcome is terminally unknown", async () => {
    mocks.reserveCoachEvaluation.mockResolvedValueOnce({
      ...runningReservation,
      status: "outcome_unknown",
      leaseToken: null,
      leaseExpiresAt: null,
      isNew: false,
    });

    const response = await sendRequest();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "evaluation_outcome_unconfirmed",
    });
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
    expect(mocks.withAiBudget).not.toHaveBeenCalled();
  });

  it("rejects a running duplicate with Retry-After", async () => {
    mocks.reserveCoachEvaluation.mockRejectedValueOnce(
      new CoachEvaluationBusyError(
        new Date(Date.now() + 30_000).toISOString(),
      ),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    await expect(response.json()).resolves.toMatchObject({
      code: "evaluation_in_progress",
    });
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
  });

  it("rejects the same key when its payload changes", async () => {
    mocks.reserveCoachEvaluation.mockRejectedValueOnce(
      new CoachEvaluationIdempotencyConflictError(),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "idempotency_conflict",
    });
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
  });

  it("completes the reservation after one provider call", async () => {
    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.evaluateWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.markCoachEvaluationDispatched).toHaveBeenCalledWith(
      supabase,
      { idempotencyKey, leaseToken },
    );
    expect(
      mocks.markCoachEvaluationDispatched.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.evaluateWithOpenAI.mock.invocationCallOrder[0]);
    expect(mocks.completeCoachEvaluation).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        idempotencyKey,
        requestFingerprint: fingerprint,
        leaseToken,
      }),
    );
    expect(mocks.releaseCoachEvaluation).not.toHaveBeenCalled();
  });

  it("does not call a provider when dispatch cannot be confirmed", async () => {
    mocks.markCoachEvaluationDispatched.mockRejectedValueOnce(
      new Error("dispatch unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(502);
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
    expect(mocks.releaseCoachEvaluation).toHaveBeenCalledWith(supabase, {
      idempotencyKey,
      leaseToken,
    });
  });

  it("uses the canonical key when another tab reserved the same request", async () => {
    const canonicalKey = "11111111-1111-4111-8111-111111111111";
    mocks.reserveCoachEvaluation.mockResolvedValueOnce({
      ...runningReservation,
      idempotencyKey: canonicalKey,
      isNew: false,
      leaseRenewed: true,
    });

    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.completeCoachEvaluation).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        idempotencyKey: canonicalKey,
        requestFingerprint: fingerprint,
        leaseToken,
      }),
    );
  });

  it("retries an ambiguous completion without running the provider twice", async () => {
    mocks.completeCoachEvaluation.mockRejectedValueOnce(
      new Error("response lost"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.evaluateWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.completeCoachEvaluation).toHaveBeenCalledTimes(2);
    expect(mocks.releaseCoachEvaluation).not.toHaveBeenCalled();
  });

  it("terminalizes an unconfirmed completion instead of risking a duplicate", async () => {
    mocks.completeCoachEvaluation.mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "evaluation_completion_unconfirmed",
    });
    expect(mocks.evaluateWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.completeCoachEvaluation).toHaveBeenCalledTimes(2);
    expect(mocks.markCoachEvaluationOutcomeUnknown).toHaveBeenCalledWith(
      supabase,
      { idempotencyKey, leaseToken },
    );
    expect(mocks.releaseCoachEvaluation).not.toHaveBeenCalled();
  });

  it("terminalizes an ambiguous provider request", async () => {
    const transportError = new Error("response lost");
    mocks.withAiBudget.mockRejectedValueOnce(
      new AiOperationOutcomeUnknownError(transportError),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      code: "evaluation_outcome_unconfirmed",
    });
    expect(mocks.releaseCoachEvaluation).not.toHaveBeenCalled();
    expect(mocks.completeCoachEvaluation).not.toHaveBeenCalled();
    expect(mocks.markCoachEvaluationOutcomeUnknown).toHaveBeenCalledWith(
      supabase,
      { idempotencyKey, leaseToken },
    );
  });

  it("releases the reservation when every provider fails", async () => {
    mocks.evaluateWithOpenAI.mockRejectedValueOnce(
      new Error("provider unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "provider_error",
    });
    expect(mocks.releaseCoachEvaluation).toHaveBeenCalledWith(supabase, {
      idempotencyKey,
      leaseToken,
    });
    expect(mocks.completeCoachEvaluation).not.toHaveBeenCalled();
  });

  it("requires an idempotency key when cloud persistence is enabled", async () => {
    const response = await sendRequest({ omitIdempotencyKey: true });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "idempotency_key_required",
    });
    expect(mocks.reserveCoachEvaluation).not.toHaveBeenCalled();
    expect(mocks.evaluateWithOpenAI).not.toHaveBeenCalled();
  });

  it("lets a guest use only the public Luna admission path", async () => {
    mocks.isAdmin.mockReturnValue(false);
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await sendRequest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: "openai",
      aiUsageRecorded: true,
    });
    expect(mocks.reservePublicAiAdmission).toHaveBeenCalledWith(
      expect.objectContaining({ requestKind: "coach_evaluation", user: null }),
    );
    expect(mocks.withPublicAiSiteBudget).toHaveBeenCalledTimes(1);
    expect(mocks.completePublicAiAdmission).toHaveBeenCalledTimes(1);
    expect(mocks.reserveCoachEvaluation).not.toHaveBeenCalled();
    expect(mocks.withAiBudget).not.toHaveBeenCalled();
    expect(mocks.runGeminiBudgetFallback).not.toHaveBeenCalled();
  });
});

function sendRequest(options: { omitIdempotencyKey?: boolean } = {}) {
  return POST(
    new Request("http://localhost/api/coach/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": crypto.randomUUID(),
      },
      body: JSON.stringify({
        questionId: identity.questionId,
        answer: identity.candidateAnswer,
        ...(options.omitIdempotencyKey ? {} : { idempotencyKey }),
      }),
    }),
  );
}
