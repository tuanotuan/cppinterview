import { describe, expect, it } from "vitest";

import {
  FSRS_SHADOW_VERSION,
  buildFsrsShadowCards,
  summarizeFsrsShadow,
} from "./fsrs-shadow";
import type { Review } from "./scheduler";

const reviews: Review[] = [
  {
    questionId: "cpp-lifetime",
    questionVersion: 2,
    sourceHash: "a".repeat(64),
    reviewedOn: "2026-07-20",
    rating: "good",
    nextDueOn: "2026-07-23",
  },
  {
    questionId: "cpp-lifetime",
    questionVersion: 2,
    sourceHash: "a".repeat(64),
    reviewedOn: "2026-07-23",
    rating: "hard",
    nextDueOn: "2026-07-27",
  },
  {
    questionId: "cpp-containers",
    questionVersion: 1,
    sourceHash: "b".repeat(64),
    reviewedOn: "2026-07-21",
    rating: "easy",
    nextDueOn: "2026-07-28",
  },
];
const questionIdentities = [
  {
    id: "cpp-lifetime",
    version: 2,
    sourceHash: "a".repeat(64),
  },
  {
    id: "cpp-containers",
    version: 1,
    sourceHash: "b".repeat(64),
  },
];

describe("FSRS shadow scheduler", () => {
  it("replays history deterministically without mutating authoritative reviews", () => {
    const before = structuredClone(reviews);
    const first = buildFsrsShadowCards({
      questionIdentities,
      reviews,
      asOf: "2026-07-28",
    });
    const second = buildFsrsShadowCards({
      questionIdentities,
      reviews,
      asOf: "2026-07-28",
    });
    expect(first).toEqual(second);
    expect(reviews).toEqual(before);
    expect(first[0].schedulerVersion).toBe(FSRS_SHADOW_VERSION);
  });

  it("reports D/S/R and an explicit delta from the current scheduler", () => {
    const cards = buildFsrsShadowCards({
      questionIdentities,
      reviews,
      asOf: "2026-07-28",
    });
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.questionVersion).toBeGreaterThan(0);
      expect(card.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.stability).toBeGreaterThan(0);
      expect(card.retrievabilityPercent).toBeGreaterThanOrEqual(0);
      expect(card.retrievabilityPercent).toBeLessThanOrEqual(100);
      expect(card.dueDeltaDays).not.toBeNull();
    }
    expect(summarizeFsrsShadow(cards)).toMatchObject({
      schedulerVersion: FSRS_SHADOW_VERSION,
      cardCount: 2,
      comparableCardCount: 2,
    });
  });

  it("ignores future reviews at the shadow as-of boundary", () => {
    const cards = buildFsrsShadowCards({
      questionIdentities: [
        ...questionIdentities,
        {
          id: "future-only",
          version: 1,
          sourceHash: "c".repeat(64),
        },
      ],
      reviews: [
        ...reviews,
        {
          questionId: "future-only",
          questionVersion: 1,
          sourceHash: "c".repeat(64),
          reviewedOn: "2026-08-01",
          rating: "good",
          nextDueOn: "2026-08-04",
        },
      ],
      asOf: "2026-07-28",
    });
    expect(
      cards.some((card) => card.questionId === "future-only"),
    ).toBe(false);
  });

  it("never replays unbound or stale question revisions into the current card", () => {
    const cards = buildFsrsShadowCards({
      questionIdentities,
      reviews: [
        ...reviews,
        {
          questionId: "cpp-lifetime",
          questionVersion: 1,
          sourceHash: "c".repeat(64),
          reviewedOn: "2026-07-24",
          rating: "easy",
          nextDueOn: "2026-07-31",
        },
        {
          questionId: "cpp-containers",
          reviewedOn: "2026-07-24",
          rating: "again",
          nextDueOn: "2026-07-25",
        },
      ],
      asOf: "2026-07-28",
    });

    expect(
      cards.find((card) => card.questionId === "cpp-lifetime"),
    ).toMatchObject({
      questionVersion: 2,
      sourceHash: "a".repeat(64),
      reviewCount: 2,
    });
    expect(
      cards.find((card) => card.questionId === "cpp-containers"),
    ).toMatchObject({
      questionVersion: 1,
      sourceHash: "b".repeat(64),
      reviewCount: 1,
    });
  });
});
