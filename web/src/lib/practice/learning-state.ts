import {
  type PracticeProgress,
  type Rating,
  type Review,
} from "./scheduler";
import {
  applyFsrsRating,
  currentFsrsOutcome,
  previewFsrsRatings,
  replayFsrsCard,
  selectFsrsRevisionHistory,
} from "./fsrs-scheduler";

export const MAX_NEW_PER_DAY = 5;
export const MAX_REVIEW_PER_DAY = 5;
export const LEECH_LAPSE_THRESHOLD = 8;

export const NEW_CARD_STANDARD_ORDER = [
  "cpp11",
  "cpp14",
  "cpp17",
  "cpp20",
  "cpp23",
] as const;
export const NEW_CARD_DIFFICULTY_ORDER = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type NewCardSequence = {
  standard: (typeof NEW_CARD_STANDARD_ORDER)[number];
  difficulty: (typeof NEW_CARD_DIFFICULTY_ORDER)[number];
  position: number;
};

export const LEARNING_STATES = [
  "new",
  "learning",
  "review",
  "relearning",
] as const;

export type LearningState = (typeof LEARNING_STATES)[number];

export type QuestionLearningState = {
  questionId: string;
  questionVersion: number;
  sourceHash: string | null;
  state: LearningState;
  dueOn: string | null;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  lastRating: Rating | null;
  lastReviewedOn: string | null;
  suspended: boolean;
  leech: boolean;
  contentChanged: boolean;
  historyResetOn: string | null;
  historyResetToken: string | null;
};

export type QuestionIdentity = {
  id: string;
  version: number;
  sourceHash: string;
  /** Undefined preserves legacy input ordering; null excludes automatic New. */
  newCardSequence?: NewCardSequence | null;
};

export type AnkiDailyCounts = {
  new: number;
  learning: number;
  review: number;
};

export type AnkiDailyPlan = {
  questionIds: string[];
  remainingIds: string[];
  completedIds: string[];
  counts: AnkiDailyCounts;
  totalCount: number;
  completedCount: number;
};

export function newQuestionLearningState({
  questionId,
  questionVersion,
  sourceHash,
}: {
  questionId: string;
  questionVersion: number;
  sourceHash: string | null;
}): QuestionLearningState {
  return {
    questionId,
    questionVersion,
    sourceHash,
    state: "new",
    dueOn: null,
    intervalDays: 0,
    reviewCount: 0,
    lapseCount: 0,
    lastRating: null,
    lastReviewedOn: null,
    suspended: false,
    leech: false,
    contentChanged: false,
    historyResetOn: null,
    historyResetToken: null,
  };
}

export function deriveLearningStateFromReviews(
  questionId: string,
  reviews: Review[],
  questionVersion = 1,
  sourceHash: string | null = null,
): QuestionLearningState {
  const questionHistory = reviews
    .filter((review) => review.questionId === questionId)
    .sort((left, right) => left.reviewedOn.localeCompare(right.reviewedOn));

  if (questionHistory.length === 0) {
    return {
      ...newQuestionLearningState({
        questionId,
        questionVersion,
        sourceHash,
      }),
    };
  }

  const currentRevisionHistory = selectFsrsRevisionHistory(
    { questionId, questionVersion, sourceHash },
    questionHistory,
  );
  // If only another bound revision exists, retain its identity long enough for
  // buildLearningStates() to mark the card contentChanged. The next review is
  // still scheduled from an empty FSRS card.
  const history = currentRevisionHistory.length
    ? currentRevisionHistory
    : questionHistory;
  const latest = history.at(-1)!;
  const fsrs = currentFsrsOutcome(
    replayFsrsCard(history, latest.reviewedOn),
  );
  const state =
    latest.rating === "again"
      ? fsrs.reviewCount === 1
        ? "learning"
        : "relearning"
      : "review";

  return {
    questionId,
    questionVersion: latest.questionVersion ?? questionVersion,
    sourceHash: latest.sourceHash ?? sourceHash,
    state,
    dueOn: fsrs.dueOn,
    intervalDays: fsrs.intervalDays,
    reviewCount: fsrs.reviewCount,
    lapseCount: fsrs.lapseCount,
    lastRating: latest.rating,
    lastReviewedOn: latest.reviewedOn,
    suspended: false,
    leech: fsrs.lapseCount >= LEECH_LAPSE_THRESHOLD,
    contentChanged: false,
    historyResetOn: null,
    historyResetToken: latest.historyResetToken ?? null,
  };
}

export function reviewBelongsToLearningHistory(
  review: Review,
  state: QuestionLearningState | undefined,
) {
  if (!state) return true;
  if (state.historyResetToken) {
    return review.historyResetToken === state.historyResetToken;
  }
  if (review.historyResetToken !== undefined) return false;
  return (
    !state.historyResetOn ||
    review.reviewedOn > state.historyResetOn
  );
}

export function filterReviewsForLearningHistory(
  reviews: readonly Review[],
  states: readonly QuestionLearningState[],
) {
  const stateByQuestion = new Map(
    states.map((state) => [state.questionId, state]),
  );
  return reviews.filter((review) =>
    reviewBelongsToLearningHistory(
      review,
      stateByQuestion.get(review.questionId),
    ),
  );
}

export function buildLearningStates(
  questions: QuestionIdentity[],
  reviews: Review[],
  cloudStates: QuestionLearningState[] = [],
): Map<string, QuestionLearningState> {
  const cloudById = new Map(cloudStates.map((state) => [state.questionId, state]));
  const currentReviews = filterReviewsForLearningHistory(
    reviews,
    cloudStates,
  );
  return new Map(
    questions.map((question) => {
      const cloud = cloudById.get(question.id);
      const local = deriveLearningStateFromReviews(
        question.id,
        currentReviews,
        question.version,
        question.sourceHash,
      );
      const preferredState = newerState(local, cloud);
      const state = cloud
        ? {
            ...preferredState,
            suspended: cloud.suspended,
            historyResetOn: cloud.historyResetOn,
            historyResetToken: cloud.historyResetToken,
          }
        : preferredState;
      const contentChanged = Boolean(
        state.sourceHash &&
          (state.sourceHash !== question.sourceHash ||
            state.questionVersion !== question.version),
      );

      return [
        question.id,
        {
          ...state,
          questionVersion: question.version,
          sourceHash: question.sourceHash,
          state: contentChanged ? "learning" : state.state,
          dueOn: contentChanged ? null : state.dueOn,
          intervalDays: contentChanged ? 0 : state.intervalDays,
          contentChanged,
        },
      ];
    }),
  );
}

export function scheduleQuestionReview(
  current: QuestionLearningState,
  rating: Rating,
  reviewedOn: string,
  reviews: readonly Review[],
): { state: QuestionLearningState; review: Review } {
  const history = current.contentChanged
    ? []
    : selectFsrsRevisionHistory(current, reviews).filter(
        (review) => review.reviewedOn < reviewedOn,
      );
  const transition = applyFsrsRating(history, rating, reviewedOn);
  const nextState =
    rating === "again"
      ? transition.reviewCount === 1
        ? "learning"
        : "relearning"
      : "review";
  const next: QuestionLearningState = {
    ...current,
    state: nextState,
    dueOn: transition.dueOn,
    intervalDays: transition.intervalDays,
    reviewCount: transition.reviewCount,
    lapseCount: transition.lapseCount,
    lastRating: rating,
    lastReviewedOn: reviewedOn,
    leech: transition.lapseCount >= LEECH_LAPSE_THRESHOLD,
    contentChanged: false,
  };

  return {
    state: next,
    review: {
      questionId: current.questionId,
      questionVersion: current.questionVersion,
      sourceHash: current.sourceHash ?? undefined,
      reviewedOn,
      rating,
      nextDueOn: transition.dueOn,
      stateAfter: next.state === "new" ? undefined : next.state,
      intervalDaysAfter: next.intervalDays,
      lapseCountAfter: next.lapseCount,
      ...(current.historyResetToken
        ? { historyResetToken: current.historyResetToken }
        : {}),
    },
  };
}

export function recordScheduledReview(
  progress: PracticeProgress,
  review: Review,
): PracticeProgress {
  return {
    version: progress.version,
    reviews: [
      ...progress.reviews.filter(
        (item) =>
          !(
            item.questionId === review.questionId &&
            item.reviewedOn === review.reviewedOn
          ),
      ),
      review,
    ],
  };
}

/**
 * Reconstructs the beginning-of-day state before selecting the bounded daily
 * workload. Reviews recorded later that day only complete IDs already in the
 * plan, so re-renders, reloads, and cloud merges cannot refill either quota.
 */
export function buildAnkiDailyPlan(
  questions: QuestionIdentity[],
  reviews: Review[],
  cloudStates: QuestionLearningState[],
  dateKey: string,
  {
    newLimit = MAX_NEW_PER_DAY,
    reviewLimit = MAX_REVIEW_PER_DAY,
    priorityQuestionIds = [],
  }: {
    newLimit?: number;
    reviewLimit?: number;
    priorityQuestionIds?: Iterable<string>;
  } = {},
): AnkiDailyPlan {
  const currentHistory = filterReviewsForLearningHistory(
    reviews,
    cloudStates,
  );
  const states = buildLearningStates(
    questions,
    currentHistory.filter((review) => review.reviewedOn < dateKey),
    cloudStates.filter(
      (state) =>
        state.lastReviewedOn === null || state.lastReviewedOn < dateKey,
    ),
  );
  const priority = new Set(priorityQuestionIds);
  const identityById = new Map(
    questions.map((question, position) => [
      question.id,
      { question, position },
    ]),
  );
  const available = [...states.values()].filter(
    (state) => !state.suspended,
  );
  const learning = available
    .filter(
      (state) =>
        (state.state === "learning" || state.state === "relearning") &&
        isDueForStudy(state, dateKey),
    )
    .sort(compareQueueStates);
  const dueReviews = available
    .filter(
      (state) =>
        state.state === "review" && isDueForStudy(state, dateKey),
    )
    .sort(compareQueueStates)
    .slice(0, Math.max(0, reviewLimit));
  const newIds = available
    .filter(
      (state) =>
        state.state === "new" &&
        identityById.get(state.questionId)?.question.newCardSequence !== null,
    )
    .map((state) => state.questionId)
    .sort((left, right) =>
      compareNewCards(left, right, identityById, priority),
    );
  const newQuestions = newIds.slice(0, Math.max(0, newLimit));

  const buckets: Record<keyof AnkiDailyCounts, string[]> = {
    new: newQuestions,
    learning: learning.map((state) => state.questionId),
    review: dueReviews.map((state) => state.questionId),
  };
  const questionIds = [
    ...learning.map((state) => state.questionId),
    ...dueReviews.map((state) => state.questionId),
    ...newQuestions,
  ];
  const reviewedToday = new Set(
    currentHistory
      .filter((review) => review.reviewedOn === dateKey)
      .map((review) => review.questionId),
  );
  const completedIds = questionIds.filter((questionId) =>
    reviewedToday.has(questionId),
  );
  const remainingIds = questionIds.filter(
    (questionId) => !reviewedToday.has(questionId),
  );

  return {
    questionIds,
    remainingIds,
    completedIds,
    counts: {
      new: buckets.new.filter((questionId) => !reviewedToday.has(questionId))
        .length,
      learning: buckets.learning.filter(
        (questionId) => !reviewedToday.has(questionId),
      ).length,
      review: buckets.review.filter(
        (questionId) => !reviewedToday.has(questionId),
      ).length,
    },
    totalCount: questionIds.length,
    completedCount: completedIds.length,
  };
}

function compareNewCards(
  leftId: string,
  rightId: string,
  identityById: ReadonlyMap<
    string,
    { question: QuestionIdentity; position: number }
  >,
  priority: ReadonlySet<string>,
) {
  const left = identityById.get(leftId);
  const right = identityById.get(rightId);
  const leftSequence = left?.question.newCardSequence;
  const rightSequence = right?.question.newCardSequence;

  if (leftSequence && rightSequence) {
    const standardDifference =
      NEW_CARD_STANDARD_ORDER.indexOf(leftSequence.standard) -
      NEW_CARD_STANDARD_ORDER.indexOf(rightSequence.standard);
    if (standardDifference !== 0) return standardDifference;

    const difficultyDifference =
      NEW_CARD_DIFFICULTY_ORDER.indexOf(leftSequence.difficulty) -
      NEW_CARD_DIFFICULTY_ORDER.indexOf(rightSequence.difficulty);
    if (difficultyDifference !== 0) return difficultyDifference;
  } else if (leftSequence) {
    return -1;
  } else if (rightSequence) {
    return 1;
  }

  const priorityDifference =
    Number(priority.has(rightId)) - Number(priority.has(leftId));
  if (priorityDifference !== 0) return priorityDifference;

  if (leftSequence && rightSequence) {
    const sequenceDifference = leftSequence.position - rightSequence.position;
    if (sequenceDifference !== 0) return sequenceDifference;
  }

  return (
    (left?.position ?? 0) - (right?.position ?? 0) ||
    leftId.localeCompare(rightId)
  );
}

export function isDueForStudy(
  state: QuestionLearningState,
  dateKey: string,
) {
  if (state.state === "new") return false;
  if (state.dueOn !== null) return state.dueOn <= dateKey;
  return state.state === "learning" || state.state === "relearning";
}

export function previewQuestionRatingIntervals(
  current: QuestionLearningState,
  reviews: readonly Review[],
  reviewedOn: string,
) {
  const history = current.contentChanged
    ? []
    : selectFsrsRevisionHistory(current, reviews).filter(
        (review) => review.reviewedOn < reviewedOn,
      );
  const preview = previewFsrsRatings(history, reviewedOn);
  return {
    again: preview.again.intervalDays,
    hard: preview.hard.intervalDays,
    good: preview.good.intervalDays,
    easy: preview.easy.intervalDays,
  } satisfies Record<Rating, number>;
}

export function learningQueuePriority(state: QuestionLearningState): number {
  if (state.suspended) return Number.POSITIVE_INFINITY;
  return {
    relearning: 0,
    learning: 1,
    review: 2,
    new: 3,
  }[state.state];
}

function newerState(
  local: QuestionLearningState,
  cloud?: QuestionLearningState,
) {
  if (!cloud) return local;
  if (cloud.state === "new" && cloud.historyResetOn) return cloud;
  if (!local.lastReviewedOn) return cloud;
  if (!cloud.lastReviewedOn) return local;
  return cloud.lastReviewedOn > local.lastReviewedOn ? cloud : local;
}

function compareQueueStates(
  left: QuestionLearningState,
  right: QuestionLearningState,
) {
  return (
    learningQueuePriority(left) - learningQueuePriority(right) ||
    (left.dueOn ?? "").localeCompare(right.dueOn ?? "") ||
    left.questionId.localeCompare(right.questionId)
  );
}
