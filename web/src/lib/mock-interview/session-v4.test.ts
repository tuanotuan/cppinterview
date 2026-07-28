import { describe, expect, it } from "vitest";

import { WORLDQUANT_CURATED_CATALOG } from "./catalog";
import {
  advanceMockInterviewSessionV4,
  createMockInterviewSessionV4,
  mockInterviewSessionMatchesGuidedRequest,
  mockInterviewStorageKey,
  parseMockInterviewSessionV4,
  serializeMockInterviewSessionV4,
} from "./session-v4";
import { buildWorldQuantTargetedMockPlan } from "./target-plan";

describe("mock interview session v4", () => {
  const plan = buildWorldQuantTargetedMockPlan({
    profileId: "tick-data-platform",
    mode: "balanced",
    variant: 1,
    durationMinutes: 30,
    candidates: WORLDQUANT_CURATED_CATALOG.map((question) => ({
      readinessCompetency: question.readinessCompetency,
      question: {
        id: question.id,
        origin: question.origin,
        version: question.version,
        contentRevision: question.contentRevision,
        estimatedMinutes: question.estimatedMinutes,
        responseMode: question.responseMode,
        language: question.language,
        track: question.track,
        execution: question.execution,
      },
    })),
  });

  it("creates an account-scoped exact-plan session", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId,
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(mockInterviewStorageKey(accountId)).toContain(accountId);
    expect(session.questions).toEqual(
      plan.questions.map((candidate) => ({
        ...candidate.question,
        readinessCompetency: candidate.readinessCompetency,
      })),
    );
    expect(
      parseMockInterviewSessionV4(
        serializeMockInterviewSessionV4(session),
      ),
    ).toEqual(session);
  });

  it("increments the optimistic session revision", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const next = advanceMockInterviewSessionV4(session, {
      currentIndex: 1,
    });

    expect(next.sessionRevision).toBe(session.sessionRevision + 1);
    expect(next.currentIndex).toBe(1);
  });

  it("rejects state for a question outside the immutable plan", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    expect(
      parseMockInterviewSessionV4(
        JSON.stringify({
          ...session,
          answers: {
            ...session.answers,
            "worldquant-not-in-plan": {
              response: "tampered",
              explanation: "",
            },
          },
        }),
      ),
    ).toBeNull();
  });

  it("persists one exact frozen submission while a report is retryable", () => {
    const session = createMockInterviewSessionV4({
      sessionId: "22222222-2222-4222-8222-222222222222",
      accountId: "11111111-1111-4111-8111-111111111111",
      sourceRevision: "a".repeat(64),
      plan,
      catalog: WORLDQUANT_CURATED_CATALOG,
      startedAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    const idempotencyKey =
      "33333333-3333-4333-8333-333333333333";
    const pendingReportRequest = {
      schemaVersion: 4 as const,
      idempotencyKey,
      sessionId: session.sessionId,
      profileId: session.profileId,
      profileVersion: session.profileVersion,
      sourceRevision: session.sourceRevision,
      startedAt: session.startedAt,
      submittedAt: "2026-07-30T00:30:00.000Z",
      plan: session.plan,
      elapsedSeconds: 1800,
      items: session.plan.questions.map((candidate) => ({
        question: candidate,
        response: "Frozen answer",
        explanation: "",
        elapsedSeconds: 60,
      })),
    };
    const evaluating = {
      ...session,
      status: "evaluating" as const,
      reportIdempotencyKey: idempotencyKey,
      pendingReportRequest,
    };

    expect(
      parseMockInterviewSessionV4(
        serializeMockInterviewSessionV4(evaluating),
      )?.pendingReportRequest,
    ).toEqual(pendingReportRequest);
    expect(
      parseMockInterviewSessionV4(
        JSON.stringify({
          ...evaluating,
          pendingReportRequest: undefined,
        }),
      ),
    ).toBeNull();
  });

  it("only returns a completed guided mock to the Mission for today", () => {
    const request = {
      profileId: "tick-data-platform" as const,
      durationMinutes: 30 as const,
      mode: "balanced" as const,
      targetCompetency: null,
      today: "2026-07-28",
    };
    const completedSession = {
      profileId: request.profileId,
      status: "completed" as const,
      completedAt: "2026-07-27T17:00:00.000Z",
      plan: {
        durationMinutes: request.durationMinutes,
        mode: request.mode,
        targetCompetency: request.targetCompetency,
      },
    };

    expect(
      mockInterviewSessionMatchesGuidedRequest({
        session: completedSession,
        request,
      }),
    ).toBe(true);
    expect(
      mockInterviewSessionMatchesGuidedRequest({
        session: {
          ...completedSession,
          completedAt: "2026-07-27T16:59:59.000Z",
        },
        request,
      }),
    ).toBe(false);
  });
});
