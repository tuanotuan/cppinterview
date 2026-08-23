import type { CoachFeedback } from "@/lib/ai/contracts";
import type { Review } from "@/lib/practice/scheduler";

import {
  ATTEMPT_ARTIFACT_VERSION,
  attemptArtifactSchema,
  type AttemptArtifact,
} from "./contracts";

type QuestionIdentity = {
  id: string;
  version: number;
  contentRevision: string;
  responseMode: "text" | "code";
  current?: boolean;
};

const ratingScore = {
  again: 20,
  hard: 50,
  good: 75,
  easy: 90,
} as const;

const ratingVerdict = {
  again: "needs_work",
  hard: "partial",
  good: "solid",
  easy: "strong",
} as const;

export function practiceReviewToAttemptArtifact({
  review,
  question,
  competencies,
}: {
  review: Review;
  question: Omit<QuestionIdentity, "id">;
  competencies: readonly string[];
}): AttemptArtifact {
  const evidenceId = "practice:self_rating";
  const score = ratingScore[review.rating];
  return attemptArtifactSchema.parse({
    version: ATTEMPT_ARTIFACT_VERSION,
    id: `practice:${review.questionId}:${review.reviewedOn}`,
    source: {
      kind: "practice",
      attemptId: `${review.questionId}:${review.reviewedOn}`,
    },
    occurredAt: `${review.reviewedOn}T00:00:00.000Z`,
    question: { id: review.questionId, ...question },
    response: {
      status: "not_captured",
      usedHint: false,
      revealedReference: false,
    },
    verification: {
      compile: "not_run",
      tests: "not_run",
      sanitizers: "not_run",
    },
    evidence: [
      {
        id: evidenceId,
        kind: "self_rating",
        label: `Self rating: ${review.rating}`,
        visibility: "learner",
      },
    ],
    assessments: competencies.map((key) => ({
      key,
      status: "assessed",
      score,
      // A self-rating informs learning but cannot verify a competency alone.
      confidence: 0.25,
      evidenceIds: [evidenceId],
      criteria: [],
    })),
    outcome: {
      score,
      verdict: ratingVerdict[review.rating],
      suggestedRating: review.rating,
    },
  });
}

export function coachFeedbackToAttemptArtifact({
  attemptId,
  occurredAt,
  question,
  candidateResponse,
  feedback,
  competencies,
  usedHint = false,
  revealedReference = false,
}: {
  attemptId: string;
  occurredAt: string;
  question: QuestionIdentity;
  candidateResponse: string;
  feedback: CoachFeedback;
  competencies: readonly string[];
  usedHint?: boolean;
  revealedReference?: boolean;
}): AttemptArtifact {
  const provided = candidateResponse.trim().length > 0;
  const evidence = feedback.coverage.map((coverage, index) => ({
    id: `coach:criterion:${index + 1}`,
    kind: "coach_feedback" as const,
    label: coverage.criterion,
    excerpt: coverage.feedback,
    visibility: "learner" as const,
  }));
  const evidenceIds = evidence.map((item) => item.id);
  const responsePayload = provided
    ? question.responseMode === "code"
      ? { code: candidateResponse }
      : { answer: candidateResponse }
    : {};

  return attemptArtifactSchema.parse({
    version: ATTEMPT_ARTIFACT_VERSION,
    id: `coach:${attemptId}:${question.id}`,
    source: { kind: "coach", attemptId },
    occurredAt,
    question,
    response: {
      status: provided ? "provided" : "not_provided",
      ...responsePayload,
      usedHint,
      revealedReference,
    },
    verification: {
      compile: "not_run",
      tests: "not_run",
      sanitizers: "not_run",
    },
    evidence,
    assessments: competencies.map((key) => ({
      key,
      status: "assessed",
      score: feedback.score,
      confidence: 0.8,
      evidenceIds,
      criteria: feedback.coverage.map((coverage, index) => ({
        key: `required:${index + 1}`,
        outcome: coverage.status,
        evidenceIds: [`coach:criterion:${index + 1}`],
      })),
    })),
    outcome: {
      score: feedback.score,
      verdict: feedback.verdict,
      suggestedRating: feedback.suggestedRating,
    },
  });
}

export function coachFeedbackRecordToAttemptArtifact({
  attemptId,
  occurredAt,
  question,
  feedback,
  competencies,
}: {
  attemptId: string;
  occurredAt: string;
  question: QuestionIdentity;
  feedback: CoachFeedback;
  competencies: readonly string[];
}): AttemptArtifact {
  const evidence = feedback.coverage.map((coverage, index) => ({
    id: `coach:criterion:${index + 1}`,
    kind: "coach_feedback" as const,
    label: coverage.criterion,
    excerpt: coverage.feedback,
    visibility: "learner" as const,
  }));
  const evidenceIds = evidence.map((item) => item.id);

  return attemptArtifactSchema.parse({
    version: ATTEMPT_ARTIFACT_VERSION,
    id: `coach:${attemptId}:${question.id}`,
    source: { kind: "coach", attemptId },
    occurredAt,
    question,
    response: {
      // Durable Coach history is projected without reloading candidate text.
      status: "not_captured",
      usedHint: false,
      revealedReference: false,
    },
    verification: {
      compile: "not_run",
      tests: "not_run",
      sanitizers: "not_run",
    },
    evidence,
    assessments: competencies.map((key) => ({
      key,
      status: "assessed",
      score: feedback.score,
      confidence: 0.8,
      evidenceIds,
      criteria: feedback.coverage.map((coverage, index) => ({
        key: `required:${index + 1}`,
        outcome: coverage.status,
        evidenceIds: [`coach:criterion:${index + 1}`],
      })),
    })),
    outcome: {
      score: feedback.score,
      verdict: feedback.verdict,
      suggestedRating: feedback.suggestedRating,
    },
  });
}
