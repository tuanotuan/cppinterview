import type {
  ContentQuestion,
  PracticeDeckId,
} from "../content/schema";
import {
  contentTrackSchema,
  questionDifficultySchema,
} from "../content/schema";
import type { QuestionLearningState } from "./learning-state";
import { selectDailyQuestion } from "./scheduler";

export type CustomStudyFilters = {
  learningState: "all" | QuestionLearningState["state"] | "due" | "leech";
  standard: "all" | ContentQuestion["taxonomy"]["standard"];
  difficulty: "all" | ContentQuestion["taxonomy"]["difficulty"];
  skill: "all" | ContentQuestion["taxonomy"]["skill"];
  topic: string;
  lessonId: string;
  limit: number;
};

type CustomStudyQuestion = Pick<ContentQuestion, "id" | "taxonomy">;

export type CustomStudyLaunch =
  | { kind: "due" | "leech"; limit?: number }
  | { kind: "topic"; topic: string; limit?: number }
  | { kind: "lesson"; lessonId: string; limit?: number }
  | {
      kind: "coverage";
      learningState?: "new" | "learning" | "relearning" | "due";
      standard?: ContentQuestion["taxonomy"]["standard"];
      difficulty?: ContentQuestion["taxonomy"]["difficulty"];
      topic?: string;
      limit?: number;
    };

export function buildCustomStudyLaunchHref(
  deck: PracticeDeckId,
  launch: CustomStudyLaunch,
) {
  const params = new URLSearchParams({
    deck,
    study: launch.kind,
  });
  if (launch.kind === "topic") params.set("topic", launch.topic);
  if (launch.kind === "lesson") params.set("lesson", launch.lessonId);
  if (launch.kind === "coverage") {
    params.set("state", launch.learningState ?? "new");
    if (launch.standard) params.set("standard", launch.standard);
    if (launch.difficulty) params.set("difficulty", launch.difficulty);
    if (launch.topic) params.set("topic", launch.topic);
  }
  if (launch.limit !== undefined) {
    params.set("limit", String(normalizeLimit(launch.limit)));
  }
  return `/practice?${params.toString()}`;
}

export function parseCustomStudyLaunch(params: {
  study?: string;
  topic?: string;
  lesson?: string;
  limit?: string;
  state?: string;
  standard?: string;
  difficulty?: string;
}): CustomStudyFilters | null {
  const limit = parseLimit(params.limit);
  if (params.study === "due" || params.study === "leech") {
    return {
      learningState: params.study,
      standard: "all",
      difficulty: "all",
      skill: "all",
      topic: "all",
      lessonId: "all",
      limit,
    };
  }
  if (
    params.study === "topic" &&
    params.topic !== undefined &&
    /^[a-z0-9][a-z0-9-]{0,79}$/u.test(params.topic)
  ) {
    return {
      learningState: "all",
      standard: "all",
      difficulty: "all",
      skill: "all",
      topic: params.topic,
      lessonId: "all",
      limit,
    };
  }
  if (
    params.study === "lesson" &&
    params.lesson !== undefined &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(params.lesson) &&
    params.lesson.length <= 120
  ) {
    return {
      learningState: "all",
      standard: "all",
      difficulty: "all",
      skill: "all",
      topic: "all",
      lessonId: params.lesson,
      limit,
    };
  }
  if (params.study === "coverage") {
    const learningState = params.state ?? "new";
    const standard = params.standard
      ? contentTrackSchema.safeParse(params.standard)
      : null;
    const difficulty = params.difficulty
      ? questionDifficultySchema.safeParse(params.difficulty)
      : null;
    const topicIsValid =
      params.topic === undefined ||
      /^[a-z0-9][a-z0-9-]{0,79}$/u.test(params.topic);
    if (
      !["new", "learning", "relearning", "due"].includes(learningState) ||
      (standard && !standard.success) ||
      (difficulty && !difficulty.success) ||
      !topicIsValid
    ) {
      return null;
    }
    return {
      learningState: learningState as CustomStudyFilters["learningState"],
      standard: standard?.success ? standard.data : "all",
      difficulty: difficulty?.success ? difficulty.data : "all",
      skill: "all",
      topic: params.topic ?? "all",
      lessonId: "all",
      limit,
    };
  }
  return null;
}

export function buildCustomStudyQueue(
  questions: CustomStudyQuestion[],
  states: Map<string, QuestionLearningState>,
  today: string,
  filters: CustomStudyFilters,
  allowedQuestionIds?: ReadonlySet<string>,
) {
  const candidates = questions
    .filter((question) => {
      if (allowedQuestionIds && !allowedQuestionIds.has(question.id)) {
        return false;
      }
      const state = states.get(question.id);
      if (!state || state.suspended || state.lastReviewedOn === today) return false;
      const effectiveState = state.contentChanged ? "new" : state.state;
      const matchesState =
        filters.learningState === "all" ||
        (filters.learningState === "due"
          ? effectiveState !== "new" &&
            state.dueOn !== null &&
            state.dueOn <= today
          : filters.learningState === "leech"
            ? state.leech
            : effectiveState === filters.learningState);
      return (
        matchesState &&
        (filters.standard === "all" ||
          question.taxonomy.standard === filters.standard) &&
        (filters.difficulty === "all" ||
          question.taxonomy.difficulty === filters.difficulty) &&
        (filters.skill === "all" || question.taxonomy.skill === filters.skill) &&
        (filters.topic === "all" ||
          question.taxonomy.topics.includes(filters.topic)) &&
        (filters.lessonId === "all" ||
          question.taxonomy.sourceLessonId === filters.lessonId)
      );
    })
    .map((question) => question.id);
  const queue: string[] = [];
  const remaining = [...candidates];
  const limit = Math.min(20, Math.max(1, Math.floor(filters.limit)));
  const seed = [
    today,
    filters.learningState,
    filters.standard,
    filters.difficulty,
    filters.skill,
    filters.topic,
  ].join(":");

  for (let index = 0; index < limit; index += 1) {
    const selected = selectDailyQuestion(remaining, `${seed}:${index}`);
    if (!selected) break;
    queue.push(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }
  return queue;
}

function parseLimit(value: string | undefined) {
  if (value === undefined || !/^\d{1,3}$/u.test(value)) return 10;
  return normalizeLimit(Number(value));
}

function normalizeLimit(value: number) {
  return Math.min(20, Math.max(1, Math.floor(value)));
}
