import type { QuestionIdentity } from "./learning-state";
import type { Review } from "./scheduler";
import {
  FSRS_SCHEDULER_VERSION,
  currentFsrsOutcome,
  dateDifferenceDays,
  getFsrsRetrievability,
  replayFsrsCard,
} from "./fsrs-scheduler";

export const FSRS_SHADOW_VERSION = FSRS_SCHEDULER_VERSION;

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
      const card = replayFsrsCard(sorted, sorted[0].reviewedOn);
      const fsrs = currentFsrsOutcome(card);
      const retrievability = getFsrsRetrievability(card, asOf);
      const latest = sorted.at(-1)!;
      const shadowDueOn = fsrs.dueOn;
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
          shadowIntervalDays: fsrs.intervalDays,
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

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: readonly number[]) {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}
