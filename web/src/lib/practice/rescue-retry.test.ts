import { describe, expect, it } from "vitest";

import {
  RESCUE_RETRY_EASY_SCORE,
  RESCUE_RETRY_PASS_SCORE,
  beginRescueRetry,
  canRateRescueRetryAttempt,
  rescueRetryBlocksRating,
  rescueRetryOutcomeRating,
  restoreRescueRetryState,
  resolveRescueRetryAfterCoach,
} from "./rescue-retry";

describe("Rescue → Retry state", () => {
  it("leaves an ordinary answered attempt outside the rescue loop", () => {
    expect(
      resolveRescueRetryAfterCoach({
        candidateAnswer: "RAII binds cleanup to object lifetime.",
        score: 80,
      }),
    ).toBeNull();
  });

  it("treats a blank answer as rescue and blocks rating", () => {
    const state = resolveRescueRetryAfterCoach({
      candidateAnswer: "   ",
      score: 0,
    });

    expect(state).toEqual({ phase: "rescue", attempts: 0 });
    expect(rescueRetryBlocksRating(state ?? undefined)).toBe(true);
    expect(rescueRetryOutcomeRating(state ?? undefined)).toBeNull();
  });

  it("returns a repeated blank retry to rescue without counting it", () => {
    const retrying = beginRescueRetry({
      phase: "rescue",
      attempts: 1,
    });
    expect(
      resolveRescueRetryAfterCoach({
        previous: retrying,
        candidateAnswer: "",
        score: 0,
      }),
    ).toEqual({ phase: "rescue", attempts: 1 });
  });

  it("maps passing retries to an automatic Good or Easy outcome", () => {
    const state = resolveRescueRetryAfterCoach({
      previous: beginRescueRetry(),
      candidateAnswer: "A complete retry.",
      score: RESCUE_RETRY_PASS_SCORE,
    });
    const excellent = resolveRescueRetryAfterCoach({
      previous: beginRescueRetry(),
      candidateAnswer: "A complete and precise retry.",
      score: RESCUE_RETRY_EASY_SCORE,
    });

    expect(state).toEqual({
      phase: "passed",
      attempts: 1,
      reviewRating: "good",
    });
    expect(rescueRetryBlocksRating(state ?? undefined)).toBe(false);
    expect(rescueRetryOutcomeRating(state ?? undefined)).toBe("good");
    expect(rescueRetryOutcomeRating(excellent ?? undefined)).toBe("easy");
  });

  it("marks a weak retry for Hard or Again repair", () => {
    const partial = resolveRescueRetryAfterCoach({
      previous: beginRescueRetry(),
      candidateAnswer: "A partial retry.",
      score: 64,
    });
    const incorrect = resolveRescueRetryAfterCoach({
      previous: beginRescueRetry(),
      candidateAnswer: "An incorrect retry.",
      score: 20,
    });

    expect(partial).toEqual({
      phase: "needs_repair",
      attempts: 1,
      repairRating: "hard",
    });
    expect(rescueRetryOutcomeRating(partial ?? undefined)).toBe("hard");
    expect(rescueRetryOutcomeRating(incorrect ?? undefined)).toBe("again");
  });

  it("preserves the retry count when trying again", () => {
    expect(
      beginRescueRetry({
        phase: "needs_repair",
        attempts: 3,
        repairRating: "hard",
      }),
    ).toEqual({ phase: "retrying", attempts: 3 });
  });

  it.each([
    [39, "again"],
    [40, "hard"],
    [64, "hard"],
    [65, "good"],
    [84, "good"],
    [85, "easy"],
  ] as const)("maps score %i to %s", (score, expectedRating) => {
    const state = resolveRescueRetryAfterCoach({
      previous: { phase: "rescue", attempts: 0 },
      candidateAnswer: "My own retry.",
      score,
    });

    expect(rescueRetryOutcomeRating(state ?? undefined)).toBe(expectedRating);
  });

  it("restores legacy blank-answer feedback as a rescue", () => {
    expect(
      restoreRescueRetryState({
        hasFeedback: true,
        coachAnswer: "",
      }),
    ).toEqual({ phase: "rescue", attempts: 0 });
    expect(
      restoreRescueRetryState({
        hasFeedback: true,
        coachAnswer: "An evaluated answer",
      }),
    ).toBeUndefined();
  });

  it("fails a persisted outcome without feedback back to retrying", () => {
    expect(
      restoreRescueRetryState({
        persisted: {
          phase: "passed",
          attempts: 2,
          reviewRating: "good",
        },
        hasFeedback: false,
      }),
    ).toEqual({ phase: "retrying", attempts: 2 });
  });

  it("only unlocks rating for current evidence outside rescue/retry", () => {
    expect(
      canRateRescueRetryAttempt({
        hasCurrentFeedback: true,
        answerRevealUsed: false,
      }),
    ).toBe(true);
    expect(
      canRateRescueRetryAttempt({
        hasCurrentFeedback: false,
        answerRevealUsed: true,
      }),
    ).toBe(true);
    expect(
      canRateRescueRetryAttempt({
        hasCurrentFeedback: false,
        answerRevealUsed: false,
      }),
    ).toBe(false);
    expect(
      canRateRescueRetryAttempt({
        hasCurrentFeedback: true,
        answerRevealUsed: true,
        state: { phase: "rescue", attempts: 0 },
      }),
    ).toBe(false);
  });
});
