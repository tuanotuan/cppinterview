import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  completeMistakeCandidateWithRetry,
  markMistakeGenerationDispatched,
  MistakeCandidateCompletionRejectedError,
  MistakeCandidateCompletionUnconfirmedError,
  MistakeQueueConfigurationError,
} from "./mistake-cards.server";

const completionInput = {
  candidateId: "23966699-ebc3-4b74-9a16-0ca48f4a47c7",
  leaseToken: "d71578c5-78aa-4536-a342-ed9c5db450ed",
  draft: { prompt: "Câu hỏi sửa lỗi" },
  provider: "openai" as const,
  model: "gpt-5.6-luna",
};

describe("mistake flashcard completion", () => {
  it("confirms the matching lease before provider work starts", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: "dispatched",
        dispatchedAt: "2026-07-30T12:01:00Z",
      },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      markMistakeGenerationDispatched(client, {
        candidateId: completionInput.candidateId,
        leaseToken: completionInput.leaseToken,
      }),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith(
      "mark_mistake_generation_dispatched",
      {
        p_candidate_id: completionInput.candidateId,
        p_lease_token: completionInput.leaseToken,
      },
    );
  });

  it("stops before provider work when dispatch cannot be confirmed", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "lease_invalid" },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      markMistakeGenerationDispatched(client, {
        candidateId: completionInput.candidateId,
        leaseToken: completionInput.leaseToken,
      }),
    ).rejects.toBeInstanceOf(MistakeQueueConfigurationError);
  });

  it("retries the same draft after an ambiguous transport failure", async () => {
    const rpc = vi
      .fn()
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({
        data: {
          status: "pending_review",
          questionId: "cpp11-auto-mistake-001",
        },
        error: null,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).resolves.toEqual({
      status: "pending_review",
      questionId: "cpp11-auto-mistake-001",
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });

  it("terminalizes the lease when completion and transition outcomes stay ambiguous", async () => {
    const rpc = vi.fn().mockRejectedValue(
      new Error("database connection lost"),
    );
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).rejects.toMatchObject({
      name: "MistakeCandidateCompletionUnconfirmedError",
      terminalized: false,
    });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenNthCalledWith(
      3,
      "terminate_mistake_flashcard_generation",
      {
        p_candidate_id: completionInput.candidateId,
        p_lease_token: completionInput.leaseToken,
        p_error_code: "completion_outcome_unknown",
      },
    );
    expect(rpc).not.toHaveBeenCalledWith(
      "fail_mistake_flashcard_candidate",
      expect.anything(),
    );
  });

  it("does not mark a candidate failed after a possibly committed first call", async () => {
    const rpc = vi
      .fn()
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({
        data: null,
        error: { code: "P0001" },
      })
      .mockResolvedValueOnce({
        data: { status: "dead_letter" },
        error: null,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).rejects.toMatchObject({
      name: "MistakeCandidateCompletionUnconfirmedError",
      terminalized: true,
    });
    expect(rpc).not.toHaveBeenCalledWith(
      "fail_mistake_flashcard_candidate",
      expect.anything(),
    );
    expect(rpc).toHaveBeenLastCalledWith(
      "terminate_mistake_flashcard_generation",
      {
        p_candidate_id: completionInput.candidateId,
        p_lease_token: completionInput.leaseToken,
        p_error_code: "completion_outcome_unknown",
      },
    );
  });

  it("treats a status-zero Supabase response as ambiguous", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "", message: "fetch failed" },
        status: 0,
      })
      .mockResolvedValueOnce({
        data: {
          status: "pending_review",
          questionId: "cpp11-auto-mistake-001",
        },
        error: null,
        status: 200,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).resolves.toMatchObject({ status: "pending_review" });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).not.toHaveBeenCalledWith(
      "fail_mistake_flashcard_candidate",
      expect.anything(),
    );
  });

  it("dead-letters a completion that the database definitively rejects", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "P0001" },
      })
      .mockResolvedValueOnce({
        data: { status: "dead_letter" },
        error: null,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).rejects.toBeInstanceOf(
      MistakeCandidateCompletionRejectedError,
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "terminate_mistake_flashcard_generation",
      {
        p_candidate_id: completionInput.candidateId,
        p_lease_token: completionInput.leaseToken,
        p_error_code: "completion_rejected",
      },
    );
  });

  it("keeps the lease policy conservative when dead-lettering is not confirmed", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "P0001" },
        status: 400,
      })
      .mockResolvedValueOnce({
        data: { status: "lease_invalid" },
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { status: "lease_invalid" },
        error: null,
        status: 200,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      completeMistakeCandidateWithRetry(client, completionInput),
    ).rejects.toBeInstanceOf(
      MistakeCandidateCompletionUnconfirmedError,
    );
  });
});
