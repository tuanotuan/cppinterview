import {
  Rating as FsrsRating,
  createEmptyCard,
  fsrs,
  type Card,
  type Grade,
} from "ts-fsrs";

import type { Rating, Review } from "./scheduler";

export const FSRS_SCHEDULER_VERSION = "fsrs-6-default-v1" as const;
export const FSRS_DESIRED_RETENTION = 0.9;
export const FSRS_MAXIMUM_INTERVAL_DAYS = 36_500;
export const FSRS_WEIGHTS = [
  0.212,
  1.2931,
  2.3065,
  8.2956,
  6.4133,
  0.8334,
  3.0194,
  0.001,
  1.8722,
  0.1666,
  0.796,
  1.4835,
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912,
  0.0658,
  0.1542,
] as const;

export type FsrsReviewOutcome = {
  dueOn: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  stability: number;
  difficulty: number;
};

export type FsrsRatingPreview = Record<Rating, FsrsReviewOutcome>;

const scheduler = fsrs({
  request_retention: FSRS_DESIRED_RETENTION,
  maximum_interval: FSRS_MAXIMUM_INTERVAL_DAYS,
  // Pin the FSRS 6 defaults to this scheduler version so a dependency update
  // cannot silently move existing due dates.
  w: FSRS_WEIGHTS,
  enable_fuzz: false,
  // cppinterview records one durable answer per card/day. Let FSRS choose the
  // next day directly instead of pretending that minute learning steps can be
  // persisted by this product's date-level review log.
  enable_short_term: false,
});

const ratingMap: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

const ratings: Rating[] = ["again", "hard", "good", "easy"];

export function selectFsrsRevisionHistory(
  {
    questionId,
    questionVersion,
    sourceHash,
  }: {
    questionId: string;
    questionVersion: number;
    sourceHash: string | null;
  },
  reviews: readonly Review[],
) {
  const questionHistory = canonicalFsrsHistory(
    reviews.filter((review) => review.questionId === questionId),
  );
  const exactHistory = questionHistory.filter(
    (review) =>
      review.questionVersion === questionVersion &&
      review.sourceHash === sourceHash,
  );
  if (exactHistory.length > 0) return exactHistory;

  const hasRevisionBoundHistory = questionHistory.some(
    (review) =>
      review.questionVersion !== undefined || review.sourceHash !== undefined,
  );
  return hasRevisionBoundHistory ? [] : questionHistory;
}

export function replayFsrsCard(
  reviews: readonly Review[],
  anchorDate: string,
) {
  const history = canonicalFsrsHistory(reviews);
  let card = createEmptyCard(reviewDate(history[0]?.reviewedOn ?? anchorDate));
  for (const review of history) {
    card = scheduler.next(
      card,
      reviewDate(review.reviewedOn),
      ratingMap[review.rating],
    ).card;
  }
  return card;
}

export function previewFsrsRatings(
  reviews: readonly Review[],
  reviewedOn: string,
): FsrsRatingPreview {
  const card = replayFsrsCard(reviews, reviewedOn);
  const preview = scheduler.repeat(card, reviewDate(reviewedOn));
  return Object.fromEntries(
    ratings.map((rating) => [
      rating,
      outcomeFromCard(preview[ratingMap[rating]].card, reviewedOn),
    ]),
  ) as FsrsRatingPreview;
}

export function applyFsrsRating(
  reviews: readonly Review[],
  rating: Rating,
  reviewedOn: string,
) {
  const card = replayFsrsCard(reviews, reviewedOn);
  return outcomeFromCard(
    scheduler.next(card, reviewDate(reviewedOn), ratingMap[rating]).card,
    reviewedOn,
  );
}

export function currentFsrsOutcome(card: Card) {
  return {
    dueOn: dateKey(card.due),
    intervalDays: Math.max(1, card.scheduled_days),
    reviewCount: card.reps,
    lapseCount: card.lapses,
    stability: card.stability,
    difficulty: card.difficulty,
  } satisfies FsrsReviewOutcome;
}

export function getFsrsRetrievability(card: Card, asOf: string) {
  return scheduler.get_retrievability(card, reviewDate(asOf), false);
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dateDifferenceDays(from: string, to: string) {
  return Math.round(
    (reviewDate(to).getTime() - reviewDate(from).getTime()) / 86_400_000,
  );
}

function outcomeFromCard(card: Card, reviewedOn: string): FsrsReviewOutcome {
  const dueOn = dateKey(card.due);
  return {
    dueOn,
    intervalDays: Math.max(1, dateDifferenceDays(reviewedOn, dueOn)),
    reviewCount: card.reps,
    lapseCount: card.lapses,
    stability: card.stability,
    difficulty: card.difficulty,
  };
}

function canonicalFsrsHistory(reviews: readonly Review[]) {
  const byDate = new Map<string, Review>();
  for (const review of [...reviews].sort((left, right) =>
    left.reviewedOn.localeCompare(right.reviewedOn),
  )) {
    byDate.set(review.reviewedOn, review);
  }
  return [...byDate.values()];
}

function reviewDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}
