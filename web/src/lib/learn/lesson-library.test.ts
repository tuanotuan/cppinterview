import manifestJson from "../../generated/content-manifest.json";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { parseCustomStudyLaunch } from "../practice/custom-study";
import {
  buildLessonLibrary,
  findLesson,
  lessonPracticeHref,
  unresolvedLessonPrerequisites,
} from "./lesson-library";

const manifest = contentManifestSchema.parse(manifestJson);

describe("lesson library", () => {
  it("builds a stable ordered catalog without exposing draft questions", () => {
    const items = buildLessonLibrary(manifest);
    const verifiedCount = manifest.questions.filter(
      (question) => question.status === "verified",
    ).length;

    expect(items).toHaveLength(manifest.lessons.length);
    expect(
      items.reduce(
        (sum, lesson) => sum + lesson.verifiedQuestionCount,
        0,
      ),
    ).toBe(verifiedCount);
    expect(items.some((lesson) => lesson.hasCode)).toBe(true);
  });

  it("resolves every registered prerequisite", () => {
    expect(unresolvedLessonPrerequisites(manifest)).toEqual([]);
  });

  it("returns null for an unknown lesson", () => {
    expect(findLesson(manifest, "missing-lesson")).toBeNull();
  });

  it("builds an exact lesson practice link that round-trips safely", () => {
    const lesson = manifest.lessons.find(
      (item) => item.id === "cpp11-auto",
    )!;
    const href = lessonPracticeHref(lesson);
    const query = new URL(href, "https://recall.local").searchParams;

    expect(
      parseCustomStudyLaunch({
        study: query.get("study") ?? undefined,
        lesson: query.get("lesson") ?? undefined,
        limit: query.get("limit") ?? undefined,
      }),
    ).toMatchObject({
      lessonId: lesson.id,
      topic: "all",
      limit: 20,
    });
  });
});
