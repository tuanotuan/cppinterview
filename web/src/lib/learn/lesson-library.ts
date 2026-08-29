import type {
  ContentManifest,
  ContentTrack,
  GeneratedLesson,
  PracticeDeckId,
} from "../content/schema";
import { buildLessonCheckLaunchHref } from "../practice/lesson-check";

export type LessonLibraryItem = {
  id: string;
  title: string;
  language: GeneratedLesson["language"];
  track: ContentTrack;
  order: number;
  tags: string[];
  hasCode: boolean;
  verifiedQuestionCount: number;
};

const trackOrder: ContentTrack[] = [
  "cpp98",
  "cpp11",
  "cpp14",
  "cpp20",
];

const trackLabels: Record<ContentTrack, string> = {
  cpp98: "C++98",
  cpp11: "C++11",
  cpp14: "C++14",
  cpp20: "C++20",
};

export const lessonStandardFilters = [
  { value: "cpp98", label: "C++98", track: "cpp98", roadmapHref: null },
  {
    value: "cpp11",
    label: "C++11",
    track: "cpp11",
    roadmapHref: "/learn/roadmap/cpp11",
  },
  {
    value: "cpp14",
    label: "C++14",
    track: "cpp14",
    roadmapHref: "/learn/roadmap/cpp14",
  },
  { value: "cpp17", label: "C++17", track: null, roadmapHref: null },
  { value: "cpp20", label: "C++20", track: "cpp20", roadmapHref: null },
  { value: "cpp23", label: "C++23", track: null, roadmapHref: null },
] as const;

export type LessonStandardFilter =
  | "all"
  | (typeof lessonStandardFilters)[number]["value"];

export function lessonTrackLabel(track: ContentTrack) {
  return trackLabels[track];
}

export function lessonMatchesStandard(
  track: ContentTrack,
  filter: LessonStandardFilter,
) {
  if (filter === "all") return true;
  return (
    lessonStandardFilters.find((option) => option.value === filter)?.track ===
    track
  );
}

export function lessonStandardIsAvailable(
  lessons: readonly Pick<LessonLibraryItem, "track">[],
  filter: LessonStandardFilter,
) {
  return (
    filter === "all" ||
    lessons.some((lesson) => lessonMatchesStandard(lesson.track, filter))
  );
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
  return buildLessonCheckLaunchHref(
    practiceDeckForLesson(lesson),
    lesson.id,
  );
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
