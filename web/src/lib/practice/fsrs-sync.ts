import {
  scheduleQuestionReview,
  type QuestionLearningState,
} from "./learning-state";
import type { Review } from "./scheduler";

export function normalizeReviewWithFsrs(
  current: QuestionLearningState,
  review: Review,
  history: readonly Review[],
) {
  const scheduled = scheduleQuestionReview(
    current,
    review.rating,
    review.reviewedOn,
    history,
  );
  const normalized = { ...scheduled.review };

  // The generation belongs to the queued request, not the latest cloud state.
  // Keeping it intact lets the RPC reject reviews created before a reset.
  if (review.historyResetToken === undefined) {
    delete normalized.historyResetToken;
  } else {
    normalized.historyResetToken = review.historyResetToken;
  }
  if (review.coachAttemptId !== undefined) {
    normalized.coachAttemptId = review.coachAttemptId;
  }
  if (review.repairPendingAt !== undefined) {
    normalized.repairPendingAt = review.repairPendingAt;
  }

  return { state: scheduled.state, review: normalized };
}

export function replaceDailyReview(
  history: readonly Review[],
  review: Review,
) {
  return [
    ...history.filter(
      (existing) =>
        existing.questionId !== review.questionId ||
        existing.reviewedOn !== review.reviewedOn,
    ),
    review,
  ];
}
