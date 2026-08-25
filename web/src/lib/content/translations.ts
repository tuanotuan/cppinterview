import { z } from "zod";

import englishCatalogJson from "@/content-translations/en.json";
import vietnameseCatalogJson from "@/content-translations/vi.json";
import type { Locale } from "@/i18n/routing";

import type { ContentManifest } from "./schema";

type ManifestLesson = ContentManifest["lessons"][number];
type ManifestQuestion = ContentManifest["questions"][number];

const sourceHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

const lessonTranslationSchema = z.object({
  lessonId: z.string().min(1),
  sourceHash: sourceHashSchema,
  title: z.string().trim().min(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    heading: z.string().trim().min(1),
    bodyMarkdown: z.string(),
    bodyText: z.string(),
  })).min(1),
  checklistItems: z.array(z.string().trim().min(1)),
});

const questionTranslationSchema = z.object({
  questionId: z.string().min(1),
  questionVersion: z.number().int().positive(),
  sourceHash: sourceHashSchema,
  prompt: z.string().trim().min(10),
  hint: z.string().trim().min(5),
  answer: z.object({
    short: z.string().trim().min(10),
    detailed: z.string().trim().min(20),
  }),
  rubric: z.object({
    required: z.array(z.string().trim().min(3)).min(1),
    bonus: z.array(z.string().trim().min(3)),
    misconceptions: z.array(z.string().trim().min(3)),
  }),
});

export const contentTranslationCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.enum(["vi", "en"]),
  lessons: z.array(lessonTranslationSchema),
  questions: z.array(questionTranslationSchema),
});

export type ContentTranslationCatalog = z.infer<
  typeof contentTranslationCatalogSchema
>;

const catalogs: Record<Locale, ContentTranslationCatalog> = {
  en: contentTranslationCatalogSchema.parse(englishCatalogJson),
  vi: contentTranslationCatalogSchema.parse(vietnameseCatalogJson),
};

export function hasExactLessonTranslation(
  lesson: ManifestLesson,
  locale: Locale,
) {
  const translation = catalogs[locale].lessons.find(
    (item) => item.lessonId === lesson.id,
  );
  if (!translation || translation.sourceHash !== lesson.sourceHash) {
    return false;
  }
  return lesson.sections.map((section) => section.id).join("\u001f") ===
    translation.sections.map((section) => section.id).join("\u001f");
}

export function hasExactQuestionTranslation(
  question: ManifestQuestion,
  locale: Locale,
) {
  const translation = catalogs[locale].questions.find(
    (item) => item.questionId === question.id,
  );
  return translation?.questionVersion === question.version &&
    translation.sourceHash === question.sourceHash;
}

/**
 * Applies only translations tied to the exact canonical revision. Stable IDs,
 * versions and source hashes stay untouched so switching UI locale cannot fork
 * practice history or make stale translations look current.
 */
export function localizeContentManifest(
  manifest: ContentManifest,
  locale: Locale,
): ContentManifest {
  const catalog = catalogs[locale];
  const lessonTranslations = new Map(
    catalog.lessons.map((item) => [item.lessonId, item]),
  );
  const questionTranslations = new Map(
    catalog.questions.map((item) => [item.questionId, item]),
  );

  return {
    ...manifest,
    lessons: manifest.lessons.map((lesson) => {
      const translation = lessonTranslations.get(lesson.id);
      if (!translation || translation.sourceHash !== lesson.sourceHash) {
        return lesson;
      }
      const sourceSectionIds = lesson.sections.map((section) => section.id);
      const translatedSectionIds = translation.sections.map(
        (section) => section.id,
      );
      if (sourceSectionIds.join("\u001f") !== translatedSectionIds.join("\u001f")) {
        return lesson;
      }
      return {
        ...lesson,
        title: translation.title,
        sections: translation.sections,
        checklistItems: translation.checklistItems,
      };
    }),
    questions: manifest.questions.map((question) => {
      const translation = questionTranslations.get(question.id);
      if (
        !translation ||
        translation.questionVersion !== question.version ||
        translation.sourceHash !== question.sourceHash
      ) {
        return question;
      }
      return {
        ...question,
        prompt: translation.prompt,
        hint: translation.hint,
        answer: translation.answer,
        rubric: translation.rubric,
      };
    }),
  };
}

export function contentTranslationCoverage(
  manifest: ContentManifest,
  locale: Locale,
) {
  const catalog = catalogs[locale];
  const lessons = new Map(catalog.lessons.map((item) => [item.lessonId, item]));
  const questions = new Map(
    catalog.questions.map((item) => [item.questionId, item]),
  );
  return {
    lessons: manifest.lessons.filter(
      (lesson) => lessons.get(lesson.id)?.sourceHash === lesson.sourceHash,
    ).length,
    questions: manifest.questions.filter((question) => {
      const item = questions.get(question.id);
      return item?.sourceHash === question.sourceHash &&
        item.questionVersion === question.version;
    }).length,
  };
}
