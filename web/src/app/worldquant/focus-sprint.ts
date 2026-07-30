import {
  createFocusSession,
  focusSessionMatchesAccount,
  focusSessionStorageKey,
  parseFocusSession,
  readFocusSessionSnapshotLocked,
  reconcileFocusSession,
  serializeFocusSession,
  writeFocusSessionSnapshot,
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

type FocusSprintScope = {
  accountId: string | null;
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
  scope: FocusSprintScope,
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
          : "Hôm nay không có câu đã duyệt phù hợp để tạo Phiên ôn tập trọng tâm.",
    };
  }

  try {
    const now = runtime.now?.() ?? new Date().toISOString();
    const session = createFocusSession(plan, {
      accountId: scope.accountId,
      now,
      sessionId:
        runtime.createSessionId?.() ?? globalThis.crypto.randomUUID(),
    });
    const href = focusSessionHref(session);
    if (!href) {
      return {
        kind: "unavailable",
        message: "Phiên ôn tập trọng tâm không có câu hợp lệ để bắt đầu.",
      };
    }

    const serialized = serializeFocusSession(session);
    if (runtime.writeSession) {
      runtime.writeSession(
        focusSessionStorageKey(scope.accountId),
        serialized,
      );
    } else {
      writeFocusSessionSnapshot(scope.accountId, session);
    }
    return { kind: "practice", href, session };
  } catch {
    return {
      kind: "storage_error",
      message:
        "Không lưu được Phiên ôn tập trọng tâm trong trình duyệt. Hệ thống chưa chuyển sang phần luyện tập; hãy cho phép lưu dữ liệu trên thiết bị rồi thử lại.",
    };
  }
}

export async function prepareFocusSprintResume(
  session: FocusSession,
  scope: FocusSprintScope,
): Promise<FocusSprintDestination> {
  if (!focusSessionMatchesAccount(session, scope.accountId)) {
    return {
      kind: "unavailable",
      message:
        "Phiên ôn tập trọng tâm thuộc một tài khoản khác nên không thể tiếp tục.",
    };
  }
  try {
    const latest = await readFocusSessionSnapshotLocked(scope.accountId);
    if (
      !latest ||
      latest.sessionId !== session.sessionId ||
      latest.status !== "active"
    ) {
      return {
        kind: "unavailable",
        message:
          "Phiên ôn tập trọng tâm cũ không còn câu đã duyệt để tiếp tục.",
      };
    }
    const href = focusSessionHref(latest);
    if (!href) {
      return {
        kind: "unavailable",
        message:
          "Phiên ôn tập trọng tâm cũ không còn câu đã duyệt để tiếp tục.",
      };
    }
    return { kind: "practice", href, session: latest };
  } catch {
    return {
      kind: "storage_error",
      message:
        "Không đọc hoặc ghi được Phiên ôn tập trọng tâm trong trình duyệt. Hệ thống chưa chuyển sang phần luyện tập.",
    };
  }
}

export function restoreMatchingFocusSession({
  raw,
  accountId,
  profileId,
  questions,
  now,
}: {
  raw: string | null;
  accountId: string | null;
  profileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  now?: string;
}): FocusSession | null {
  const parsed = parseFocusSession(raw);
  if (
    !parsed ||
    !focusSessionMatchesAccount(parsed, accountId) ||
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
