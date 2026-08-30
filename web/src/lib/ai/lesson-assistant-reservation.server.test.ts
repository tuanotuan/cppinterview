import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import {
  LessonAssistantBusyError,
  LessonAssistantIdempotencyConflictError,
  LessonAssistantReservationConfigurationError,
  completeLessonAssistantResponse,
  lessonAssistantRequestFingerprint,
  parseLessonAssistantReservation,
  reserveLessonAssistantResponse,
} from "./lesson-assistant-reservation.server";

const idempotencyKey = "123e4567-e89b-82d3-a456-426614174002";
const leaseToken = "123e4567-e89b-42d3-a456-426614174001";
const identity = {
  lessonId: "cpp11-toolchain",
  contextHash: "a".repeat(64),
  messages: [{ role: "user" as const, content: "What is a toolchain?" }],
  responseLocale: "en" as const,
};
const fingerprint = lessonAssistantRequestFingerprint(identity);
const reply = {
  answer: "A toolchain turns source code into a runnable program.",
  sourceSectionIds: ["what-it-solves"],
  grounding: "lesson" as const,
};

describe("lesson assistant reservations", () => {
  it("binds the fingerprint to localized context and conversation", () => {
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      lessonAssistantRequestFingerprint({
        ...identity,
        responseLocale: "vi",
      }),
    ).not.toBe(fingerprint);
    expect(
      lessonAssistantRequestFingerprint({
        ...identity,
        contextHash: "b".repeat(64),
      }),
    ).not.toBe(fingerprint);
  });

  it("calls the exact bounded lease RPC contract", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: runningReservation(),
      error: null,
    });

    await reserveLessonAssistantResponse(
      { rpc } as unknown as SupabaseClient,
      {
        idempotencyKey,
        requestFingerprint: fingerprint,
        identity,
      },
    );

    expect(rpc).toHaveBeenCalledWith("reserve_lesson_ai_response", {
      p_idempotency_key: idempotencyKey,
      p_lease_seconds: 600,
      p_request_fingerprint: fingerprint,
    });
  });

  it("validates a completed response before persisting it", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: completedReservation(),
      error: null,
    });

    await expect(
      completeLessonAssistantResponse(
        { rpc } as unknown as SupabaseClient,
        {
          idempotencyKey,
          requestFingerprint: fingerprint,
          leaseToken,
          response: reply,
          model: "gpt-5.6-luna",
        },
      ),
    ).resolves.toMatchObject({ status: "completed", response: reply });
    expect(rpc).toHaveBeenCalledWith("complete_lesson_ai_response", {
      p_idempotency_key: idempotencyKey,
      p_lease_token: leaseToken,
      p_model: "gpt-5.6-luna",
      p_request_fingerprint: fingerprint,
      p_response: reply,
    });
  });

  it("turns RPC conflict and busy states into actionable errors", () => {
    expect(() =>
      parseLessonAssistantReservation({ status: "idempotency_conflict" }),
    ).toThrow(LessonAssistantIdempotencyConflictError);
    expect(() =>
      parseLessonAssistantReservation({
        status: "busy",
        lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toThrow(LessonAssistantBusyError);
  });

  it("rejects malformed terminal cache rows", () => {
    expect(() =>
      parseLessonAssistantReservation({
        ...completedReservation(),
        response: null,
      }),
    ).toThrow(LessonAssistantReservationConfigurationError);
  });
});

function runningReservation() {
  return {
    status: "running",
    idempotency_key: idempotencyKey,
    request_fingerprint: fingerprint,
    response: null,
    model: null,
    lease_token: leaseToken,
    lease_expires_at: new Date(Date.now() + 600_000).toISOString(),
    outcome_unknown_at: null,
    is_new: true,
  };
}

function completedReservation() {
  return {
    status: "completed",
    idempotency_key: idempotencyKey,
    request_fingerprint: fingerprint,
    response: reply,
    model: "gpt-5.6-luna",
    lease_token: null,
    lease_expires_at: null,
    outcome_unknown_at: null,
    is_new: false,
  };
}
