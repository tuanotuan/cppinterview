import { describe, expect, it } from "vitest";

import { coachFeedbackToAttemptArtifact } from "@/lib/evidence/adapters";
import { coachGoldenCases } from "@/lib/evidence/golden-cases";

import { buildWorldQuantAccountEvidenceProjection } from "./evidence";
import {
  worldQuantCompetencyKeys,
  type ReadinessQuestionSummary,
} from "./readiness";

describe("WorldQuant account evidence composition", () => {
  it("projects current Coach evidence against the approved question bank", () => {
    const question: ReadinessQuestionSummary = {
      id: "modern-cpp-evidence",
      version: 2,
      sourceHash: "a".repeat(64),
      deckId: "cpp-interview",
      lessonId: "cpp-modern",
      estimatedMinutes: 5,
      competency: "modern_cpp",
      validation: "repository_verified",
    };
    const artifact = coachFeedbackToAttemptArtifact({
      attemptId: "coach-worldquant-1",
      occurredAt: "2026-08-22T00:00:00.000Z",
      question: {
        id: question.id,
        version: question.version,
        contentRevision: question.sourceHash,
        responseMode: "text",
      },
      candidateResponse: coachGoldenCases[0].candidateAnswer,
      feedback: coachGoldenCases[0].feedback,
      competencies: [question.competency],
    });

    const projection = buildWorldQuantAccountEvidenceProjection({
      coachArtifacts: [artifact],
      mockHistory: [],
      questions: [question],
      asOf: "2026-08-23T00:00:00.000Z",
    });

    expect(projection.competencies).toHaveLength(
      worldQuantCompetencyKeys.length,
    );
    expect(
      projection.competencies.find(
        (competency) => competency.key === "modern_cpp",
      ),
    ).toMatchObject({
      content: "available",
      assessmentCount: 1,
      nextAction: "practice",
    });
    expect(
      projection.competencies.find(
        (competency) => competency.key === "tick_market_data",
      ),
    ).toMatchObject({ content: "missing", assessmentCount: 0 });
  });
});
