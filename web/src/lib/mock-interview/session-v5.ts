import { z } from "zod";

import {
  generalCppCompletedArtifactSchema,
  generalCppHistoryDetailSchema,
  generalCppInterviewPlanSchema,
  generalCppReportRequestSchema,
  generalCppReviewSnapshotSchema,
  type GeneralCppHistoryDetail,
} from "./contracts-v5";

const answerSchema = z
  .object({
    response: z.string().max(8_000),
    elapsedSeconds: z.number().int().min(0).max(2 * 60 * 60),
  })
  .strict();

export const generalCppSessionSchema = z
  .object({
    schemaVersion: z.literal(5),
    accountScope: z.string().trim().min(1).max(80),
    sessionId: z.string().uuid(),
    sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
    plan: generalCppInterviewPlanSchema,
    status: z.enum(["in_progress", "evaluating", "completed"]),
    startedAt: z.string().datetime(),
    deadlineAt: z.string().datetime(),
    currentIndex: z.number().int().min(0).max(9),
    answers: z.record(z.string(), answerSchema),
    pendingRequest: generalCppReportRequestSchema.optional(),
    report: generalCppCompletedArtifactSchema.optional(),
    review: generalCppReviewSnapshotSchema.optional(),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      session.sourceRevision !== session.plan.catalogRevision ||
      session.currentIndex >= session.plan.questions.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["plan"],
        message: "Session must match its immutable plan",
      });
    }
    const questionIds = new Set(
      session.plan.questions.map((question) => question.id),
    );
    if (Object.keys(session.answers).some((id) => !questionIds.has(id))) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Session contains an answer outside its plan",
      });
    }
    if (
      (session.status === "evaluating") !== Boolean(session.pendingRequest) ||
      (session.status === "completed") !== Boolean(session.report)
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Session status and immutable artifacts must agree",
      });
    }
    if (
      session.review
      && (
        session.status !== "completed"
        || !session.report
        || !generalCppHistoryDetailSchema.safeParse({
          artifact: session.report,
          review: session.review,
        }).success
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["review"],
        message: "Session review must match its completed report",
      });
    }
    if (
      session.pendingRequest &&
      (session.pendingRequest.sessionId !== session.sessionId ||
        JSON.stringify(session.pendingRequest.plan) !==
          JSON.stringify(session.plan))
    ) {
      context.addIssue({
        code: "custom",
        path: ["pendingRequest"],
        message: "Pending report must match its session",
      });
    }
  });

const legacyGeneralCppLocalHistoryEntrySchema =
  generalCppCompletedArtifactSchema.transform((artifact) => ({
    artifact,
    review: null,
  }));

export const generalCppLocalHistorySchema = z
  .array(
    z.union([
      generalCppHistoryDetailSchema,
      legacyGeneralCppLocalHistoryEntrySchema,
    ]),
  )
  .max(5);

export type GeneralCppSession = z.infer<typeof generalCppSessionSchema>;

export function generalCppSessionStorageKey(accountScope: string) {
  return `recall:general-cpp-mock:${storageScope(accountScope)}:v5:active`;
}

export function generalCppHistoryStorageKey(accountScope: string) {
  return `recall:general-cpp-mock:${storageScope(accountScope)}:v5:history`;
}

export function parseGeneralCppSession(raw: string | null) {
  if (!raw) return null;
  try {
    return generalCppSessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseGeneralCppLocalHistory(raw: string | null) {
  if (!raw) return [];
  try {
    return generalCppLocalHistorySchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveGeneralCppSession(session: GeneralCppSession) {
  window.localStorage.setItem(
    generalCppSessionStorageKey(session.accountScope),
    JSON.stringify(generalCppSessionSchema.parse(session)),
  );
}

export function clearGeneralCppSession(accountScope: string) {
  window.localStorage.removeItem(generalCppSessionStorageKey(accountScope));
}

export function prependGeneralCppLocalHistory(
  accountScope: string,
  detail: GeneralCppHistoryDetail,
) {
  const current = parseGeneralCppLocalHistory(
    window.localStorage.getItem(generalCppHistoryStorageKey(accountScope)),
  );
  const next = [
    detail,
    ...current.filter(
      (item) => item.artifact.sessionId !== detail.artifact.sessionId,
    ),
  ].slice(0, 5);
  window.localStorage.setItem(
    generalCppHistoryStorageKey(accountScope),
    JSON.stringify(generalCppLocalHistorySchema.parse(next)),
  );
  return next;
}

function storageScope(value: string) {
  return encodeURIComponent(value.trim().toLowerCase() || "guest");
}
