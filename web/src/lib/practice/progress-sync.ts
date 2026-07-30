import { z } from "zod";

import {
  mergeProgress,
  type PracticeProgress,
  type Rating,
  type Review,
} from "./scheduler";

const reviewOutcomeSchema = z.object({
  status: z.enum([
    "recorded",
    "already_recorded",
    "history_recorded",
    "reset_discarded",
  ]),
  rating: z.enum(["again", "hard", "good", "easy"]),
});

const discardedPracticeReviewSchema = z.object({
  questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rating: z.enum(["again", "hard", "good", "easy"]),
  nextDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questionVersion: z.number().int().positive().optional(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  stateAfter: z.enum(["learning", "review", "relearning"]).optional(),
  intervalDaysAfter: z.number().int().positive().optional(),
  lapseCountAfter: z.number().int().nonnegative().optional(),
  historyResetToken: z.string().uuid().optional(),
  coachAttemptId: z.number().int().positive().optional(),
  repairPendingAt: z.string().datetime({ offset: true }).optional(),
});

const mistakeCaptureResolutionSchema = z.object({
  coachAttemptId: z.number().int().positive(),
  questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rating: z.enum(["again", "hard", "good", "easy"]),
  disposition: z.enum(["acknowledged", "discarded"]),
});

export type PracticeReviewOutcome = {
  review: Review;
  status:
    | "recorded"
    | "already_recorded"
    | "history_recorded"
    | "reset_discarded";
  rating: Rating;
};

export type DiscardedPracticeReviewIdentity = z.infer<
  typeof discardedPracticeReviewSchema
>;

export type MistakeCaptureMarker = {
  coachAttemptId: number;
  questionId: string;
  reviewedOn: string;
  rating: Rating;
};

export type MistakeCaptureResolution = MistakeCaptureMarker & {
  disposition: "acknowledged" | "discarded";
};

export type CurrentQuestionIdentity = {
  id: string;
  version: number;
  sourceHash: string;
};

export type DiscardedPracticeReview = {
  review: Review;
  reason:
    | "question_unavailable"
    | "content_identity_changed"
    | "incomplete_transition";
};

export function parsePracticeReviewOutcome(
  review: Review,
  value: unknown,
): PracticeReviewOutcome | null {
  const parsed = reviewOutcomeSchema.safeParse(value);
  return parsed.success
    ? {
        review,
        status: parsed.data.status,
        rating: parsed.data.rating,
      }
    : null;
}

export function reviewOutcomeMatchesMistakeCapture(
  outcomes: PracticeReviewOutcome[],
  capture: MistakeCaptureMarker,
) {
  return outcomes.some(
    (outcome) =>
      (outcome.status === "recorded" ||
        outcome.status === "already_recorded") &&
      outcome.review.questionId === capture.questionId &&
      outcome.review.reviewedOn === capture.reviewedOn &&
      outcome.review.rating === capture.rating &&
      outcome.review.coachAttemptId === capture.coachAttemptId &&
      outcome.rating === capture.rating,
  );
}

export function legacyReviewOutcomeMatchesMistakeCapture(
  outcomes: PracticeReviewOutcome[],
  capture: {
    questionId: string;
    rating: "again" | "hard";
  },
) {
  return outcomes.some(
    (outcome) =>
      (outcome.status === "recorded" ||
        outcome.status === "already_recorded") &&
      outcome.review.questionId === capture.questionId &&
      outcome.review.rating === capture.rating &&
      outcome.rating === capture.rating,
  );
}

export function mistakeCaptureMarkerKey(marker: MistakeCaptureMarker) {
  return [
    marker.questionId,
    marker.reviewedOn,
    marker.rating,
    marker.coachAttemptId,
  ].join(":");
}

export function parseMistakeCaptureResolutions(value: unknown) {
  const parsed = z
    .array(mistakeCaptureResolutionSchema)
    .max(600)
    .safeParse(value);
  return parsed.success
    ? (parsed.data as MistakeCaptureResolution[])
    : [];
}

export function parseDiscardedPracticeReviews(value: unknown) {
  const parsed = z
    .array(discardedPracticeReviewSchema)
    .max(600)
    .safeParse(value);
  return parsed.success
    ? (parsed.data as DiscardedPracticeReviewIdentity[])
    : [];
}

export function practiceReviewDiscardIdentity(
  review: Review,
): DiscardedPracticeReviewIdentity {
  return discardedPracticeReviewSchema.parse(review);
}

export function practiceReviewDiscardIdentityKey(
  review: DiscardedPracticeReviewIdentity,
) {
  return JSON.stringify([
    review.questionId,
    review.reviewedOn,
    review.rating,
    review.nextDueOn,
    review.questionVersion ?? null,
    review.sourceHash ?? null,
    review.stateAfter ?? null,
    review.intervalDaysAfter ?? null,
    review.lapseCountAfter ?? null,
    review.historyResetToken ?? null,
    review.coachAttemptId ?? null,
    review.repairPendingAt ?? null,
  ]);
}

export function mergeProgressAfterCloudSync(
  local: PracticeProgress,
  cloud: PracticeProgress,
  resolutions: MistakeCaptureResolution[],
  discardedReviews: DiscardedPracticeReviewIdentity[] = [],
) {
  const discarded = new Set(
    discardedReviews.map(practiceReviewDiscardIdentityKey),
  );
  const resolved = new Set(
    resolutions.map(mistakeCaptureMarkerKey),
  );
  const localWithoutResolvedMarkers: PracticeProgress = {
    version: local.version,
    reviews: local.reviews
      .filter(
        (review) =>
          !discarded.has(
            practiceReviewDiscardIdentityKey(
              practiceReviewDiscardIdentity(review),
            ),
          ),
      )
      .map((review) => {
        if (review.coachAttemptId === undefined) return review;
        const marker: MistakeCaptureMarker = {
          coachAttemptId: review.coachAttemptId,
          questionId: review.questionId,
          reviewedOn: review.reviewedOn,
          rating: review.rating,
        };
        if (!resolved.has(mistakeCaptureMarkerKey(marker))) return review;
        const acknowledgedReview = { ...review };
        delete acknowledgedReview.coachAttemptId;
        return acknowledgedReview;
      }),
  };
  const cloudWithoutDiscarded: PracticeProgress = {
    version: cloud.version,
    reviews: cloud.reviews.filter(
      (review) =>
        !discarded.has(
          practiceReviewDiscardIdentityKey(
            practiceReviewDiscardIdentity(review),
          ),
        ),
    ),
  };
  const pendingCoach = new Map<string, Review>(
    localWithoutResolvedMarkers.reviews
      .filter((review) => review.coachAttemptId !== undefined)
      .map((review) => [
        `${review.questionId}:${review.reviewedOn}`,
        review,
      ]),
  );
  const pendingRepair = new Map<string, string>(
    localWithoutResolvedMarkers.reviews.flatMap((review) =>
      review.repairPendingAt === undefined
        ? []
        : [
            [
              `${review.questionId}:${review.reviewedOn}`,
              review.repairPendingAt,
            ] as const,
          ],
    ),
  );
  const merged = mergeProgress(
    localWithoutResolvedMarkers,
    cloudWithoutDiscarded,
  );

  return {
    ...merged,
    reviews: merged.reviews.map((review) => {
      const key = `${review.questionId}:${review.reviewedOn}` as const;
      const pendingCoachReview = pendingCoach.get(key);
      if (pendingCoachReview) return pendingCoachReview;
      const repairPendingAt = pendingRepair.get(key);
      return repairPendingAt
        ? { ...review, repairPendingAt }
        : review;
    }),
  };
}

export function partitionReviewsForCurrentQuestions(
  reviews: Review[],
  questions: CurrentQuestionIdentity[],
) {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const accepted: Review[] = [];
  const discarded: DiscardedPracticeReview[] = [];

  for (const review of reviews) {
    const question = questionById.get(review.questionId);
    if (!question) {
      discarded.push({ review, reason: "question_unavailable" });
      continue;
    }
    const transitionValues = [
      review.questionVersion,
      review.sourceHash,
      review.stateAfter,
      review.intervalDaysAfter,
      review.lapseCountAfter,
    ];
    const supplied = transitionValues.filter(
      (value) => value !== undefined,
    ).length;
    if (supplied > 0 && supplied < transitionValues.length) {
      discarded.push({ review, reason: "incomplete_transition" });
      continue;
    }
    if (
      supplied === transitionValues.length &&
      (review.questionVersion !== question.version ||
        review.sourceHash !== question.sourceHash)
    ) {
      discarded.push({
        review,
        reason: "content_identity_changed",
      });
      continue;
    }
    accepted.push(review);
  }

  return { accepted, discarded };
}
