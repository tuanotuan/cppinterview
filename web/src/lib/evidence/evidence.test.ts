import { describe, expect, it } from "vitest";

import { coachGoldenCases, executionGoldenCases } from "./golden-cases";
import {
  coachFeedbackToAttemptArtifact,
  practiceReviewToAttemptArtifact,
} from "./adapters";
import { attemptArtifactSchema } from "./contracts";
import {
  buildEvidenceProjection,
  competencyEvidenceProjectionSchema,
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

describe("Evidence Engine v2", () => {
  it("rejects internally inconsistent projection classifications", () => {
    const valid = buildEvidenceProjection({
      artifacts: [
        artifactFor(
          coachGoldenCases[0],
          "projection-contract",
          "2026-08-22T00:00:00.000Z",
        ),
      ],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    }).competencies[0];

    expect(
      competencyEvidenceProjectionSchema.safeParse({
        ...valid,
        inconclusiveArtifactIds: [...valid.supportingArtifactIds],
      }).success,
    ).toBe(false);
    expect(
      competencyEvidenceProjectionSchema.safeParse({
        ...valid,
        status: "unassessed",
        nextAction: "assess",
      }).success,
    ).toBe(false);
  });

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

  it("keeps infrastructure errors inconclusive instead of blaming the learner", () => {
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
      status: "unassessed",
      score: null,
      assessmentCount: 0,
      successfulAttemptCount: 0,
      nextAction: "assess",
      contradictingArtifactIds: [],
      inconclusiveArtifactIds: [artifact.id],
      invalidatedArtifactIds: [],
      recommendedQuestionIds: [],
    });
  });

  it("does not let a later infrastructure error revoke verified evidence", () => {
    const successes = [
      artifactFor(
        coachGoldenCases[0],
        "verified-a",
        "2026-08-20T00:00:00.000Z",
      ),
      artifactFor(
        coachGoldenCases[0],
        "verified-b",
        "2026-08-21T00:00:00.000Z",
      ),
    ];
    const infrastructureError = attemptArtifactSchema.parse({
      ...artifactFor(
        coachGoldenCases[0],
        "infra-after-verification",
        "2026-08-22T00:00:00.000Z",
      ),
      verification: {
        compile: "infrastructure_error",
        tests: "infrastructure_error",
        sanitizers: "not_run",
      },
    });
    const verified = buildEvidenceProjection({
      artifacts: successes,
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 2 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });
    const withInfrastructureError = buildEvidenceProjection({
      artifacts: [...successes, infrastructureError],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 2 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(withInfrastructureError.competencies[0]).toMatchObject({
      status: "verified",
      score: 91,
      assessmentCount: 2,
      successfulAttemptCount: 2,
      latestEvidenceAt: "2026-08-21T00:00:00.000Z",
      inconclusiveArtifactIds: [infrastructureError.id],
      contradictingArtifactIds: [],
      nextAction: "maintain",
    });
    expect(evidenceProjectionFingerprint(withInfrastructureError)).toBe(
      evidenceProjectionFingerprint(verified),
    );
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

  it("invalidates a superseded revision instead of creating a learner gap", () => {
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
      status: "unassessed",
      score: null,
      assessmentCount: 0,
      successfulAttemptCount: 0,
      nextAction: "assess",
      contradictingArtifactIds: [],
      inconclusiveArtifactIds: [],
      invalidatedArtifactIds: [artifact.id],
      recommendedQuestionIds: [],
    });
  });

  it("does not let a superseded revision revoke current verification", () => {
    const current = artifactFor(
      coachGoldenCases[0],
      "current",
      "2026-08-20T00:00:00.000Z",
    );
    const supersededBase = artifactFor(
      coachGoldenCases[2],
      "superseded-later",
      "2026-08-22T00:00:00.000Z",
    );
    const superseded = attemptArtifactSchema.parse({
      ...supersededBase,
      question: { ...supersededBase.question, current: false },
    });
    const projection = buildEvidenceProjection({
      artifacts: [current, superseded],
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies[0]).toMatchObject({
      status: "verified",
      assessmentCount: 1,
      successfulAttemptCount: 1,
      latestEvidenceAt: current.occurredAt,
      contradictingArtifactIds: [],
      invalidatedArtifactIds: [superseded.id],
      nextAction: "maintain",
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
