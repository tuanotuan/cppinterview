import { describe, expect, it } from "vitest";

import {
  FSRS_DESIRED_RETENTION,
  FSRS_MAXIMUM_INTERVAL_DAYS,
  FSRS_SCHEDULER_VERSION,
  FSRS_WEIGHTS,
  applyFsrsRating,
  previewFsrsRatings,
  selectFsrsRevisionHistory,
} from "./fsrs-scheduler";
import type { Review } from "./scheduler";

const identity = {
  questionId: "cpp11-lifetime-001",
  questionVersion: 2,
  sourceHash: "a".repeat(64),
};

describe("FSRS 6 practice scheduler", () => {
  it("uses one explicit, deterministic scheduler policy", () => {
    expect(FSRS_SCHEDULER_VERSION).toBe("fsrs-6-default-v1");
    expect(FSRS_DESIRED_RETENTION).toBe(0.9);
    expect(FSRS_MAXIMUM_INTERVAL_DAYS).toBe(36_500);
    expect(FSRS_WEIGHTS).toHaveLength(21);

    const first = previewFsrsRatings([], "2026-09-02");
    const second = previewFsrsRatings([], "2026-09-02");

    expect(second).toEqual(first);
    expect({
      again: first.again.intervalDays,
      hard: first.hard.intervalDays,
      good: first.good.intervalDays,
      easy: first.easy.intervalDays,
    }).toEqual({ again: 1, hard: 2, good: 3, easy: 8 });
  });

  it("derives later intervals from review history without mutating it", () => {
    const first = applyFsrsRating([], "good", "2026-09-02");
    const history: Review[] = [
      {
        ...identity,
        reviewedOn: "2026-09-02",
        rating: "good",
        nextDueOn: first.dueOn,
      },
    ];
    const before = structuredClone(history);
    const next = previewFsrsRatings(history, first.dueOn);

    expect(history).toEqual(before);
    expect({
      again: next.again.intervalDays,
      hard: next.hard.intervalDays,
      good: next.good.intervalDays,
      easy: next.easy.intervalDays,
    }).toEqual({ again: 1, hard: 9, good: 14, easy: 24 });
  });

  it("counts Again as a lapse only after the card has entered Review", () => {
    const first = applyFsrsRating([], "again", "2026-09-02");
    const firstAgain: Review = {
      ...identity,
      reviewedOn: "2026-09-02",
      rating: "again",
      nextDueOn: first.dueOn,
    };
    const graduated = applyFsrsRating(
      [firstAgain],
      "good",
      "2026-09-03",
    );
    const graduation: Review = {
      ...identity,
      reviewedOn: "2026-09-03",
      rating: "good",
      nextDueOn: graduated.dueOn,
    };
    const lapsed = applyFsrsRating(
      [firstAgain, graduation],
      "again",
      graduated.dueOn,
    );

    expect(first.lapseCount).toBe(0);
    expect(lapsed.lapseCount).toBe(1);
  });

  it("replays only the current content revision and rejects stale bound history", () => {
    const current: Review = {
      ...identity,
      reviewedOn: "2026-09-02",
      rating: "good",
      nextDueOn: "2026-09-05",
    };
    const legacy: Review = {
      questionId: identity.questionId,
      reviewedOn: "2026-08-30",
      rating: "hard",
      nextDueOn: "2026-09-01",
    };
    const stale: Review = {
      ...current,
      questionVersion: 1,
      sourceHash: "b".repeat(64),
      reviewedOn: "2026-09-01",
    };

    expect(
      selectFsrsRevisionHistory(identity, [legacy, stale, current]),
    ).toEqual([current]);
    expect(
      selectFsrsRevisionHistory(identity, [legacy, stale]),
    ).toEqual([]);
    expect(
      selectFsrsRevisionHistory(identity, [legacy]),
    ).toEqual([legacy]);
  });
});
