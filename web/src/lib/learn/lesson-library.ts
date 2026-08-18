import type {
  ContentManifest,
  ContentTrack,
  GeneratedLesson,
  PracticeDeckId,
} from "../content/schema";
import { buildCustomStudyLaunchHref } from "../practice/custom-study";

export type LessonLibraryItem = {
  id: string;
  title: string;
  language: GeneratedLesson["language"];
  track: ContentTrack;
  order: number;
  tags: string[];
  prerequisiteIds: string[];
  sectionCount: number;
  checklistCount: number;
  hasCode: boolean;
  verifiedQuestionCount: number;
};

const trackOrder: ContentTrack[] = [
  "cpp98",
  "cpp11",
  "cpp20",
];

const trackLabels: Record<ContentTrack, string> = {
  cpp98: "C++98",
  cpp11: "C++11/14/17",
  cpp20: "C++20/23",
};

export function lessonTrackLabel(track: ContentTrack) {
  return trackLabels[track];
}

export function practiceDeckForLesson(
  _lesson: Pick<GeneratedLesson, "language">,
): PracticeDeckId {
  void _lesson;
  return "cpp-interview";
}

export function lessonPracticeHref(
  lesson: Pick<GeneratedLesson, "id" | "language">,
) {
  return buildCustomStudyLaunchHref(practiceDeckForLesson(lesson), {
    kind: "lesson",
    lessonId: lesson.id,
    limit: 20,
  });
}

export function buildLessonLibrary(
  manifest: Pick<ContentManifest, "lessons" | "questions">,
): LessonLibraryItem[] {
  const verifiedCounts = new Map<string, number>();
  for (const question of manifest.questions) {
    if (question.status !== "verified") continue;
    verifiedCounts.set(
      question.lessonId,
      (verifiedCounts.get(question.lessonId) ?? 0) + 1,
    );
  }

  return manifest.lessons
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      language: lesson.language,
      track: lesson.track,
      order: lesson.order,
      tags: [...lesson.tags],
      prerequisiteIds: [...lesson.prerequisites],
      sectionCount: lesson.sections.length,
      checklistCount: lesson.checklistItems.length,
      hasCode: lesson.code !== null,
      verifiedQuestionCount: verifiedCounts.get(lesson.id) ?? 0,
    }))
    .sort(
      (left, right) =>
        trackOrder.indexOf(left.track) - trackOrder.indexOf(right.track) ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    );
}

export function findLesson(
  manifest: Pick<ContentManifest, "lessons">,
  lessonId: string,
) {
  return manifest.lessons.find((lesson) => lesson.id === lessonId) ?? null;
}

export function unresolvedLessonPrerequisites(
  manifest: Pick<ContentManifest, "lessons">,
) {
  const lessonIds = new Set(manifest.lessons.map((lesson) => lesson.id));
  return manifest.lessons.flatMap((lesson) =>
    lesson.prerequisites
      .filter((prerequisiteId) => !lessonIds.has(prerequisiteId))
      .map((prerequisiteId) => ({
        lessonId: lesson.id,
        prerequisiteId,
      })),
  );
}
