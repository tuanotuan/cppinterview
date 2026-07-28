import { describe, expect, it } from "vitest";

import {
  buildWorldQuantCurriculumCoverage,
  classifyQuestionConcepts,
  conceptsForCompetency,
  worldQuantConcepts,
  type CurriculumQuestionEvidence,
} from "./curriculum";
import { worldQuantCompetencyKeys } from "./readiness";

const orderBookQuestion: CurriculumQuestionEvidence = {
  id: "order-book-state",
  competency: "tick_market_data",
  lessonId: "tick-data-order-book",
  topics: ["order-book", "fixed-point"],
  tags: ["topic::order-book", "source::repository"],
  evidenceKind: "repository_verified",
};

describe("WorldQuant curriculum graph", () => {
  it("defines three connected concepts for every competency", () => {
    expect(worldQuantConcepts).toHaveLength(
      worldQuantCompetencyKeys.length * 3,
    );
    for (const competency of worldQuantCompetencyKeys) {
      expect(conceptsForCompetency(competency)).toHaveLength(3);
    }
    const ids = new Set(worldQuantConcepts.map((concept) => concept.id));
    expect(ids.size).toBe(worldQuantConcepts.length);
    for (const concept of worldQuantConcepts) {
      for (const prerequisite of concept.prerequisites) {
        expect(ids.has(prerequisite)).toBe(true);
        expect(prerequisite).not.toBe(concept.id);
      }
    }
  });

  it("maps a question only inside its canonical competency", () => {
    expect(classifyQuestionConcepts(orderBookQuestion)).toEqual([
      "tick-order-book",
    ]);
    expect(
      classifyQuestionConcepts({
        ...orderBookQuestion,
        id: "same-terms-wrong-competency",
        competency: "modern_cpp",
      }),
    ).toEqual([]);
  });

  it("keeps approved coverage, pending content, remediation and transfer evidence separate", () => {
    const result = buildWorldQuantCurriculumCoverage({
      questions: [
        orderBookQuestion,
        {
          ...orderBookQuestion,
          id: "order-book-draft",
          evidenceKind: "pending_review",
        },
        {
          ...orderBookQuestion,
          id: "order-book-personal-repair",
          evidenceKind: "personal_remediation",
        },
      ],
      drills: [
        {
          id: "order-book-practice",
          conceptIds: ["tick-order-book"],
          variant: "practice",
        },
        {
          id: "order-book-checkpoint",
          conceptIds: ["tick-order-book"],
          variant: "checkpoint",
        },
      ],
    });
    const coverage = result.concepts.find(
      (item) => item.concept.id === "tick-order-book",
    );

    expect(coverage).toMatchObject({
      status: "transfer_ready",
      activeQuestionIds: ["order-book-state"],
      pendingQuestionIds: ["order-book-draft"],
      personalRemediationIds: ["order-book-personal-repair"],
      practiceDrillIds: ["order-book-practice"],
      checkpointDrillIds: ["order-book-checkpoint"],
    });
    expect(
      result.competencies.tick_market_data.activeQuestionCount,
    ).toBe(1);
  });

  it("reports pending, drill-only and true content gaps without treating them as learner weakness", () => {
    const result = buildWorldQuantCurriculumCoverage({
      questions: [
        {
          id: "cmake-draft",
          competency: "build_delivery",
          lessonId: "cmake-targets",
          topics: ["cmake", "target"],
          tags: ["topic::cmake"],
          evidenceKind: "pending_review",
        },
      ],
      drills: [
        {
          id: "linux-practice",
          conceptIds: ["linux-process-io"],
          variant: "practice",
        },
      ],
    });

    expect(
      result.concepts.find(
        (item) => item.concept.id === "build-target-cmake",
      )?.status,
    ).toBe("pending_review");
    expect(
      result.concepts.find(
        (item) => item.concept.id === "linux-process-io",
      )?.status,
    ).toBe("drill_only");
    expect(
      result.concepts.find(
        (item) => item.concept.id === "ownership-english",
      )?.status,
    ).toBe("content_gap");
  });

  it("exposes unclassified questions for editorial review", () => {
    const result = buildWorldQuantCurriculumCoverage({
      questions: [
        {
          id: "unknown-modern-cpp",
          competency: "modern_cpp",
          lessonId: "misc",
          topics: ["unknown-topic"],
          tags: ["topic::unknown-topic"],
          evidenceKind: "owner_approved",
        },
      ],
    });

    expect(result.unclassifiedQuestionIds).toEqual([
      "unknown-modern-cpp",
    ]);
    expect(
      result.competencies.modern_cpp.activeQuestionCount,
    ).toBe(0);
  });

  it("does not expand a generic topic into a longer signal", () => {
    expect(
      classifyQuestionConcepts({
        id: "generic-algorithm",
        competency: "algorithms_data_structures",
        lessonId: "generic-algorithm",
        topics: ["algorithm"],
        tags: [],
        evidenceKind: "repository_verified",
      }),
    ).toEqual(["algorithms-complexity"]);
  });
});
