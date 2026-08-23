import {
  coachFeedbackSchema,
  normalizeCoachFeedback,
  type CoachFeedback,
} from "@/lib/ai/contracts";

import type { CoachGoldenCase } from "./golden-cases";

export type GoldenEvaluationResult = {
  caseId: string;
  passed: boolean;
  failures: string[];
  normalizedFeedback: CoachFeedback | null;
};

export function evaluateCoachGoldenCase(
  goldenCase: CoachGoldenCase,
  rawFeedback: unknown = goldenCase.feedback,
): GoldenEvaluationResult {
  const parsed = coachFeedbackSchema.safeParse(rawFeedback);
  if (!parsed.success) {
    return {
      caseId: goldenCase.id,
      passed: false,
      failures: ["Feedback does not satisfy the structured coach contract"],
      normalizedFeedback: null,
    };
  }

  const feedback = normalizeCoachFeedback(parsed.data);
  const failures: string[] = [];
  if (
    feedback.score < goldenCase.expected.minimumScore ||
    feedback.score > goldenCase.expected.maximumScore
  ) {
    failures.push(
      `Score ${feedback.score} is outside ${goldenCase.expected.minimumScore}-${goldenCase.expected.maximumScore}`,
    );
  }
  if (feedback.verdict !== goldenCase.expected.verdict) {
    failures.push(
      `Verdict ${feedback.verdict} does not match ${goldenCase.expected.verdict}`,
    );
  }
  if (feedback.suggestedRating !== goldenCase.expected.suggestedRating) {
    failures.push(
      `Rating ${feedback.suggestedRating} does not match ${goldenCase.expected.suggestedRating}`,
    );
  }

  const actualCriteria = feedback.coverage.map((item) => item.criterion);
  if (
    actualCriteria.length !== goldenCase.requiredCriteria.length ||
    new Set(actualCriteria).size !== actualCriteria.length ||
    goldenCase.requiredCriteria.some(
      (criterion) => !actualCriteria.includes(criterion),
    )
  ) {
    failures.push("Coverage must cite every required criterion exactly once");
  }
  for (const [criterion, expectedStatus] of Object.entries(
    goldenCase.expected.coverage,
  )) {
    const actual = feedback.coverage.find(
      (item) => item.criterion === criterion,
    );
    if (actual?.status !== expectedStatus) {
      failures.push(
        `Criterion ${criterion} is ${actual?.status ?? "missing"}, expected ${expectedStatus}`,
      );
    }
  }

  if (
    goldenCase.candidateAnswer.trim() === "" &&
    (feedback.score !== 0 ||
      feedback.verdict !== "needs_work" ||
      feedback.strengths.length > 0 ||
      feedback.coverage.some((item) => item.status !== "missed") ||
      feedback.suggestedRating !== "again")
  ) {
    failures.push("Blank answers must follow the explicit zero-score contract");
  }

  return {
    caseId: goldenCase.id,
    passed: failures.length === 0,
    failures,
    normalizedFeedback: feedback,
  };
}

export function evaluateCoachGoldenCorpus(
  cases: readonly CoachGoldenCase[],
) {
  const results = cases.map((goldenCase) =>
    evaluateCoachGoldenCase(goldenCase),
  );
  return {
    passed: results.every((result) => result.passed),
    passedCount: results.filter((result) => result.passed).length,
    caseCount: results.length,
    results,
  };
}
