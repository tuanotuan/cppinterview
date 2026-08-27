import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";
import {
  contentTranslationCoverage,
  hasExactLessonTranslation,
  hasExactQuestionTranslation,
  localizeContentManifest,
} from "./translations";

describe("content translations", () => {
  const manifest = contentManifestSchema.parse(manifestJson);

  it("changes display copy without changing stable learning identity", () => {
    const source = manifest;
    const localized = localizeContentManifest(source, "en");
    const sourceQuestion = source.questions.find(
      (question) => question.id === "cpp20-designated-initializers-001",
    )!;
    const translatedQuestion = localized.questions.find(
      (question) => question.id === sourceQuestion.id,
    )!;

    expect(translatedQuestion.prompt).toContain("valid");
    expect(translatedQuestion.prompt).not.toBe(sourceQuestion.prompt);
    expect({
      id: translatedQuestion.id,
      version: translatedQuestion.version,
      sourceHash: translatedQuestion.sourceHash,
      taxonomy: translatedQuestion.taxonomy,
      sources: translatedQuestion.sources,
      code: translatedQuestion.code,
    }).toEqual({
      id: sourceQuestion.id,
      version: sourceQuestion.version,
      sourceHash: sourceQuestion.sourceHash,
      taxonomy: sourceQuestion.taxonomy,
      sources: sourceQuestion.sources,
      code: sourceQuestion.code,
    });
  });

  it("reports exact-revision coverage", () => {
    const coverage = contentTranslationCoverage(
      manifest,
      "en",
    );
    expect(coverage).toEqual({
      lessons: 1,
      questions: 7,
    });
  });

  it("localizes a bilingual lesson from its generated English companion", () => {
    const sourceLesson = manifest.lessons.find(
      (lesson) => lesson.id === "cpp11-toolchain",
    )!;
    const localizedLesson = localizeContentManifest(manifest, "en").lessons.find(
      (lesson) => lesson.id === sourceLesson.id,
    )!;

    expect(sourceLesson.title).toContain("Ngày 1");
    expect(localizedLesson.title).toContain("Day 1");
    expect(localizedLesson.sections.map((section) => section.id)).toEqual(
      sourceLesson.sections.map((section) => section.id),
    );
    expect(hasExactLessonTranslation(sourceLesson, "en")).toBe(true);
  });

  it("distinguishes translated questions from canonical-language fallbacks", () => {
    const translated = manifest.questions.find(
      (question) => question.id === "cpp20-designated-initializers-001",
    )!;
    const untranslated = manifest.questions.find(
      (question) => question.id === "cpp98-object-variable-memory-001",
    )!;
    const untranslatedLesson = manifest.lessons.find(
      (lesson) => lesson.id === untranslated.lessonId,
    )!;

    expect(hasExactQuestionTranslation(translated, "en")).toBe(true);
    expect(hasExactQuestionTranslation(untranslated, "en")).toBe(false);
    expect(hasExactLessonTranslation(untranslatedLesson, "en")).toBe(false);
  });
});
