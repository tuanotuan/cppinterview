import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CoachEvaluationBusyError,
  CoachEvaluationConfigurationError,
  CoachEvaluationIdempotencyConflictError,
  coachEvaluationRequestFingerprint,
  completeCoachEvaluation,
  markCoachEvaluationDispatched,
  markCoachEvaluationOutcomeUnknown,
  parseCoachEvaluationReservation,
  releaseCoachEvaluation,
  reserveCoachEvaluation,
} from "./coach-reservation.server";

const idempotencyKey = "23966699-ebc3-4b74-9a16-0ca48f4a47c7";
const leaseToken = "d71578c5-78aa-4536-a342-ed9c5db450ed";
const identity = {
  questionId: "cpp11-copy-assignment-001",
  questionVersion: 2,
  sourceRevision: "b".repeat(64),
  candidateAnswer: "Một câu trả lời",
};
const fingerprint = coachEvaluationRequestFingerprint(identity);
const feedback = {
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
};

const running = {
  status: "running",
  idempotency_key: idempotencyKey,
  request_fingerprint: fingerprint,
  attempt_id: null,
  feedback: null,
  model: null,
  lease_token: leaseToken,
  lease_expires_at: new Date(Date.now() + 600_000).toISOString(),
  lease_attempt: 1,
  is_new: true,
  lease_renewed: false,
};
const outcomeUnknown = {
  ...running,
  status: "outcome_unknown",
  lease_token: null,
  lease_expires_at: null,
  is_new: false,
};

describe("coach evaluation reservation parsing", () => {
  it("maps a new token-scoped running lease", () => {
    expect(
      parseCoachEvaluationReservation(running),
    ).toMatchObject({
      status: "running",
      idempotencyKey,
      leaseToken,
      isNew: true,
    });
  });

  it("returns a validated completed cache", () => {
    expect(
      parseCoachEvaluationReservation({
        ...running,
        status: "completed",
        attempt_id: 42,
        feedback,
        model: "gpt-5.6-luna",
        lease_token: null,
        lease_expires_at: null,
        is_new: false,
      }),
    ).toMatchObject({
      status: "completed",
      attemptId: 42,
      feedback,
      model: "gpt-5.6-luna",
    });
  });

  it("accepts a terminal unknown outcome without reusable lease data", () => {
    expect(
      parseCoachEvaluationReservation(outcomeUnknown),
    ).toMatchObject({
      status: "outcome_unknown",
      attemptId: null,
      feedback: null,
      model: null,
      leaseToken: null,
    });
    expect(() =>
      parseCoachEvaluationReservation({
        ...outcomeUnknown,
        lease_token: leaseToken,
      }),
    ).toThrow(CoachEvaluationConfigurationError);
  });

  it("maps conflicting and running duplicate requests to domain errors", () => {
    expect(() =>
      parseCoachEvaluationReservation({
        status: "idempotency_conflict",
      }),
    ).toThrow(CoachEvaluationIdempotencyConflictError);
    expect(() =>
      parseCoachEvaluationReservation({
        status: "busy",
        lease_expires_at: new Date(Date.now() + 30_000).toISOString(),
      }),
    ).toThrow(CoachEvaluationBusyError);
  });

  it("rejects running responses without a usable lease", () => {
    expect(() =>
      parseCoachEvaluationReservation({
        ...running,
        lease_token: null,
      }),
    ).toThrow(CoachEvaluationConfigurationError);
    expect(() =>
      parseCoachEvaluationReservation({
        ...running,
        lease_expires_at: new Date(Date.now() - 1_000).toISOString(),
      }),
    ).toThrow(CoachEvaluationConfigurationError);
    expect(() =>
      parseCoachEvaluationReservation({
        status: "busy",
      }),
    ).toThrow(CoachEvaluationConfigurationError);
  });

  it("fails closed on malformed completed feedback", () => {
    expect(() =>
      parseCoachEvaluationReservation({
        ...running,
        status: "completed",
        feedback: { score: 70 },
        model: "gpt-5.6-luna",
        lease_token: null,
        lease_expires_at: null,
      }),
    ).toThrow(CoachEvaluationConfigurationError);
  });

  it("fails closed when a completed cache has no persisted attempt", () => {
    expect(() =>
      parseCoachEvaluationReservation({
        ...running,
        status: "completed",
        attempt_id: null,
        feedback,
        model: "gpt-5.6-luna",
        lease_token: null,
        lease_expires_at: null,
      }),
    ).toThrow(CoachEvaluationConfigurationError);
  });

  it("fails closed when legacy feedback cannot be validated", () => {
    expect(() =>
      parseCoachEvaluationReservation({
        status: "legacy_cache_invalid",
      }),
    ).toThrow(CoachEvaluationConfigurationError);
  });
});

describe("coach evaluation request fingerprint", () => {
  it("is stable for the same request and changes with any payload field", () => {
    const first = coachEvaluationRequestFingerprint(identity);
    expect(coachEvaluationRequestFingerprint({ ...identity })).toBe(first);
    expect(
      coachEvaluationRequestFingerprint({
        ...identity,
        candidateAnswer: "Câu trả lời khác",
      }),
    ).not.toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("coach evaluation reservation RPCs", () => {
  it("reserves the exact request under one lease", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: running, error: null });
    const client = { rpc } as unknown as Parameters<
      typeof reserveCoachEvaluation
    >[0];

    await reserveCoachEvaluation(client, {
      idempotencyKey,
      requestFingerprint: fingerprint,
      identity,
    });

    expect(rpc).toHaveBeenCalledWith("reserve_coach_evaluation", {
      p_candidate_answer: identity.candidateAnswer,
      p_idempotency_key: idempotencyKey,
      p_lease_seconds: 600,
      p_question_id: identity.questionId,
      p_question_version: identity.questionVersion,
      p_request_fingerprint: fingerprint,
      p_source_revision: identity.sourceRevision,
    });
  });

  it("rejects a fingerprint forged for another request", async () => {
    const rpc = vi.fn();
    const client = { rpc } as unknown as Parameters<
      typeof reserveCoachEvaluation
    >[0];

    await expect(
      reserveCoachEvaluation(client, {
        idempotencyKey,
        requestFingerprint: "a".repeat(64),
        identity,
      }),
    ).rejects.toBeInstanceOf(CoachEvaluationConfigurationError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("atomically completes the lease with its terminal cache", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ...running,
        status: "completed",
        attempt_id: 42,
        feedback,
        model: "gpt-5.6-luna",
        lease_token: null,
        lease_expires_at: null,
      },
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof completeCoachEvaluation
    >[0];

    await completeCoachEvaluation(client, {
      idempotencyKey,
      requestFingerprint: fingerprint,
      leaseToken,
      identity,
      feedback,
      model: "gpt-5.6-luna",
    });

    expect(rpc).toHaveBeenCalledWith(
      "complete_coach_evaluation",
      expect.objectContaining({
        p_idempotency_key: idempotencyKey,
        p_request_fingerprint: fingerprint,
        p_lease_token: leaseToken,
        p_feedback: feedback,
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
      typeof markCoachEvaluationDispatched
    >[0];

    await expect(
      markCoachEvaluationDispatched(client, {
        idempotencyKey,
        leaseToken,
      }),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith(
      "mark_coach_evaluation_dispatched",
      {
        p_idempotency_key: idempotencyKey,
        p_lease_token: leaseToken,
      },
    );
  });

  it("releases only the matching lease after a provider failure", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "released" },
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof releaseCoachEvaluation
    >[0];

    await expect(
      releaseCoachEvaluation(client, { idempotencyKey, leaseToken }),
    ).resolves.toBe("released");
    expect(rpc).toHaveBeenCalledWith("release_coach_evaluation", {
      p_idempotency_key: idempotencyKey,
      p_lease_token: leaseToken,
    });
  });

  it("terminalizes an ambiguous provider outcome under the matching token", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: outcomeUnknown,
      error: null,
    });
    const client = { rpc } as unknown as Parameters<
      typeof markCoachEvaluationOutcomeUnknown
    >[0];

    await expect(
      markCoachEvaluationOutcomeUnknown(client, {
        idempotencyKey,
        leaseToken,
      }),
    ).resolves.toMatchObject({ status: "outcome_unknown" });
    expect(rpc).toHaveBeenCalledWith(
      "mark_coach_evaluation_outcome_unknown",
      {
        p_idempotency_key: idempotencyKey,
        p_lease_token: leaseToken,
      },
    );
  });
});
