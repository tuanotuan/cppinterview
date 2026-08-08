import { describe, expect, it } from "vitest";

import { parseStudySession, serializeStudySession } from "./study-session";

const identity = {
  id: "cpp20-designated-initializers-001",
  version: 2,
  sourceHash: "source-v2",
};

describe("study session persistence", () => {
  it("restores a valid session for the exact question source", () => {
    const raw = serializeStudySession(
      {
        [identity.id]: {
          questionVersion: identity.version,
          sourceHash: identity.sourceHash,
          answer: "Aggregate initialization follows declaration order.",
          codeAnswer: "class RiskConfig {};",
          confidencePercent: 80,
          revealed: true,
          answerRevealUsed: true,
          hintUsed: true,
          coachFeedbackUsed: true,
          sourceVisible: true,
          rescueRetry: {
            phase: "needs_repair",
            attempts: 2,
            repairRating: "hard",
          },
          followUpChat: [
            { role: "user", content: "Why does declaration order matter?" },
          ],
          deepDiveOpen: true,
          deepDiveAnswer: "auto drops the top-level const during deduction.",
          questionClarification: {
            plainLanguage: "Đề yêu cầu phân tích cách suy luận kiểu dữ liệu.",
            whatToAddress: ["Nêu phần đề đang hỏi."],
            terms: [
              {
                term: "type deduction",
                meaning: "Quy tắc suy luận kiểu của trình biên dịch.",
              },
            ],
            scopeNote: "Chỉ cần bám theo dữ kiện đã cho.",
          },
          questionClarificationModel: "gpt-5.6-luna",
        },
      },
      identity.id,
    );

    const restored = parseStudySession(raw, [identity]);
    expect(restored.activeQuestionId).toBe(identity.id);
    expect(restored.questions[identity.id]).toMatchObject({
      answer: "Aggregate initialization follows declaration order.",
      codeAnswer: "class RiskConfig {};",
      confidencePercent: 80,
      revealed: true,
      answerRevealUsed: true,
      hintUsed: true,
      coachFeedbackUsed: true,
      sourceVisible: true,
      rescueRetry: {
        phase: "needs_repair",
        attempts: 2,
        repairRating: "hard",
      },
      deepDiveOpen: true,
      deepDiveAnswer: "auto drops the top-level const during deduction.",
      questionClarification: {
        plainLanguage: "Đề yêu cầu phân tích cách suy luận kiểu dữ liệu.",
        whatToAddress: ["Nêu phần đề đang hỏi."],
        terms: [
          {
            term: "type deduction",
            meaning: "Quy tắc suy luận kiểu của trình biên dịch.",
          },
        ],
        scopeNote: "Chỉ cần bám theo dữ kiện đã cho.",
      },
      questionClarificationModel: "gpt-5.6-luna",
    });
  });

  it("drops stale sessions after a question source change", () => {
    const raw = serializeStudySession({
      [identity.id]: {
        questionVersion: identity.version,
        sourceHash: "old-source",
        answer: "Stale answer",
      },
    });

    expect(parseStudySession(raw, [identity]).questions).toEqual({});
  });

  it("round-trips answers without a product character limit", () => {
    const answer = "a".repeat(7000);
    const codeAnswer = "c".repeat(8000);
    const deepDiveAnswer = "d".repeat(9000);
    const raw = serializeStudySession({
      [identity.id]: {
        questionVersion: identity.version,
        sourceHash: identity.sourceHash,
        answer,
        codeAnswer,
        coachAnswer: answer,
        deepDiveAnswer,
      },
    });

    expect(parseStudySession(raw, [identity]).questions[identity.id]).toMatchObject({
      answer,
      codeAnswer,
      coachAnswer: answer,
      deepDiveAnswer,
    });
  });

  it.each([
    { phase: "rescue", attempts: 0 },
    { phase: "retrying", attempts: 1 },
    { phase: "passed", attempts: 2, reviewRating: "good" },
    {
      phase: "needs_repair",
      attempts: 3,
      repairRating: "again",
    },
  ] as const)("round-trips Rescue → Retry phase $phase", (rescueRetry) => {
    const raw = serializeStudySession({
      [identity.id]: {
        questionVersion: identity.version,
        sourceHash: identity.sourceHash,
        answer: rescueRetry.phase === "retrying" ? "Draft in progress" : "",
        coachAnswer: "",
        rescueRetry,
      },
    });

    expect(
      parseStudySession(raw, [identity]).questions[identity.id],
    ).toMatchObject({
      coachAnswer: "",
      rescueRetry,
    });
  });

  it("recovers safely from malformed browser storage", () => {
    expect(parseStudySession("not-json", [identity]).questions).toEqual({});
    expect(parseStudySession('{"version":99}', [identity]).questions).toEqual({});
  });

  it("drops an active question that no longer exists", () => {
    const raw = serializeStudySession({}, "removed-question");
    expect(parseStudySession(raw, [identity]).activeQuestionId).toBeUndefined();
  });
});
