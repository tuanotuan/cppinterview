import { describe, expect, it } from "vitest";

import { reviewSchema, rowsToLearningStates, rowsToProgress } from "./cloud";

describe("cloud progress contract", () => {
  it("maps private database rows back to scheduler reviews", () => {
    expect(
      rowsToProgress([
        {
          question_id: "cpp11-auto-001",
          reviewed_on: "2026-07-19",
          rating: "good",
          next_due_on: "2026-07-23",
          history_reset_token:
            "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
        },
      ]).reviews[0],
    ).toEqual({
      questionId: "cpp11-auto-001",
      reviewedOn: "2026-07-19",
      rating: "good",
      nextDueOn: "2026-07-23",
      historyResetToken:
        "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
    });
  });

  it("accepts adaptive intervals but rejects incomplete transition metadata", () => {
    expect(
      reviewSchema.safeParse({
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-19",
        rating: "easy",
        nextDueOn: "2026-08-20",
        questionVersion: 2,
        sourceHash: "a".repeat(64),
        stateAfter: "review",
        intervalDaysAfter: 32,
        lapseCountAfter: 1,
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-19",
        rating: "easy",
        nextDueOn: "2026-08-20",
        questionVersion: 2,
      }).success,
    ).toBe(false);
  });

  it("accepts a positive durable coach capture marker", () => {
    const baseReview = {
      questionId: "cpp11-auto-001",
      reviewedOn: "2026-07-19",
      rating: "again",
      nextDueOn: "2026-07-20",
    };

    expect(
      reviewSchema.safeParse({
        ...baseReview,
        coachAttemptId: 42,
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        ...baseReview,
        coachAttemptId: 0,
      }).success,
    ).toBe(false);
  });

  it("accepts only an ISO timestamp for a pending repair journal entry", () => {
    const baseReview = {
      questionId: "cpp11-auto-001",
      reviewedOn: "2026-07-19",
      rating: "again",
      nextDueOn: "2026-07-20",
    };

    expect(
      reviewSchema.safeParse({
        ...baseReview,
        repairPendingAt: "2026-07-19T08:30:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        ...baseReview,
        repairPendingAt: "not-a-timestamp",
      }).success,
    ).toBe(false);
  });

  it("accepts only a UUID reset generation on a newly created review", () => {
    const baseReview = {
      questionId: "cpp11-auto-001",
      reviewedOn: "2026-07-19",
      rating: "good",
      nextDueOn: "2026-07-22",
    };

    expect(
      reviewSchema.safeParse({
        ...baseReview,
        historyResetToken: "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
      }).success,
    ).toBe(true);
    expect(
      reviewSchema.safeParse({
        ...baseReview,
        historyResetToken: "not-a-reset-token",
      }).success,
    ).toBe(false);
  });

  it("maps the current private learning-state projection", () => {
    expect(
      rowsToLearningStates([
        {
          question_id: "cpp11-auto-001",
          question_version: 2,
          source_hash: "a".repeat(64),
          learning_state: "relearning",
          due_on: "2026-07-22",
          interval_days: 1,
          review_count: 4,
          lapse_count: 2,
          last_rating: "again",
          last_reviewed_on: "2026-07-21",
          is_suspended: false,
          is_leech: false,
          content_changed: false,
          history_reset_on: null,
          history_reset_token:
            "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
        },
      ])[0],
    ).toMatchObject({
      questionId: "cpp11-auto-001",
      state: "relearning",
      intervalDays: 1,
      lapseCount: 2,
      historyResetToken:
        "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86",
    });
  });
});
