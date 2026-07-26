import { describe, expect, it } from "vitest";

import { buildWorldQuantMockDebrief } from "../worldquant/mock-debrief";
import { WORLDQUANT_CURATED_CATALOG } from "./catalog";
import {
  mockCodeRunRequestV4Schema,
  mockInterviewCompletedArtifactV4Schema,
  mockInterviewReportRequestV4Schema,
} from "./contracts-v4";
import { buildWorldQuantTargetedMockPlan } from "./target-plan";

describe("mock interview v4 request contracts", () => {
  const plan = buildWorldQuantTargetedMockPlan({
    profileId: "tick-data-platform",
    mode: "balanced",
    durationMinutes: 30,
    candidates: WORLDQUANT_CURATED_CATALOG.map((question) => ({
      readinessCompetency: question.readinessCompetency,
      question: {
        id: question.id,
        origin: question.origin,
        version: question.version,
        contentRevision: question.contentRevision,
        estimatedMinutes: question.estimatedMinutes,
        responseMode: question.responseMode,
        language: question.language,
        track: question.track,
        execution: question.execution,
      },
    })),
  });

  it("binds report answers to the exact ordered plan", () => {
    const request = {
      schemaVersion: 4,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      profileId: plan.profileId,
      profileVersion: plan.profileVersion,
      sourceRevision: "a".repeat(64),
      startedAt: "2026-07-30T00:00:00.000Z",
      submittedAt: "2026-07-30T00:20:00.000Z",
      plan,
      elapsedSeconds: 1_200,
      items: plan.questions.map((question) => ({
        question,
        response: "answer",
        explanation: "",
        elapsedSeconds: 60,
      })),
    };
    expect(mockInterviewReportRequestV4Schema.safeParse(request).success).toBe(
      true,
    );
    expect(
      mockInterviewReportRequestV4Schema.safeParse({
        ...request,
        items: [...request.items].reverse(),
      }).success,
    ).toBe(false);
  });

  it("rejects a report blueprint with fewer than three evidence items", () => {
    const shortPlan = {
      ...plan,
      questions: plan.questions.slice(0, 2),
      scheduledMinutes: plan.questions
        .slice(0, 2)
        .reduce(
          (sum, candidate) =>
            sum + candidate.question.estimatedMinutes,
          0,
        ),
    };
    expect(
      mockInterviewReportRequestV4Schema.safeParse({
        schemaVersion: 4,
        idempotencyKey:
          "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
        profileId: shortPlan.profileId,
        profileVersion: 1,
        sourceRevision: "a".repeat(64),
        startedAt: "2026-07-30T00:00:00.000Z",
        submittedAt: "2026-07-30T00:30:00.000Z",
        plan: shortPlan,
        elapsedSeconds: 1800,
        items: shortPlan.questions.map((question) => ({
          question,
          response: "",
          explanation: "",
          elapsedSeconds: 0,
        })),
      }).success,
    ).toBe(false);
  });

  it("only runs exact executable questions from the plan", () => {
    const executable = plan.questions.find(
      (candidate) => candidate.question.execution,
    );
    expect(executable).toBeDefined();
    const request = {
      schemaVersion: 4,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      profileId: plan.profileId,
      profileVersion: plan.profileVersion,
      sourceRevision: "a".repeat(64),
      plan,
      question: executable,
      code: "int main() {}",
    };
    expect(mockCodeRunRequestV4Schema.safeParse(request).success).toBe(true);
    expect(
      mockCodeRunRequestV4Schema.safeParse({
        ...request,
        question: {
          ...executable,
          question: {
            ...executable!.question,
            contentRevision: "tampered",
          },
        },
      }).success,
    ).toBe(false);
  });

  it("accepts only redacted hidden evidence bound to one planned executable question", () => {
    const executable = plan.questions.find(
      (candidate) => candidate.question.execution,
    )!;
    const questionAssessments = plan.questions.map((candidate) => ({
      questionId: candidate.question.id,
      score: 70,
      verdict: "solid" as const,
      summary: "Scoped evidence.",
      strengths: [],
      missedCriteria: [],
    }));
    const debrief = buildWorldQuantMockDebrief({
      profileId: plan.profileId,
      plan: {
        mode: plan.mode,
        questionMappings: plan.questions.map((candidate) => ({
          questionId: candidate.question.id,
          competency: candidate.readinessCompetency,
        })),
      },
      scores: questionAssessments.map((assessment) => ({
        questionId: assessment.questionId,
        score: assessment.score,
      })),
    });
    const notAssessed = {
      status: "not_assessed" as const,
      score: null,
      summary: "Not assessed.",
      strengths: [],
      gaps: [],
      evidenceQuestionIds: [],
    };
    const codeHash = "b".repeat(64);
    const artifact = {
      schemaVersion: 4,
      sessionId: "22222222-2222-4222-8222-222222222222",
      profileId: plan.profileId,
      profileVersion: plan.profileVersion,
      plan,
      startedAt: "2026-07-30T00:00:00.000Z",
      completedAt: "2026-07-30T00:30:00.000Z",
      report: {
        evidenceScope: debrief.scope,
        summary: "Scoped report.",
        competencies: {
          modern_cpp: notAssessed,
          tick_data_order_book: notAssessed,
          data_pipeline_performance: notAssessed,
          engineering_quality: notAssessed,
          scripting: notAssessed,
          communication_ownership: notAssessed,
        },
        questionAssessments,
        strengths: [],
        priorityGaps: [],
        studyPlan: [],
      },
      debrief,
      model: "test-model",
      provider: "openai",
      executionResults: [
        {
          questionId: executable.question.id,
          submittedCodeHash: codeHash,
          result: {
            suite: "hidden",
            codeHash,
            specRevision:
              executable.question.execution!.specRevision,
            language: executable.question.language,
            status: "passed",
            passedTests: 2,
            totalTests: 2,
            durationMs: 10,
            toolchain: "test-toolchain",
            completedAt: "2026-07-30T00:25:00.000Z",
          },
        },
      ],
    };

    expect(
      mockInterviewCompletedArtifactV4Schema.safeParse(artifact)
        .success,
    ).toBe(true);
    expect(
      mockInterviewCompletedArtifactV4Schema.safeParse({
        ...artifact,
        executionResults: [
          {
            ...artifact.executionResults[0],
            result: {
              ...artifact.executionResults[0]!.result,
              diagnostics: "secret compiler detail",
            },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      mockInterviewCompletedArtifactV4Schema.safeParse({
        ...artifact,
        executionResults: [
          {
            ...artifact.executionResults[0],
            submittedCodeHash: "c".repeat(64),
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      mockInterviewCompletedArtifactV4Schema.safeParse({
        ...artifact,
        report: {
          ...artifact.report,
          questionAssessments: [
            artifact.report.questionAssessments[0],
            artifact.report.questionAssessments[0],
            ...artifact.report.questionAssessments.slice(2),
          ],
        },
      }).success,
    ).toBe(false);
  });
});
