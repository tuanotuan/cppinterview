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
import {
  withBrowserStorageLock,
  type BrowserLockManager,
} from "../practice/browser-storage-lock";

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
export type MockInterviewSessionV4Patch = Partial<
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
>;

export function mockInterviewSessionMatchesGuidedRequest({
  session,
  request,
}: {
  session: {
    profileId: TargetedMockPlan["profileId"];
    status: "in_progress" | "evaluating" | "completed";
    completedAt?: string;
    plan: Pick<
      TargetedMockPlan,
      "durationMinutes" | "mode" | "targetCompetency"
    >;
  };
  request: Pick<
    TargetedMockPlan,
    "profileId" | "durationMinutes" | "mode" | "targetCompetency"
  > & { today: string };
}) {
  const exactPlan =
    session.profileId === request.profileId &&
    session.plan.durationMinutes === request.durationMinutes &&
    session.plan.mode === request.mode &&
    session.plan.targetCompetency === request.targetCompetency;
  if (!exactPlan) return false;
  if (session.status !== "completed") return true;
  if (!session.completedAt) return false;
  const completedAt = new Date(session.completedAt);
  return (
    Number.isFinite(completedAt.getTime()) &&
    vietnamDateKey(completedAt) === request.today
  );
}

export function mockInterviewStorageKey(accountId: string) {
  return `recall:mock-interview:${z.string().uuid().parse(accountId)}:v4:active`;
}

export function mockInterviewSessionMatchesAccount(
  session: MockInterviewSessionV4,
  accountId: string,
) {
  return session.accountId === z.string().uuid().parse(accountId);
}

export function sameMockInterviewSessionRevision(
  left: MockInterviewSessionV4 | null,
  right: MockInterviewSessionV4 | null,
) {
  if (!left || !right) return left === right;
  return (
    left.accountId === right.accountId &&
    left.sessionId === right.sessionId &&
    left.sessionRevision === right.sessionRevision
  );
}

export function compareAndSetMockInterviewSessionSnapshotLocked(
  accountId: string,
  expected: MockInterviewSessionV4 | null,
  replacement: MockInterviewSessionV4 | null,
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = mockInterviewStorageKey(accountId);
  if (
    expected &&
    !mockInterviewSessionMatchesAccount(expected, accountId)
  ) {
    throw new Error(
      "Expected mock session account does not match its storage key",
    );
  }
  if (
    replacement &&
    !mockInterviewSessionMatchesAccount(replacement, accountId)
  ) {
    throw new Error(
      "Replacement mock session account does not match its storage key",
    );
  }

  return withBrowserStorageLock(
    storageKey,
    () => {
      const parsed = parseMockInterviewSessionV4(
        window.localStorage.getItem(storageKey),
      );
      const current =
        parsed && mockInterviewSessionMatchesAccount(parsed, accountId)
          ? parsed
          : null;
      if (!sameMockInterviewSessionRevision(current, expected)) {
        return { applied: false as const, session: current };
      }

      if (!replacement) {
        window.localStorage.removeItem(storageKey);
        return { applied: true as const, session: null };
      }

      const continuingSameSession =
        expected !== null &&
        expected.sessionId === replacement.sessionId;
      if (!continuingSameSession && replacement.sessionRevision !== 1) {
        throw new Error(
          "A replacement mock session must start at revision 1",
        );
      }
      const next = continuingSameSession
        ? mockInterviewSessionV4Schema.parse({
            ...replacement,
            sessionRevision: expected.sessionRevision + 1,
          })
        : replacement;
      window.localStorage.setItem(
        storageKey,
        serializeMockInterviewSessionV4(next),
      );
      return { applied: true as const, session: next };
    },
    lockManager,
  );
}

export function mutateMockInterviewSessionSnapshotLocked(
  accountId: string,
  expected: MockInterviewSessionV4,
  mutation: (
    current: MockInterviewSessionV4,
  ) => MockInterviewSessionV4Patch,
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = mockInterviewStorageKey(accountId);
  if (!mockInterviewSessionMatchesAccount(expected, accountId)) {
    throw new Error(
      "Expected mock session account does not match its storage key",
    );
  }

  return withBrowserStorageLock(
    storageKey,
    () => {
      const parsed = parseMockInterviewSessionV4(
        window.localStorage.getItem(storageKey),
      );
      const current =
        parsed && mockInterviewSessionMatchesAccount(parsed, accountId)
          ? parsed
          : null;
      if (
        !current ||
        current.sessionId !== expected.sessionId ||
        current.status !== expected.status ||
        current.sessionRevision < expected.sessionRevision
      ) {
        return { applied: false as const, session: current };
      }

      // A revision change within the same active state can be rebased safely
      // because the caller supplies an intent patch derived from `current`,
      // never a stale full-session snapshot. State transitions still use the
      // strict compare-and-set helper above.
      const next = advanceMockInterviewSessionV4(
        current,
        mutation(current),
      );
      if (
        next.sessionId !== current.sessionId ||
        !mockInterviewSessionMatchesAccount(next, accountId)
      ) {
        throw new Error(
          "Mock session mutation changed its immutable owner or identity",
        );
      }
      window.localStorage.setItem(
        storageKey,
        serializeMockInterviewSessionV4(next),
      );
      return { applied: true as const, session: next };
    },
    lockManager,
  );
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
  patch: MockInterviewSessionV4Patch,
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

function vietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
