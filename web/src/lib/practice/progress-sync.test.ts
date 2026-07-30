import { describe, expect, it } from "vitest";

import type { PracticeProgress, Review } from "./scheduler";
import {
  legacyReviewOutcomeMatchesMistakeCapture,
  mergeProgressAfterCloudSync,
  parseDiscardedPracticeReviews,
  parseMistakeCaptureResolutions,
  partitionReviewsForCurrentQuestions,
  parsePracticeReviewOutcome,
  practiceReviewDiscardIdentity,
  reviewOutcomeMatchesMistakeCapture,
} from "./progress-sync";

const review: Review = {
  questionId: "cpp11-auto-001",
  questionVersion: 1,
  sourceHash: "a".repeat(64),
  reviewedOn: "2026-07-30",
  rating: "again",
  nextDueOn: "2026-07-31",
  stateAfter: "learning",
  intervalDaysAfter: 1,
  lapseCountAfter: 0,
  coachAttemptId: 42,
};

describe("practice review sync outcomes", () => {
  it.each(["recorded", "already_recorded"] as const)(
    "allows idempotent mistake capture for a matching %s rating",
    (status) => {
      const outcome = parsePracticeReviewOutcome(review, {
        status,
        rating: "again",
      });

      expect(outcome).not.toBeNull();
      expect(
        reviewOutcomeMatchesMistakeCapture([outcome!], {
          coachAttemptId: review.coachAttemptId!,
          questionId: review.questionId,
          reviewedOn: review.reviewedOn,
          rating: "again",
        }),
      ).toBe(true);
    },
  );

  it("rejects mistake capture when another device's rating won", () => {
    const outcome = parsePracticeReviewOutcome(review, {
      status: "already_recorded",
      rating: "good",
    });

    expect(outcome).not.toBeNull();
    expect(
      reviewOutcomeMatchesMistakeCapture([outcome!], {
        coachAttemptId: review.coachAttemptId!,
        questionId: review.questionId,
        reviewedOn: review.reviewedOn,
        rating: "again",
      }),
    ).toBe(false);
  });

  it("does not capture a mistake from a history-only offline review", () => {
    const outcome = parsePracticeReviewOutcome(review, {
      status: "history_recorded",
      rating: "again",
    });

    expect(outcome).not.toBeNull();
    expect(
      reviewOutcomeMatchesMistakeCapture([outcome!], {
        coachAttemptId: review.coachAttemptId!,
        questionId: review.questionId,
        reviewedOn: review.reviewedOn,
        rating: "again",
      }),
    ).toBe(false);
  });

  it("does not capture a mistake from a review discarded by a reset", () => {
    const outcome = parsePracticeReviewOutcome(review, {
      status: "reset_discarded",
      rating: "again",
    });

    expect(outcome).not.toBeNull();
    expect(
      reviewOutcomeMatchesMistakeCapture([outcome!], {
        coachAttemptId: review.coachAttemptId!,
        questionId: review.questionId,
        reviewedOn: review.reviewedOn,
        rating: "again",
      }),
    ).toBe(false);
    expect(
      legacyReviewOutcomeMatchesMistakeCapture([outcome!], {
        questionId: review.questionId,
        rating: "again",
      }),
    ).toBe(false);
  });

  it("requires the exact review date and coach attempt marker", () => {
    const outcome = parsePracticeReviewOutcome(review, {
      status: "recorded",
      rating: "again",
    });

    expect(
      reviewOutcomeMatchesMistakeCapture([outcome!], {
        coachAttemptId: review.coachAttemptId! + 1,
        questionId: review.questionId,
        reviewedOn: review.reviewedOn,
        rating: "again",
      }),
    ).toBe(false);
    expect(
      reviewOutcomeMatchesMistakeCapture([outcome!], {
        coachAttemptId: review.coachAttemptId!,
        questionId: review.questionId,
        reviewedOn: "2026-07-29",
        rating: "again",
      }),
    ).toBe(false);
  });

  it("keeps the compatibility matcher for legacy separate capture payloads", () => {
    const legacyReview = { ...review };
    delete legacyReview.coachAttemptId;
    const outcome = parsePracticeReviewOutcome(legacyReview, {
      status: "recorded",
      rating: "again",
    });

    expect(
      legacyReviewOutcomeMatchesMistakeCapture([outcome!], {
        questionId: review.questionId,
        rating: "again",
      }),
    ).toBe(true);
  });

  it("rejects malformed database outcomes", () => {
    expect(
      parsePracticeReviewOutcome(review, {
        status: "recorded",
        rating: "unknown",
      }),
    ).toBeNull();
  });
});

describe("durable mistake capture merge", () => {
  const local: PracticeProgress = {
    version: 1,
    reviews: [review],
  };
  const reviewWithoutCaptureMarker = { ...review };
  delete reviewWithoutCaptureMarker.coachAttemptId;
  const authoritativeGood: PracticeProgress = {
    version: 1,
    reviews: [
      {
        ...reviewWithoutCaptureMarker,
        rating: "good",
        nextDueOn: "2026-08-03",
        stateAfter: "review",
        intervalDaysAfter: 4,
      },
    ],
  };

  it("does not let an unrelated cloud response erase a pending marker", () => {
    expect(
      mergeProgressAfterCloudSync(local, authoritativeGood, []).reviews,
    ).toEqual([review]);
  });

  it.each(["acknowledged", "discarded"] as const)(
    "applies authoritative progress after an exact %s resolution",
    (disposition) => {
      const merged = mergeProgressAfterCloudSync(
        local,
        authoritativeGood,
        [
          {
            coachAttemptId: review.coachAttemptId!,
            questionId: review.questionId,
            reviewedOn: review.reviewedOn,
            rating: review.rating,
            disposition,
          },
        ],
      );

      expect(merged.reviews).toEqual([authoritativeGood.reviews[0]]);
      expect(merged.reviews[0]).not.toHaveProperty("coachAttemptId");
    },
  );

  it("does not clear a marker with a resolution for another attempt", () => {
    const merged = mergeProgressAfterCloudSync(
      local,
      authoritativeGood,
      [
        {
          coachAttemptId: review.coachAttemptId! + 1,
          questionId: review.questionId,
          reviewedOn: review.reviewedOn,
          rating: review.rating,
          disposition: "acknowledged",
        },
      ],
    );

    expect(merged.reviews).toEqual([review]);
  });

  it("preserves a pending repair journal even after coach capture resolves", () => {
    const repairPendingReview = {
      ...review,
      repairPendingAt: "2026-07-30T08:30:00.000Z",
    };
    const merged = mergeProgressAfterCloudSync(
      { version: 1, reviews: [repairPendingReview] },
      authoritativeGood,
      [
        {
          coachAttemptId: review.coachAttemptId!,
          questionId: review.questionId,
          reviewedOn: review.reviewedOn,
          rating: review.rating,
          disposition: "acknowledged",
        },
      ],
    );

    expect(merged.reviews[0]).toMatchObject({
      rating: "good",
      repairPendingAt: repairPendingReview.repairPendingAt,
    });
    expect(merged.reviews[0]).not.toHaveProperty("coachAttemptId");
  });

  it("fails closed when the server returns malformed resolutions", () => {
    expect(
      parseMistakeCaptureResolutions([
        {
          coachAttemptId: 42,
          questionId: review.questionId,
          reviewedOn: review.reviewedOn,
          rating: "again",
          disposition: "unknown",
        },
      ]),
    ).toEqual([]);
  });

  it("removes only the exact review that the server discarded after a reset", () => {
    const discardedReviews = parseDiscardedPracticeReviews([
      practiceReviewDiscardIdentity(review),
    ]);

    expect(
      mergeProgressAfterCloudSync(
        local,
        authoritativeGood,
        [],
        discardedReviews,
      ).reviews,
    ).toEqual(authoritativeGood.reviews);
  });

  it("does not delete a concurrent current-generation review on the same day", () => {
    const stale = {
      ...review,
      historyResetToken:
        "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
    };
    const current = {
      ...review,
      historyResetToken:
        "eab7afc2-ae26-4663-b200-8c404d0a7df3",
    };

    expect(
      mergeProgressAfterCloudSync(
        { version: 1, reviews: [current] },
        { version: 1, reviews: [current] },
        [],
        [practiceReviewDiscardIdentity(stale)],
      ).reviews,
    ).toEqual([current]);
  });

  it("fails closed when discarded review identities are malformed", () => {
    expect(
      parseDiscardedPracticeReviews([
        {
          questionId: "../another-question",
          reviewedOn: review.reviewedOn,
        },
      ]),
    ).toEqual([]);
  });
});

describe("review identity filtering", () => {
  const currentQuestion = {
    id: review.questionId,
    version: review.questionVersion!,
    sourceHash: review.sourceHash!,
  };

  it("keeps current and legacy reviews for active questions", () => {
    const legacyReview: Review = {
      questionId: review.questionId,
      reviewedOn: "2026-07-29",
      rating: "good",
      nextDueOn: "2026-08-02",
    };

    expect(
      partitionReviewsForCurrentQuestions(
        [review, legacyReview],
        [currentQuestion],
      ),
    ).toEqual({
      accepted: [review, legacyReview],
      discarded: [],
    });
  });

  it("isolates archived, stale-content, and partial reviews", () => {
    const archived = {
      ...review,
      questionId: "archived-question",
    };
    const staleContent = {
      ...review,
      questionVersion: review.questionVersion! + 1,
    };
    const partialTransition: Review = {
      questionId: review.questionId,
      reviewedOn: "2026-07-28",
      rating: "hard",
      nextDueOn: "2026-07-30",
      questionVersion: review.questionVersion,
    };

    expect(
      partitionReviewsForCurrentQuestions(
        [archived, staleContent, partialTransition],
        [currentQuestion],
      ),
    ).toEqual({
      accepted: [],
      discarded: [
        {
          review: archived,
          reason: "question_unavailable",
        },
        {
          review: staleContent,
          reason: "content_identity_changed",
        },
        {
          review: partialTransition,
          reason: "incomplete_transition",
        },
      ],
    });
  });
});
