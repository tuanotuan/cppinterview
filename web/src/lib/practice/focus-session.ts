import { z } from "zod";

import {
  focusPlanSchema,
  focusQuestionRefSchema,
  type FocusQuestionRef,
  type WorldQuantFocusPlan,
} from "../worldquant/focus-plan";
import {
  withBrowserStorageLock,
  type BrowserLockManager,
} from "./browser-storage-lock";

export const EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT =
  "__empty_focus_session__";
export const FOCUS_SESSION_VERSION = 2 as const;
const FOCUS_SESSION_CHANGED_EVENT = "recall:focus-session-changed";
const focusSessionIdSchema = z.string().uuid();
const focusSessionScopeSchema = z.union([
  z.literal("local"),
  z.string().uuid(),
]);

const focusSessionSchema = z
  .object({
    version: z.literal(FOCUS_SESSION_VERSION),
    accountScope: focusSessionScopeSchema,
    sessionId: focusSessionIdSchema,
    status: z.enum(["active", "completed"]),
    startedAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    completedAt: z.string().datetime({ offset: true }).optional(),
    plan: focusPlanSchema,
    remainingQuestions: z.array(focusQuestionRefSchema),
    completedQuestions: z.array(focusQuestionRefSchema),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.status === "active" && session.completedAt !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "An active focus session cannot have completedAt",
      });
    }
    if (
      session.status === "active" &&
      session.remainingQuestions.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["remainingQuestions"],
        message: "An active focus session requires a remaining question",
      });
    }
    if (session.status === "completed" && session.completedAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "A completed focus session requires completedAt",
      });
    }
    if (Date.parse(session.updatedAt) < Date.parse(session.startedAt)) {
      context.addIssue({
        code: "custom",
        path: ["updatedAt"],
        message: "updatedAt cannot precede startedAt",
      });
    }
    if (
      session.completedAt !== undefined &&
      Date.parse(session.completedAt) < Date.parse(session.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "completedAt cannot precede startedAt",
      });
    }

    const planReferences = new Map(
      session.plan.questions.map(({ question }) => [question.id, question]),
    );
    const seen = new Set<string>();
    for (const [queueName, references] of [
      ["remainingQuestions", session.remainingQuestions],
      ["completedQuestions", session.completedQuestions],
    ] as const) {
      references.forEach((reference, index) => {
        const planReference = planReferences.get(reference.id);
        if (!planReference || !samePlannedQuestionRef(reference, planReference)) {
          context.addIssue({
            code: "custom",
            path: [queueName, index],
            message: "Focus session reference must match its versioned plan",
          });
        }
        if (seen.has(reference.id)) {
          context.addIssue({
            code: "custom",
            path: [queueName, index, "id"],
            message: "A question can only appear once in a focus session",
          });
        }
        seen.add(reference.id);
      });
    }

    let previousPlanIndex = -1;
    for (const [queueName, references] of [
      ["completedQuestions", session.completedQuestions],
      ["remainingQuestions", session.remainingQuestions],
    ] as const) {
      references.forEach((reference, index) => {
        const planIndex = session.plan.questions.findIndex(
          ({ question }) => question.id === reference.id,
        );
        if (planIndex <= previousPlanIndex) {
          context.addIssue({
            code: "custom",
            path: [queueName, index],
            message: "Focus session queues must preserve plan order",
          });
        }
        previousPlanIndex = planIndex;
      });
    }
  });

export type FocusSession = z.infer<typeof focusSessionSchema>;
export type FocusSessionQuestionIdentity = Pick<
  FocusQuestionRef,
  "id" | "version" | "sourceHash" | "deckId"
>;

export function parseFocusSessionId(value: string | undefined): string | null {
  const parsed = focusSessionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

type CreateFocusSessionOptions = {
  accountId?: string | null;
  now?: string;
  sessionId?: string;
};

export function createFocusSession(
  plan: WorldQuantFocusPlan,
  options: CreateFocusSessionOptions = {},
): FocusSession {
  const validPlan = focusPlanSchema.parse(plan);
  const now = options.now ?? new Date().toISOString();
  const sessionId = options.sessionId ?? globalThis.crypto.randomUUID();
  const accountScope = focusSessionAccountScope(options.accountId ?? null);
  const remainingQuestions = validPlan.questions.map(({ question }) => question);
  const completed = remainingQuestions.length === 0;

  return focusSessionSchema.parse({
    version: FOCUS_SESSION_VERSION,
    accountScope,
    sessionId,
    status: completed ? "completed" : "active",
    startedAt: now,
    updatedAt: now,
    ...(completed ? { completedAt: now } : {}),
    plan: validPlan,
    remainingQuestions,
    completedQuestions: [],
  });
}

export function parseFocusSession(raw: string | null): FocusSession | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = focusSessionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function serializeFocusSession(session: FocusSession): string {
  return JSON.stringify(focusSessionSchema.parse(session));
}

export function focusSessionAccountScope(accountId: string | null) {
  return accountId ? z.string().uuid().parse(accountId) : "local";
}

export function focusSessionStorageKey(accountId: string | null) {
  return `recall:focus-session:${focusSessionAccountScope(accountId)}:v2`;
}

export function focusSessionMatchesAccount(
  session: FocusSession,
  accountId: string | null,
) {
  return session.accountScope === focusSessionAccountScope(accountId);
}

export function readFocusSessionSnapshot(accountId: string | null) {
  try {
    return (
      window.localStorage.getItem(focusSessionStorageKey(accountId)) ??
      EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT;
  }
}

export function writeFocusSessionSnapshot(
  accountId: string | null,
  session: FocusSession,
) {
  if (!focusSessionMatchesAccount(session, accountId)) {
    throw new Error(
      "Focus session account scope does not match its storage key",
    );
  }
  const storageKey = focusSessionStorageKey(accountId);
  window.localStorage.setItem(
    storageKey,
    serializeFocusSession(session),
  );
  window.dispatchEvent(
    new CustomEvent(FOCUS_SESSION_CHANGED_EVENT, {
      detail: { storageKey },
    }),
  );
}

export function removeFocusSessionSnapshot(accountId: string | null) {
  const storageKey = focusSessionStorageKey(accountId);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(FOCUS_SESSION_CHANGED_EVENT, {
      detail: { storageKey },
    }),
  );
}

export function readFocusSessionSnapshotLocked(
  accountId: string | null,
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = focusSessionStorageKey(accountId);
  return withBrowserStorageLock(
    storageKey,
    () => readStoredFocusSession(accountId, storageKey),
    lockManager,
  );
}

export function compareAndSetFocusSessionSnapshotLocked(
  accountId: string | null,
  expected: FocusSession,
  replacement: FocusSession | null,
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = focusSessionStorageKey(accountId);
  return withBrowserStorageLock(
    storageKey,
    () => {
      const current = readStoredFocusSession(accountId, storageKey);
      if (!sameFocusSessionRevision(current, expected)) {
        return { applied: false as const, session: current };
      }
      if (replacement) {
        writeFocusSessionSnapshot(accountId, replacement);
      } else {
        removeFocusSessionSnapshot(accountId);
      }
      return { applied: true as const, session: replacement };
    },
    lockManager,
  );
}

export function subscribeToFocusSession(
  accountId: string | null,
  callback: () => void,
) {
  const storageKey = focusSessionStorageKey(accountId);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === storageKey
    ) {
      callback();
    }
  };
  const onChanged = (event: Event) => {
    const detail = (
      event as CustomEvent<{ storageKey?: string }>
    ).detail;
    if (detail?.storageKey === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FOCUS_SESSION_CHANGED_EVENT, onChanged);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FOCUS_SESSION_CHANGED_EVENT, onChanged);
  };
}

function readStoredFocusSession(
  accountId: string | null,
  storageKey = focusSessionStorageKey(accountId),
) {
  const parsed = parseFocusSession(
    window.localStorage.getItem(storageKey),
  );
  return parsed && focusSessionMatchesAccount(parsed, accountId)
    ? parsed
    : null;
}

export function sameFocusSessionRevision(
  left: FocusSession | null,
  right: FocusSession,
) {
  return (
    left !== null &&
    serializeFocusSession(left) === serializeFocusSession(right)
  );
}

export function completeFocusSessionQuestion(
  session: FocusSession,
  questionId: string,
  now = new Date().toISOString(),
): FocusSession {
  if (session.status === "completed") return session;

  const questionIndex = session.remainingQuestions.findIndex(
    (question) => question.id === questionId,
  );
  if (questionIndex !== 0) return session;

  const question = session.remainingQuestions[questionIndex];
  const remainingQuestions = session.remainingQuestions.filter(
    (_, index) => index !== questionIndex,
  );
  const completed = remainingQuestions.length === 0;

  return focusSessionSchema.parse({
    ...session,
    status: completed ? "completed" : "active",
    updatedAt: now,
    ...(completed ? { completedAt: now } : {}),
    remainingQuestions,
    completedQuestions: [...session.completedQuestions, question],
  });
}

export function completeFocusSession(
  session: FocusSession,
  now = new Date().toISOString(),
): FocusSession {
  if (session.status === "completed") return session;

  return focusSessionSchema.parse({
    ...session,
    status: "completed",
    updatedAt: now,
    completedAt: now,
  });
}

export function stopFocusSession(
  session: FocusSession,
  now = new Date().toISOString(),
): FocusSession {
  return completeFocusSession(session, now);
}

export function reconcileFocusSession(
  session: FocusSession,
  availableIdentities: readonly FocusSessionQuestionIdentity[],
  now = new Date().toISOString(),
): {
  session: FocusSession;
  staleDroppedCount: number;
} {
  const availableById = new Map(
    availableIdentities.map((identity) => [identity.id, identity]),
  );
  const isCurrent = (reference: FocusQuestionRef) => {
    const available = availableById.get(reference.id);
    return available !== undefined && sameQuestionIdentity(reference, available);
  };
  const remainingQuestions = session.remainingQuestions.filter(isCurrent);
  const completedQuestions = session.completedQuestions.filter(isCurrent);
  const staleDroppedCount =
    session.remainingQuestions.length +
    session.completedQuestions.length -
    remainingQuestions.length -
    completedQuestions.length;

  if (staleDroppedCount === 0) {
    return { session, staleDroppedCount };
  }

  const completesActiveSession =
    session.status === "active" && remainingQuestions.length === 0;
  const reconciled = focusSessionSchema.parse({
    ...session,
    status: completesActiveSession ? "completed" : session.status,
    updatedAt: now,
    ...(completesActiveSession ? { completedAt: now } : {}),
    remainingQuestions,
    completedQuestions,
  });
  return { session: reconciled, staleDroppedCount };
}

function sameQuestionIdentity(
  left: FocusSessionQuestionIdentity,
  right: FocusSessionQuestionIdentity,
) {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.sourceHash === right.sourceHash &&
    left.deckId === right.deckId
  );
}

function samePlannedQuestionRef(
  left: FocusQuestionRef,
  right: FocusQuestionRef,
) {
  return (
    sameQuestionIdentity(left, right) &&
    left.estimatedMinutes === right.estimatedMinutes
  );
}
