import type { ContentQuestion, GeneratedLesson } from "./schema";

export type QuestionSourceSection = {
  id: string;
  heading: string;
  excerpt: string;
};

/**
 * Resolves question citations only against the lesson revision they describe.
 * DB-owned questions remain visible as `needs_review` after a lesson revision
 * changes, so their old section IDs must not be looked up in the new lesson.
 */
export function currentQuestionSourceSections(
  question: Pick<ContentQuestion, "id" | "lessonId" | "sourceHash" | "sources">,
  lesson: Pick<GeneratedLesson, "id" | "sourceHash" | "sections">,
): QuestionSourceSection[] {
  if (question.sourceHash !== lesson.sourceHash) return [];

  return question.sources.map(({ sectionId }) => {
    const section = lesson.sections.find((item) => item.id === sectionId);
    if (!section) {
      throw new Error(`Missing section ${question.lessonId}#${sectionId}`);
    }
    return {
      id: section.id,
      heading: section.heading,
      excerpt: section.bodyText.slice(0, 900),
    };
  });
}
