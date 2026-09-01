import { describe, expect, it } from "vitest";

import manifestJson from "../../generated/content-manifest.json";
import {
  contentManifestSchema,
  type ContentQuestion,
} from "../content/schema";
import {
  buildKnowledgeCoverageAnalytics,
  COVERAGE_DIFFICULTIES,
  COVERAGE_STANDARDS,
  selectCanonicalCoverageQuestions,
} from "./coverage-analytics";
import { newQuestionLearningState } from "./learning-state";

const manifest = contentManifestSchema.parse(manifestJson);
const canonicalQuestions = manifest.questions.filter((question) =>
  COVERAGE_STANDARDS.includes(
    question.taxonomy.standard as (typeof COVERAGE_STANDARDS)[number],
  ),
);

describe("knowledge coverage analytics", () => {
  it("keeps the current C++11-C++23 curriculum denominator stable", () => {
    const analytics = buildKnowledgeCoverageAnalytics({
      questions: canonicalQuestions,
      states: [],
      reviews: [],
      today: "2026-09-01",
    });

    expect(analytics.summary).toMatchObject({
      total: 777,
      totalLessons: 259,
      covered: 0,
      unseen: 777,
    });
    expect(
      Object.fromEntries(
        analytics.standards.map((standard) => [
          standard.standard,
          standard.total,
        ]),
      ),
    ).toEqual({ cpp11: 159, cpp14: 150, cpp17: 150, cpp20: 156, cpp23: 162 });
    expect(
      Object.fromEntries(
        analytics.difficulties.map((difficulty) => [
          difficulty.difficulty,
          difficulty.total,
        ]),
      ),
    ).toEqual({ beginner: 259, intermediate: 259, advanced: 259 });
  });

  it("uses repo-owned slots and excludes additional database questions", () => {
    const extraQuestion = {
      ...canonicalQuestions[0],
      id: "database-extra-question",
    } satisfies ContentQuestion;
    const selected = selectCanonicalCoverageQuestions({
      repoQuestions: manifest.questions,
      currentQuestions: [...manifest.questions, extraQuestion],
      deck: "cpp-interview",
    });

    expect(selected).toHaveLength(777);
    expect(selected.map((question) => question.id)).not.toContain(
      extraQuestion.id,
    );
  });

  it("separates current coverage, durable recall and due cards", () => {
    const questions = canonicalQuestions.slice(0, 4);
    const states = questions.map((question) =>
      newQuestionLearningState({
        questionId: question.id,
        questionVersion: question.version,
        sourceHash: question.sourceHash,
      }),
    );
    states[0] = {
      ...states[0],
      state: "learning",
      dueOn: "2026-09-01",
      intervalDays: 2,
      reviewCount: 1,
      lastRating: "hard",
      lastReviewedOn: "2026-08-30",
    };
    states[1] = {
      ...states[1],
      state: "review",
      dueOn: "2026-09-20",
      intervalDays: 24,
      reviewCount: 4,
      lastRating: "good",
      lastReviewedOn: "2026-08-27",
    };

    const analytics = buildKnowledgeCoverageAnalytics({
      questions,
      states,
      reviews: [
        {
          questionId: questions[0].id,
          reviewedOn: "2026-08-30",
          rating: "hard",
          nextDueOn: "2026-09-01",
        },
        {
          questionId: questions[1].id,
          reviewedOn: "2026-09-01",
          rating: "good",
          nextDueOn: "2026-09-20",
        },
      ],
      today: "2026-09-01",
    });

    expect(analytics.summary).toMatchObject({
      total: 4,
      covered: 2,
      learning: 1,
      retained: 1,
      unseen: 2,
      due: 1,
      coveragePercent: 50,
      retainedPercent: 25,
      totalReviews: 2,
      reviewedToday: 1,
    });
  });

  it("does not count stale content revisions as current coverage", () => {
    const question = canonicalQuestions[0];
    const stale = {
      ...newQuestionLearningState({
        questionId: question.id,
        questionVersion: question.version,
        sourceHash: question.sourceHash,
      }),
      state: "review" as const,
      intervalDays: 40,
      reviewCount: 5,
      contentChanged: true,
    };

    const analytics = buildKnowledgeCoverageAnalytics({
      questions: [question],
      states: [stale],
      reviews: [],
      today: "2026-09-01",
    });

    expect(analytics.summary).toMatchObject({
      covered: 0,
      retained: 0,
      unseen: 1,
    });
  });

  it("deduplicates question IDs and topic tags before aggregating", () => {
    const question = {
      ...canonicalQuestions[0],
      taxonomy: {
        ...canonicalQuestions[0].taxonomy,
        topics: ["lifetime", "lifetime"],
      },
    } satisfies ContentQuestion;

    const analytics = buildKnowledgeCoverageAnalytics({
      questions: [question, question],
      states: [],
      reviews: [],
      today: "2026-09-01",
    });

    expect(analytics.summary.total).toBe(1);
    expect(analytics.topics).toEqual([
      expect.objectContaining({ topic: "lifetime", total: 1 }),
    ]);
  });

  it("always exposes every standard and difficulty bucket", () => {
    const analytics = buildKnowledgeCoverageAnalytics({
      questions: [],
      states: [],
      reviews: [],
      today: "2026-09-01",
    });

    expect(analytics.standards.map((item) => item.standard)).toEqual(
      COVERAGE_STANDARDS,
    );
    expect(analytics.difficulties.map((item) => item.difficulty)).toEqual(
      COVERAGE_DIFFICULTIES,
    );
  });
});
