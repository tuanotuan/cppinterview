import { describe, expect, it } from "vitest";

import type { ContentQuestion } from "../content/schema";
import {
  buildLessonCheckLaunchHref,
  completeLessonCheckQuestion,
  findLessonCheckLesson,
  lessonCheckQuestionIds,
  parseLessonCheckLaunch,
} from "./lesson-check";

const lessonQuestion = (id: string, lessonId = "cpp11-toolchain") => ({
  id,
  lessonId,
}) satisfies Pick<ContentQuestion, "id" | "lessonId">;

describe("lesson check", () => {
  it("round-trips a safe one-time lesson check link", () => {
    const href = buildLessonCheckLaunchHref(
      "cpp-interview",
      "cpp11-toolchain",
    );
    const query = new URL(href, "https://cppinterview.test").searchParams;

    expect(href).toBe(
      "/practice?deck=cpp-interview&study=lesson-check&lesson=cpp11-toolchain&restart=1",
    );
    expect(
      parseLessonCheckLaunch({
        study: query.get("study") ?? undefined,
        lesson: query.get("lesson") ?? undefined,
        restart: query.get("restart") ?? undefined,
      }),
    ).toEqual({ lessonId: "cpp11-toolchain", restart: true });
  });

  it("resumes a direct lesson-check URL after its restart marker is consumed", () => {
    expect(
      parseLessonCheckLaunch({
        study: "lesson-check",
        lesson: "cpp11-toolchain",
      }),
    ).toEqual({ lessonId: "cpp11-toolchain", restart: false });
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
    expect(
      parseLessonCheckLaunch({
        study: "lesson-check",
        lesson: "cpp11-toolchain",
        restart: "yes",
      }),
    ).toBeNull();
  });

  it("selects only the three available Git-owned questions in canonical order", () => {
    expect(
      lessonCheckQuestionIds(
        [
          lessonQuestion("hard"),
          lessonQuestion("database-generated"),
          lessonQuestion("easy"),
          lessonQuestion("medium"),
          lessonQuestion("other-lesson", "cpp11-other"),
        ],
        [
          lessonQuestion("easy"),
          lessonQuestion("medium"),
          lessonQuestion("hard"),
          lessonQuestion("retired-but-still-current"),
          lessonQuestion("other-lesson", "cpp11-other"),
        ],
        "cpp11-toolchain",
      ),
    ).toEqual(["easy", "medium", "hard"]);
  });

  it("uses the repository lesson when the DB snapshot has not synced it yet", () => {
    expect(
      findLessonCheckLesson(
        [{ id: "cpp17-example", title: "C++17" }],
        [{ id: "cpp23-example", title: "C++23" }],
        "cpp23-example",
      ),
    ).toEqual({ id: "cpp23-example", title: "C++23" });
  });

  it("marks each checked question complete once", () => {
    const afterFirst = completeLessonCheckQuestion([], "easy");
    const afterDuplicate = completeLessonCheckQuestion(afterFirst, "easy");
    const completed = completeLessonCheckQuestion(afterDuplicate, "hard");

    expect(completed).toEqual(["easy", "hard"]);
  });
});
