export const ROADMAP_TRACKS = [
  "cpp11",
  "cpp14",
  "cpp17",
  "cpp20",
  "cpp23",
] as const;

export const ROADMAP_PROGRESS_STATUSES = [
  "learning",
  "done",
  "skipped",
] as const;

export type RoadmapTrack = (typeof ROADMAP_TRACKS)[number];
export type RoadmapProgressStatus =
  (typeof ROADMAP_PROGRESS_STATUSES)[number];
export type RoadmapProgressStates = Record<string, RoadmapProgressStatus>;

export type RoadmapProgressSummary = {
  learning: number;
  done: number;
  skipped: number;
  completed: number;
  total: number;
};

export function isRoadmapTrack(value: unknown): value is RoadmapTrack {
  return typeof value === "string" && ROADMAP_TRACKS.includes(
    value as RoadmapTrack,
  );
}

export function isRoadmapProgressStatus(
  value: unknown,
): value is RoadmapProgressStatus {
  return typeof value === "string" && ROADMAP_PROGRESS_STATUSES.includes(
    value as RoadmapProgressStatus,
  );
}

export function toggledRoadmapProgressStatus(
  current: RoadmapProgressStatus | undefined,
  selected: RoadmapProgressStatus,
): RoadmapProgressStatus | null {
  return current === selected ? null : selected;
}

export function summarizeRoadmapProgress(
  lessonIds: readonly string[],
  states: RoadmapProgressStates,
): RoadmapProgressSummary {
  const visibleLessonIds = new Set(lessonIds);
  const summary: RoadmapProgressSummary = {
    learning: 0,
    done: 0,
    skipped: 0,
    completed: 0,
    total: visibleLessonIds.size,
  };

  for (const [lessonId, status] of Object.entries(states)) {
    if (!visibleLessonIds.has(lessonId)) continue;
    summary[status] += 1;
  }
  summary.completed = summary.done + summary.skipped;
  return summary;
}

export function parseRoadmapProgressStates(
  value: unknown,
): RoadmapProgressStates | null {
  if (typeof value !== "object" || value === null) return null;
  const rows = (value as { states?: unknown }).states;
  if (!Array.isArray(rows)) return null;

  const states: RoadmapProgressStates = {};
  for (const row of rows) {
    if (typeof row !== "object" || row === null) return null;
    const { lessonId, status } = row as {
      lessonId?: unknown;
      status?: unknown;
    };
    if (
      typeof lessonId !== "string" ||
      !isRoadmapProgressStatus(status)
    ) {
      return null;
    }
    states[lessonId] = status;
  }
  return states;
}
