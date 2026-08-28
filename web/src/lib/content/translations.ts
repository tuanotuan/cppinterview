import { z } from "zod";

import englishCatalogJson from "@/content-translations/en.json";
import vietnameseCatalogJson from "@/content-translations/vi.json";
import generatedEnglishLessonCatalogJson from "@/generated/lesson-translations-en.json";
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

const translatedAnswerSchema = z.object({
  short: z.string().trim().min(10),
  detailed: z.string().trim().min(20),
});

const translatedRubricSchema = z.object({
  required: z.array(z.string().trim().min(3)).min(1),
  bonus: z.array(z.string().trim().min(3)),
  misconceptions: z.array(z.string().trim().min(3)),
});

const questionTranslationSchema = z.object({
  questionId: z.string().min(1),
  questionVersion: z.number().int().positive(),
  sourceHash: sourceHashSchema,
  status: z.enum(["draft", "verified", "archived"]),
  prompt: z.string().trim().min(10),
  hint: z.string().trim().min(5),
  answer: translatedAnswerSchema,
  rubric: translatedRubricSchema,
});

const questionTranslationPublicationRowSchema = z.object({
  question_id: z.string().min(1),
  question_version: z.coerce.number().int().positive(),
  source_hash: sourceHashSchema,
  locale: z.enum(["vi", "en"]),
  prompt: z.string().trim().min(10),
  hint: z.string().trim().min(5),
  answer: translatedAnswerSchema,
  rubric: translatedRubricSchema,
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
export type QuestionTranslation = z.infer<typeof questionTranslationSchema>;
export type QuestionTranslationPublication = {
  questionId: string;
  questionVersion: number;
  sourceHash: string;
  locale: Locale;
  prompt: string;
  hint: string;
  answer: QuestionTranslation["answer"];
  rubric: QuestionTranslation["rubric"];
};

export type QuestionTranslationReviewCandidate = {
  locale: Locale;
  translation: QuestionTranslation;
  question: ManifestQuestion;
};

export const questionTranslationPublicationSelect =
  "question_id, question_version, source_hash, locale, prompt, hint, answer, rubric";

const curatedEnglishCatalog = contentTranslationCatalogSchema.parse(
  englishCatalogJson,
);
const generatedEnglishLessonCatalog = contentTranslationCatalogSchema.parse(
  generatedEnglishLessonCatalogJson,
);

const catalogs: Record<Locale, ContentTranslationCatalog> = {
  en: mergeTranslationCatalogs(
    curatedEnglishCatalog,
    generatedEnglishLessonCatalog,
  ),
  vi: contentTranslationCatalogSchema.parse(vietnameseCatalogJson),
};

function mergeTranslationCatalogs(
  ...sources: ContentTranslationCatalog[]
): ContentTranslationCatalog {
  const locale = sources[0]?.locale;
  if (!locale || sources.some((source) => source.locale !== locale)) {
    throw new Error("Translation catalogs must use the same locale");
  }

  const lessons = sources.flatMap((source) => source.lessons);
  const questions = sources.flatMap((source) => source.questions);
  assertUniqueTranslationIds(
    lessons.map((lesson) => lesson.lessonId),
    `${locale} lesson translations`,
  );
  assertUniqueTranslationIds(
    questions.map((question) => question.questionId),
    `${locale} question translations`,
  );

  return contentTranslationCatalogSchema.parse({
    schemaVersion: 1,
    locale,
    lessons,
    questions,
  });
}

function assertUniqueTranslationIds(ids: string[], label: string) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size) {
    throw new Error(`Duplicate ${label}: ${[...duplicates].join(", ")}`);
  }
}

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
  publications: readonly QuestionTranslationPublication[] = [],
) {
  const translation = findExactQuestionTranslation(question, locale);
  return translation !== null && isQuestionTranslationPublished(
    translation,
    locale,
    publications,
  );
}

export function findExactQuestionTranslation(
  question: ManifestQuestion,
  locale: Locale,
): QuestionTranslation | null {
  const translation = catalogs[locale].questions.find(
    (item) => item.questionId === question.id,
  );
  return translation?.questionVersion === question.version &&
      translation.sourceHash === question.sourceHash
    ? translation
    : null;
}

export function rowsToQuestionTranslationPublications(
  rows: readonly unknown[],
): QuestionTranslationPublication[] {
  return rows.map((row) => {
    const parsed = questionTranslationPublicationRowSchema.parse(row);
    return {
      questionId: parsed.question_id,
      questionVersion: parsed.question_version,
      sourceHash: parsed.source_hash,
      locale: parsed.locale,
      prompt: parsed.prompt,
      hint: parsed.hint,
      answer: parsed.answer,
      rubric: parsed.rubric,
    };
  });
}

export function questionTranslationReviewCandidates(
  manifest: ContentManifest,
  locale: Locale,
  publications: readonly QuestionTranslationPublication[] = [],
): QuestionTranslationReviewCandidate[] {
  const questions = new Map(
    manifest.questions.map((question) => [question.id, question]),
  );
  return catalogs[locale].questions.flatMap((translation) => {
    const question = questions.get(translation.questionId);
    if (
      !question ||
      question.status === "archived" ||
      translation.status !== "draft" ||
      translation.questionVersion !== question.version ||
      translation.sourceHash !== question.sourceHash ||
      isQuestionTranslationPublished(translation, locale, publications)
    ) {
      return [];
    }
    return [{
      locale,
      translation,
      question: {
        ...question,
        prompt: translation.prompt,
        hint: translation.hint,
        answer: translation.answer,
        rubric: translation.rubric,
      },
    }];
  });
}

/**
 * Applies only translations tied to the exact canonical revision. Stable IDs,
 * versions and source hashes stay untouched so switching UI locale cannot fork
 * practice history or make stale translations look current.
 */
export function localizeContentManifest(
  manifest: ContentManifest,
  locale: Locale,
  publications: readonly QuestionTranslationPublication[] = [],
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
        translation.sourceHash !== question.sourceHash ||
        !isQuestionTranslationPublished(translation, locale, publications)
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

function isQuestionTranslationPublished(
  translation: QuestionTranslation,
  locale: Locale,
  publications: readonly QuestionTranslationPublication[],
) {
  if (translation.status === "verified") return true;
  if (translation.status === "archived") return false;
  return publications.some(
    (publication) =>
      publication.locale === locale &&
      publication.questionId === translation.questionId &&
      publication.questionVersion === translation.questionVersion &&
      publication.sourceHash === translation.sourceHash &&
      publication.prompt === translation.prompt &&
      publication.hint === translation.hint &&
      publication.answer.short === translation.answer.short &&
      publication.answer.detailed === translation.answer.detailed &&
      equalStrings(
        publication.rubric.required,
        translation.rubric.required,
      ) &&
      equalStrings(publication.rubric.bonus, translation.rubric.bonus) &&
      equalStrings(
        publication.rubric.misconceptions,
        translation.rubric.misconceptions,
      ),
  );
}

function equalStrings(left: readonly string[], right: readonly string[]) {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
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
