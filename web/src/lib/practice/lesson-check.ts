import type { ContentQuestion, PracticeDeckId } from "../content/schema";

const lessonIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

type LessonCheckQuestion = Pick<ContentQuestion, "id" | "taxonomy">;

export type LessonCheckLaunch = {
  lessonId: string;
};

export function buildLessonCheckLaunchHref(
  deck: PracticeDeckId,
  lessonId: string,
) {
  const params = new URLSearchParams({
    deck,
    study: "lesson-check",
    lesson: lessonId,
  });
  return `/practice?${params.toString()}`;
}

export function parseLessonCheckLaunch(params: {
  study?: string;
  lesson?: string;
}): LessonCheckLaunch | null {
  if (
    params.study !== "lesson-check" ||
    params.lesson === undefined ||
    params.lesson.length > 120 ||
    !lessonIdPattern.test(params.lesson)
  ) {
    return null;
  }

  return { lessonId: params.lesson };
}

export function lessonCheckQuestionIds(
  questions: readonly LessonCheckQuestion[],
  lessonId: string,
) {
  // The caller owns publication/approval filtering. This helper only narrows
  // that already-authorized collection to the requested lesson.
  return questions
    .filter(
      (question) => question.taxonomy.sourceLessonId === lessonId,
    )
    .map((question) => question.id);
}

export function completeLessonCheckQuestion(
  completedQuestionIds: readonly string[],
  questionId: string,
) {
  return completedQuestionIds.includes(questionId)
    ? [...completedQuestionIds]
    : [...completedQuestionIds, questionId];
}
