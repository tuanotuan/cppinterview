import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateOpenAi: vi.fn(),
  generateGemini: vi.fn(),
  withAiBudget: vi.fn(),
  runGeminiFallback: vi.fn(),
  revisionChecksum: vi.fn(() => "revision-checksum"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/budget")>();
  return {
    ...actual,
    withAiBudget: mocks.withAiBudget,
  };
});
vi.mock("@/lib/ai/fallback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/fallback")>();
  return {
    ...actual,
    runGeminiBudgetFallback: mocks.runGeminiFallback,
  };
});
vi.mock("@/lib/ai/openai", () => ({
  generateMistakeCardWithOpenAI: mocks.generateOpenAi,
  safetyIdentifier: () => "safe-user",
}));
vi.mock("@/lib/ai/gemini", () => ({
  generateMistakeCardWithGemini: mocks.generateGemini,
}));
vi.mock("@/lib/content/backfill", () => ({
  questionRevisionChecksum: mocks.revisionChecksum,
}));

import {
  AiDailyBudgetExceededError,
  AiOperationNotStartedError,
} from "@/lib/ai/budget";
import { generateMistakeCandidate } from "./mistake-cards.server";

const candidateId = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";
const sourceHash = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAiBudget.mockImplementation(
    async (_client, _amount, operation) => {
      await operation.beforeProviderDispatch();
      return {
        result: await operation.invokeProvider(),
        dailyBudget: null,
      };
    },
  );
  mocks.runGeminiFallback.mockImplementation(
    async (error, _client, operation) => {
      if (error instanceof AiDailyBudgetExceededError) {
        return operation();
      }
      throw error;
    },
  );
});

describe("mistake generation dispatch ordering", () => {
  it("marks the lease before calling OpenAI", async () => {
    const providerError = new Error("definitive provider failure");
    mocks.generateOpenAi.mockRejectedValue(providerError);
    const { client, rpc } = createClient();

    await expect(generate(client)).rejects.toBe(providerError);

    expect(rpc).toHaveBeenCalledWith(
      "mark_mistake_generation_dispatched",
      {
        p_candidate_id: candidateId,
        p_lease_token: leaseToken,
      },
    );
    expect(
      rpc.mock.invocationCallOrder[
        rpc.mock.calls.findIndex(
          ([name]) => name === "mark_mistake_generation_dispatched",
        )
      ],
    ).toBeLessThan(mocks.generateOpenAi.mock.invocationCallOrder[0]);
  });

  it("does not call a provider when the dispatch marker is unconfirmed", async () => {
    const { client } = createClient({ dispatchFails: true });

    await expect(generate(client)).rejects.toBeInstanceOf(
      AiOperationNotStartedError,
    );
    expect(mocks.generateOpenAi).not.toHaveBeenCalled();
    expect(mocks.generateGemini).not.toHaveBeenCalled();
  });

  it("marks the same lease before a Gemini quota fallback", async () => {
    mocks.withAiBudget.mockRejectedValue(
      new AiDailyBudgetExceededError("daily limit"),
    );
    const providerError = new Error("definitive Gemini failure");
    mocks.generateGemini.mockRejectedValue(providerError);
    const { client, rpc } = createClient();

    await expect(generate(client)).rejects.toBe(providerError);

    expect(
      rpc.mock.invocationCallOrder[
        rpc.mock.calls.findIndex(
          ([name]) => name === "mark_mistake_generation_dispatched",
        )
      ],
    ).toBeLessThan(mocks.generateGemini.mock.invocationCallOrder[0]);
  });

  it("terminalizes the dispatched lease when local processing fails after AI returns", async () => {
    const processingError = new Error("local materialization failed");
    mocks.generateOpenAi.mockResolvedValue({
      data: {
        type: "recall",
        responseMode: "text",
        difficulty: "intermediate",
        estimatedMinutes: 3,
        prompt: "Explain the missing production condition clearly.",
        code: null,
        hint: "Review object lifetime and invalidation.",
        answer: {
          short: "Check the lifetime before retaining the reference.",
          detailed:
            "The referenced object must outlive every use, and container operations must not invalidate the reference.",
        },
        rubric: {
          required: ["State the lifetime requirement."],
          bonus: [],
          misconceptions: [],
        },
      },
      model: "test-model",
      usage: { inputTokens: 10, outputTokens: 20 },
    });
    mocks.revisionChecksum.mockImplementationOnce(() => {
      throw processingError;
    });
    const { client, rpc } = createClient();

    await expect(generate(client)).rejects.toBe(processingError);

    expect(rpc).toHaveBeenCalledWith(
      "terminate_mistake_flashcard_generation",
      {
        p_candidate_id: candidateId,
        p_lease_token: leaseToken,
        p_error_code: "completion_rejected",
      },
    );
    expect(
      rpc.mock.calls.some(
        ([name]) => name === "fail_mistake_flashcard_candidate",
      ),
    ).toBe(false);
  });
});

function generate(supabase: SupabaseClient) {
  return generateMistakeCandidate({
    supabase,
    userId: "10000000-0000-4000-8000-000000000001",
    candidateId,
    manifest: {
      lessons: [
        {
          id: "cpp11-auto",
          sourceHash,
          sections: [{ id: "section-1" }],
        },
      ],
      questions: [
        {
          id: "cpp11-auto-001",
          lessonId: "cpp11-auto",
          version: 1,
          sourceHash,
          taxonomy: { tags: [] },
        },
      ],
    } as never,
  });
}

function createClient({ dispatchFails = false } = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "mistake_generation_retry_protocol_version") {
      return { data: 3, error: null };
    }
    if (name === "claim_mistake_flashcard_candidate") {
      return {
        data: { status: "claimed", leaseToken },
        error: null,
      };
    }
    if (name === "mark_mistake_generation_dispatched") {
      return dispatchFails
        ? { data: null, error: { code: "PGRST202" } }
        : {
            data: {
              status: "dispatched",
              dispatchedAt: "2026-07-30T12:01:00Z",
            },
            error: null,
          };
    }
    if (name === "fail_mistake_flashcard_candidate") {
      return { data: { status: "failed" }, error: null };
    }
    if (name === "terminate_mistake_flashcard_generation") {
      return { data: { status: "dead_letter" }, error: null };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  const single = vi.fn().mockResolvedValue({
    data: {
      lesson_id: "cpp11-auto",
      lesson_revision_id: 1,
      source_hash: sourceHash,
      source_question_id: "cpp11-auto-001",
      source_question_version: 1,
      source_section_ids: ["section-1"],
      criterion_text: "Explain the missed concept",
      safe_evidence: {},
      occurrence_count: 1,
    },
    error: null,
  });
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single,
  };
  const client = {
    rpc,
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;
  return { client, rpc };
}
