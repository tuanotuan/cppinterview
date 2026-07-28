import {
  Rating as FsrsRating,
  createEmptyCard,
  fsrs,
  type Card,
  type Grade,
} from "ts-fsrs";

import type { QuestionIdentity } from "./learning-state";
import type { Rating, Review } from "./scheduler";

export const FSRS_SHADOW_VERSION = "fsrs-6-default-v1" as const;

export type FsrsShadowCard = {
  questionId: string;
  questionVersion: number;
  sourceHash: string;
  schedulerVersion: typeof FSRS_SHADOW_VERSION;
  reviewCount: number;
  actualDueOn: string | null;
  shadowDueOn: string;
  shadowIntervalDays: number;
  retrievabilityPercent: number;
  stability: number;
  difficulty: number;
  dueDeltaDays: number | null;
};

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36_500,
  enable_fuzz: false,
  enable_short_term: false,
});

const ratingMap: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

export function buildFsrsShadowCards({
  questionIdentities,
  reviews,
  asOf,
}: {
  questionIdentities: readonly QuestionIdentity[];
  reviews: readonly Review[];
  asOf: string;
}): FsrsShadowCard[] {
  const currentById = new Map(
    questionIdentities.map((question) => [question.id, question]),
  );
  const byQuestion = new Map<string, Review[]>();
  for (const review of reviews) {
    if (review.reviewedOn > asOf) continue;
    const current = currentById.get(review.questionId);
    if (
      !current ||
      review.questionVersion !== current.version ||
      review.sourceHash !== current.sourceHash
    ) {
      continue;
    }
    const history = byQuestion.get(review.questionId) ?? [];
    history.push(review);
    byQuestion.set(review.questionId, history);
  }
  return [...byQuestion.entries()]
    .flatMap(([questionId, history]) => {
      const sorted = [...history].sort(
        (left, right) =>
          left.reviewedOn.localeCompare(right.reviewedOn) ||
          left.rating.localeCompare(right.rating),
      );
      if (!sorted.length) return [];
      let card: Card = createEmptyCard(
        reviewDate(sorted[0].reviewedOn),
      );
      for (const review of sorted) {
        card = scheduler.next(
          card,
          reviewDate(review.reviewedOn),
          ratingMap[review.rating],
        ).card;
      }
      const asOfDate = reviewDate(asOf);
      const retrievability = scheduler.get_retrievability(
        card,
        asOfDate,
        false,
      );
      const latest = sorted.at(-1)!;
      const shadowDueOn = dateKey(card.due);
      const identity = currentById.get(questionId)!;
      return [
        {
          questionId,
          questionVersion: identity.version,
          sourceHash: identity.sourceHash,
          schedulerVersion: FSRS_SHADOW_VERSION,
          reviewCount: sorted.length,
          actualDueOn: latest.nextDueOn ?? null,
          shadowDueOn,
          shadowIntervalDays: Math.max(
            0,
            dateDifferenceDays(latest.reviewedOn, shadowDueOn),
          ),
          retrievabilityPercent: Math.round(
            Math.max(0, Math.min(1, retrievability)) * 100,
          ),
          stability: round(card.stability),
          difficulty: round(card.difficulty),
          dueDeltaDays: latest.nextDueOn
            ? dateDifferenceDays(latest.nextDueOn, shadowDueOn)
            : null,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.questionId.localeCompare(right.questionId) ||
        left.questionVersion - right.questionVersion ||
        left.sourceHash.localeCompare(right.sourceHash),
    );
}

export function summarizeFsrsShadow(
  cards: readonly FsrsShadowCard[],
) {
  const comparable = cards.filter(
    (
      card,
    ): card is FsrsShadowCard & {
      dueDeltaDays: number;
    } => card.dueDeltaDays !== null,
  );
  return {
    schedulerVersion: FSRS_SHADOW_VERSION,
    cardCount: cards.length,
    comparableCardCount: comparable.length,
    averageRetrievabilityPercent: average(
      cards.map((card) => card.retrievabilityPercent),
    ),
    averageDueDeltaDays: average(
      comparable.map((card) => card.dueDeltaDays),
    ),
    earlierCount: comparable.filter(
      (card) => card.dueDeltaDays < 0,
    ).length,
    sameCount: comparable.filter(
      (card) => card.dueDeltaDays === 0,
    ).length,
    laterCount: comparable.filter(
      (card) => card.dueDeltaDays > 0,
    ).length,
  };
}

function reviewDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateDifferenceDays(from: string, to: string) {
  return Math.round(
    (reviewDate(to).getTime() - reviewDate(from).getTime()) /
      86_400_000,
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: readonly number[]) {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}
