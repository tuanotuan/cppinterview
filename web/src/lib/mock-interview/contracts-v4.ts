import { z } from "zod";

import {
  CODE_RUNNER_MAX_SOURCE_BYTES,
  codeExecutionResultSchema,
} from "@/lib/code-runner/contracts";
import { worldQuantMockDebriefSchema } from "@/lib/worldquant/mock-debrief";
import { worldQuantMockGateSetSchema } from "@/lib/worldquant/mock-gates";

import {
  mockInterviewReportSchema,
  normalizedInterviewDimensionsSchema,
  normalizedNextPracticeActionsSchema,
} from "./contracts";
import { targetedMockPlanSchema } from "./target-plan";

const roleProfileVersionSchema = z.union([z.literal(1), z.literal(2)]);

export const publicHiddenExecutionResultSchema =
  codeExecutionResultSchema
    .omit({
      diagnostics: true,
      output: true,
      cases: true,
    })
    .extend({
    suite: z.literal("hidden"),
    })
    .strict();

const answerItemSchema = z
  .object({
    question: targetedMockPlanSchema.shape.questions.element,
    response: z.string().max(8_000),
    explanation: z.string().max(4_000),
    elapsedSeconds: z.number().int().min(0).max(2 * 60 * 60),
  })
  .strict();

export const mockInterviewReportRequestV4Schema = z
  .object({
    schemaVersion: z.literal(4),
    responseLocale: z.enum(["vi", "en"]).optional(),
    idempotencyKey: z.string().uuid(),
    sessionId: z.string().uuid(),
    profileId: targetedMockPlanSchema.shape.profileId,
    profileVersion: roleProfileVersionSchema,
    sourceRevision: z.string().regex(/^[a-f0-9]{40,64}$/),
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime(),
    plan: targetedMockPlanSchema,
    elapsedSeconds: z.number().int().min(0).max(4 * 60 * 60),
    items: z.array(answerItemSchema).min(3).max(8),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.profileId !== request.plan.profileId ||
      request.profileVersion !== request.plan.profileVersion
    ) {
      context.addIssue({
        code: "custom",
        path: ["plan"],
        message: "Report role must match its immutable mock plan",
      });
    }
    if (
      request.items.length !== request.plan.questions.length ||
      request.items.some(
        (item, index) =>
          JSON.stringify(item.question) !==
          JSON.stringify(request.plan.questions[index]),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Report items must match the exact ordered mock plan",
      });
    }
    if (
      new Date(request.submittedAt).getTime() <
      new Date(request.startedAt).getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["submittedAt"],
        message: "Mock cannot be submitted before it starts",
      });
    }
  });

export const mockInterviewScopedReportV4Schema =
  mockInterviewReportSchema
    .omit({
      overallScore: true,
      readiness: true,
      hiringSignal: true,
    })
    .extend({
      evidenceScope: worldQuantMockDebriefSchema.shape.scope,
      // Historical v4 artifacts predate the evidence-backed detail/report queue.
      // New reports always carry both fields; keeping them optional here lets
      // history remain readable after the contract upgrade.
      interviewDimensions: normalizedInterviewDimensionsSchema.optional(),
      nextPracticeActions: normalizedNextPracticeActionsSchema.optional(),
    })
    .strict();

export const mockCodeRunRequestV4Schema = z
  .object({
    schemaVersion: z.literal(4),
    idempotencyKey: z.string().uuid(),
    sessionId: z.string().uuid(),
    profileId: targetedMockPlanSchema.shape.profileId,
    profileVersion: roleProfileVersionSchema,
    sourceRevision: z.string().regex(/^[a-f0-9]{40,64}$/),
    plan: targetedMockPlanSchema,
    question: targetedMockPlanSchema.shape.questions.element,
    code: z.string().max(CODE_RUNNER_MAX_SOURCE_BYTES),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.profileId !== request.plan.profileId ||
      request.profileVersion !== request.plan.profileVersion
    ) {
      context.addIssue({
        code: "custom",
        path: ["plan"],
        message: "Runner role must match its immutable mock plan",
      });
    }
    if (
      !request.plan.questions.some(
        (candidate) =>
          JSON.stringify(candidate) === JSON.stringify(request.question),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["question"],
        message: "Runner question must belong to the exact mock plan",
      });
    }
    if (!request.question.question.execution) {
      context.addIssue({
        code: "custom",
        path: ["question", "question", "execution"],
        message: "Runner question must have a server-owned execution spec",
      });
    }
  });

export const mockInterviewCompletedArtifactV4Schema = z
  .object({
    schemaVersion: z.literal(4),
    responseLocale: z.enum(["vi", "en"]).optional(),
    sessionId: z.string().uuid(),
    profileId: targetedMockPlanSchema.shape.profileId,
    profileVersion: roleProfileVersionSchema,
    plan: targetedMockPlanSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    report: mockInterviewScopedReportV4Schema,
    debrief: worldQuantMockDebriefSchema,
    // Older persisted v4 artifacts do not have deterministic gate outcomes.
    // New reports always include them; optionality keeps the audit trail legible.
    gates: worldQuantMockGateSetSchema.optional(),
    model: z.string().trim().min(1).max(120),
    provider: z.enum(["openai", "gemini"]),
    executionResults: z
      .array(
        z
          .object({
            questionId: z.string().trim().min(1).max(160),
            submittedCodeHash: z.string().regex(/^[a-f0-9]{64}$/),
            result: publicHiddenExecutionResultSchema,
          })
          .strict(),
      )
      .max(8),
  })
  .strict()
  .superRefine((artifact, context) => {
    if (
      artifact.profileId !== artifact.plan.profileId ||
      artifact.profileVersion !== artifact.plan.profileVersion ||
      artifact.debrief.profileId !== artifact.profileId ||
      artifact.debrief.profileVersion !== artifact.profileVersion ||
      artifact.debrief.planMode !== artifact.plan.mode ||
      artifact.report.evidenceScope !== artifact.debrief.scope
    ) {
      context.addIssue({
        code: "custom",
        path: ["debrief"],
        message: "Completed artifact role and debrief must match its plan",
      });
    }
    const planIds = new Set(
      artifact.plan.questions.map(
        (candidate) => candidate.question.id,
      ),
    );
    if (
      artifact.report.questionAssessments.length !== planIds.size ||
      new Set(
        artifact.report.questionAssessments.map(
          (assessment) => assessment.questionId,
        ),
      ).size !== planIds.size ||
      artifact.report.questionAssessments.some(
        (assessment) => !planIds.has(assessment.questionId),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["report", "questionAssessments"],
        message: "Report must assess the exact planned question set",
      });
    }
    const executionIds = new Set<string>();
    if (
      artifact.executionResults.some((entry) => {
        const planned = artifact.plan.questions.find(
          (candidate) =>
            candidate.question.id === entry.questionId,
        );
        const duplicate = executionIds.has(entry.questionId);
        executionIds.add(entry.questionId);
        return (
          duplicate ||
          !planIds.has(entry.questionId) ||
          !planned?.question.execution ||
          planned.question.execution.specRevision !==
            entry.result.specRevision ||
          planned.question.language !== entry.result.language ||
          entry.submittedCodeHash !== entry.result.codeHash
        );
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["executionResults"],
        message:
          "Public hidden evidence must uniquely bind to its planned executable question and submitted code hash",
      });
    }
  });

export type MockInterviewReportRequestV4 = z.infer<
  typeof mockInterviewReportRequestV4Schema
>;
export type MockCodeRunRequestV4 = z.infer<
  typeof mockCodeRunRequestV4Schema
>;
export type MockInterviewCompletedArtifactV4 = z.infer<
  typeof mockInterviewCompletedArtifactV4Schema
>;
export type MockInterviewScopedReportV4 = z.infer<
  typeof mockInterviewScopedReportV4Schema
>;
