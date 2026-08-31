import type { ContentQuestion, PracticeDeckId } from "../content/schema";

const lessonIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

type LessonCheckQuestion = Pick<ContentQuestion, "id" | "lessonId">;

type LessonCheckLesson = {
  id: string;
  title: string;
};

export type LessonCheckLaunch = {
  lessonId: string;
  restart: boolean;
};

export function buildLessonCheckLaunchHref(
  deck: PracticeDeckId,
  lessonId: string,
) {
  const params = new URLSearchParams({
    deck,
    study: "lesson-check",
    lesson: lessonId,
    restart: "1",
  });
  return `/practice?${params.toString()}`;
}

export function parseLessonCheckLaunch(params: {
  study?: string;
  lesson?: string;
  restart?: string;
}): LessonCheckLaunch | null {
  if (
    params.study !== "lesson-check" ||
    params.lesson === undefined ||
    params.lesson.length > 120 ||
    !lessonIdPattern.test(params.lesson) ||
    (params.restart !== undefined && params.restart !== "1")
  ) {
    return null;
  }

  return {
    lessonId: params.lesson,
    restart: params.restart === "1",
  };
}

export function lessonCheckQuestionIds(
  availableQuestions: readonly LessonCheckQuestion[],
  repositoryQuestions: readonly LessonCheckQuestion[],
  lessonId: string,
) {
  // The available collection owns publication/approval filtering. Walk the
  // Git-owned collection to preserve its canonical order while excluding
  // approved DB-native or retired questions that happen to share a lesson.
  const availableIds = new Set(
    availableQuestions
      .filter((question) => question.lessonId === lessonId)
      .map((question) => question.id),
  );
  return repositoryQuestions
    .filter(
      (question) =>
        question.lessonId === lessonId && availableIds.has(question.id),
    )
    .map((question) => question.id);
}

export function findLessonCheckLesson(
  availableLessons: readonly LessonCheckLesson[],
  repositoryLessons: readonly LessonCheckLesson[],
  lessonId: string,
) {
  return (
    availableLessons.find((lesson) => lesson.id === lessonId) ??
    repositoryLessons.find((lesson) => lesson.id === lessonId) ??
    null
  );
}

export function completeLessonCheckQuestion(
  completedQuestionIds: readonly string[],
  questionId: string,
) {
  return completedQuestionIds.includes(questionId)
    ? [...completedQuestionIds]
    : [...completedQuestionIds, questionId];
}
