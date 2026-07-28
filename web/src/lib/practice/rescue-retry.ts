import { z } from "zod";

export const RESCUE_RETRY_PASS_SCORE = 65;
export const RESCUE_RETRY_EASY_SCORE = 85;

const attemptsSchema = z.number().int().nonnegative().max(20);

export const rescueRetryStateSchema = z.discriminatedUnion("phase", [
  z.object({
    phase: z.literal("rescue"),
    attempts: attemptsSchema,
  }),
  z.object({
    phase: z.literal("retrying"),
    attempts: attemptsSchema,
  }),
  z.object({
    phase: z.literal("passed"),
    attempts: attemptsSchema,
    reviewRating: z.enum(["good", "easy"]),
  }),
  z.object({
    phase: z.literal("needs_repair"),
    attempts: attemptsSchema,
    repairRating: z.enum(["again", "hard"]),
  }),
]);

export type RescueRetryState = z.infer<typeof rescueRetryStateSchema>;
export type RescueRetryOutcomeRating = "again" | "hard" | "good" | "easy";

export function beginRescueRetry(
  previous?: RescueRetryState,
): RescueRetryState {
  return {
    phase: "retrying",
    attempts: previous?.attempts ?? 0,
  };
}

export function resolveRescueRetryAfterCoach({
  previous,
  candidateAnswer,
  score,
}: {
  previous?: RescueRetryState;
  candidateAnswer: string;
  score: number;
}): RescueRetryState | null {
  const attempts = previous?.attempts ?? 0;
  if (!candidateAnswer.trim()) {
    return { phase: "rescue", attempts };
  }
  if (!previous) return null;

  const nextAttempts = Math.min(20, attempts + 1);
  if (score >= RESCUE_RETRY_PASS_SCORE) {
    return {
      phase: "passed",
      attempts: nextAttempts,
      reviewRating: score >= RESCUE_RETRY_EASY_SCORE ? "easy" : "good",
    };
  }
  return {
    phase: "needs_repair",
    attempts: nextAttempts,
    repairRating: score < 40 ? "again" : "hard",
  };
}

export function rescueRetryBlocksRating(state?: RescueRetryState) {
  return state?.phase === "rescue" || state?.phase === "retrying";
}

export function canRateRescueRetryAttempt({
  hasCurrentFeedback,
  answerRevealUsed,
  state,
}: {
  hasCurrentFeedback: boolean;
  answerRevealUsed: boolean;
  state?: RescueRetryState;
}) {
  return (
    (hasCurrentFeedback || answerRevealUsed) &&
    !rescueRetryBlocksRating(state)
  );
}

export function rescueRetryOutcomeRating(
  state?: RescueRetryState,
): RescueRetryOutcomeRating | null {
  if (state?.phase === "passed") return state.reviewRating;
  if (state?.phase === "needs_repair") return state.repairRating;
  return null;
}

export function restoreRescueRetryState({
  persisted,
  hasFeedback,
  coachAnswer,
}: {
  persisted?: RescueRetryState;
  hasFeedback: boolean;
  coachAnswer?: string;
}): RescueRetryState | undefined {
  if (persisted) {
    return !hasFeedback && persisted.phase !== "retrying"
      ? beginRescueRetry(persisted)
      : persisted;
  }
  if (hasFeedback && coachAnswer !== undefined && !coachAnswer.trim()) {
    return { phase: "rescue", attempts: 0 };
  }
  return undefined;
}
