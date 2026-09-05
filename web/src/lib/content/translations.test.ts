import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";
import {
  contentTranslationCoverage,
  hasExactLessonTranslation,
  hasExactQuestionTranslation,
  localizeContentManifest,
  questionTranslationReviewCandidates,
  type QuestionTranslationPublication,
  type QuestionTranslationReviewCandidate,
} from "./translations";

describe("content translations", () => {
  const manifest = contentManifestSchema.parse(manifestJson);

  it("changes display copy without changing stable learning identity", () => {
    const source = manifest;
    const localized = localizeContentManifest(source, "en");
    const sourceQuestion = source.questions.find(
      (question) => question.id === "cpp98-address-pointer-001",
    )!;
    const translatedQuestion = localized.questions.find(
      (question) => question.id === sourceQuestion.id,
    )!;

    expect(translatedQuestion.prompt).toContain("Distinguish");
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
      lessons: 435,
      questions: 956,
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

  it("presents the current Daily collection name without changing its v1 hashes", () => {
    const sourceLesson = manifest.lessons.find(
      (lesson) => lesson.id === "dailycpp-q050",
    )!;
    const localizedVietnamese = localizeContentManifest(
      manifest,
      "vi",
    ).lessons.find((lesson) => lesson.id === sourceLesson.id)!;
    const localizedEnglish = localizeContentManifest(
      manifest,
      "en",
    ).lessons.find((lesson) => lesson.id === sourceLesson.id)!;

    expect(sourceLesson.sections.some((section) =>
      section.bodyMarkdown.includes("Daily C++ Interview")
    )).toBe(true);
    expect(localizedVietnamese.sections.some((section) =>
      section.bodyMarkdown.includes("Daily C++ Interview")
    )).toBe(false);
    expect(localizedVietnamese.sections.some((section) =>
      section.bodyMarkdown.includes("Real-World C++ Interviews")
    )).toBe(true);
    expect(localizedVietnamese.code).toContain("Real-World C++ Interviews Q050");
    expect(localizedEnglish.title).toContain("Question 050");
    expect(localizedEnglish.sections.some((section) =>
      section.bodyMarkdown.includes("Real-World C++ Interviews")
    )).toBe(true);
    expect(localizedVietnamese.sourceHash).toBe(sourceLesson.sourceHash);
    expect(localizedEnglish.sourceHash).toBe(sourceLesson.sourceHash);
  });

  it("uses the exact approved English copy for a Daily lesson check", () => {
    const review = questionTranslationReviewCandidates(manifest, "en").find(
      (candidate) => candidate.question.id === "dailycpp-q050-001",
    )!;
    const sourceQuestion = manifest.questions.find(
      (question) => question.id === review.question.id,
    )!;
    const publication = publicationFor(review);
    const localizedQuestion = localizeContentManifest(
      manifest,
      "en",
      [publication],
    ).questions.find((question) => question.id === sourceQuestion.id)!;

    expect(hasExactQuestionTranslation(sourceQuestion, "en", [publication]))
      .toBe(true);
    expect(localizedQuestion.prompt).toBe("What is a trivial class in C++?");
    expect(localizedQuestion.prompt).not.toContain("là gì");
    expect(localizedQuestion.sourceHash).toBe(sourceQuestion.sourceHash);
  });

  it("distinguishes translated questions from canonical-language fallbacks", () => {
    const translated = manifest.questions.find(
      (question) => question.id === "cpp98-address-pointer-001",
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

  it("queues three English drafts for every C++11 through C++23 roadmap lesson with canonical filter tags", () => {
    const reviews = questionTranslationReviewCandidates(manifest, "en");
    const roadmapLessons = manifest.lessons
      .filter(
        (lesson) =>
          lesson.track === "cpp11" ||
          lesson.track === "cpp14" ||
          lesson.track === "cpp17" ||
          lesson.track === "cpp20" ||
          lesson.track === "cpp23",
      )
      .sort(
        (left, right) =>
          left.track.localeCompare(right.track) || left.order - right.order,
      );
    const roadmapLessonIds = new Set(
      roadmapLessons.map((lesson) => lesson.id),
    );
    const roadmapReviews = reviews.filter((review) =>
      roadmapLessonIds.has(review.question.lessonId),
    );

    expect(roadmapReviews).toHaveLength((53 + 50 + 50 + 52 + 54) * 3);
    for (const lesson of roadmapLessons) {
      const lessonReviews = roadmapReviews.filter(
        (review) => review.question.lessonId === lesson.id,
      );
      expect(lessonReviews.map((review) => review.question.difficulty)).toEqual([
        "beginner",
        "intermediate",
        "advanced",
      ]);
      for (const review of lessonReviews) {
        expect(review.question.taxonomy.standard).toBe(lesson.track);
        expect(review.question.taxonomy.tags).toContain(
          `standard::${lesson.track}`,
        );
        expect(review.question.taxonomy.tags).toContain(
          `difficulty::${review.question.difficulty}`,
        );
        expect(hasExactQuestionTranslation(review.question, "en")).toBe(false);
      }
    }
  });

  it("publishes only the exact English copy approved for the same question", () => {
    const review = questionTranslationReviewCandidates(manifest, "en")[0];
    const publication = publicationFor(review);
    const sourceQuestion = manifest.questions.find(
      (question) => question.id === review.question.id,
    )!;

    const databaseOrderedPublication = {
      ...publication,
      answer: {
        detailed: publication.answer.detailed,
        short: publication.answer.short,
      },
      rubric: {
        bonus: publication.rubric.bonus,
        misconceptions: publication.rubric.misconceptions,
        required: publication.rubric.required,
      },
    };
    expect(
      hasExactQuestionTranslation(sourceQuestion, "en", [
        databaseOrderedPublication,
      ]),
    ).toBe(true);
    expect(
      localizeContentManifest(manifest, "en", [publication]).questions.find(
        (question) => question.id === sourceQuestion.id,
      )?.prompt,
    ).toBe(review.question.prompt);
    expect(
      questionTranslationReviewCandidates(manifest, "en", [publication]).map(
        (candidate) => candidate.question.id,
      ),
    ).not.toContain(sourceQuestion.id);

    const stalePublication = {
      ...publication,
      prompt: `${publication.prompt} stale`,
    };
    expect(
      hasExactQuestionTranslation(sourceQuestion, "en", [stalePublication]),
    ).toBe(false);
    expect(
      questionTranslationReviewCandidates(manifest, "en", [stalePublication]).map(
        (candidate) => candidate.question.id,
      ),
    ).toContain(sourceQuestion.id);
  });
});

function publicationFor(
  review: QuestionTranslationReviewCandidate,
): QuestionTranslationPublication {
  return {
    questionId: review.translation.questionId,
    questionVersion: review.translation.questionVersion,
    sourceHash: review.translation.sourceHash,
    locale: review.locale,
    prompt: review.translation.prompt,
    hint: review.translation.hint,
    answer: review.translation.answer,
    rubric: review.translation.rubric,
  };
}
