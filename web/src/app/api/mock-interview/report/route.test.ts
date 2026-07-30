import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateOpenAi: vi.fn(),
  evaluateGemini: vi.fn(),
  reserveAttempt: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return {
    ...actual,
    evaluateMockInterviewWithOpenAI: mocks.evaluateOpenAi,
  };
});
vi.mock("@/lib/ai/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gemini")>();
  return {
    ...actual,
    evaluateMockInterviewWithGemini: mocks.evaluateGemini,
  };
});
vi.mock("@/lib/mock-interview/history.server", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/mock-interview/history.server")
  >();
  return {
    ...actual,
    reserveMockInterviewAttempt: mocks.reserveAttempt,
  };
});

import {
  WORLDQUANT_MOCK_SETS,
  WORLDQUANT_PROFILE_VERSION,
  WORLDQUANT_ROLE_QUESTIONS,
} from "@/lib/mock-interview/profile";

import { POST } from "./route";

describe("POST /api/mock-interview/report", () => {
  it("rejects a valid legacy request before reserving or calling AI", async () => {
    const mockSet = WORLDQUANT_MOCK_SETS[0];
    const questionById = new Map(
      WORLDQUANT_ROLE_QUESTIONS.map((question) => [question.id, question]),
    );
    const response = await POST(
      new Request("http://localhost/api/mock-interview/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": crypto.randomUUID(),
        },
        body: JSON.stringify({
          idempotencyKey: "23966699-ebc3-4b74-9a16-0ca48f4a47c7",
          sessionId: "9f58ceae-6ce7-4d56-bf6e-2be2256cc063",
          profileId: "worldquant-tick-data-engineer",
          profileVersion: WORLDQUANT_PROFILE_VERSION,
          setId: mockSet.id,
          setVersion: mockSet.version,
          sourceRevision: "a".repeat(40),
          durationMinutes: mockSet.durationMinutes,
          elapsedSeconds: 60,
          items: mockSet.questionIds.map((questionId) => {
            const question = questionById.get(questionId)!;
            return {
              questionId,
              origin: question.origin,
              version: question.version,
              contentRevision: question.contentRevision,
              response: "A candidate answer.",
              explanation: "The relevant engineering trade-offs.",
              elapsedSeconds: 30,
            };
          }),
        }),
      }),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      code: "legacy_report_unsupported",
    });
    expect(mocks.reserveAttempt).not.toHaveBeenCalled();
    expect(mocks.evaluateOpenAi).not.toHaveBeenCalled();
    expect(mocks.evaluateGemini).not.toHaveBeenCalled();
  });
});
