import type { FocusSessionQuestionIdentity } from "./focus-session";
import type { QuestionLearningState } from "./learning-state";

type LatestReview = {
  reviewedOn: string;
};

export function focusEligibleQuestionIdentities({
  questions,
  learningStates,
  latest,
  completedQuestionIds,
  today,
}: {
  questions: readonly FocusSessionQuestionIdentity[];
  learningStates: ReadonlyMap<string, QuestionLearningState>;
  latest: ReadonlyMap<string, LatestReview>;
  completedQuestionIds: ReadonlySet<string>;
  today: string;
}): FocusSessionQuestionIdentity[] {
  return questions.filter((question) => {
    const state = learningStates.get(question.id);
    const reviewedToday =
      state?.lastReviewedOn === today ||
      latest.get(question.id)?.reviewedOn === today;
    return (
      !state?.suspended &&
      (completedQuestionIds.has(question.id) || !reviewedToday)
    );
  });
}
