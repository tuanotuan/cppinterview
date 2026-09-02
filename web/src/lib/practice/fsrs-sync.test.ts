import { describe, expect, it } from "vitest";

import { newQuestionLearningState } from "./learning-state";
import {
  normalizeReviewWithFsrs,
  replaceDailyReview,
} from "./fsrs-sync";
import type { Review } from "./scheduler";

const resetToken = "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86";
const staleToken = "eab7afc2-ae26-4663-b200-8c404d0a7df3";
const state = {
  ...newQuestionLearningState({
    questionId: "cpp11-lifetime-001",
    questionVersion: 2,
    sourceHash: "a".repeat(64),
  }),
  historyResetToken: resetToken,
};

describe("FSRS cloud-sync normalization", () => {
  it("recomputes client transition fields while preserving durable markers", () => {
    const input: Review = {
      questionId: state.questionId,
      reviewedOn: "2026-09-02",
      rating: "good",
      nextDueOn: "2099-01-01",
      intervalDaysAfter: 999,
      coachAttemptId: 42,
      repairPendingAt: "2026-09-02T01:02:03.000Z",
      historyResetToken: resetToken,
    };

    expect(normalizeReviewWithFsrs(state, input, []).review).toMatchObject({
      questionId: state.questionId,
      reviewedOn: "2026-09-02",
      rating: "good",
      nextDueOn: "2026-09-05",
      intervalDaysAfter: 3,
      lapseCountAfter: 0,
      historyResetToken: resetToken,
      coachAttemptId: 42,
      repairPendingAt: "2026-09-02T01:02:03.000Z",
    });
  });

  it("does not silently upgrade a queued review to a newer reset generation", () => {
    const stale = normalizeReviewWithFsrs(
      state,
      {
        questionId: state.questionId,
        reviewedOn: "2026-09-02",
        rating: "hard",
        nextDueOn: "2026-09-04",
        historyResetToken: staleToken,
      },
      [],
    ).review;
    const legacy = normalizeReviewWithFsrs(
      state,
      {
        questionId: state.questionId,
        reviewedOn: "2026-09-02",
        rating: "hard",
        nextDueOn: "2026-09-04",
      },
      [],
    ).review;

    expect(stale.historyResetToken).toBe(staleToken);
    expect(legacy.historyResetToken).toBeUndefined();
  });

  it("replaces one question/day without disturbing other history", () => {
    const previous: Review = {
      questionId: state.questionId,
      reviewedOn: "2026-09-02",
      rating: "again",
      nextDueOn: "2026-09-03",
    };
    const other: Review = {
      ...previous,
      questionId: "cpp14-lambda-001",
    };
    const replacement = { ...previous, rating: "good" as const };

    expect(replaceDailyReview([previous, other], replacement)).toEqual([
      other,
      replacement,
    ]);
  });
});
