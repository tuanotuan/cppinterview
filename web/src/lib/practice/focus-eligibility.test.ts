import { describe, expect, it } from "vitest";

import type { FocusSessionQuestionIdentity } from "./focus-session";
import { focusEligibleQuestionIdentities } from "./focus-eligibility";
import type { QuestionLearningState } from "./learning-state";

const today = "2026-07-26";
const questions: FocusSessionQuestionIdentity[] = [
  question("available", "cpp-interview"),
  question("reviewed-today", "cmake-build-systems"),
  question("suspended", "python-interview"),
  question("completed", "cpp-interview"),
];

describe("focus eligibility reconciliation", () => {
  it("drops suspended and already-reviewed remaining refs across decks", () => {
    const states = new Map<string, QuestionLearningState>([
      ["suspended", state("suspended", { suspended: true })],
      [
        "reviewed-today",
        state("reviewed-today", { lastReviewedOn: today }),
      ],
    ]);

    expect(
      focusEligibleQuestionIdentities({
        questions,
        learningStates: states,
        latest: new Map(),
        completedQuestionIds: new Set(),
        today,
      }),
    ).toEqual([questions[0], questions[3]]);
  });

  it("retains a completed ref reviewed today for session history", () => {
    expect(
      focusEligibleQuestionIdentities({
        questions,
        learningStates: new Map(),
        latest: new Map([
          ["completed", { reviewedOn: today }],
          ["reviewed-today", { reviewedOn: today }],
        ]),
        completedQuestionIds: new Set(["completed"]),
        today,
      }).map(({ id, deckId }) => ({ id, deckId })),
    ).toEqual([
      { id: "available", deckId: "cpp-interview" },
      { id: "suspended", deckId: "python-interview" },
      { id: "completed", deckId: "cpp-interview" },
    ]);
  });
});

function question(
  id: string,
  deckId: FocusSessionQuestionIdentity["deckId"],
): FocusSessionQuestionIdentity {
  return {
    id,
    version: 1,
    sourceHash: "a".repeat(64),
    deckId,
  };
}

function state(
  questionId: string,
  overrides: Partial<QuestionLearningState>,
): QuestionLearningState {
  return {
    questionId,
    questionVersion: 1,
    sourceHash: "a".repeat(64),
    state: "review",
    dueOn: "2026-07-25",
    intervalDays: 4,
    reviewCount: 1,
    lapseCount: 0,
    leech: false,
    suspended: false,
    lastReviewedOn: "2026-07-20",
    lastRating: "good",
    contentChanged: false,
    historyResetOn: null,
    ...overrides,
  };
}
