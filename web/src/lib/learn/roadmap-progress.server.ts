import "server-only";

import { z } from "zod";

import { getRepoContentManifest } from "@/lib/content/question-store-server";

import {
  ROADMAP_PROGRESS_STATUSES,
  ROADMAP_TRACKS,
  type RoadmapTrack,
} from "./roadmap-progress";

const roadmapTrackSchema = z.enum(ROADMAP_TRACKS);
const lessonIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const roadmapProgressStatusSchema = z.enum(ROADMAP_PROGRESS_STATUSES);

export const roadmapProgressMutationSchema = z
  .object({
    track: roadmapTrackSchema,
    lessonId: lessonIdSchema,
    status: roadmapProgressStatusSchema,
  })
  .strict();

export const roadmapProgressDeleteSchema = z
  .object({
    track: roadmapTrackSchema,
    lessonId: lessonIdSchema,
  })
  .strict();

export function roadmapLessonIds(track: RoadmapTrack): string[] {
  return getRepoContentManifest().lessons
    .filter((lesson) => lesson.track === track)
    .map((lesson) => lesson.id);
}

export function isLessonInRoadmapTrack(
  track: RoadmapTrack,
  lessonId: string,
): boolean {
  return roadmapLessonIds(track).includes(lessonId);
}
