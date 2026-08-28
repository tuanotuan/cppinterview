import { describe, expect, it } from "vitest";

import type { ContentQuestion } from "../content/schema";
import {
  buildLessonCheckLaunchHref,
  completeLessonCheckQuestion,
  lessonCheckQuestionIds,
  parseLessonCheckLaunch,
} from "./lesson-check";

const taxonomy = {
  deckId: "cpp-interview",
  standard: "cpp11",
  topics: ["toolchain"],
  skill: "recall",
  difficulty: "beginner",
  responseMode: "text",
  sourceLessonId: "cpp11-toolchain",
  tags: [
    "deck::cpp-interview",
    "standard::cpp11",
    "topic::toolchain",
    "skill::recall",
    "difficulty::beginner",
    "response::text",
    "source::cpp11-toolchain",
  ],
} satisfies ContentQuestion["taxonomy"];

describe("lesson check", () => {
  it("round-trips a safe one-time lesson check link", () => {
    const href = buildLessonCheckLaunchHref(
      "cpp-interview",
      "cpp11-toolchain",
    );
    const query = new URL(href, "https://cppinterview.test").searchParams;

    expect(href).toBe(
      "/practice?deck=cpp-interview&study=lesson-check&lesson=cpp11-toolchain",
    );
    expect(
      parseLessonCheckLaunch({
        study: query.get("study") ?? undefined,
        lesson: query.get("lesson") ?? undefined,
      }),
    ).toEqual({ lessonId: "cpp11-toolchain" });
  });

  it("rejects unknown modes and unsafe lesson identifiers", () => {
    expect(
      parseLessonCheckLaunch({
        study: "lesson",
        lesson: "cpp11-toolchain",
      }),
    ).toBeNull();
    expect(
      parseLessonCheckLaunch({
        study: "lesson-check",
        lesson: "../cpp11-toolchain",
      }),
    ).toBeNull();
  });

  it("selects every approved input question from the exact lesson", () => {
    expect(
      lessonCheckQuestionIds(
        [
          { id: "easy", taxonomy },
          {
            id: "medium",
            taxonomy: { ...taxonomy, difficulty: "intermediate" },
          },
          {
            id: "other-lesson",
            taxonomy: {
              ...taxonomy,
              sourceLessonId: "cpp11-other",
            },
          },
          {
            id: "hard",
            taxonomy: { ...taxonomy, difficulty: "advanced" },
          },
        ],
        "cpp11-toolchain",
      ),
    ).toEqual(["easy", "medium", "hard"]);
  });

  it("marks each checked question complete once", () => {
    const afterFirst = completeLessonCheckQuestion([], "easy");
    const afterDuplicate = completeLessonCheckQuestion(afterFirst, "easy");
    const completed = completeLessonCheckQuestion(afterDuplicate, "hard");

    expect(completed).toEqual(["easy", "hard"]);
  });
});
