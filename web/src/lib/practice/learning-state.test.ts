import { describe, expect, it } from "vitest";

import {
  buildAnkiDailyPlan,
  buildLearningStates,
  deriveLearningStateFromReviews,
  filterReviewsForLearningHistory,
  isDueForStudy,
  learningQueuePriority,
  newQuestionLearningState,
  ratingIntervalDays,
  scheduleQuestionReview,
} from "./learning-state";
import type { Review } from "./scheduler";

describe("Anki-style learning-state foundation", () => {
  it("creates an unseen question as New", () => {
    expect(
      newQuestionLearningState({
        questionId: "cpp11-auto-001",
        questionVersion: 2,
        sourceHash: "a".repeat(64),
      }),
    ).toMatchObject({
      state: "new",
      dueOn: null,
      intervalDays: 0,
      reviewCount: 0,
      lapseCount: 0,
    });
  });

  it("backfills existing history without treating the first Again as a lapse", () => {
    const reviews: Review[] = [
      {
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-10",
        rating: "again",
        nextDueOn: "2026-07-11",
      },
      {
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-11",
        rating: "good",
        nextDueOn: "2026-07-15",
      },
      {
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-15",
        rating: "again",
        nextDueOn: "2026-07-16",
      },
    ];

    expect(
      deriveLearningStateFromReviews("cpp11-auto-001", reviews),
    ).toMatchObject({
      state: "relearning",
      dueOn: "2026-07-16",
      intervalDays: 1,
      reviewCount: 3,
      lapseCount: 1,
      lastRating: "again",
    });
  });

  it("orders relearning, learning, and review before new and excludes suspended", () => {
    const base = newQuestionLearningState({
      questionId: "cpp11-auto-001",
      questionVersion: 1,
      sourceHash: "a".repeat(64),
    });

    expect(
      ["relearning", "learning", "review", "new"].map((state) =>
        learningQueuePriority({
          ...base,
          state: state as typeof base.state,
        }),
      ),
    ).toEqual([0, 1, 2, 3]);
    expect(learningQueuePriority({ ...base, suspended: true })).toBe(Infinity);
  });

  it("graduates New cards and lapses Review cards into Relearning", () => {
    const fresh = newQuestionLearningState({
      questionId: "cpp11-auto-001",
      questionVersion: 2,
      sourceHash: "a".repeat(64),
    });
    const learned = scheduleQuestionReview(fresh, "good", "2026-07-21");
    const forgotten = scheduleQuestionReview(
      { ...learned.state, intervalDays: 10 },
      "again",
      "2026-07-24",
    );

    expect(learned.state).toMatchObject({
      state: "review",
      dueOn: "2026-07-24",
      intervalDays: 3,
      reviewCount: 1,
    });
    expect(learned.review).toMatchObject({
      questionVersion: 2,
      stateAfter: "review",
      intervalDaysAfter: 3,
      lapseCountAfter: 0,
    });
    expect(forgotten.state).toMatchObject({
      state: "relearning",
      dueOn: "2026-07-25",
      lapseCount: 1,
    });
  });

  it("binds the first post-reset review to its exact reset generation", () => {
    const resetToken =
      "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86";
    const reset = {
      ...newQuestionLearningState({
        questionId: "cpp11-auto-001",
        questionVersion: 2,
        sourceHash: "a".repeat(64),
      }),
      historyResetOn: "2026-07-21",
      historyResetToken: resetToken,
    };

    const scheduled = scheduleQuestionReview(
      reset,
      "good",
      "2026-07-21",
    );

    expect(scheduled.review.historyResetToken).toBe(resetToken);
    expect(scheduled.state).toMatchObject({
      historyResetOn: "2026-07-21",
      historyResetToken: resetToken,
    });
  });

  it("keeps only reviews from the current durable history generation", () => {
    const currentToken =
      "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86";
    const staleToken =
      "eab7afc2-ae26-4663-b200-8c404d0a7df3";
    const state = {
      ...newQuestionLearningState({
        questionId: "cpp11-auto-001",
        questionVersion: 2,
        sourceHash: "a".repeat(64),
      }),
      historyResetOn: "2026-07-21",
      historyResetToken: currentToken,
    };
    const baseReview: Review = {
      questionId: state.questionId,
      reviewedOn: "2026-07-21",
      rating: "good",
      nextDueOn: "2026-07-24",
    };

    expect(
      filterReviewsForLearningHistory(
        [
          { ...baseReview, historyResetToken: staleToken },
          { ...baseReview, historyResetToken: currentToken },
          baseReview,
        ],
        [state],
      ),
    ).toEqual([
      { ...baseReview, historyResetToken: currentToken },
    ]);
  });

  it("grows Review intervals according to Hard, Good, and Easy", () => {
    const review = {
      ...newQuestionLearningState({
        questionId: "cpp11-auto-001",
        questionVersion: 1,
        sourceHash: "a".repeat(64),
      }),
      state: "review" as const,
      intervalDays: 10,
      dueOn: "2026-07-21",
      reviewCount: 2,
    };

    expect(ratingIntervalDays(review, "hard")).toBe(12);
    expect(ratingIntervalDays(review, "good")).toBe(22);
    expect(ratingIntervalDays(review, "easy")).toBe(32);
  });

  it("builds one stable daily plan with Learning and Due before New", () => {
    const questions = [
      "new-a",
      "new-b",
      "review-a",
      "review-b",
      "review-future",
      "review-suspended",
      "learn-a",
      "relearn-a",
    ].map((id) => ({ id, version: 1, sourceHash: "a".repeat(64) }));
    const states = buildLearningStates(questions, []);
    states.set("review-a", {
      ...states.get("review-a")!,
      state: "review",
      dueOn: "2026-07-20",
      intervalDays: 4,
      reviewCount: 1,
      lastRating: "good",
      lastReviewedOn: "2026-07-16",
    });
    states.set("review-b", {
      ...states.get("review-b")!,
      state: "review",
      dueOn: "2026-07-20",
      intervalDays: 4,
      reviewCount: 1,
      lastRating: "good",
      lastReviewedOn: "2026-07-16",
    });
    states.set("review-future", {
      ...states.get("review-future")!,
      state: "review",
      dueOn: "2026-07-22",
      intervalDays: 4,
      reviewCount: 1,
      lastRating: "good",
      lastReviewedOn: "2026-07-18",
    });
    states.set("review-suspended", {
      ...states.get("review-suspended")!,
      state: "review",
      dueOn: "2026-07-20",
      intervalDays: 4,
      reviewCount: 1,
      lastRating: "good",
      lastReviewedOn: "2026-07-16",
      suspended: true,
    });
    states.set("learn-a", {
      ...states.get("learn-a")!,
      state: "learning",
      dueOn: "2026-07-21",
      intervalDays: 1,
      reviewCount: 1,
      lastRating: "again",
      lastReviewedOn: "2026-07-20",
    });
    states.set("relearn-a", {
      ...states.get("relearn-a")!,
      state: "relearning",
      dueOn: "2026-07-21",
      intervalDays: 1,
      reviewCount: 2,
      lastRating: "again",
      lastReviewedOn: "2026-07-20",
    });

    const firstPlan = buildAnkiDailyPlan(
      questions,
      [],
      [...states.values()],
      "2026-07-21",
      { newLimit: 1, reviewLimit: 1 },
    );
    const selectedNew = firstPlan.questionIds.at(-1)!;

    expect(firstPlan.questionIds).toEqual([
      "relearn-a",
      "learn-a",
      "review-a",
      selectedNew,
    ]);
    expect(selectedNew).toMatch(/^new-/);
    expect(firstPlan.counts).toEqual({
      new: 1,
      learning: 2,
      review: 1,
    });
    expect(firstPlan).toMatchObject({
      completedCount: 0,
      totalCount: 4,
    });

    const scheduled = scheduleQuestionReview(
      states.get(selectedNew)!,
      "good",
      "2026-07-21",
    );
    const cloudAfterReview = new Map(states);
    cloudAfterReview.set(selectedNew, scheduled.state);
    const afterReload = buildAnkiDailyPlan(
      questions,
      [scheduled.review],
      [...cloudAfterReview.values()],
      "2026-07-21",
      { newLimit: 1, reviewLimit: 1 },
    );

    expect(afterReload.questionIds).toEqual(firstPlan.questionIds);
    expect(afterReload.remainingIds).not.toContain(selectedNew);
    expect(afterReload.remainingIds).not.toContain(
      selectedNew === "new-a" ? "new-b" : "new-a",
    );
    expect(afterReload.counts).toEqual({
      new: 0,
      learning: 2,
      review: 1,
    });
    expect(afterReload).toMatchObject({
      completedCount: 1,
      totalCount: 4,
    });

    const nextDay = buildAnkiDailyPlan(
      questions,
      [scheduled.review],
      [...cloudAfterReview.values()],
      "2026-07-22",
      { newLimit: 1, reviewLimit: 1 },
    );
    expect(nextDay.counts.new).toBe(1);
    expect(nextDay.questionIds.at(-1)).toBe(
      selectedNew === "new-a" ? "new-b" : "new-a",
    );
  });

  it("does not refill the daily Review quota after a due card is completed", () => {
    const sourceHash = "a".repeat(64);
    const questions = ["review-a", "review-b"].map((id) => ({
      id,
      version: 1,
      sourceHash,
    }));
    const history: Review[] = questions.map((question) => ({
      questionId: question.id,
      questionVersion: question.version,
      sourceHash,
      reviewedOn: "2026-07-16",
      rating: "good",
      nextDueOn: "2026-07-20",
      stateAfter: "review",
      intervalDaysAfter: 4,
      lapseCountAfter: 0,
    }));
    const states = buildLearningStates(questions, history);
    const firstPlan = buildAnkiDailyPlan(
      questions,
      history,
      [],
      "2026-07-21",
      { newLimit: 0, reviewLimit: 1 },
    );
    expect(firstPlan.questionIds).toEqual(["review-a"]);

    const scheduled = scheduleQuestionReview(
      states.get("review-a")!,
      "good",
      "2026-07-21",
    );
    const afterReload = buildAnkiDailyPlan(
      questions,
      [...history, scheduled.review],
      [scheduled.state],
      "2026-07-21",
      { newLimit: 0, reviewLimit: 1 },
    );

    expect(afterReload.questionIds).toEqual(["review-a"]);
    expect(afterReload.remainingIds).toEqual([]);
    expect(afterReload.counts.review).toBe(0);
    expect(afterReload.completedCount).toBe(1);
  });

  it("treats content-changed Learning cards with no due date as due", () => {
    const state = {
      ...newQuestionLearningState({
        questionId: "changed",
        questionVersion: 2,
        sourceHash: "b".repeat(64),
      }),
      state: "learning" as const,
      contentChanged: true,
    };

    expect(isDueForStudy(state, "2026-07-21")).toBe(true);
    expect(
      isDueForStudy({ ...state, state: "new" }, "2026-07-21"),
    ).toBe(false);
  });

  it("keeps a reset generation on one stable New slot across reloads", () => {
    const sourceHash = "a".repeat(64);
    const questions = ["reset-card", "other-new"].map((id) => ({
      id,
      version: 1,
      sourceHash,
    }));
    const resetToken = "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86";
    const resetState = {
      ...newQuestionLearningState({
        questionId: "reset-card",
        questionVersion: 1,
        sourceHash,
      }),
      historyResetOn: "2026-07-21",
      historyResetToken: resetToken,
    };
    const firstPlan = buildAnkiDailyPlan(
      questions,
      [
        {
          questionId: "reset-card",
          reviewedOn: "2026-07-20",
          rating: "good",
          nextDueOn: "2026-07-24",
        },
      ],
      [resetState],
      "2026-07-21",
      {
        newLimit: 1,
        priorityQuestionIds: ["reset-card"],
      },
    );
    expect(firstPlan.questionIds).toEqual(["reset-card"]);

    const scheduled = scheduleQuestionReview(
      resetState,
      "good",
      "2026-07-21",
    );
    const afterReload = buildAnkiDailyPlan(
      questions,
      [scheduled.review, scheduled.review],
      [scheduled.state],
      "2026-07-21",
      {
        newLimit: 1,
        priorityQuestionIds: ["reset-card"],
      },
    );
    expect(afterReload.questionIds).toEqual(["reset-card"]);
    expect(afterReload.remainingIds).toEqual([]);
    expect(afterReload.completedCount).toBe(1);
  });

  it("uses extended review metadata when restoring a state", () => {
    const restored = deriveLearningStateFromReviews("cpp11-auto-001", [
      {
        questionId: "cpp11-auto-001",
        questionVersion: 3,
        sourceHash: "b".repeat(64),
        reviewedOn: "2026-07-21",
        rating: "hard",
        nextDueOn: "2026-08-02",
        stateAfter: "review",
        intervalDaysAfter: 12,
        lapseCountAfter: 4,
      },
    ]);

    expect(restored).toMatchObject({
      questionVersion: 3,
      sourceHash: "b".repeat(64),
      state: "review",
      intervalDays: 12,
      lapseCount: 4,
    });
  });

  it("prefers the authoritative cloud projection when review dates tie", () => {
    const questions = [
      { id: "cpp11-auto-001", version: 1, sourceHash: "a".repeat(64) },
    ];
    const reviews: Review[] = [
      {
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-21",
        rating: "good",
        nextDueOn: "2026-07-25",
      },
    ];
    const local = deriveLearningStateFromReviews(
      "cpp11-auto-001",
      reviews,
      1,
      "a".repeat(64),
    );
    const states = buildLearningStates(questions, reviews, [
      { ...local, intervalDays: 22, dueOn: "2026-08-12" },
    ]);

    expect(states.get("cpp11-auto-001")).toMatchObject({
      intervalDays: 22,
      dueOn: "2026-08-12",
    });
  });

  it("keeps an explicit cloud reset as New even when old local reviews remain", () => {
    const questions = [
      { id: "cpp11-auto-001", version: 1, sourceHash: "a".repeat(64) },
    ];
    const reviews: Review[] = [
      {
        questionId: "cpp11-auto-001",
        reviewedOn: "2026-07-20",
        rating: "good",
        nextDueOn: "2026-07-24",
      },
    ];
    const reset = {
      ...newQuestionLearningState({
        questionId: "cpp11-auto-001",
        questionVersion: 1,
        sourceHash: "a".repeat(64),
      }),
      historyResetOn: "2026-07-21",
    };

    expect(buildLearningStates(questions, reviews, [reset]).get("cpp11-auto-001"))
      .toMatchObject({ state: "new", reviewCount: 0, historyResetOn: "2026-07-21" });
  });
});

describe("mistake-card queue priority", () => {
  it("selects a new remediation card before ordinary New cards", () => {
    const questions = ["ordinary-a", "remediation", "ordinary-b"].map(
      (id) => ({ id, version: 1, sourceHash: "a".repeat(64) }),
    );
    const firstPlan = buildAnkiDailyPlan(questions, [], [], "2026-07-27", {
      newLimit: 1,
      priorityQuestionIds: ["remediation"],
    });
    expect(firstPlan.questionIds).toEqual(["remediation"]);

    const remediationState = newQuestionLearningState({
      questionId: "remediation",
      questionVersion: 1,
      sourceHash: "a".repeat(64),
    });
    const scheduled = scheduleQuestionReview(
      remediationState,
      "good",
      "2026-07-27",
    );
    const afterReload = buildAnkiDailyPlan(
      questions,
      [scheduled.review],
      [scheduled.state],
      "2026-07-27",
      {
        newLimit: 1,
        priorityQuestionIds: ["remediation"],
      },
    );
    expect(afterReload.questionIds).toEqual(["remediation"]);
    expect(afterReload.remainingIds).toEqual([]);
  });
});
