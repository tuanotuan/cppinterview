import { describe, expect, it, vi } from "vitest";

import {
  hydrateStudySession,
  parseStudySession,
  serializeStudySession,
} from "./study-session";

const identity = {
  id: "cpp20-designated-initializers-001",
  version: 2,
  sourceHash: "source-v2",
};

describe("study session persistence", () => {
  it("starts a requested fresh run without restoring its previous attempt", () => {
    const previousAttempt = serializeStudySession(
      {
        [identity.id]: {
          questionVersion: identity.version,
          sourceHash: identity.sourceHash,
          answer: "Answer from the previous run",
          revealed: true,
          hintUsed: true,
          coachIdempotencyKey: "22222222-2222-8222-8222-222222222222",
          deepDiveOpen: true,
          deepDiveAnswer: "Previous follow-up answer",
        },
      },
      identity.id,
    );
    const storage = {
      getItem: vi.fn(() => previousAttempt),
      removeItem: vi.fn(),
    };

    expect(
      hydrateStudySession(storage, "lesson-check-key", [identity], {
        reset: true,
      }),
    ).toEqual({ version: 1, questions: {} });
    expect(storage.removeItem).toHaveBeenCalledWith("lesson-check-key");
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("keeps resuming ordinary study sessions", () => {
    const previousAttempt = serializeStudySession({
      [identity.id]: {
        questionVersion: identity.version,
        sourceHash: identity.sourceHash,
        answer: "Resume this answer",
      },
    });
    const storage = {
      getItem: vi.fn(() => previousAttempt),
      removeItem: vi.fn(),
    };

    expect(
      hydrateStudySession(storage, "ordinary-session-key", [identity], {
        reset: false,
      }).questions[identity.id]?.answer,
    ).toBe("Resume this answer");
    expect(storage.getItem).toHaveBeenCalledWith("ordinary-session-key");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

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
