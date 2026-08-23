import { describe, expect, it } from "vitest";

import { buildEvidenceProjection } from "@/lib/evidence/engine";

import { attemptArtifactsFromMockHistoryEntry } from "./evidence-adapter";
import { buildWorldQuantMockTrends } from "./trends";

describe("mock history evidence adapter", () => {
  it("recovers exact question identity and hidden execution outcome", () => {
    const entry = completedEntry();
    const artifacts = attemptArtifactsFromMockHistoryEntry(entry);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      id: "mock:attempt-1:vector-growth",
      question: {
        id: "vector-growth",
        version: 4,
        contentRevision: "revision-4",
        responseMode: "code",
      },
      response: { status: "not_captured" },
      verification: { compile: "passed", tests: "failed" },
      assessments: [
        { key: "modern_cpp", score: 88, confidence: 0.9 },
      ],
    });

    const projection = buildEvidenceProjection({
      artifacts,
      competencies: [
        { key: "modern_cpp", content: "available", targetSuccessfulAttempts: 1 },
      ],
      asOf: entry.completedAt!,
    });
    expect(projection.competencies[0]).toMatchObject({
      status: "learning",
      successfulAttemptCount: 0,
    });
  });

  it("drives the existing mock trend read model through canonical artifacts", () => {
    const trends = buildWorldQuantMockTrends({ entries: [completedEntry()] });

    expect(trends.assessedAttemptCount).toBe(1);
    expect(trends.competencies.modern_cpp).toEqual({
      latest: 88,
      previous: null,
      delta: null,
      count: 1,
    });
  });

  it("marks historical mock evidence superseded against the current bank", () => {
    const artifacts = attemptArtifactsFromMockHistoryEntry(completedEntry(), [
      {
        id: "vector-growth",
        version: 5,
        contentRevision: "revision-5",
      },
    ]);

    expect(artifacts[0].question.current).toBe(false);
  });

  it("fails closed on malformed or ambiguous report data", () => {
    const entry = completedEntry();
    const malformed = {
      ...entry,
      report: {
        ...(entry.report as Record<string, unknown>),
        report: {
          questionAssessments: [
            { questionId: "vector-growth", score: 88 },
            { questionId: "vector-growth", score: 99 },
          ],
        },
      },
    };

    expect(attemptArtifactsFromMockHistoryEntry(malformed)).toEqual([]);
  });
});

function completedEntry() {
  return {
    attemptId: "attempt-1",
    status: "completed",
    roleProfileId: "tick-data-platform",
    roleProfileVersion: 2,
    durationMinutes: 45,
    completedAt: "2026-08-22T10:00:00.000Z",
    report: {
      schemaVersion: 4,
      plan: {
        mode: "balanced",
        targetCompetency: null,
        questions: [
          {
            readinessCompetency: "modern_cpp",
            question: {
              id: "vector-growth",
              version: 4,
              contentRevision: "revision-4",
              responseMode: "code",
            },
          },
        ],
      },
      report: {
        questionAssessments: [
          { questionId: "vector-growth", score: 88 },
        ],
      },
      debrief: {
        competencies: [
          { competency: "modern_cpp", status: "assessed", score: 88 },
        ],
      },
      executionResults: [
        {
          questionId: "vector-growth",
          result: { status: "tests_failed" },
        },
      ],
    },
  };
}
