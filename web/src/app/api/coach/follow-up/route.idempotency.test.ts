import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  answerCoachFollowUpWithOpenAI: vi.fn(),
  completeCoachFollowUp: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isUnmeteredLocalAiEnabled: vi.fn(),
  markCoachFollowUpDispatched: vi.fn(),
  markCoachFollowUpOutcomeUnknown: vi.fn(),
  releaseCoachFollowUp: vi.fn(),
  reserveCoachFollowUp: vi.fn(),
  runGeminiBudgetFallback: vi.fn(),
  withAiBudget: vi.fn(),
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
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/ai/access", () => ({
  isUnmeteredLocalAiEnabled: mocks.isUnmeteredLocalAiEnabled,
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

vi.mock(
  "@/lib/ai/coach-follow-up-reservation.server",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("@/lib/ai/coach-follow-up-reservation.server")
    >();
    return {
      ...actual,
      completeCoachFollowUp: mocks.completeCoachFollowUp,
      markCoachFollowUpDispatched:
        mocks.markCoachFollowUpDispatched,
      markCoachFollowUpOutcomeUnknown:
        mocks.markCoachFollowUpOutcomeUnknown,
      releaseCoachFollowUp: mocks.releaseCoachFollowUp,
      reserveCoachFollowUp: mocks.reserveCoachFollowUp,
    };
  },
);

vi.mock("@/lib/ai/fallback", () => ({
  AllAiQuotasExceededError: class extends Error {},
  GeminiFallbackProviderError: class extends Error {
    constructor(readonly cause: unknown) {
      super("fallback failed");
    }
  },
  runGeminiBudgetFallback: mocks.runGeminiBudgetFallback,
}));

vi.mock("@/lib/ai/gemini", () => ({
  answerCoachFollowUpWithGemini: vi.fn(),
}));

vi.mock("@/lib/ai/openai", () => ({
  answerCoachFollowUpWithOpenAI:
    mocks.answerCoachFollowUpWithOpenAI,
  CoachConfigurationError: class extends Error {},
  safetyIdentifier: (value: string) => value,
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  consumeCoachRequest: () => ({ allowed: true }),
}));

vi.mock("@/lib/ai/usage", () => ({
  COACH_RESERVATION_USD_MICROS: { luna: 20_000 },
}));

vi.mock("@/lib/content/question-overrides-server", () => ({
  loadQuestionOverrides: vi.fn().mockResolvedValue({
    overrides: [],
    error: null,
  }),
}));

vi.mock("@/lib/content/question-store-server", () => ({
  getRepoContentManifest: () => mocks.manifest,
  loadQuestionStoreManifest: vi.fn().mockResolvedValue(mocks.manifest),
}));

vi.mock("@/lib/supabase/authorization", () => ({
  isTuanotuanQuestionAdmin: () => true,
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { AiOperationOutcomeUnknownError } from "@/lib/ai/budget";
import {
  CoachFollowUpBusyError,
  CoachFollowUpIdempotencyConflictError,
  coachFollowUpRequestFingerprint,
} from "@/lib/ai/coach-follow-up-reservation.server";

import { POST } from "./route";

const idempotencyKey = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";
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
const messages = [
  { role: "user" as const, content: "Giải thích kỹ hơn." },
];
const reply = {
  answer: "Đây là phần giải thích chi tiết.",
  sourceSectionIds: ["auto"],
  checkQuestion: "Bạn sẽ áp dụng quy tắc này khi nào?",
};
const identity = {
  questionId: "cpp11-auto-001",
  questionVersion: 1,
  sourceRevision: mocks.manifest.sourceRevision,
  candidateAnswer: "Câu trả lời thử nghiệm",
  feedback,
  messages,
};
const fingerprint = coachFollowUpRequestFingerprint(identity);
const runningReservation = {
  status: "running" as const,
  idempotencyKey,
  requestFingerprint: fingerprint,
  response: null,
  model: null,
  provider: null,
  leaseToken,
  leaseExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  outcomeUnknownAt: null,
  isNew: true,
};
const completedReservation = {
  ...runningReservation,
  status: "completed" as const,
  response: reply,
  model: "gpt-5.6-luna",
  provider: "openai" as const,
  leaseToken: null,
  leaseExpiresAt: null,
  isNew: false,
};
const unknownReservation = {
  ...runningReservation,
  status: "outcome_unknown" as const,
  leaseToken: null,
  leaseExpiresAt: null,
  outcomeUnknownAt: new Date().toISOString(),
  isNew: false,
};

const supabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.isUnmeteredLocalAiEnabled.mockReturnValue(false);
  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: { id: "1bb81120-9434-4e39-89ad-d0580e768c7c" },
    },
    error: null,
  });
  supabase.from.mockImplementation((table: string) => {
    if (table === "question_approvals") {
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mocks.createSupabaseServerClient.mockResolvedValue(supabase);
  mocks.reserveCoachFollowUp.mockResolvedValue(runningReservation);
  mocks.completeCoachFollowUp.mockResolvedValue(completedReservation);
  mocks.markCoachFollowUpOutcomeUnknown.mockResolvedValue(
    unknownReservation,
  );
  mocks.markCoachFollowUpDispatched.mockResolvedValue(undefined);
  mocks.releaseCoachFollowUp.mockResolvedValue("released");
  mocks.answerCoachFollowUpWithOpenAI.mockResolvedValue({
    data: reply,
    model: "gpt-5.6-luna",
  });
  mocks.withAiBudget.mockImplementation(
    async (
      _client: unknown,
      _reservation: number,
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
  mocks.runGeminiBudgetFallback.mockImplementation(
    async (error: unknown) => {
      throw error;
    },
  );
});

describe("POST /api/coach/follow-up idempotency", () => {
  it("returns a completed cache without calling a paid provider", async () => {
    mocks.reserveCoachFollowUp.mockResolvedValueOnce(
      completedReservation,
    );

    const response = await sendRequest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reply,
      cached: true,
    });
    expect(mocks.answerCoachFollowUpWithOpenAI).not.toHaveBeenCalled();
  });

  it("never reopens a terminally unknown request", async () => {
    mocks.reserveCoachFollowUp.mockResolvedValueOnce(unknownReservation);

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      code: "follow_up_outcome_unconfirmed",
    });
    expect(mocks.answerCoachFollowUpWithOpenAI).not.toHaveBeenCalled();
  });

  it("rejects a duplicate while its original lease is running", async () => {
    mocks.reserveCoachFollowUp.mockRejectedValueOnce(
      new CoachFollowUpBusyError(
        new Date(Date.now() + 30_000).toISOString(),
      ),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).not.toBeNull();
    expect(mocks.answerCoachFollowUpWithOpenAI).not.toHaveBeenCalled();
  });

  it("rejects a key reused for different follow-up content", async () => {
    mocks.reserveCoachFollowUp.mockRejectedValueOnce(
      new CoachFollowUpIdempotencyConflictError(),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "idempotency_conflict",
    });
    expect(mocks.answerCoachFollowUpWithOpenAI).not.toHaveBeenCalled();
  });

  it("requires a key whenever Supabase persistence is enabled", async () => {
    const response = await sendRequest({ omitIdempotencyKey: true });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "idempotency_key_required",
    });
    expect(mocks.reserveCoachFollowUp).not.toHaveBeenCalled();
  });

  it("allows an unkeyed request in explicitly enabled local development", async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);
    mocks.isUnmeteredLocalAiEnabled.mockReturnValue(true);

    const response = await sendRequest({ omitIdempotencyKey: true });

    expect(response.status).toBe(200);
    expect(mocks.reserveCoachFollowUp).not.toHaveBeenCalled();
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
  });

  it("calls the provider once and atomically caches the response", async () => {
    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.withAiBudget).toHaveBeenCalledWith(
      supabase,
      20_000,
      expect.any(Object),
    );
    expect(mocks.markCoachFollowUpDispatched).toHaveBeenCalledWith(
      supabase,
      { idempotencyKey, leaseToken },
    );
    expect(
      mocks.markCoachFollowUpDispatched.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.answerCoachFollowUpWithOpenAI.mock.invocationCallOrder[0],
    );
    expect(mocks.completeCoachFollowUp).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        idempotencyKey,
        requestFingerprint: fingerprint,
        leaseToken,
        response: reply,
      }),
    );
  });

  it("does not call a provider when dispatch cannot be confirmed", async () => {
    mocks.markCoachFollowUpDispatched.mockRejectedValueOnce(
      new Error("dispatch unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(502);
    expect(mocks.answerCoachFollowUpWithOpenAI).not.toHaveBeenCalled();
    expect(mocks.releaseCoachFollowUp).toHaveBeenCalledWith(supabase, {
      idempotencyKey,
      leaseToken,
    });
  });

  it("uses the canonical reservation key returned for the fingerprint", async () => {
    const canonicalKey = "11111111-1111-4111-8111-111111111111";
    mocks.reserveCoachFollowUp.mockResolvedValueOnce({
      ...runningReservation,
      idempotencyKey: canonicalKey,
      isNew: false,
    });

    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.completeCoachFollowUp).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        idempotencyKey: canonicalKey,
        requestFingerprint: fingerprint,
        leaseToken,
      }),
    );
  });

  it("recovers a completion whose first RPC response was lost", async () => {
    mocks.completeCoachFollowUp
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce(completedReservation);

    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.completeCoachFollowUp).toHaveBeenCalledTimes(2);
    expect(
      mocks.markCoachFollowUpOutcomeUnknown,
    ).not.toHaveBeenCalled();
  });

  it("recovers a committed cache through the terminal marker", async () => {
    mocks.completeCoachFollowUp.mockRejectedValue(
      new Error("database response lost"),
    );
    mocks.markCoachFollowUpOutcomeUnknown.mockResolvedValueOnce(
      completedReservation,
    );

    const response = await sendRequest();

    expect(response.status).toBe(200);
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.completeCoachFollowUp).toHaveBeenCalledTimes(2);
    expect(mocks.markCoachFollowUpOutcomeUnknown).toHaveBeenCalledTimes(1);
    expect(mocks.releaseCoachFollowUp).not.toHaveBeenCalled();
  });

  it("terminalizes an unconfirmed completion instead of rerunning AI", async () => {
    mocks.completeCoachFollowUp.mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.completeCoachFollowUp).toHaveBeenCalledTimes(2);
    expect(mocks.markCoachFollowUpOutcomeUnknown).toHaveBeenCalledTimes(1);
    expect(mocks.releaseCoachFollowUp).not.toHaveBeenCalled();
  });

  it("marks an ambiguous provider call unknown and holds its lease", async () => {
    mocks.withAiBudget.mockRejectedValueOnce(
      new AiOperationOutcomeUnknownError(new Error("response lost")),
    );

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(mocks.markCoachFollowUpOutcomeUnknown).toHaveBeenCalledWith(
      supabase,
      {
        idempotencyKey,
        requestFingerprint: fingerprint,
        leaseToken,
      },
    );
    expect(mocks.releaseCoachFollowUp).not.toHaveBeenCalled();
  });

  it("keeps the retry hint only when the terminal marker also fails", async () => {
    mocks.completeCoachFollowUp.mockRejectedValue(
      new Error("database unavailable"),
    );
    mocks.markCoachFollowUpOutcomeUnknown.mockRejectedValueOnce(
      new Error("marker unavailable"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(mocks.answerCoachFollowUpWithOpenAI).toHaveBeenCalledTimes(1);
    expect(mocks.releaseCoachFollowUp).not.toHaveBeenCalled();
  });

  it("releases the lease after a definitely safe provider failure", async () => {
    mocks.answerCoachFollowUpWithOpenAI.mockRejectedValueOnce(
      new Error("confirmed provider rejection"),
    );

    const response = await sendRequest();

    expect(response.status).toBe(502);
    expect(mocks.releaseCoachFollowUp).toHaveBeenCalledWith(supabase, {
      idempotencyKey,
      leaseToken,
    });
  });
});

function sendRequest(options: { omitIdempotencyKey?: boolean } = {}) {
  return POST(
    new Request("http://localhost/api/coach/follow-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": crypto.randomUUID(),
      },
      body: JSON.stringify({
        questionId: identity.questionId,
        candidateAnswer: identity.candidateAnswer,
        feedback,
        messages,
        ...(options.omitIdempotencyKey ? {} : { idempotencyKey }),
      }),
    }),
  );
}
