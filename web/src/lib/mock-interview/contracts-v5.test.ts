import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import { mockInterviewDimensionKeys } from "./contracts";
import {
  buildGeneralCppHistoryPublicAttempt,
  buildGeneralCppReviewSnapshot,
  generalCppCompletedArtifactSchema,
  generalCppHistoryDetailSchema,
  generalCppInterviewPlanSchema,
  normalizeGeneralCppReport,
  normalizeGeneralCppReportForSubmission,
  parseGeneralCppHistoryDetail,
  type GeneralCppReportRequest,
  type GeneralCppRawReport,
} from "./contracts-v5";
import {
  buildGeneralCppInterviewCatalog,
  buildGeneralCppInterviewPlan,
  generalCppCompetencies,
  generalCppStandards,
} from "./general-catalog";
import { parseGeneralCppLocalHistory } from "./session-v5";

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
const selectedCatalog = plan.questions.map(
  (question) => catalog.find((item) => item.id === question.id)!,
);

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

  it("builds an exact user-visible review snapshot without private evaluation data", () => {
    const request = reportRequest();
    const review = buildGeneralCppReviewSnapshot({
      request,
      catalog: selectedCatalog,
    });

    expect(review.items).toHaveLength(plan.questions.length);
    expect(review.items[0]).toMatchObject({
      questionId: plan.questions[0].id,
      questionVersion: plan.questions[0].version,
      contentRevision: plan.questions[0].contentRevision,
      prompt: selectedCatalog[0].prompt,
      code: selectedCatalog[0].code ?? null,
      response: "  const answer = 42;\n",
    });
    expect(JSON.stringify(review)).not.toMatch(
      /canonicalAnswer|evaluationGuide|referenceAnswer|rubric/i,
    );
    const publicAttempt = buildGeneralCppHistoryPublicAttempt({
      request,
      review,
    });
    expect(publicAttempt).toMatchObject({
      schemaVersion: 5,
      sourceRevision: manifest.sourceRevision,
    });
    expect(publicAttempt.review.items[0].response).toBe(
      "  const answer = 42;\n",
    );
    expect(() =>
      buildGeneralCppReviewSnapshot({
        request,
        catalog: [
          { ...selectedCatalog[0], version: selectedCatalog[0].version + 1 },
          ...selectedCatalog.slice(1),
        ],
      }),
    ).toThrow("question identity");
  });

  it("keeps legacy feedback readable and drops a mismatched optional snapshot", () => {
    const artifact = completedArtifact();
    const review = buildGeneralCppReviewSnapshot({
      request: reportRequest(),
      catalog: selectedCatalog,
    });

    expect(
      parseGeneralCppHistoryDetail({ artifact, review: undefined }),
    ).toMatchObject({
      artifact: { sessionId: artifact.sessionId },
      review: null,
    });
    expect(
      parseGeneralCppHistoryDetail({
        artifact,
        review: {
          ...review,
          items: review.items.map((item, index) =>
            index === 0
              ? { ...item, questionVersion: item.questionVersion + 1 }
              : item,
          ),
        },
      }),
    ).toMatchObject({ review: null });
    expect(
      generalCppHistoryDetailSchema.parse({ artifact, review }).review?.items[0]
        .response,
    ).toBe("  const answer = 42;\n");
    expect(parseGeneralCppLocalHistory(JSON.stringify([artifact]))).toEqual([
      { artifact, review: null },
    ]);
    expect(
      parseGeneralCppLocalHistory(
        JSON.stringify([{ artifact, review }]),
      )[0]?.review?.items[0].response,
    ).toBe("  const answer = 42;\n");
  });
});

function reportRequest(): GeneralCppReportRequest {
  return {
    schemaVersion: 5,
    responseLocale: "vi",
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    sessionId: "00000000-0000-4000-8000-000000000003",
    sourceRevision: manifest.sourceRevision,
    startedAt: "2026-09-01T01:00:00.000Z",
    submittedAt: "2026-09-01T01:30:00.000Z",
    elapsedSeconds: 1_800,
    plan,
    items: plan.questions.map((question, index) => ({
      question,
      response: index === 0 ? "  const answer = 42;\n" : "",
      elapsedSeconds: 60 + index,
    })),
  };
}

function completedArtifact() {
  return generalCppCompletedArtifactSchema.parse({
    schemaVersion: 5,
    responseLocale: "vi",
    sessionId: "00000000-0000-4000-8000-000000000003",
    profileId: plan.profileId,
    profileVersion: plan.profileVersion,
    plan,
    startedAt: "2026-09-01T01:00:00.000Z",
    completedAt: "2026-09-01T01:30:00.000Z",
    report: normalizeGeneralCppReport({ plan, rawReport: rawReport() }),
    model: "gpt-5.6-luna",
    provider: "openai",
  });
}

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
