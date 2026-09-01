import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import { mockInterviewDimensionKeys } from "./contracts";
import {
  generalCppInterviewPlanSchema,
  normalizeGeneralCppReport,
  normalizeGeneralCppReportForSubmission,
  type GeneralCppRawReport,
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
    const normalized = normalizeGeneralCppReport({
      plan,
      rawReport: rawReport(),
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

  it("falls back to a complete zero-score report when every answer is blank", () => {
    const malformed = rawReport();
    malformed.questionAssessments = malformed.questionAssessments.map(
      (assessment) => ({
        ...assessment,
        questionId: plan.questions[0].id,
      }),
    );

    const normalized = normalizeGeneralCppReportForSubmission({
      rawReport: malformed,
      plan,
      responses: plan.questions.map(() => "   "),
      locale: "vi",
    });

    expect(normalized.usedBlankFallback).toBe(true);
    expect(normalized.report.overallScore).toBe(0);
    expect(normalized.report.readiness).toBe("needs_foundation");
    expect(normalized.report.questionAssessments).toHaveLength(
      plan.questions.length,
    );
    expect(
      normalized.report.questionAssessments.every(
        (assessment) =>
          assessment.score === 0 && assessment.verdict === "needs_work",
      ),
    ).toBe(true);
    expect(
      normalized.report.nextActions.every((action) =>
        action.questionIds.every((id) =>
          plan.questions.some((question) => question.id === id),
        ),
      ),
    ).toBe(true);

    const english = normalizeGeneralCppReportForSubmission({
      rawReport: malformed,
      plan,
      responses: plan.questions.map(() => ""),
      locale: "en",
    });
    expect(english.report.summary).toMatch(/^No answers were submitted/);
    expect(english.report.nextActions[0].title).toMatch(/^Retry the C\+\+/);
  });

  it("does not hide an invalid AI report when any answer has content", () => {
    const malformed = rawReport();
    malformed.questionAssessments = malformed.questionAssessments.map(
      (assessment) => ({
        ...assessment,
        questionId: plan.questions[0].id,
      }),
    );

    expect(() =>
      normalizeGeneralCppReportForSubmission({
        rawReport: malformed,
        plan,
        responses: plan.questions.map((_, index) =>
          index === 0 ? "A real answer." : "",
        ),
        locale: "en",
      }),
    ).toThrow("AI report returned a mismatched question set");
  });
});

function rawReport(): GeneralCppRawReport {
  const competencyAssessment = {
    status: "assessed" as const,
    score: 99,
    summary: "Provider summary.",
    strengths: [],
    gaps: [],
    evidenceQuestionIds: [],
  };
  return {
    summary: "A grounded summary of this interview.",
    competencies: generalCppCompetencies.reduce<
      GeneralCppRawReport["competencies"]
    >((result, key) => {
      result[key] = competencyAssessment;
      return result;
    }, {} as GeneralCppRawReport["competencies"]),
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
    nextActions: [
      {
        priority: 1,
        title: "Action 1",
        action: "Practice the cited gap with a focused explanation.",
        questionIds: [plan.questions[0].id],
      },
      {
        priority: 2,
        title: "Action 2",
        action: "Practice the cited gap with a focused explanation.",
        questionIds: [plan.questions[0].id],
      },
      {
        priority: 3,
        title: "Action 3",
        action: "Practice the cited gap with a focused explanation.",
        questionIds: [plan.questions[0].id],
      },
    ],
  };
}
