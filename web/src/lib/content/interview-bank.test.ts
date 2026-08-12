import { describe, expect, it } from "vitest";

import {
  INTERVIEW_QUESTION_BANK_TARGET,
  planDraftCategories,
  questionVerificationGaps,
  resolveInterviewQuestionCategory,
  summarizeInterviewQuestionBank,
} from "./interview-bank";

const taxonomy = {
  deckId: "cpp-interview" as const,
  standard: "cpp20" as const,
  topics: ["lifetime"],
  skill: "pitfall" as const,
  difficulty: "advanced" as const,
  responseMode: "text" as const,
  sourceLessonId: "cpp11-lifetime",
  tags: [
    "deck::cpp-interview",
    "standard::cpp20",
    "topic::lifetime",
    "skill::pitfall",
    "difficulty::advanced",
    "response::text",
    "source::cpp11-lifetime",
  ],
};

const baseQuestion = {
  type: "pitfall" as const,
  responseMode: "text" as const,
  taxonomy,
  sources: [{ sectionId: "lifetime" }],
  rubric: { required: ["Explains lifetime"], bonus: [], misconceptions: [] },
  answer: { short: "A short reference answer", detailed: "A detailed reference answer." },
  status: "verified" as const,
};

describe("interview question bank", () => {
  it("keeps the requested six-bucket target at 300", () => {
    expect(INTERVIEW_QUESTION_BANK_TARGET).toBe(300);
  });

  it("classifies legacy questions deterministically without rewriting them", () => {
    expect(resolveInterviewQuestionCategory(baseQuestion)).toBe("code_reading_ub");
    expect(
      resolveInterviewQuestionCategory({
        ...baseQuestion,
        type: "recall",
      }),
    ).toBe("language_knowledge");
    expect(
      resolveInterviewQuestionCategory({
        ...baseQuestion,
        responseMode: "code",
      }),
    ).toBe("coding");
  });

  it("does not treat a code question as verified-ready without both test suites", () => {
    const missing = questionVerificationGaps({
      ...baseQuestion,
      responseMode: "code",
    });
    expect(missing).toContain("thiếu test suite phía máy chủ");

    expect(
      questionVerificationGaps({
        ...baseQuestion,
        responseMode: "code",
        codeTestSuite: {
          specRevision: 1,
          publicTestCount: 2,
          hiddenTestCount: 3,
        },
      }),
    ).toEqual([]);
  });

  it("counts only reviewed, contract-complete questions toward the target", () => {
    const summary = summarizeInterviewQuestionBank([
      baseQuestion,
      { ...baseQuestion, status: "draft" as const },
      {
        ...baseQuestion,
        responseMode: "code" as const,
        interviewCategory: "coding" as const,
      },
    ]);
    expect(summary.verified).toBe(1);
    expect(summary.draft).toBe(1);
    expect(summary.categories.find((item) => item.category === "coding")?.verified).toBe(0);
  });

  it("prioritizes the largest remaining bank gaps for future AI drafts", () => {
    expect(planDraftCategories({ questions: [baseQuestion], count: 2 })).toEqual([
      "language_knowledge",
      "code_reading_ub",
    ]);
  });
});
