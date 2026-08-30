import manifestJson from "../../generated/content-manifest.json";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { parseLessonCheckLaunch } from "../practice/lesson-check";
import {
  buildLessonLibrary,
  findLesson,
  lessonMatchesStandard,
  lessonPracticeHref,
  lessonSectionLabel,
  lessonStandardFilters,
  lessonStandardIsAvailable,
  lessonTrackLabel,
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
    expect(
      items.every(
        (lesson) =>
          !("prerequisiteIds" in lesson) &&
          !("sectionCount" in lesson) &&
          !("checklistCount" in lesson),
      ),
    ).toBe(true);
  });

  it("resolves every registered prerequisite", () => {
    expect(unresolvedLessonPrerequisites(manifest)).toEqual([]);
  });

  it("returns null for an unknown lesson", () => {
    expect(findLesson(manifest, "missing-lesson")).toBeNull();
  });

  it("renders every section heading with exactly one ordinal", () => {
    expect(lessonSectionLabel("1. Vấn đề nó giải quyết", 1)).toBe(
      "1. Vấn đề nó giải quyết",
    );
    expect(lessonSectionLabel("2. 2. Kiến thức cần có", 2)).toBe(
      "2. Kiến thức cần có",
    );
    expect(lessonSectionLabel("Scope and lifetime", 3)).toBe(
      "3. Scope and lifetime",
    );
  });

  it("builds an exact lesson practice link that round-trips safely", () => {
    const lesson = manifest.lessons.find(
      (item) => item.id === "cpp11-const-pointer-lvalue-reference",
    )!;
    const href = lessonPracticeHref(lesson);
    const query = new URL(href, "https://recall.local").searchParams;

    expect(
      parseLessonCheckLaunch({
        study: query.get("study") ?? undefined,
        lesson: query.get("lesson") ?? undefined,
        restart: query.get("restart") ?? undefined,
      }),
    ).toEqual({
      lessonId: lesson.id,
      restart: true,
    });
  });

  it("presents every C++ standard as a separate filter", () => {
    expect(lessonStandardFilters.map(({ label }) => label)).toEqual([
      "C++98",
      "C++11",
      "C++14",
      "C++17",
      "C++20",
      "C++23",
    ]);
    expect(lessonTrackLabel("cpp11")).toBe("C++11");
    expect(lessonTrackLabel("cpp14")).toBe("C++14");
    expect(lessonTrackLabel("cpp17")).toBe("C++17");
    expect(lessonTrackLabel("cpp20")).toBe("C++20");
  });

  it("exposes only implemented roadmap routes", () => {
    expect(
      lessonStandardFilters.map(({ value, roadmapHref }) => ({
        value,
        roadmapHref,
      })),
    ).toEqual([
      { value: "cpp98", roadmapHref: null },
      { value: "cpp11", roadmapHref: "/learn/roadmap/cpp11" },
      { value: "cpp14", roadmapHref: "/learn/roadmap/cpp14" },
      { value: "cpp17", roadmapHref: "/learn/roadmap/cpp17" },
      { value: "cpp20", roadmapHref: "/learn/roadmap/cpp20" },
      { value: "cpp23", roadmapHref: null },
    ]);
  });

  it("only enables standards backed by catalog content", () => {
    const lessons = buildLessonLibrary(manifest);

    expect(lessonStandardIsAvailable(lessons, "cpp98")).toBe(true);
    expect(lessonStandardIsAvailable(lessons, "cpp11")).toBe(true);
    expect(lessonStandardIsAvailable(lessons, "cpp14")).toBe(true);
    expect(lessonStandardIsAvailable(lessons, "cpp17")).toBe(true);
    expect(lessonStandardIsAvailable(lessons, "cpp20")).toBe(true);
    expect(lessonStandardIsAvailable(lessons, "cpp23")).toBe(false);
    expect(lessonMatchesStandard("cpp11", "cpp14")).toBe(false);
  });
});
