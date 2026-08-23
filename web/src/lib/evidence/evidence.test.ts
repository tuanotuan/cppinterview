import { describe, expect, it } from "vitest";

import { coachGoldenCases, executionGoldenCases } from "./golden-cases";
import {
  coachFeedbackToAttemptArtifact,
  practiceReviewToAttemptArtifact,
} from "./adapters";
import { attemptArtifactSchema } from "./contracts";
import {
  buildEvidenceProjection,
  evidenceProjectionFingerprint,
} from "./engine";
import {
  evaluateCoachGoldenCase,
  evaluateCoachGoldenCorpus,
} from "./golden-evaluation";

describe("AttemptArtifact v1", () => {
  it("normalizes coach feedback into a versioned private artifact", () => {
    const goldenCase = coachGoldenCases[0];
    const artifact = artifactFor(goldenCase, "attempt-1", "2026-08-01T00:00:00.000Z");

    expect(artifact).toMatchObject({
      version: 1,
      source: { kind: "coach", attemptId: "attempt-1" },
      question: { id: "golden-question", version: 3 },
      response: { status: "provided", answer: goldenCase.candidateAnswer },
      outcome: { score: 91, verdict: "strong" },
    });
    expect(artifact.assessments[0].criteria).toHaveLength(2);
  });

  it("rejects dangling evidence references and payload-less provided answers", () => {
    const valid = artifactFor(
      coachGoldenCases[0],
      "attempt-1",
      "2026-08-01T00:00:00.000Z",
    );
    expect(
      attemptArtifactSchema.safeParse({
        ...valid,
        assessments: [
          { ...valid.assessments[0], evidenceIds: ["unknown:evidence"] },
        ],
      }).success,
    ).toBe(false);
    expect(
      attemptArtifactSchema.safeParse({
        ...valid,
        response: {
          status: "provided",
          usedHint: false,
          revealedReference: false,
        },
      }).success,
    ).toBe(false);
  });

  it("treats a practice self-rating as low-confidence learning evidence", () => {
    const artifact = practiceReviewToAttemptArtifact({
      review: {
        questionId: "vector-growth",
        reviewedOn: "2026-08-22",
        rating: "easy",
        nextDueOn: "2026-08-29",
      },
      question: {
        version: 2,
        contentRevision: "revision-2",
        responseMode: "text",
      },
      competencies: ["modern_cpp"],
    });
    const projection = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "learning",
      score: 90,
      successfulAttemptCount: 0,
      nextAction: "practice",
      recommendedQuestionIds: [],
    });
  });
});

describe("Evidence Engine v1", () => {
  it("creates a stable fingerprint from assessed evidence, not projection time", () => {
    const artifact = artifactFor(
      coachGoldenCases[0],
      "fingerprint",
      "2026-08-20T00:00:00.000Z",
    );
    const definitions = [
      {
        key: "modern_cpp",
        content: "available" as const,
        targetSuccessfulAttempts: 2,
      },
      {
        key: "tick_market_data",
        content: "available" as const,
        targetSuccessfulAttempts: 2,
      },
    ];
    const first = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: definitions,
      asOf: "2026-08-22T00:00:00.000Z",
    });
    const reordered = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [...definitions].reverse(),
      asOf: "2026-08-23T00:00:00.000Z",
    });
    const changed = buildEvidenceProjection({
      artifacts: [
        artifactFor(
          coachGoldenCases[0],
          "different-attempt",
          "2026-08-20T00:00:00.000Z",
        ),
      ],
      competencies: definitions,
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(evidenceProjectionFingerprint(first)).toBe(
      evidenceProjectionFingerprint(reordered),
    );
    expect(evidenceProjectionFingerprint(changed)).not.toBe(
      evidenceProjectionFingerprint(first),
    );
    expect(
      evidenceProjectionFingerprint(
        buildEvidenceProjection({
          artifacts: [],
          competencies: definitions,
          asOf: "2026-08-23T00:00:00.000Z",
        }),
      ),
    ).toBe("none");
  });

  it("keeps content gaps separate from learner weakness", () => {
    const projection = buildEvidenceProjection({
      artifacts: [],
      competencies: [
        { key: "tick_data", content: "missing", targetSuccessfulAttempts: 2 },
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 2 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies).toEqual([
      expect.objectContaining({
        key: "tick_data",
        status: "unassessed",
        gapKind: "content",
        nextAction: "add_content",
      }),
      expect.objectContaining({
        key: "modern_cpp",
        status: "unassessed",
        gapKind: "none",
        nextAction: "assess",
      }),
    ]);
  });

  it("requires repeated fresh evidence and marks old verification stale", () => {
    const artifacts = [
      artifactFor(coachGoldenCases[0], "a", "2026-05-01T00:00:00.000Z"),
      artifactFor(coachGoldenCases[0], "b", "2026-05-02T00:00:00.000Z"),
    ];
    const projection = buildEvidenceProjection({
      artifacts,
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 2 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "stale",
      gapKind: "learner",
      nextAction: "refresh",
      successfulAttemptCount: 2,
    });
  });

  it("does not leak private candidate responses into projections", () => {
    const secret = "PRIVATE_CANDIDATE_RESPONSE_7f3f";
    const artifact = artifactFor(
      { ...coachGoldenCases[0], candidateAnswer: secret },
      "private",
      "2026-08-22T00:00:00.000Z",
    );
    const projection = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(JSON.stringify(projection)).not.toContain(secret);
    expect(projection.competencies[0].status).toBe("verified");
  });

  it("cannot verify code that passes rubric grading but fails hidden tests", () => {
    const executionCase = executionGoldenCases[0];
    const base = artifactFor(
      coachGoldenCases[0],
      executionCase.id,
      "2026-08-22T00:00:00.000Z",
    );
    const artifact = attemptArtifactSchema.parse({
      ...base,
      question: { ...base.question, responseMode: "code" },
      response: {
        ...base.response,
        answer: undefined,
        code: "int main() { return 0; }",
      },
      verification: {
        compile: executionCase.compile,
        tests: executionCase.tests,
        sanitizers: "not_run",
      },
      assessments: [
        { ...base.assessments[0], score: executionCase.score },
      ],
      outcome: { ...base.outcome, score: executionCase.score },
    });
    const projection = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: executionCase.expectedStatus,
      successfulAttemptCount: 0,
      contradictingArtifactIds: [artifact.id],
    });
  });

  it("does not turn infrastructure errors into verified evidence", () => {
    const base = artifactFor(
      coachGoldenCases[0],
      "infra",
      "2026-08-22T00:00:00.000Z",
    );
    const artifact = attemptArtifactSchema.parse({
      ...base,
      verification: {
        compile: "infrastructure_error",
        tests: "infrastructure_error",
        sanitizers: "not_run",
      },
    });
    const projection = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "learning",
      successfulAttemptCount: 0,
    });
  });

  it("ignores future evidence and lets the latest contradiction revoke verification", () => {
    const priorSuccess = artifactFor(
      coachGoldenCases[0],
      "success",
      "2026-08-20T00:00:00.000Z",
    );
    const laterFailure = artifactFor(
      coachGoldenCases[2],
      "failure",
      "2026-08-21T00:00:00.000Z",
    );
    const futureSuccess = artifactFor(
      coachGoldenCases[0],
      "future",
      "2026-08-25T00:00:00.000Z",
    );
    const projection = buildEvidenceProjection({
      artifacts: [futureSuccess, priorSuccess, laterFailure],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "learning",
      assessmentCount: 2,
      successfulAttemptCount: 1,
      latestEvidenceAt: "2026-08-21T00:00:00.000Z",
      contradictingArtifactIds: [laterFailure.id],
      nextAction: "repair",
      recommendedQuestionIds: ["golden-question"],
    });
  });

  it("does not verify a superseded question revision", () => {
    const base = artifactFor(
      coachGoldenCases[0],
      "superseded",
      "2026-08-22T00:00:00.000Z",
    );
    const artifact = attemptArtifactSchema.parse({
      ...base,
      question: { ...base.question, current: false },
    });
    const projection = buildEvidenceProjection({
      artifacts: [artifact],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "learning",
      successfulAttemptCount: 0,
      nextAction: "repair",
      recommendedQuestionIds: ["golden-question"],
    });
  });
});

describe("golden coach evaluation corpus", () => {
  it("passes every versioned golden case", () => {
    expect(evaluateCoachGoldenCorpus(coachGoldenCases)).toMatchObject({
      passed: true,
      passedCount: coachGoldenCases.length,
      caseCount: coachGoldenCases.length,
    });
  });

  it("detects a provider result that drops a required criterion", () => {
    const goldenCase = coachGoldenCases[1];
    const result = evaluateCoachGoldenCase(goldenCase, {
      ...goldenCase.feedback,
      coverage: goldenCase.feedback.coverage.slice(1),
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain(
      "Coverage must cite every required criterion exactly once",
    );
  });
});

function artifactFor(
  goldenCase: (typeof coachGoldenCases)[number],
  attemptId: string,
  occurredAt: string,
) {
  return coachFeedbackToAttemptArtifact({
    attemptId,
    occurredAt,
    question: {
      id: "golden-question",
      version: 3,
      contentRevision: "golden-revision-v1",
      responseMode: "text",
    },
    candidateResponse: goldenCase.candidateAnswer,
    feedback: goldenCase.feedback,
    competencies: ["modern_cpp"],
  });
}
