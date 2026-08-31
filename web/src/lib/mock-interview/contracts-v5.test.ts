import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import { mockInterviewDimensionKeys } from "./contracts";
import {
  generalCppInterviewPlanSchema,
  normalizeGeneralCppReport,
} from "./contracts-v5";
import {
  buildGeneralCppInterviewCatalog,
  buildGeneralCppInterviewPlan,
  generalCppCompetencies,
  generalCppStandards,
} from "./general-catalog";

const manifest = contentManifestSchema.parse(manifestJson);
const catalog = buildGeneralCppInterviewCatalog({
  manifest,
  approvals: manifest.questions.map((question) => ({
    questionId: question.id,
    questionVersion: question.version,
    sourceHash: question.sourceHash,
  })),
});
const plan = buildGeneralCppInterviewPlan({
  catalog,
  catalogRevision: manifest.sourceRevision,
  durationMinutes: 30,
  seed: "00000000-0000-4000-8000-000000000001",
});

describe("general C++ interview v5 contracts", () => {
  it("rejects plans that omit a required C++ standard", () => {
    const malformed = {
      ...plan,
      questions: plan.questions.map((question) => ({
        ...question,
        standard: "cpp11",
      })),
    };
    expect(generalCppInterviewPlanSchema.safeParse(malformed).success).toBe(
      false,
    );
  });

  it("recomputes aggregate scores from the exact planned questions", () => {
    const competencyAssessment = {
      status: "assessed" as const,
      score: 99,
      summary: "Provider summary.",
      strengths: [],
      gaps: [],
      evidenceQuestionIds: [],
    };
    const normalized = normalizeGeneralCppReport({
      plan,
      rawReport: {
        summary: "A grounded summary of this interview.",
        competencies: Object.fromEntries(
          generalCppCompetencies.map((key) => [key, competencyAssessment]),
        ) as Record<(typeof generalCppCompetencies)[number], typeof competencyAssessment>,
        questionAssessments: plan.questions.map((question, index) => ({
          questionId: question.id,
          score: 40 + index * 10,
          verdict: "strong" as const,
          summary: "Assessment grounded in the candidate answer.",
          strengths: [],
          missedCriteria: [],
        })),
        interviewDimensions: mockInterviewDimensionKeys.map((key) => ({
          key,
          status: "assessed" as const,
          score: 60,
          summary: "Dimension summary.",
        })),
        strengths: [],
        priorityGaps: [],
        nextActions: [1, 2, 3].map((priority) => ({
          priority,
          title: `Action ${priority}`,
          action: "Practice the cited gap with a focused explanation.",
          questionIds: [plan.questions[0].id],
        })) as [
          { priority: 1; title: string; action: string; questionIds: string[] },
          { priority: 2; title: string; action: string; questionIds: string[] },
          { priority: 3; title: string; action: string; questionIds: string[] },
        ],
      },
    });

    expect(normalized.overallScore).toBe(60);
    expect(normalized.questionAssessments.map((item) => item.verdict)).toEqual([
      "partial",
      "partial",
      "partial",
      "solid",
      "solid",
    ]);
    expect(normalized.standardScores.map((item) => item.standard)).toEqual(
      generalCppStandards,
    );
    expect(
      Object.values(normalized.competencies)
        .filter((item) => item.status === "assessed")
        .every((item) => item.evidenceQuestionIds.length > 0),
    ).toBe(true);
  });
});
