import { describe, expect, it } from "vitest";

import {
  coachEvaluationIdempotencyKey,
  coachFollowUpCanonicalRequest,
  coachFollowUpIdempotencyKey,
} from "./coach-idempotency-client";

const identity = {
  questionId: "cpp11-copy-assignment-001",
  questionVersion: 2,
  sourceRevision: "a".repeat(64),
  candidateAnswer: "Một câu trả lời thử nghiệm",
};

describe("coachEvaluationIdempotencyKey", () => {
  it("derives the same UUID for the same logical evaluation", async () => {
    const first = await coachEvaluationIdempotencyKey(identity);
    const second = await coachEvaluationIdempotencyKey({ ...identity });

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it.each([
    ["questionId", "cpp11-copy-assignment-002"],
    ["questionVersion", 3],
    ["sourceRevision", "b".repeat(64)],
    ["candidateAnswer", "Một câu trả lời khác"],
  ] as const)("changes when %s changes", async (field, value) => {
    await expect(
      coachEvaluationIdempotencyKey({
        ...identity,
        [field]: value,
      }),
    ).resolves.not.toBe(
      await coachEvaluationIdempotencyKey(identity),
    );
  });
});

const followUpIdentity = {
  ...identity,
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

describe("coachFollowUpIdempotencyKey", () => {
  it("derives one UUID from the exact logical conversation request", async () => {
    const first = await coachFollowUpIdempotencyKey(followUpIdentity);
    const second = await coachFollowUpIdempotencyKey({
      ...followUpIdentity,
      feedback: {
        // Deliberately rebuild the object to prove insertion order is irrelevant.
        suggestedRating: followUpIdentity.feedback.suggestedRating,
        sourceSectionIds: [...followUpIdentity.feedback.sourceSectionIds],
        followUpQuestion: followUpIdentity.feedback.followUpQuestion,
        nextStep: followUpIdentity.feedback.nextStep,
        explanation: followUpIdentity.feedback.explanation,
        corrections: [...followUpIdentity.feedback.corrections],
        coverage: followUpIdentity.feedback.coverage.map((item) => ({
          feedback: item.feedback,
          status: item.status,
          criterion: item.criterion,
        })),
        strengths: [...followUpIdentity.feedback.strengths],
        summary: followUpIdentity.feedback.summary,
        verdict: followUpIdentity.feedback.verdict,
        score: followUpIdentity.feedback.score,
      },
      messages: followUpIdentity.messages.map((message) => ({ ...message })),
    });

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it.each([
    ["questionVersion", 3],
    ["sourceRevision", "c".repeat(64)],
    ["candidateAnswer", "Câu trả lời khác"],
    [
      "feedback",
      { ...followUpIdentity.feedback, score: 71 },
    ],
    [
      "messages",
      [{ role: "user" as const, content: "Một câu hỏi khác." }],
    ],
  ] as const)("changes when %s changes", async (field, value) => {
    await expect(
      coachFollowUpIdempotencyKey({
        ...followUpIdentity,
        [field]: value,
      }),
    ).resolves.not.toBe(
      await coachFollowUpIdempotencyKey(followUpIdentity),
    );
  });

  it("canonicalizes every contract field in a fixed order", () => {
    expect(
      JSON.parse(coachFollowUpCanonicalRequest(followUpIdentity)),
    ).toEqual(followUpIdentity);
  });
});
