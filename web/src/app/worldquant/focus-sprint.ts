import {
  FOCUS_SESSION_STORAGE_KEY,
  createFocusSession,
  parseFocusSession,
  reconcileFocusSession,
  serializeFocusSession,
  type FocusSession,
} from "../../lib/practice/focus-session";
import type {
  ReadinessQuestionSummary,
  WorldQuantRoleProfileId,
} from "../../lib/worldquant/readiness";
import type { WorldQuantFocusPlan } from "../../lib/worldquant/focus-plan";

type FocusSessionWriter = (key: string, value: string) => void;

type FocusSprintRuntime = {
  createSessionId?: () => string;
  now?: () => string;
  writeSession?: FocusSessionWriter;
};

export type FocusSprintDestination =
  | {
      kind: "practice";
      href: string;
      session: FocusSession;
    }
  | {
      kind: "guide";
      href: string;
    }
  | {
      kind: "unavailable";
      message: string;
    }
  | {
      kind: "storage_error";
      message: string;
    };

export function prepareFocusSprint(
  plan: WorldQuantFocusPlan,
  runtime: FocusSprintRuntime = {},
): FocusSprintDestination {
  if (plan.questions.length === 0) {
    const guide = plan.fallbacks.find(
      (fallback) => fallback.kind === "guide",
    );
    if (guide?.href) {
      return { kind: "guide", href: guide.href };
    }

    const contentGap = plan.fallbacks[0];
    return {
      kind: "unavailable",
      message:
        contentGap?.kind === "content_gap"
          ? contentGap.label
          : "Hôm nay không có câu đã duyệt phù hợp để tạo Focus Sprint.",
    };
  }

  try {
    const now = runtime.now?.() ?? new Date().toISOString();
    const session = createFocusSession(plan, {
      now,
      sessionId:
        runtime.createSessionId?.() ?? globalThis.crypto.randomUUID(),
    });
    const href = focusSessionHref(session);
    if (!href) {
      return {
        kind: "unavailable",
        message: "Focus Sprint không có câu hợp lệ để bắt đầu.",
      };
    }

    const writeSession =
      runtime.writeSession ??
      ((key: string, value: string) =>
        globalThis.localStorage.setItem(key, value));
    writeSession(FOCUS_SESSION_STORAGE_KEY, serializeFocusSession(session));
    return { kind: "practice", href, session };
  } catch {
    return {
      kind: "storage_error",
      message:
        "Không lưu được Focus Sprint trong trình duyệt. Chưa chuyển sang Practice; hãy bật local storage rồi thử lại.",
    };
  }
}

export function prepareFocusSprintResume(
  session: FocusSession,
  runtime: Pick<FocusSprintRuntime, "writeSession"> = {},
): FocusSprintDestination {
  const href = focusSessionHref(session);
  if (!href) {
    return {
      kind: "unavailable",
      message: "Focus Sprint cũ không còn câu đã duyệt để tiếp tục.",
    };
  }

  try {
    const writeSession =
      runtime.writeSession ??
      ((key: string, value: string) =>
        globalThis.localStorage.setItem(key, value));
    writeSession(FOCUS_SESSION_STORAGE_KEY, serializeFocusSession(session));
    return { kind: "practice", href, session };
  } catch {
    return {
      kind: "storage_error",
      message:
        "Không đọc/ghi được Focus Sprint trong trình duyệt. Chưa chuyển sang Practice.",
    };
  }
}

export function restoreMatchingFocusSession({
  raw,
  profileId,
  questions,
  now,
}: {
  raw: string | null;
  profileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  now?: string;
}): FocusSession | null {
  const parsed = parseFocusSession(raw);
  if (
    !parsed ||
    parsed.status !== "active" ||
    parsed.plan.profileId !== profileId
  ) {
    return null;
  }

  const reconciled = reconcileFocusSession(
    parsed,
    questions.map((question) => ({
      id: question.id,
      version: question.version,
      sourceHash: question.sourceHash,
      deckId: question.deckId,
    })),
    now,
  ).session;
  return reconciled.status === "active" &&
    reconciled.remainingQuestions.length > 0
    ? reconciled
    : null;
}

function focusSessionHref(session: FocusSession) {
  const firstQuestion = session.remainingQuestions[0];
  if (!firstQuestion) return null;

  const search = new URLSearchParams({
    deck: firstQuestion.deckId,
    focus: session.sessionId,
  });
  return `/?${search.toString()}`;
}
