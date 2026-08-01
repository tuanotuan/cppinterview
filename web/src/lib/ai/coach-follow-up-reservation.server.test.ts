import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CoachFollowUpBusyError,
  CoachFollowUpIdempotencyConflictError,
  CoachFollowUpReservationConfigurationError,
  coachFollowUpRequestFingerprint,
  completeCoachFollowUp,
  markCoachFollowUpDispatched,
  markCoachFollowUpOutcomeUnknown,
  parseCoachFollowUpReservation,
  releaseCoachFollowUp,
  reserveCoachFollowUp,
} from "./coach-follow-up-reservation.server";

const idempotencyKey = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";
const identity = {
  questionId: "cpp11-copy-assignment-001",
  questionVersion: 2,
  sourceRevision: "b".repeat(64),
  candidateAnswer: "Một câu trả lời",
  feedback: {
    score: 70,
    verdict: "solid" as const,
    summary: "Nắm được ý chính.",
    strengths: ["Phân biệt đúng hai toán tử."],
    coverage: [
      {
        criterion: "Nêu đúng quy tắc",
        status: "met" as const,
        feedback: "Đã nêu đúng.",
      },
    ],
    corrections: [],
    explanation: "Câu trả lời phù hợp với tài liệu.",
    nextStep: "Bổ sung ví dụ.",
    followUpQuestion: "Khi nào cần kiểm tra tự gán?",
    suggestedRating: "good" as const,
    sourceSectionIds: ["copy-assignment"],
  },
  messages: [
    { role: "user" as const, content: "Giải thích kỹ hơn về tự gán." },
  ],
};
const fingerprint = coachFollowUpRequestFingerprint(identity);
const reply = {
  answer: "Cần kiểm tra tự gán trước khi giải phóng tài nguyên cũ.",
  sourceSectionIds: ["copy-assignment"],
  checkQuestion: "Điều kiện kiểm tra thường viết như thế nào?",
};
const running = {
  status: "running",
  idempotency_key: idempotencyKey,
  request_fingerprint: fingerprint,
  response: null,
  model: null,
  provider: null,
  lease_token: leaseToken,
  lease_expires_at: new Date(Date.now() + 600_000).toISOString(),
  outcome_unknown_at: null,
  is_new: true,
};

describe("coach follow-up reservation parsing", () => {
  it("parses running, completed, and terminal unknown states", () => {
    expect(parseCoachFollowUpReservation(running)).toMatchObject({
      status: "running",
      leaseToken,
    });
    expect(
      parseCoachFollowUpReservation({
        ...running,
        status: "completed",
        response: reply,
        model: "gpt-5.6-luna",
        provider: "openai",
        lease_token: null,
        lease_expires_at: null,
        is_new: false,
      }),
    ).toMatchObject({
      status: "completed",
      response: reply,
      provider: "openai",
    });
    expect(
      parseCoachFollowUpReservation({
        ...running,
        status: "outcome_unknown",
        lease_token: null,
        lease_expires_at: null,
        outcome_unknown_at: new Date().toISOString(),
        is_new: false,
      }),
    ).toMatchObject({
      status: "outcome_unknown",
      response: null,
    });
  });

  it("maps conflicts, busy leases, and terminal unknown results", () => {
    expect(() =>
      parseCoachFollowUpReservation({
        status: "idempotency_conflict",
      }),
    ).toThrow(CoachFollowUpIdempotencyConflictError);
    expect(() =>
      parseCoachFollowUpReservation({
        status: "busy",
        lease_expires_at: new Date(Date.now() + 30_000).toISOString(),
      }),
    ).toThrow(CoachFollowUpBusyError);
    expect(() =>
      parseCoachFollowUpReservation({
        ...running,
        status: "outcome_unknown",
        lease_token: null,
        lease_expires_at: null,
        outcome_unknown_at: new Date().toISOString(),
      }),
    ).not.toThrow();
  });

  it("fails closed on malformed terminal payloads", () => {
    expect(() =>
      parseCoachFollowUpReservation({
        ...running,
        status: "completed",
        response: { answer: "" },
        model: "gpt-5.6-luna",
        provider: "openai",
        lease_token: null,
        lease_expires_at: null,
      }),
    ).toThrow(CoachFollowUpReservationConfigurationError);
    expect(() =>
      parseCoachFollowUpReservation({
        ...running,
        status: "outcome_unknown",
        lease_token: null,
        lease_expires_at: null,
        outcome_unknown_at: null,
      }),
    ).toThrow(CoachFollowUpReservationConfigurationError);
  });
});

describe("coach follow-up request fingerprint", () => {
  it("covers the exact request and rejects forged fingerprints", async () => {
    expect(coachFollowUpRequestFingerprint({ ...identity })).toBe(
      fingerprint,
    );
    expect(
      coachFollowUpRequestFingerprint({
        ...identity,
        messages: [
          { role: "user", content: "Giải thích một ý khác." },
        ],
      }),
    ).not.toBe(fingerprint);

    const rpc = vi.fn();
    const client = { rpc } as unknown as Parameters<
      typeof reserveCoachFollowUp
    >[0];
    await expect(
      reserveCoachFollowUp(client, {
        idempotencyKey,
        requestFingerprint: "a".repeat(64),
        identity,
      }),
    ).rejects.toBeInstanceOf(
      CoachFollowUpReservationConfigurationError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("coach follow-up reservation RPCs", () => {
  it("reserves a new exact request", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: running, error: null });
    const client = { rpc } as unknown as Parameters<
      typeof reserveCoachFollowUp
    >[0];

    await reserveCoachFollowUp(client, {
      idempotencyKey,
      requestFingerprint: fingerprint,
      identity,
    });

    expect(rpc).toHaveBeenCalledWith("reserve_coach_follow_up", {
      p_idempotency_key: idempotencyKey,
      p_lease_seconds: 600,
      p_request_fingerprint: fingerprint,
    });
  });

  it("completes and validates a cached response", async () => {
    const completed = {
      ...running,
      status: "completed",
      response: reply,
      model: "gpt-5.6-luna",
      provider: "openai",
      lease_token: null,
      lease_expires_at: null,
    };
    const rpc = vi.fn().mockResolvedValue({
      data: completed,
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof completeCoachFollowUp
    >[0];

    await expect(
      completeCoachFollowUp(client, {
        idempotencyKey,
        requestFingerprint: fingerprint,
        leaseToken,
        response: reply,
        model: "gpt-5.6-luna",
        provider: "openai",
      }),
    ).resolves.toMatchObject({ status: "completed", response: reply });
    expect(rpc).toHaveBeenCalledWith(
      "complete_coach_follow_up",
      expect.objectContaining({
        p_request_fingerprint: fingerprint,
        p_response: reply,
      }),
    );
  });

  it("marks the matching lease dispatched before provider work", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: "dispatched",
        dispatched_at: "2026-07-30T12:01:00Z",
      },
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof markCoachFollowUpDispatched
    >[0];

    await expect(
      markCoachFollowUpDispatched(client, {
        idempotencyKey,
        leaseToken,
      }),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith(
      "mark_coach_follow_up_dispatched",
      {
        p_idempotency_key: idempotencyKey,
        p_lease_token: leaseToken,
      },
    );
  });

  it("marks an ambiguous request terminally unknown", async () => {
    const unknown = {
      ...running,
      status: "outcome_unknown",
      lease_token: null,
      lease_expires_at: null,
      outcome_unknown_at: new Date().toISOString(),
    };
    const rpc = vi.fn().mockResolvedValue({ data: unknown, error: null });
    const client = { rpc } as unknown as Parameters<
      typeof markCoachFollowUpOutcomeUnknown
    >[0];

    await expect(
      markCoachFollowUpOutcomeUnknown(client, {
        idempotencyKey,
        requestFingerprint: fingerprint,
        leaseToken,
      }),
    ).resolves.toMatchObject({ status: "outcome_unknown" });
    expect(rpc).toHaveBeenCalledWith(
      "mark_coach_follow_up_outcome_unknown",
      {
        p_idempotency_key: idempotencyKey,
        p_lease_token: leaseToken,
        p_request_fingerprint: fingerprint,
      },
    );
  });

  it("releases only a matching definitely-safe failure", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "released" },
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof releaseCoachFollowUp
    >[0];

    await expect(
      releaseCoachFollowUp(client, { idempotencyKey, leaseToken }),
    ).resolves.toBe("released");
  });
});
