import { describe, expect, it } from "vitest";

import type { ContentQuestion } from "../content/schema";
import { newQuestionLearningState } from "./learning-state";
import {
  buildCustomStudyLaunchHref,
  buildCustomStudyQueue,
  parseCustomStudyLaunch,
} from "./custom-study";

const taxonomy = {
  deckId: "cpp-interview",
  standard: "cpp11",
  topics: ["lambda"],
  skill: "recall",
  difficulty: "intermediate",
  responseMode: "text",
  sourceLessonId: "cpp11-lambda",
  tags: [
    "deck::cpp-interview",
    "standard::cpp11",
    "topic::lambda",
    "skill::recall",
    "difficulty::intermediate",
    "response::text",
    "source::cpp11-lambda",
  ],
} satisfies ContentQuestion["taxonomy"];

describe("custom study", () => {
  it("round-trips safe launch links from analytics", () => {
    expect(
      buildCustomStudyLaunchHref("cpp-interview", {
        kind: "topic",
        topic: "move-semantics",
        limit: 50,
      }),
    ).toBe("/practice?deck=cpp-interview&study=topic&topic=move-semantics&limit=20");
    expect(
      parseCustomStudyLaunch({
        study: "topic",
        topic: "move-semantics",
        limit: "20",
      }),
    ).toEqual({
      learningState: "all",
      standard: "all",
      difficulty: "all",
      skill: "all",
      topic: "move-semantics",
      lessonId: "all",
      limit: 20,
    });
    expect(
      parseCustomStudyLaunch({ study: "due", limit: "not-a-number" }),
    ).toMatchObject({ learningState: "due", limit: 10 });
  });

  it("round-trips a validated coverage launch", () => {
    expect(
      buildCustomStudyLaunchHref("cpp-interview", {
        kind: "coverage",
        learningState: "new",
        standard: "cpp20",
        difficulty: "advanced",
        topic: "concurrency",
        limit: 12,
      }),
    ).toBe(
      "/practice?deck=cpp-interview&study=coverage&state=new&standard=cpp20&difficulty=advanced&topic=concurrency&limit=12",
    );
    expect(
      parseCustomStudyLaunch({
        study: "coverage",
        state: "new",
        standard: "cpp20",
        difficulty: "advanced",
        topic: "concurrency",
        limit: "12",
      }),
    ).toEqual({
      learningState: "new",
      standard: "cpp20",
      difficulty: "advanced",
      skill: "all",
      topic: "concurrency",
      lessonId: "all",
      limit: 12,
    });
  });

  it("rejects unknown presets and unsafe topic values", () => {
    expect(parseCustomStudyLaunch({ study: "unknown" })).toBeNull();
    expect(
      parseCustomStudyLaunch({
        study: "topic",
        topic: "../../another-page",
      }),
    ).toBeNull();
    expect(parseCustomStudyLaunch({ study: "topic" })).toBeNull();
    expect(
      parseCustomStudyLaunch({
        study: "lesson",
        lesson: "../cpp11-lambda",
      }),
    ).toBeNull();
    expect(
      parseCustomStudyLaunch({
        study: "coverage",
        state: "new",
        standard: "cpp26",
      }),
    ).toBeNull();
    expect(
      parseCustomStudyLaunch({
        study: "coverage",
        state: "new",
        difficulty: "expert",
      }),
    ).toBeNull();
    expect(
      parseCustomStudyLaunch({
        study: "coverage",
        state: "new",
        topic: "../../another-page",
      }),
    ).toBeNull();
  });

  it("filters by taxonomy and learning state without selecting suspended cards", () => {
    const questions = ["new-one", "new-two", "review-one"].map((id) => ({
      id,
      taxonomy,
    }));
    const states = new Map(
      questions.map((question) => [
        question.id,
        newQuestionLearningState({
          questionId: question.id,
          questionVersion: 1,
          sourceHash: "a".repeat(64),
        }),
      ]),
    );
    states.set("new-two", { ...states.get("new-two")!, suspended: true });
    states.set("review-one", {
      ...states.get("review-one")!,
      state: "review",
      dueOn: "2026-07-21",
      intervalDays: 4,
      reviewCount: 1,
      lastRating: "good",
      lastReviewedOn: "2026-07-17",
    });

    expect(
      buildCustomStudyQueue(questions, states, "2026-07-21", {
        learningState: "new",
        standard: "cpp11",
        difficulty: "intermediate",
        skill: "recall",
        topic: "lambda",
        lessonId: "all",
        limit: 10,
      }),
    ).toEqual(["new-one"]);
    expect(
      buildCustomStudyQueue(questions, states, "2026-07-21", {
        learningState: "due",
        standard: "all",
        difficulty: "all",
        skill: "all",
        topic: "all",
        lessonId: "all",
        limit: 10,
      }),
    ).toEqual(["review-one"]);
  });

  it("treats changed content as unseen and honors a canonical question allow-list", () => {
    const questions = ["changed", "repo-new", "remote-extra"].map((id) => ({
      id,
      taxonomy,
    }));
    const states = new Map(
      questions.map((question) => [
        question.id,
        newQuestionLearningState({
          questionId: question.id,
          questionVersion: 1,
          sourceHash: "c".repeat(64),
        }),
      ]),
    );
    states.set("changed", {
      ...states.get("changed")!,
      state: "learning",
      contentChanged: true,
    });

    expect(
      buildCustomStudyQueue(
        questions,
        states,
        "2026-07-21",
        {
          learningState: "new",
          standard: "all",
          difficulty: "all",
          skill: "all",
          topic: "all",
          lessonId: "all",
          limit: 20,
        },
        new Set(["changed", "repo-new"]),
      ).sort(),
    ).toEqual(["changed", "repo-new"]);
  });

  it("limits a lesson launch to the exact source lesson", () => {
    const questions = [
      { id: "target", taxonomy },
      {
        id: "other",
        taxonomy: {
          ...taxonomy,
          sourceLessonId: "cpp11-other",
        },
      },
    ];
    const states = new Map(
      questions.map((question) => [
        question.id,
        newQuestionLearningState({
          questionId: question.id,
          questionVersion: 1,
          sourceHash: "b".repeat(64),
        }),
      ]),
    );

    expect(
      buildCustomStudyQueue(questions, states, "2026-07-21", {
        learningState: "all",
        standard: "all",
        difficulty: "all",
        skill: "all",
        topic: "all",
        lessonId: "cpp11-lambda",
        limit: 20,
      }),
    ).toEqual(["target"]);
  });
});
