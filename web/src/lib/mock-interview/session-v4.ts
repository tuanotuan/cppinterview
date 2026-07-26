import { z } from "zod";

import { codeExecutionResultSchema } from "@/lib/code-runner/contracts";
import {
  worldQuantMockDebriefSchema,
} from "@/lib/worldquant/mock-debrief";

import {
  mockInterviewReportRequestV4Schema,
  mockInterviewScopedReportV4Schema,
} from "./contracts-v4";
import {
  targetedMockCandidateSchema,
  targetedMockPlanSchema,
  targetedMockQuestionRefSchema,
  type TargetedMockPlan,
} from "./target-plan";
import type { WorldQuantMockQuestion } from "./catalog";

export const MOCK_INTERVIEW_SESSION_VERSION = 4 as const;
export const MOCK_INTERVIEW_PROFILE_VERSION = 1 as const;

const answerSchema = z
  .object({
    response: z.string().max(8_000),
    explanation: z.string().max(4_000),
  })
  .strict();

export const mockInterviewSessionQuestionV4Schema =
  targetedMockQuestionRefSchema
    .extend({
      readinessCompetency:
        targetedMockCandidateSchema.shape.readinessCompetency,
    })
    .strict();

export const mockInterviewSessionV4Schema = z
  .object({
    schemaVersion: z.literal(MOCK_INTERVIEW_SESSION_VERSION),
    sessionId: z.string().uuid(),
    accountId: z.string().uuid(),
    profileId: targetedMockPlanSchema.shape.profileId,
    profileVersion: z.literal(MOCK_INTERVIEW_PROFILE_VERSION),
    sourceRevision: z.string().regex(/^[a-f0-9]{40,64}$/),
    plan: targetedMockPlanSchema,
    status: z.enum(["in_progress", "evaluating", "completed"]),
    startedAt: z.string().datetime(),
    deadlineAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    sessionRevision: z.number().int().positive(),
    questions: z.array(mockInterviewSessionQuestionV4Schema).min(1).max(8),
    currentIndex: z.number().int().min(0).max(7),
    answers: z.record(z.string(), answerSchema),
    elapsedByQuestion: z.record(
      z.string(),
      z.number().int().min(0).max(2 * 60 * 60),
    ),
    sampleCodeRuns: z.record(z.string(), codeExecutionResultSchema),
    hiddenCodeRuns: z.record(z.string(), codeExecutionResultSchema),
    pendingCodeRuns: z.record(
      z.string(),
      z
        .object({
          idempotencyKey: z.string().uuid(),
          requestedAt: z.string().datetime(),
        })
        .strict(),
    ),
    reportIdempotencyKey: z.string().uuid().optional(),
    pendingReportRequest:
      mockInterviewReportRequestV4Schema.optional(),
    activeQuestionStartedAt: z.string().datetime(),
    report: mockInterviewScopedReportV4Schema.optional(),
    debrief: worldQuantMockDebriefSchema.optional(),
    reportModel: z.string().trim().max(120).optional(),
    reportProvider: z.enum(["openai", "gemini"]).optional(),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      session.profileId !== session.plan.profileId ||
      session.profileVersion !== session.plan.profileVersion
    ) {
      context.addIssue({
        code: "custom",
        path: ["plan"],
        message: "Mock session role must match its versioned plan",
      });
    }
    if (
      session.questions.length !== session.plan.questions.length ||
      session.questions.some(
        (question, index) => {
          const planned = session.plan.questions[index];
          return (
            !planned ||
            JSON.stringify(question) !==
              JSON.stringify({
                ...planned.question,
                readinessCompetency: planned.readinessCompetency,
              })
          );
        },
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Mock session questions must match its immutable plan",
      });
    }
    if (
      session.questions.length === 0 ||
      session.currentIndex >= session.questions.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["currentIndex"],
        message: "Mock session current question is unavailable",
      });
    }
    const knownIds = new Set(
      session.questions.map((question) => question.id),
    );
    for (const [field, values] of [
      ["answers", session.answers],
      ["elapsedByQuestion", session.elapsedByQuestion],
      ["sampleCodeRuns", session.sampleCodeRuns],
      ["hiddenCodeRuns", session.hiddenCodeRuns],
      ["pendingCodeRuns", session.pendingCodeRuns],
    ] as const) {
      for (const questionId of Object.keys(values)) {
        if (!knownIds.has(questionId)) {
          context.addIssue({
            code: "custom",
            path: [field, questionId],
            message: "Mock session contains state for an unknown question",
          });
        }
      }
    }
    for (const [questionId, result] of Object.entries(
      session.sampleCodeRuns,
    )) {
      if (result.suite !== "sample") {
        context.addIssue({
          code: "custom",
          path: ["sampleCodeRuns", questionId, "suite"],
          message: "Sample evidence must use the sample suite",
        });
      }
    }
    for (const [questionId, result] of Object.entries(
      session.hiddenCodeRuns,
    )) {
      if (result.suite !== "hidden") {
        context.addIssue({
          code: "custom",
          path: ["hiddenCodeRuns", questionId, "suite"],
          message: "Hidden evidence must use the hidden suite",
        });
      }
    }
    const completedArtifacts =
      Boolean(session.completedAt) &&
      Boolean(session.report) &&
      Boolean(session.debrief);
    if (
      (session.status === "completed") !== completedArtifacts
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Completed mock sessions require an immutable report and debrief",
      });
    }
    if (
      (session.status === "evaluating") !==
      Boolean(session.pendingReportRequest)
    ) {
      context.addIssue({
        code: "custom",
        path: ["pendingReportRequest"],
        message:
          "Evaluating sessions require one frozen report submission",
      });
    }
    if (session.pendingReportRequest) {
      const pending = session.pendingReportRequest;
      if (
        pending.idempotencyKey !== session.reportIdempotencyKey ||
        pending.sessionId !== session.sessionId ||
        pending.profileId !== session.profileId ||
        pending.profileVersion !== session.profileVersion ||
        pending.sourceRevision !== session.sourceRevision ||
        pending.startedAt !== session.startedAt ||
        JSON.stringify(pending.plan) !== JSON.stringify(session.plan)
      ) {
        context.addIssue({
          code: "custom",
          path: ["pendingReportRequest"],
          message:
            "Frozen report submission must match its immutable session",
        });
      }
    }
    if (session.debrief) {
      if (
        session.debrief.profileId !== session.profileId ||
        session.debrief.planMode !== session.plan.mode
      ) {
        context.addIssue({
          code: "custom",
          path: ["debrief"],
          message: "Mock debrief must match the session role and mode",
        });
      }
      const evidenceIds = new Set(
        session.debrief.competencies.flatMap(
          (competency) => competency.evidenceQuestionIds,
        ),
      );
      if (
        evidenceIds.size !== knownIds.size ||
        [...knownIds].some((questionId) => !evidenceIds.has(questionId))
      ) {
        context.addIssue({
          code: "custom",
          path: ["debrief"],
          message: "Mock debrief must assess the exact session question set",
        });
      }
    }
  });

export type MockInterviewSessionV4 = z.infer<
  typeof mockInterviewSessionV4Schema
>;

export function mockInterviewStorageKey(accountId: string) {
  return `recall:mock-interview:${z.string().uuid().parse(accountId)}:v4:active`;
}

export function createMockInterviewSessionV4({
  sessionId,
  accountId,
  sourceRevision,
  plan,
  catalog,
  startedAt,
}: {
  sessionId: string;
  accountId: string;
  sourceRevision: string;
  plan: TargetedMockPlan;
  catalog: readonly WorldQuantMockQuestion[];
  startedAt: Date;
}): MockInterviewSessionV4 {
  const parsedPlan = targetedMockPlanSchema.parse(plan);
  if (parsedPlan.questions.length === 0) {
    throw new Error("Cannot start a mock without eligible questions");
  }
  const questionByIdentity = new Map(
    catalog.map((question) => [
      `${question.origin}:${question.id}`,
      question,
    ]),
  );
  const answers = Object.fromEntries(
    parsedPlan.questions.flatMap((candidate) => {
      const question = questionByIdentity.get(
        `${candidate.question.origin}:${candidate.question.id}`,
      );
      if (
        !question ||
        question.version !== candidate.question.version ||
        question.contentRevision !== candidate.question.contentRevision
      ) {
        throw new Error(
          `Mock catalog no longer matches ${candidate.question.origin}:${candidate.question.id}`,
        );
      }
      return question.responseMode === "code" && question.code
        ? [
            [
              question.id,
              { response: question.code, explanation: "" },
            ] as const,
          ]
        : [];
    }),
  );

  return mockInterviewSessionV4Schema.parse({
    schemaVersion: MOCK_INTERVIEW_SESSION_VERSION,
    sessionId,
    accountId,
    profileId: parsedPlan.profileId,
    profileVersion: MOCK_INTERVIEW_PROFILE_VERSION,
    sourceRevision,
    plan: parsedPlan,
    status: "in_progress",
    startedAt: startedAt.toISOString(),
    deadlineAt: new Date(
      startedAt.getTime() + parsedPlan.durationMinutes * 60_000,
    ).toISOString(),
    sessionRevision: 1,
    questions: parsedPlan.questions.map((candidate) => ({
      ...candidate.question,
      readinessCompetency: candidate.readinessCompetency,
    })),
    currentIndex: 0,
    answers,
    elapsedByQuestion: {},
    sampleCodeRuns: {},
    hiddenCodeRuns: {},
    pendingCodeRuns: {},
    activeQuestionStartedAt: startedAt.toISOString(),
  });
}

export function advanceMockInterviewSessionV4(
  session: MockInterviewSessionV4,
  patch: Partial<
    Omit<
      MockInterviewSessionV4,
      | "schemaVersion"
      | "sessionId"
      | "accountId"
      | "profileId"
      | "profileVersion"
      | "sourceRevision"
      | "plan"
      | "questions"
      | "startedAt"
      | "deadlineAt"
      | "sessionRevision"
    >
  >,
) {
  return mockInterviewSessionV4Schema.parse({
    ...session,
    ...patch,
    sessionRevision: session.sessionRevision + 1,
  });
}

export function parseMockInterviewSessionV4(raw: string | null) {
  if (!raw) return null;
  try {
    return mockInterviewSessionV4Schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeMockInterviewSessionV4(
  session: MockInterviewSessionV4,
) {
  return JSON.stringify(mockInterviewSessionV4Schema.parse(session));
}
