"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { MonacoCodeEditor } from "@/app/scenario-code-editor";
import {
  codeExecutionResultSchema,
  type CodeExecutionResult,
} from "@/lib/code-runner/contracts";
import {
  publicHiddenExecutionResultSchema,
  type MockInterviewCompletedArtifactV4,
  type MockInterviewReportRequestV4,
  type MockInterviewScopedReportV4,
} from "@/lib/mock-interview/contracts-v4";
import type { WorldQuantMockGateSet } from "@/lib/worldquant/mock-gates";
import {
  type MockInterviewDimensionKey,
  type MockReportEvidence,
} from "@/lib/mock-interview/contracts";
import {
  targetedMockCandidates,
  WORLDQUANT_CURATED_CATALOG,
  type WorldQuantMockQuestion,
} from "@/lib/mock-interview/catalog";
import {
  WORLDQUANT_PROFILE,
  type MockInterviewDuration,
} from "@/lib/mock-interview/profile";
import { submitFrozenMockInterviewReport } from "@/lib/mock-interview/report-submission-client";
import {
  compareAndSetMockInterviewSessionSnapshotLocked,
  createMockInterviewSessionV4,
  mockInterviewSessionMatchesAccount,
  mockInterviewSessionMatchesGuidedRequest,
  mockInterviewStorageKey,
  mutateMockInterviewSessionSnapshotLocked,
  parseMockInterviewSessionV4,
  type MockInterviewSessionV4,
  type MockInterviewSessionV4Patch,
} from "@/lib/mock-interview/session-v4";
import {
  buildWorldQuantTargetedMockPlan,
  type TargetedMockBlueprintId,
  type TargetedMockMode,
  type TargetedMockPlan,
  type TargetedMockVariant,
} from "@/lib/mock-interview/target-plan";
import {
  buildLearningStates,
  filterReviewsForLearningHistory,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
import {
  EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
  readFocusSessionSnapshot,
} from "@/lib/practice/focus-session";
import {
  mergeProgress,
  parseProgress,
  type PracticeProgress,
} from "@/lib/practice/scheduler";
import {
  EMPTY_PROGRESS_STORAGE_SNAPSHOT,
  readPracticeProgressSnapshot,
  subscribeToPracticeProgress,
} from "@/lib/practice/storage";
import {
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfiles,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";
import {
  buildWorldQuantMockRemediation,
  type WorldQuantMockRemediation,
} from "@/lib/worldquant/mock-remediation";
import { prepareFocusSprint } from "@/app/worldquant/focus-sprint";
import { useConfirmation } from "@/app/confirmation-dialog";

type MockInterviewHistoryArtifact = Pick<
  MockInterviewCompletedArtifactV4,
  "sessionId" | "profileId" | "profileVersion" | "completedAt"
> & {
  plan: Pick<
    MockInterviewCompletedArtifactV4["plan"],
    "durationMinutes" | "mode" | "targetCompetency" | "variant" | "blueprintId"
  >;
  debrief: Pick<
    MockInterviewCompletedArtifactV4["debrief"],
    "assessedWeightPercent" | "roleInterviewScore" | "competencies"
  >;
};

type MockInterviewHistoryEntry = {
  attemptId: string;
  artifact: MockInterviewHistoryArtifact;
};

type MockInterviewAppProps = {
  account: {
    id: string;
    displayName: string;
    login: string | null;
  };
  sourceRevision: string;
  bankQuestions: WorldQuantMockQuestion[];
  readinessQuestions: ReadinessQuestionSummary[];
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  today: string;
  initialRoleProfileId: WorldQuantRoleProfileId;
  initialDuration: MockInterviewDuration;
  initialMode: TargetedMockMode;
  initialTargetCompetency: WorldQuantCompetencyKey | null;
  missionReturnHref: string | null;
  initialHistory: MockInterviewHistoryEntry[];
  historyAvailable: boolean;
  codeRunnerAvailable: boolean;
};

const EMPTY_MOCK_SESSION = "__empty_mock_session__";
const mockSessionListeners = new Map<string, Set<() => void>>();

function subscribeToMockSession(
  storageKey: string,
  callback: () => void,
) {
  const listeners =
    mockSessionListeners.get(storageKey) ?? new Set<() => void>();
  listeners.add(callback);
  mockSessionListeners.set(storageKey, listeners);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === storageKey
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      mockSessionListeners.delete(storageKey);
    }
    window.removeEventListener("storage", onStorage);
  };
}

function notifyMockSessionListeners(storageKey: string) {
  mockSessionListeners
    .get(storageKey)
    ?.forEach((listener) => listener());
}

function getMockSessionSnapshot(storageKey: string) {
  return (
    window.localStorage.getItem(storageKey) ??
    EMPTY_MOCK_SESSION
  );
}

function getServerMockSessionSnapshot() {
  return null;
}

async function saveMockSession(
  accountId: string,
  expected: MockInterviewSessionV4 | null,
  replacement: MockInterviewSessionV4,
) {
  const result =
    await compareAndSetMockInterviewSessionSnapshotLocked(
      accountId,
      expected,
      replacement,
    );
  if (result.applied) {
    notifyMockSessionListeners(mockInterviewStorageKey(accountId));
  }
  return result;
}

async function mutateMockSession(
  accountId: string,
  expected: MockInterviewSessionV4,
  mutation: (
    current: MockInterviewSessionV4,
  ) => MockInterviewSessionV4Patch,
) {
  const result =
    await mutateMockInterviewSessionSnapshotLocked(
      accountId,
      expected,
      mutation,
    );
  if (result.applied) {
    notifyMockSessionListeners(mockInterviewStorageKey(accountId));
  }
  return result;
}

async function clearMockSession(
  accountId: string,
  expected: MockInterviewSessionV4 | null,
) {
  const result =
    await compareAndSetMockInterviewSessionSnapshotLocked(
      accountId,
      expected,
      null,
    );
  if (result.applied) {
    notifyMockSessionListeners(mockInterviewStorageKey(accountId));
  }
  return result;
}

function readStoredMockSession(accountId: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(
    mockInterviewStorageKey(accountId),
  );
  const parsed = raw ? parseMockInterviewSessionV4(raw) : null;
  return parsed && mockInterviewSessionMatchesAccount(parsed, accountId)
    ? parsed
    : null;
}

function withoutKey<T>(record: Record<string, T>, key: string) {
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => entryKey !== key),
  ) as Record<string, T>;
}

async function clearPendingCodeRun(
  accountId: string,
  sessionId: string,
  questionId: string,
) {
  const latest = readStoredMockSession(accountId);
  if (!latest || latest.sessionId !== sessionId) return;
  await saveMockSession(accountId, latest, {
    ...latest,
    pendingCodeRuns: withoutKey(latest.pendingCodeRuns, questionId),
  });
}

const durationOptions: Array<{
  minutes: MockInterviewDuration;
}> = [
  { minutes: 30 },
  { minutes: 45 },
  { minutes: 60 },
];

const verdictLabels: Record<
  MockInterviewScopedReportV4["questionAssessments"][number]["verdict"],
  string
> = {
  needs_work: "Cần ôn lại",
  partial: "Đúng một phần",
  solid: "Khá chắc",
  strong: "Mạnh",
};

const interviewDimensionLabels: Record<MockInterviewDimensionKey, string> = {
  correctness: "Tính đúng đắn",
  complexity: "Độ phức tạp",
  idiomatic_cpp: "C++ idiomatic",
  lifetime_ownership: "Lifetime và ownership",
  testing_debugging: "Kiểm thử và gỡ lỗi",
  communication: "Giao tiếp",
  requirement_clarification: "Làm rõ yêu cầu",
  tradeoff_reasoning: "Lập luận trade-off",
};

export function MockInterviewApp({
  account,
  sourceRevision,
  bankQuestions,
  readinessQuestions,
  initialCloudProgress,
  initialQuestionStates,
  today,
  initialRoleProfileId,
  initialDuration,
  initialMode,
  initialTargetCompetency,
  missionReturnHref,
  initialHistory,
  historyAvailable,
  codeRunnerAvailable,
}: MockInterviewAppProps) {
  const [duration, setDuration] =
    useState<MockInterviewDuration>(initialDuration);
  const [roleProfileId, setRoleProfileId] =
    useState<WorldQuantRoleProfileId>(initialRoleProfileId);
  const [mode, setMode] = useState<TargetedMockMode>(initialMode);
  const [targetCompetency, setTargetCompetency] =
    useState<WorldQuantCompetencyKey | null>(
      initialMode === "targeted" ? initialTargetCompetency : null,
    );
  const [variant, setVariant] = useState<TargetedMockVariant>(1);
  const [blueprintId, setBlueprintId] =
    useState<TargetedMockBlueprintId>("new-feed");
  const [history, setHistory] =
    useState<MockInterviewHistoryEntry[]>(initialHistory);
  const [historyCloudAvailable, setHistoryCloudAvailable] =
    useState(historyAvailable);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [remediationMessage, setRemediationMessage] =
    useState<string | null>(null);
  const [remediationMinutes, setRemediationMinutes] = useState(30);
  const [now, setNow] = useState(() => Date.now());
  const [reportError, setReportError] = useState<string | null>(null);
  const [codeRunError, setCodeRunError] = useState<string | null>(null);
  const [runningQuestionId, setRunningQuestionId] =
    useState<string | null>(null);
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const evaluationInFlight = useRef(false);
  const autoSubmitted = useRef(false);
  const storageKey = useMemo(
    () => mockInterviewStorageKey(account.id),
    [account.id],
  );
  const subscribeToScopedMockSession = useMemo(
    () => (callback: () => void) =>
      subscribeToMockSession(storageKey, callback),
    [storageKey],
  );
  const subscribeToScopedProgress = useMemo(
    () => (callback: () => void) =>
      subscribeToPracticeProgress(account.id, callback),
    [account.id],
  );
  const readScopedProgress = useMemo(
    () => () => readPracticeProgressSnapshot(account.id),
    [account.id],
  );
  const sessionSnapshot = useSyncExternalStore(
    subscribeToScopedMockSession,
    () => getMockSessionSnapshot(storageKey),
    getServerMockSessionSnapshot,
  );
  const progressSnapshot = useSyncExternalStore(
    subscribeToScopedProgress,
    readScopedProgress,
    () => null,
  );

  const allQuestions = useMemo(
    () => [...bankQuestions, ...WORLDQUANT_CURATED_CATALOG],
    [bankQuestions],
  );
  const questionByIdentity = useMemo(
    () =>
      new Map(
        allQuestions.map((question) => [
          `${question.origin}:${question.id}`,
          question,
        ]),
      ),
    [allQuestions],
  );
  const storedSession = useMemo(
    () => {
      const parsed =
        sessionSnapshot && sessionSnapshot !== EMPTY_MOCK_SESSION
          ? parseMockInterviewSessionV4(sessionSnapshot)
          : null;
      return parsed &&
        mockInterviewSessionMatchesAccount(parsed, account.id)
        ? parsed
        : null;
    },
    [account.id, sessionSnapshot],
  );
  const staleSession = Boolean(
    storedSession?.status !== "completed" &&
      storedSession?.questions.some((identity) => {
      const question = questionByIdentity.get(
        `${identity.origin}:${identity.id}`,
      );
      return (
        !question ||
        question.origin !== identity.origin ||
        question.version !== identity.version ||
        question.contentRevision !== identity.contentRevision
      );
    }),
  );
  const interruptedEvaluation =
    storedSession?.status === "evaluating" && !evaluationInFlight.current;
  if (interruptedEvaluation) autoSubmitted.current = true;
  const session =
    storedSession && !staleSession ? storedSession : null;
  const guidedMissionMatchesSession =
    !missionReturnHref ||
    !session ||
    mockInterviewSessionMatchesGuidedRequest({
      session,
      request: {
        profileId: initialRoleProfileId,
        durationMinutes: initialDuration,
        mode: initialMode,
        targetCompetency:
          initialMode === "targeted"
            ? initialTargetCompetency
            : null,
        today,
      },
    });
  const hydrated = sessionSnapshot !== null;
  const notice = staleSession
    ? "Nội dung bộ đề hoặc ngân hàng câu hỏi đã thay đổi nên không thể khôi phục buổi cũ. Hãy tạo buổi mới để tránh chấm sai phiên bản."
    : sessionSnapshot !== null &&
        sessionSnapshot !== EMPTY_MOCK_SESSION &&
        !storedSession
      ? "Dữ liệu buổi phỏng vấn thử cũ bị lỗi nên đã được bỏ qua."
      : null;
  const visibleReportError =
    reportError ??
    (interruptedEvaluation
      ? "Lần chấm trước bị gián đoạn hoặc gặp lỗi. Bài nộp đã được khóa; nhấn “Thử tạo lại báo cáo” để gửi lại đúng dữ liệu cũ."
      : null);
  const timerSessionKey =
    session?.status === "in_progress"
      ? `${session.sessionId}:${session.status}`
      : null;

  useEffect(() => {
    if (!timerSessionKey) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [timerSessionKey]);

  const sessionQuestions = useMemo(
    () =>
      session?.questions.flatMap((identity) => {
        const question = questionByIdentity.get(
          `${identity.origin}:${identity.id}`,
        );
        return question ? [question] : [];
      }) ?? [],
    [questionByIdentity, session?.questions],
  );
  const currentQuestion = sessionQuestions[session?.currentIndex ?? 0];
  const selectedRole = worldQuantRoleProfileById(roleProfileId);
  const plan = useMemo(() => {
    try {
      return buildWorldQuantTargetedMockPlan({
        profileId: roleProfileId,
        mode,
        targetCompetency:
          mode === "targeted" ? targetCompetency : null,
        variant,
        blueprintId,
        durationMinutes: duration,
        candidates: targetedMockCandidates(allQuestions),
      });
    } catch {
      return null;
    }
  }, [
    allQuestions,
    duration,
    mode,
    roleProfileId,
    targetCompetency,
    variant,
    blueprintId,
  ]);
  const currentLearningStates = useMemo(() => {
    const local = parseProgress(
      progressSnapshot === null ||
        progressSnapshot === EMPTY_PROGRESS_STORAGE_SNAPSHOT
        ? null
        : progressSnapshot,
    );
    const merged = mergeProgress(initialCloudProgress, local);
    const reviews = filterReviewsForLearningHistory(
      merged.reviews,
      initialQuestionStates,
    );
    return buildLearningStates(
      readinessQuestions.map((question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
      })),
      reviews,
      initialQuestionStates,
    );
  }, [
    initialCloudProgress,
    initialQuestionStates,
    progressSnapshot,
    readinessQuestions,
  ]);
  const remediation = useMemo(() => {
    if (!session?.debrief) return null;
    return buildWorldQuantMockRemediation({
      debrief: session.debrief,
      approvedQuestions: readinessQuestions,
      states: currentLearningStates,
      today,
      timeBudgetMinutes: remediationMinutes,
    });
  }, [
    currentLearningStates,
    remediationMinutes,
    readinessQuestions,
    session?.debrief,
    today,
  ]);
  const remainingSeconds = session
    ? Math.max(
        0,
        Math.ceil(
          (new Date(session.deadlineAt).getTime() - now) / 1000,
        ),
      )
    : 0;

  useEffect(() => {
    if (
      !session ||
      session.status !== "in_progress" ||
      remainingSeconds > 0 ||
      autoSubmitted.current
    ) {
      return;
    }
    autoSubmitted.current = true;
    void finishInterview(true);
    // finishInterview intentionally consumes the exact session snapshot that
    // caused the deadline transition; adding it would retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, session?.sessionId, session?.status]);

  async function startInterview(selectedPlan: TargetedMockPlan) {
    if (selectedPlan.questions.length < 3) {
      setReportError(
        "Bộ đề này chưa có đủ 3 câu đã duyệt để tạo báo cáo đáng tin cậy.",
      );
      return;
    }
    const sessionId = crypto.randomUUID();
    const startedAt = new Date();
    const nextSession = createMockInterviewSessionV4({
      sessionId,
      accountId: account.id,
      sourceRevision,
      plan: selectedPlan,
      catalog: allQuestions,
      startedAt,
    });
    setReportError(null);
    setHistoryError(null);
    setCodeRunError(null);
    setRunningQuestionId(null);
    const saved = await saveMockSession(
      account.id,
      storedSession,
      nextSession,
    );
    if (!saved.applied) {
      setReportError(
        "Phiên phỏng vấn đã được cập nhật ở thẻ trình duyệt khác. Hãy kiểm tra lại trước khi tạo phiên mới.",
      );
      return;
    }
    autoSubmitted.current = false;
    evaluationInFlight.current = false;
    setNow(startedAt.getTime());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateAnswer(
    questionId: string,
    field: "response" | "explanation",
    value: string,
  ) {
    if (!session || session.status !== "in_progress") return;
    const saved = await mutateMockSession(account.id, session, (current) => {
      const answer = current.answers[questionId] ?? {
        response: "",
        explanation: "",
      };
      const sourceChanged =
        field === "response" && answer.response !== value;
      return {
        answers: {
          ...current.answers,
          [questionId]: { ...answer, [field]: value },
        },
        sampleCodeRuns: sourceChanged
          ? withoutKey(current.sampleCodeRuns, questionId)
          : current.sampleCodeRuns,
        hiddenCodeRuns: sourceChanged
          ? withoutKey(current.hiddenCodeRuns, questionId)
          : current.hiddenCodeRuns,
        pendingCodeRuns: sourceChanged
          ? withoutKey(current.pendingCodeRuns, questionId)
          : current.pendingCodeRuns,
        reportIdempotencyKey: sourceChanged
          ? undefined
          : current.reportIdempotencyKey,
      };
    });
    if (
      field === "response" &&
      saved.applied &&
      saved.session.answers[questionId]?.response === value
    ) {
      setCodeRunError(null);
    }
    if (!saved.applied) {
      setReportError(
        "Câu trả lời đã được cập nhật ở thẻ trình duyệt khác. Trang đang giữ phiên bản mới hơn.",
      );
    }
  }

  async function runCurrentCode() {
    if (
      !session ||
      session.status !== "in_progress" ||
      !currentQuestion?.execution ||
      currentQuestion.origin !== "role_profile" ||
      runningQuestionId
    ) {
      return;
    }
    if (!codeRunnerAvailable) {
      setCodeRunError(
        "Môi trường chạy mã cô lập chưa được cấu hình trên Vercel.",
      );
      return;
    }
    const source =
      session.answers[currentQuestion.id]?.response ?? "";
    if (!source.trim()) {
      setCodeRunError("Hãy viết mã trước khi chạy các kiểm thử mẫu.");
      return;
    }

    const identity = session.questions[session.currentIndex];
    if (!identity || identity.id !== currentQuestion.id) return;
    const pending =
      session.pendingCodeRuns[currentQuestion.id] ?? {
        idempotencyKey: crypto.randomUUID(),
        requestedAt: new Date().toISOString(),
      };
    const pendingSaved = await saveMockSession(account.id, session, {
      ...session,
      pendingCodeRuns: {
        ...session.pendingCodeRuns,
        [currentQuestion.id]: pending,
      },
    });
    if (!pendingSaved.applied) {
      setCodeRunError(
        "Phiên phỏng vấn đã được cập nhật ở thẻ trình duyệt khác. Hãy kiểm tra lại trước khi chạy mã.",
      );
      return;
    }
    setCodeRunError(null);
    setRunningQuestionId(currentQuestion.id);

    try {
      const response = await fetch("/api/mock-interview/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 4,
          idempotencyKey: pending.idempotencyKey,
          sessionId: session.sessionId,
          profileId: session.profileId,
          profileVersion: session.profileVersion,
          sourceRevision: session.sourceRevision,
          plan: session.plan,
          question: session.plan.questions[session.currentIndex],
          code: source,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: unknown;
        error?: string;
        code?: string;
      };
      const parsedResult = codeExecutionResultSchema.safeParse(
        payload.result,
      );
      if (!response.ok || !payload.ok || !parsedResult.success) {
        if (
          payload.code !== "run_in_progress" &&
          payload.code !== "runner_busy" &&
          payload.code !== "run_finalization_indeterminate"
        ) {
          await clearPendingCodeRun(
            account.id,
            session.sessionId,
            currentQuestion.id,
          );
        }
        throw new Error(
          payload.error || "Môi trường chạy mã chưa trả về kết quả hợp lệ.",
        );
      }

      const latest = readStoredMockSession(account.id);
      if (
        latest?.sessionId === session.sessionId &&
        latest.answers[currentQuestion.id]?.response === source
      ) {
        await saveMockSession(account.id, latest, {
          ...latest,
          sampleCodeRuns: {
            ...latest.sampleCodeRuns,
            [currentQuestion.id]: parsedResult.data,
          },
          pendingCodeRuns: withoutKey(
            latest.pendingCodeRuns,
            currentQuestion.id,
          ),
        });
      }
    } catch (error) {
      setCodeRunError(
        error instanceof Error
          ? error.message
          : "Môi trường chạy mã chưa hoạt động. Vui lòng thử lại sau.",
      );
    } finally {
      setRunningQuestionId(null);
    }
  }

  async function moveToQuestion(nextIndex: number) {
    if (
      !session ||
      session.status !== "in_progress" ||
      nextIndex < 0 ||
      nextIndex >= session.questions.length
    ) {
      return;
    }
    const saved = await saveMockSession(
      account.id,
      session,
      commitCurrentQuestionTime(session, Date.now(), nextIndex),
    );
    if (!saved.applied) {
      setReportError(
        "Phiên phỏng vấn đã được cập nhật ở thẻ trình duyệt khác. Trang đang giữ phiên bản mới hơn.",
      );
      return;
    }
    setCodeRunError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishInterview(
    timerExpired = false,
    confirmedUnanswered = false,
  ) {
    if (
      !session ||
      (session.status !== "in_progress" &&
        !(
          session.status === "evaluating" &&
          session.pendingReportRequest
        )) ||
      evaluationInFlight.current
    ) {
      return;
    }
    const retryingFrozenSubmission =
      session.status === "evaluating" &&
      Boolean(session.pendingReportRequest);
    const unanswered = retryingFrozenSubmission
      ? 0
      : session.questions.filter((identity) => {
          const question = questionByIdentity.get(
            `${identity.origin}:${identity.id}`,
          );
          return (
            !question ||
            !isQuestionAnswered(
              question,
              session.answers[identity.id] ?? {
                response: "",
                explanation: "",
              },
            )
          );
        }).length;
    if (unanswered > 0 && !timerExpired && !confirmedUnanswered) {
      requestConfirmation({
        title: "Nộp khi còn câu chưa trả lời?",
        description: `Còn ${unanswered} câu chưa trả lời. Nếu nộp ngay, các câu này sẽ được tính là 0 điểm trong báo cáo phỏng vấn thử.`,
        confirmLabel: "Nộp bài ngay",
        tone: "danger",
        onConfirm: () => finishInterview(false, true),
      });
      return;
    }

    evaluationInFlight.current = true;
    const submittedAt = Date.now();
    const committed = retryingFrozenSubmission
      ? session
      : commitCurrentQuestionTime(
          session,
          submittedAt,
          session.currentIndex,
        );
    const pendingReportRequest: MockInterviewReportRequestV4 =
      committed.pendingReportRequest ?? {
        schemaVersion: 4,
        idempotencyKey:
          committed.reportIdempotencyKey ?? crypto.randomUUID(),
        sessionId: committed.sessionId,
        profileId: committed.profileId,
        profileVersion: committed.profileVersion,
        sourceRevision: committed.sourceRevision,
        startedAt: committed.startedAt,
        submittedAt: new Date(submittedAt).toISOString(),
        plan: committed.plan,
        elapsedSeconds: Math.max(
          0,
          Math.floor(
            (submittedAt - new Date(committed.startedAt).getTime()) /
              1000,
          ),
        ),
        items: committed.questions.map((identity, index) => {
          const question = questionByIdentity.get(
            `${identity.origin}:${identity.id}`,
          )!;
          const draft = committed.answers[identity.id] ?? {
            response: "",
            explanation: "",
          };
          const normalized = draftForSubmission(question, draft);
          return {
            question: committed.plan.questions[index],
            response: normalized.response,
            explanation: normalized.explanation,
            elapsedSeconds:
              committed.elapsedByQuestion[identity.id] ?? 0,
          };
        }),
      };
    const reportIdempotencyKey =
      pendingReportRequest.idempotencyKey;
    const evaluatingSession: MockInterviewSessionV4 = {
      ...committed,
      status: "evaluating",
      reportIdempotencyKey,
      pendingReportRequest,
    };
    setReportError(null);

    try {
      const submission = await submitFrozenMockInterviewReport({
        lockName: `recall:mock-report:${storageKey}`,
        persistFrozenSession: () =>
          saveMockSession(
            account.id,
            session,
            evaluatingSession,
          ).then((result) => result.applied),
        sendReport: () =>
          fetch("/api/mock-interview/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pendingReportRequest),
          }),
      });
      if (submission.kind === "storage_conflict") {
        setReportError(
          "Buổi phỏng vấn đã được cập nhật ở thẻ trình duyệt khác. Trang đã giữ phiên bản mới hơn; hãy kiểm tra lại rồi nộp lần nữa.",
        );
        return;
      }
      const response = submission.response;
      const payload = (await response.json()) as {
        report?: MockInterviewScopedReportV4;
        debrief?: MockInterviewSessionV4["debrief"];
        gates?: WorldQuantMockGateSet;
        completedAt?: string;
        model?: string;
        provider?: "openai" | "gemini";
        historyPersisted?: boolean;
        historyAttemptId?: string | null;
        historyWarning?: string | null;
        mistakeCapture?: {
          candidates: Array<{ id: string }>;
          generationMode: "ask" | "auto" | "off";
        } | null;
        mistakeQueueAvailable?: boolean;
        executionResults?: Array<{
          questionId: string;
          result: unknown;
        }>;
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.report || !payload.debrief) {
        const requestError = new Error(
          payload.error || "AI chưa tạo được báo cáo.",
        ) as Error & { code?: string };
        requestError.code = payload.code;
        throw requestError;
      }
      const hiddenCodeRuns = Object.fromEntries(
        (payload.executionResults ?? []).flatMap((entry) => {
          const parsedResult =
            publicHiddenExecutionResultSchema.safeParse(entry.result);
          if (
            !parsedResult.success ||
            !committed.questions.some(
              (question) => question.id === entry.questionId,
            )
          ) {
            return [];
          }
          const localResult: CodeExecutionResult = {
            ...parsedResult.data,
            diagnostics: "",
            output: "",
            cases: [],
          };
          return [[entry.questionId, localResult] as const];
        }),
      );
      const latest = readStoredMockSession(account.id);
      if (
        !latest ||
        latest.sessionId !== committed.sessionId ||
        latest.reportIdempotencyKey !== reportIdempotencyKey
      ) {
        return;
      }
      const completed: MockInterviewSessionV4 = {
        ...latest,
        status: "completed",
        completedAt: payload.completedAt ?? new Date().toISOString(),
        reportIdempotencyKey,
        pendingReportRequest: undefined,
        hiddenCodeRuns,
        report: payload.report,
        debrief: payload.debrief,
        gates: payload.gates,
        reportModel: payload.model,
        reportProvider: payload.provider,
      };
      const completedSaved = await saveMockSession(
        account.id,
        latest,
        completed,
      );
      if (!completedSaved.applied) {
        setReportError(
          "Báo cáo đã tạo xong nhưng phiên trong trình duyệt vừa được cập nhật ở thẻ khác. Hãy nộp lại để tải kết quả đã lưu mà không gọi AI lần nữa.",
        );
        return;
      }
      if (payload.historyPersisted) {
        setHistoryCloudAvailable(true);
        const artifact = {
          schemaVersion: 4 as const,
          sessionId: completed.sessionId,
          profileId: completed.profileId,
          profileVersion: completed.profileVersion,
          plan: completed.plan,
          startedAt: completed.startedAt,
          completedAt: completed.completedAt!,
          report: completed.report!,
          debrief: completed.debrief!,
          gates: completed.gates,
          model: completed.reportModel ?? "Mô hình AI",
          provider: completed.reportProvider ?? "openai",
          executionResults: Object.entries(hiddenCodeRuns).map(
            ([questionId, result]) => ({
              questionId,
              submittedCodeHash: result.codeHash,
              result: toPublicHiddenExecutionResult(result),
            }),
          ),
        };
        setHistory((current) => [
          {
            attemptId:
              payload.historyAttemptId ?? completed.sessionId,
            artifact,
          },
          ...current.filter(
            (entry) => entry.artifact.sessionId !== completed.sessionId,
          ),
        ]);
      }
      const detected = payload.mistakeCapture?.candidates ?? [];
      const mistakeMessage = detected.length
        ? `Đã đưa ${detected.length} việc cần luyện từ báo cáo vào hàng chờ lỗi cần ôn.`
        : payload.mistakeQueueAvailable === false
          ? "Hàng chờ lỗi cần ôn chưa được cài đặt dữ liệu trên Supabase."
          : null;
      setHistoryError(
        [payload.historyWarning, mistakeMessage].filter(Boolean).join(" ") ||
          null,
      );
      if (
        detected.length &&
        payload.mistakeCapture?.generationMode === "auto"
      ) {
        void Promise.allSettled(
          detected.map((candidate) =>
            fetch("/api/mistakes/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidateId: candidate.id }),
            }),
          ),
        );
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      autoSubmitted.current = true;
      const requestCode =
        error instanceof Error && "code" in error
          ? (error as Error & { code?: string }).code
          : undefined;
      const latest = readStoredMockSession(account.id);
      if (
        latest?.sessionId === committed.sessionId &&
        latest.reportIdempotencyKey === reportIdempotencyKey
      ) {
        const retryable: MockInterviewSessionV4 =
          requestCode === "code_execution_retry_required"
            ? {
                ...latest,
                status: "in_progress",
                reportIdempotencyKey: undefined,
                pendingReportRequest: undefined,
                activeQuestionStartedAt: new Date().toISOString(),
              }
            : {
                ...latest,
                status: "evaluating",
                reportIdempotencyKey,
                pendingReportRequest,
              };
        await saveMockSession(account.id, latest, retryable);
      }
      setReportError(
        error instanceof Error
          ? error.message
          : "AI chưa tạo được báo cáo. Vui lòng thử lại sau.",
      );
    } finally {
      evaluationInFlight.current = false;
    }
  }

  function launchRemediation(
    option: WorldQuantMockRemediation["recommendations"][number],
    confirmed = false,
  ) {
    setRemediationMessage(null);
    if (
      !confirmed &&
      readFocusSessionSnapshot(account.id) !==
        EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT
    ) {
      requestConfirmation({
        title: "Thay phiên ôn tập trọng tâm đang mở?",
        description: "Một phiên ôn tập trọng tâm khác đang mở trên trình duyệt này. Nếu tiếp tục, phiên đó sẽ được thay bằng kế hoạch ôn mới.",
        confirmLabel: "Thay bằng kế hoạch mới",
        tone: "danger",
        onConfirm: () => launchRemediation(option, true),
      });
      return;
    }
    startRemediation(option);
  }

  function startRemediation(
    option: WorldQuantMockRemediation["recommendations"][number],
  ) {
    const destination = prepareFocusSprint(option.plan, {
      accountId: account.id,
    });
    if (destination.kind === "practice") {
      window.location.assign(destination.href);
      return;
    }
    if (destination.kind === "guide") {
      window.location.assign(destination.href);
      return;
    }
    setRemediationMessage(destination.message);
  }

  async function deleteHistoryEntry(attemptId: string, confirmed = false) {
    if (!confirmed) {
      requestConfirmation({
        title: "Xóa lượt phỏng vấn khỏi lịch sử?",
        description: "Báo cáo và dữ liệu của lượt này sẽ bị xóa khỏi lịch sử trực tuyến. Thao tác này không thể hoàn tác.",
        confirmLabel: "Xóa lượt phỏng vấn",
        tone: "danger",
        onConfirm: () => deleteHistoryEntry(attemptId, true),
      });
      return;
    }
    setHistoryError(null);
    try {
      const response = await fetch("/api/mock-interview/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        deleted?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.deleted) {
        throw new Error(payload.error || "Không xóa được lượt phỏng vấn.");
      }
      setHistory((current) =>
        current.filter((entry) => entry.attemptId !== attemptId),
      );
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Không xóa được lượt phỏng vấn.",
      );
    }
  }

  async function resetInterview(
    preferInitialRequest = false,
    confirmed = false,
  ) {
    if (
      session?.status !== "completed" &&
      session &&
      !confirmed
    ) {
      requestConfirmation({
        title: "Dừng buổi phỏng vấn đang làm?",
        description: "Câu trả lời và thời gian của buổi đang làm sẽ bị xóa khỏi trình duyệt. Bạn sẽ bắt đầu một buổi mới.",
        confirmLabel: "Dừng và tạo buổi mới",
        tone: "danger",
        onConfirm: () => resetInterview(preferInitialRequest, true),
      });
      return;
    }
    const cleared = await clearMockSession(account.id, session);
    if (!cleared.applied) {
      setReportError(
        "Phiên phỏng vấn đã được cập nhật ở thẻ trình duyệt khác. Hãy kiểm tra lại trước khi xóa.",
      );
      return;
    }
    if (session && !preferInitialRequest) {
      setDuration(session.plan.durationMinutes);
      setRoleProfileId(session.profileId);
      setMode(session.plan.mode);
      setTargetCompetency(session.plan.targetCompetency);
      setVariant(session.plan.variant);
      setBlueprintId(
        session.plan.blueprintId ??
          (session.plan.variant === 1 ? "new-feed" : "migration-incident"),
      );
    } else if (preferInitialRequest) {
      setDuration(initialDuration);
      setRoleProfileId(initialRoleProfileId);
      setMode(initialMode);
      setTargetCompetency(
        initialMode === "targeted"
          ? initialTargetCompetency
          : null,
      );
      setVariant(1);
      setBlueprintId("new-feed");
    }
    autoSubmitted.current = false;
    evaluationInFlight.current = false;
    setReportError(null);
    setCodeRunError(null);
    setRunningQuestionId(null);
    setRemediationMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="font-mono text-xs text-[#526276]">
          Đang khôi phục phòng phỏng vấn…
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <>
        <MockSetup
          account={account}
        duration={duration}
        roleProfileId={roleProfileId}
        mode={mode}
        targetCompetency={targetCompetency}
        blueprintId={blueprintId}
        plan={plan}
        onDuration={setDuration}
        onRole={(nextRole) => {
          const nextProfile = worldQuantRoleProfileById(nextRole);
          setRoleProfileId(nextRole);
          if (
            targetCompetency &&
            nextProfile.weights[targetCompetency] <= 0
          ) {
            setTargetCompetency(
              nextProfile.coreCompetencies[0] ?? null,
            );
          }
        }}
        onMode={(nextMode) => {
          setMode(nextMode);
          if (nextMode === "balanced") {
            setTargetCompetency(null);
          } else if (!targetCompetency) {
            setTargetCompetency(
              selectedRole.coreCompetencies[0] ?? null,
            );
          }
        }}
        onTargetCompetency={setTargetCompetency}
        onBlueprint={(nextBlueprint) => {
          setBlueprintId(nextBlueprint);
          setVariant(nextBlueprint === "new-feed" ? 1 : 2);
        }}
        onStart={() => plan && startInterview(plan)}
        bankQuestionCount={bankQuestions.length}
        catalog={allQuestions}
        history={history}
        historyAvailable={historyCloudAvailable}
        historyError={historyError}
        onDeleteHistory={deleteHistoryEntry}
          notice={notice}
        />
        {confirmationDialog}
      </>
    );
  }

  if (session.status === "completed" && session.report) {
    return (
      <>
        <MockReport
          account={account}
        session={session}
        questions={sessionQuestions}
        remediation={remediation}
        remediationMinutes={remediationMinutes}
        remediationMessage={remediationMessage}
        historyWarning={historyError}
        missionReturnHref={
          guidedMissionMatchesSession ? missionReturnHref : null
        }
        missionStartRequired={
          Boolean(missionReturnHref) && !guidedMissionMatchesSession
        }
        onReset={() => resetInterview()}
        onStartMissionMock={() => resetInterview(true)}
        onReplay={() => startInterview(session.plan)}
        onRemediate={launchRemediation}
          onRemediationMinutes={setRemediationMinutes}
        />
        {confirmationDialog}
      </>
    );
  }

  if (!currentQuestion) {
    return (
      <>
        <main className="grid min-h-screen place-items-center px-5">
        <section className="max-w-lg rounded-[1.25rem] border border-[#a65c0e]/20 bg-white/70 p-8 text-center">
          <h1 className="text-2xl font-semibold">Không khôi phục được câu hỏi</h1>
          <p className="mt-3 text-[#526276]">
            Ngân hàng câu hỏi đã thay đổi. Hãy tạo buổi mới để tránh chấm
            nhầm phiên bản.
          </p>
          <button
            type="button"
            onClick={() => resetInterview()}
            className="mt-6 rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white"
          >
            Tạo buổi mới
          </button>
        </section>
        </main>
        {confirmationDialog}
      </>
    );
  }

  const currentDraft = session.answers[currentQuestion.id] ?? {
    response: "",
    explanation: "",
  };
  const answeredQuestionIds = new Set(
    session.questions.flatMap((identity) => {
      const question = questionByIdentity.get(
        `${identity.origin}:${identity.id}`,
      );
      return question &&
        isQuestionAnswered(
          question,
          session.answers[identity.id] ?? {
            response: "",
            explanation: "",
          },
        )
        ? [identity.id]
        : [];
    }),
  );
  const answeredCount = answeredQuestionIds.size;
  const progress =
    ((session.currentIndex + 1) / session.questions.length) * 100;

  return (
    <>
    <main className="min-h-screen px-4 py-4 sm:px-7 lg:px-10">
      <div className="ui-page-width">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Về trang chủ cppinterview"
              title="Về trang chủ cppinterview"
              className="grid size-10 place-items-center rounded-xl bg-[#0f3a69] font-mono text-xs font-bold text-[#65e6d2] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              CI
            </Link>
            <div>
              <p className="font-semibold">Phỏng vấn thử</p>
              <p className="ui-metadata mt-0.5 text-[color:var(--ink-subtle)]">
                {worldQuantRoleProfileById(session.profileId).label} ·{" "}
                {session.plan.mode === "targeted" ? "Trọng tâm" : "Toàn diện"} ·{" "}
                {session.plan.durationMinutes} phút
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-4 py-2 font-mono text-sm font-bold ${
                remainingSeconds <= 300
                  ? "border-[#a65c0e]/30 bg-[#fff1f1] text-[#c43d3d]"
                  : "border-[#0f3a69]/15 bg-white/65 text-[#16865a]"
              }`}
            >
              {formatClock(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={() =>
                resetInterview(
                  Boolean(missionReturnHref) &&
                    !guidedMissionMatchesSession,
                )
              }
              disabled={
                session.status === "evaluating" &&
                !visibleReportError
              }
              className="rounded-xl border border-[#0f3a69]/15 bg-white/60 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              {missionReturnHref && !guidedMissionMatchesSession
                ? "Đổi sang buổi phỏng vấn của nhiệm vụ"
                : "Dừng"}
            </button>
          </div>
        </header>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs text-[#526276]">
            <span className="font-mono font-bold">
              Câu {session.currentIndex + 1}/{session.questions.length}
            </span>
            <span>{answeredCount} câu đã trả lời · tự lưu khi F5</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0f3a69]/10">
            <div
              className="h-full rounded-full bg-[#138f8c] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section className="grid gap-5 py-7 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/58 p-4 shadow-sm">
              <p className="ui-eyebrow text-[#285f86]">
                Điều hướng buổi
              </p>
              <p className="mt-2 text-xs leading-5 text-[color:var(--ink-subtle)]">
                Chỉ hiển thị thứ tự và trạng thái trả lời; không lộ chủ đề hay gợi ý.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {session.questions.map((identity, index) => {
                  const active = index === session.currentIndex;
                  const answered = answeredQuestionIds.has(identity.id);
                  return (
                    <button
                      key={`${identity.origin}:${identity.id}`}
                      type="button"
                      onClick={() => moveToQuestion(index)}
                      disabled={session.status === "evaluating"}
                      aria-current={active ? "step" : undefined}
                      aria-label={`Câu ${index + 1}${answered ? ", đã trả lời" : ", chưa trả lời"}`}
                      className={`relative rounded-xl px-3 py-2.5 text-left font-mono text-xs font-bold transition disabled:opacity-45 ${
                        active
                          ? "border border-[#65e6d2] bg-[#e6f8f5] text-[#0f3a69] shadow-[inset_0_-2px_0_#65e6d2]"
                          : "border border-[#0f3a69]/12 bg-white text-[#43546a] hover:border-[#285f86]/35"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                      <span
                        aria-hidden="true"
                        className={`ml-2 inline-block size-1.5 rounded-full ${
                          answered ? "bg-[#138f8c]" : "bg-[#a65c0e]/45"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 border-t border-[#0f3a69]/10 pt-4 text-xs leading-5 text-[#526276]">
                <strong className="text-[#0f3a69]">{answeredCount}</strong>/{session.questions.length} câu đã trả lời
              </div>
            </div>
          </aside>
          <div className="min-w-0">
          <article className="overflow-hidden rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/68 shadow-[0_22px_80px_rgb(15_58_105_/_8%)]">
            <div className="border-b border-[#0f3a69]/10 bg-[#0f3a69] px-6 py-4 text-white sm:px-9">
              <p className="ui-eyebrow text-[#65e6d2]">
                Người phỏng vấn
              </p>
              <p className="mt-1 text-sm text-on-dark-muted">
                Không gợi ý · không nhãn chủ đề · không phản hồi giữa buổi
              </p>
            </div>
            <div className="p-6 sm:p-9">
              <h1 className="max-w-4xl text-balance text-2xl leading-[1.35] font-semibold tracking-[-0.025em] sm:text-3xl">
                <InlineCode text={currentQuestion.prompt} />
              </h1>

              {currentQuestion.code &&
              currentQuestion.responseMode !== "code" ? (
                <pre className="mt-7 max-h-[26rem] overflow-auto rounded-2xl bg-[#092c51] p-5 font-mono text-[13px] leading-6 text-[#e6f8f5]">
                  <code>{currentQuestion.code}</code>
                </pre>
              ) : null}

              <div className="mt-8">
                {currentQuestion.responseMode === "code" ? (
                  <div className="space-y-5">
                    <div className="overflow-hidden rounded-2xl border border-[#0f3a69]/15 bg-[#092c51]">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                        <span className="font-mono text-xs font-bold text-[#65e6d2]">
                          Bài làm của ứng viên
                        </span>
                        <span className="text-[10px] text-white/45">
                          {currentQuestion.execution
                            ? codeRunnerAvailable
                              ? "Môi trường cô lập · kiểm thử mẫu"
                              : "Môi trường cô lập chưa được cấu hình"
                            : "AI đánh giá · không có đặc tả chạy tự động"}
                        </span>
                      </div>
                      <MonacoCodeEditor
                        language={currentQuestion.language}
                        value={currentDraft.response}
                        onChange={(value) =>
                          updateAnswer(
                            currentQuestion.id,
                            "response",
                            value.slice(0, 8000),
                          )
                        }
                        height="420px"
                        expanded={false}
                        placeholder="Viết lời giải của bạn ở đây…"
                      />
                    </div>
                    {currentQuestion.execution ? (
                      <div className="rounded-2xl border border-[#0f3a69]/15 bg-[#f8fafc] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#285f86]">
                              Chạy mã
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#526276]">
                              Kiểm thử mẫu hiển thị chi tiết; kiểm thử ẩn chỉ
                              chạy khi kết thúc buổi.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void runCurrentCode()}
                            disabled={
                              !codeRunnerAvailable ||
                              session.status === "evaluating" ||
                              runningQuestionId !== null
                            }
                            className="rounded-xl bg-[#0f3a69] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-45"
                          >
                            {runningQuestionId === currentQuestion.id
                              ? "Đang biên dịch và kiểm thử…"
                              : "Chạy kiểm thử mẫu"}
                          </button>
                        </div>
                        {session.sampleCodeRuns[currentQuestion.id] ? (
                          <ExecutionResultPanel
                            result={
                              session.sampleCodeRuns[currentQuestion.id]
                            }
                            compact={false}
                          />
                        ) : null}
                        {codeRunError ? (
                          <p
                            role="alert"
                            className="mt-3 rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] px-3 py-2 text-xs leading-5 text-[#c43d3d]"
                          >
                            {codeRunError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="block text-sm font-bold text-[#285f86]">
                      Độ phức tạp, giả định và các điểm đánh đổi
                      <textarea
                        value={currentDraft.explanation}
                        onChange={(event) =>
                          updateAnswer(
                            currentQuestion.id,
                            "explanation",
                            event.target.value,
                          )
                        }
                        maxLength={4000}
                        rows={5}
                        disabled={session.status === "evaluating"}
                        placeholder="Giải thích như đang trao đổi với người phỏng vấn…"
                        className="mt-2 w-full resize-y rounded-2xl border border-[#0f3a69]/15 bg-white/80 px-4 py-3 font-normal leading-7 outline-none focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block text-sm font-bold text-[#285f86]">
                    Câu trả lời của bạn
                    <textarea
                      value={currentDraft.response}
                      onChange={(event) =>
                        updateAnswer(
                          currentQuestion.id,
                          "response",
                          event.target.value,
                        )
                      }
                      maxLength={8000}
                      rows={10}
                      disabled={session.status === "evaluating"}
                      placeholder="Trả lời thành tiếng hoặc viết như đang trao đổi với người phỏng vấn…"
                      className="mt-2 w-full resize-y rounded-2xl border border-[#0f3a69]/15 bg-white/80 px-4 py-3 font-normal leading-7 outline-none focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45"
                    />
                  </label>
                )}
              </div>
            </div>
          </article>

          {visibleReportError ? (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
            >
              {visibleReportError}
            </p>
          ) : null}

          <div className="sticky bottom-24 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0f3a69]/12 bg-[#f8fafc]/94 p-3 shadow-[0_12px_38px_rgba(15,58,105,0.12)] backdrop-blur lg:bottom-3">
            <button
              type="button"
              onClick={() => moveToQuestion(session.currentIndex - 1)}
              disabled={
                session.currentIndex === 0 || session.status === "evaluating"
              }
              className="rounded-xl border border-[#0f3a69]/15 bg-white/70 px-5 py-3 text-sm font-bold disabled:opacity-35"
            >
              ← Câu trước
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {session.currentIndex < session.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => moveToQuestion(session.currentIndex + 1)}
                  disabled={session.status === "evaluating"}
                  className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50"
                >
                  Câu tiếp theo →
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void finishInterview(false)}
                disabled={
                  session.status === "evaluating" &&
                  !visibleReportError
                }
                className="rounded-xl bg-[#65e6d2] px-5 py-3 text-sm font-bold text-[#0f3a69] shadow-sm disabled:cursor-wait disabled:opacity-55"
              >
                {session.status === "evaluating"
                  ? visibleReportError
                    ? "Thử tạo lại báo cáo"
                    : "Đang chạy kiểm thử ẩn và tạo báo cáo…"
                  : remainingSeconds === 0
                    ? "Thử tạo lại báo cáo"
                    : "Kết thúc và tạo báo cáo"}
              </button>
            </div>
          </div>
          </div>
        </section>
      </div>
    </main>
    {confirmationDialog}
    </>
  );
}

function MockSetup({
  account,
  duration,
  roleProfileId,
  mode,
  targetCompetency,
  blueprintId,
  plan,
  onDuration,
  onRole,
  onMode,
  onTargetCompetency,
  onBlueprint,
  onStart,
  bankQuestionCount,
  catalog,
  history,
  historyAvailable,
  historyError,
  onDeleteHistory,
  notice,
}: {
  account: MockInterviewAppProps["account"];
  duration: MockInterviewDuration;
  roleProfileId: WorldQuantRoleProfileId;
  mode: TargetedMockMode;
  targetCompetency: WorldQuantCompetencyKey | null;
  blueprintId: TargetedMockBlueprintId;
  plan: TargetedMockPlan | null;
  onDuration: (duration: MockInterviewDuration) => void;
  onRole: (profileId: WorldQuantRoleProfileId) => void;
  onMode: (mode: TargetedMockMode) => void;
  onTargetCompetency: (competency: WorldQuantCompetencyKey) => void;
  onBlueprint: (blueprint: TargetedMockBlueprintId) => void;
  onStart: () => void;
  bankQuestionCount: number;
  catalog: WorldQuantMockQuestion[];
  history: MockInterviewHistoryEntry[];
  historyAvailable: boolean;
  historyError: string | null;
  onDeleteHistory: (attemptId: string) => void;
  notice: string | null;
}) {
  const role = worldQuantRoleProfileById(roleProfileId);
  const eligibleCompetencies = worldQuantCompetencyKeys.filter(
    (competency) => role.weights[competency] > 0,
  );
  const coverage = Object.fromEntries(
    worldQuantCompetencyKeys.map((competency) => [
      competency,
      catalog.filter(
        (question) => question.readinessCompetency === competency,
      ).length,
    ]),
  ) as Record<WorldQuantCompetencyKey, number>;
  const visibleHistory = history.filter(
    (entry) =>
      entry.artifact.profileId === roleProfileId &&
      entry.artifact.plan.durationMinutes === duration &&
      entry.artifact.plan.mode === mode &&
      (entry.artifact.plan.blueprintId ??
        (entry.artifact.plan.variant === 1
          ? "new-feed"
          : "migration-incident")) === blueprintId &&
      (mode === "balanced" ||
        entry.artifact.plan.targetCompetency === targetCompetency),
  );
  const plannedCompetencies = plan
    ? [
        ...new Set(
          plan.questions.map(
            (candidate) => candidate.readinessCompetency,
          ),
        ),
      ]
    : [];
  const plannedRoleWeight = plannedCompetencies.reduce(
    (sum, competency) => sum + role.weights[competency],
    0,
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="ui-page-width">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Về trang chủ cppinterview"
              title="Về trang chủ cppinterview"
              className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              WQ
            </Link>
            <div>
              <p className="font-bold">Phỏng vấn thử cùng cppinterview</p>
              <p className="text-xs text-[#526276]">
                Vị trí C++ mục tiêu
              </p>
            </div>
          </div>
          <nav aria-label="Điều hướng phỏng vấn thử" className="flex flex-wrap items-center gap-2">
            <Link
              href="/learn/tick-data-order-book"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Học dữ liệu tick
            </Link>
            <Link
              href="/"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Luyện thẻ
            </Link>
            <Link
              href="/stats"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Thống kê
            </Link>
            <span className="rounded-full border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
              @{account.login ?? account.displayName}
            </span>
          </nav>
        </header>

        {notice ? (
          <p className="mt-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]">
            {notice}
          </p>
        ) : null}

        <section className="grid gap-7 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="ui-eyebrow text-[#a65c0e]">
               Vị trí mục tiêu
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {role.label}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#43546a]">
              {role.summary} Trong buổi phỏng vấn, hệ thống không hiện gợi ý
              hay phản hồi. Báo cáo chỉ xuất hiện sau khi bạn hoàn thành toàn
              bộ câu hỏi.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {role.coreCompetencies.map((competency) => (
                <div
                  key={competency}
                  className="flex gap-3 rounded-2xl border border-[#0f3a69]/10 bg-white/55 p-4 text-sm leading-6"
                >
                  <span className="mt-1 text-[#79a72e]">◆</span>
                  <span>
                    <strong>
                      {worldQuantCompetencies[competency].shortLabel}
                    </strong>
                    <span className="mt-1 block text-xs text-[#526276]">
                      Trọng số của vị trí {role.weights[competency]}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.25rem] border border-[#0f3a69]/15 bg-[#0f3a69] p-6 text-white shadow-[0_22px_80px_rgb(15_58_105_/_16%)] sm:p-7">
            <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
              Chọn vị trí
            </p>
            <select
              value={roleProfileId}
              onChange={(event) =>
                onRole(event.target.value as WorldQuantRoleProfileId)
              }
              className="mt-3 w-full rounded-2xl border border-white/15 bg-[#12467a] px-4 py-3 text-sm font-bold text-white outline-none"
            >
              {worldQuantRoleProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <p className="mt-6 font-mono text-[11px] font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
              Thời lượng
            </p>
            <div className="mt-4 space-y-3">
              {durationOptions.map((option) => {
                const active = option.minutes === duration;
                return (
                  <button
                    key={option.minutes}
                    type="button"
                    onClick={() => onDuration(option.minutes)}
                    aria-pressed={active}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#65e6d2] bg-white/12"
                        : "border-white/12 bg-white/5 hover:bg-white/9"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <strong>{option.minutes} phút</strong>
                      <span
                        className={`size-3 rounded-full border ${
                          active
                            ? "border-[#65e6d2] bg-[#65e6d2]"
                            : "border-white/30"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-6 font-mono text-[11px] font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
              Phạm vi đánh giá
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["balanced", "targeted"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => onMode(scope)}
                  aria-pressed={mode === scope}
                  className={`rounded-2xl border p-4 text-left transition ${
                    mode === scope
                      ? "border-[#65e6d2] bg-[#65e6d2]/12"
                      : "border-white/12 bg-white/5 hover:bg-white/9"
                  }`}
                >
                  <strong>
                    {scope === "balanced" ? "Toàn diện" : "Trọng tâm"}
                  </strong>
                  <span className="mt-1 block text-[10px] text-white/50">
                    {scope === "balanced"
                      ? "Phân bổ theo mức độ quan trọng của từng năng lực"
                      : "Chỉ đánh giá một năng lực"}
                  </span>
                </button>
              ))}
            </div>
            {mode === "targeted" ? (
              <select
                value={targetCompetency ?? ""}
                onChange={(event) =>
                  onTargetCompetency(
                    event.target.value as WorldQuantCompetencyKey,
                  )
                }
                className="mt-3 w-full rounded-2xl border border-white/15 bg-[#12467a] px-4 py-3 text-sm font-bold text-white outline-none"
              >
                {eligibleCompetencies.map((competency) => (
                  <option key={competency} value={competency}>
                    {worldQuantCompetencies[competency].shortLabel} ·{" "}
                    {role.weights[competency]}%
                  </option>
                ))}
              </select>
            ) : null}
            <p className="mt-6 font-mono text-[11px] font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
              Tình huống
            </p>
            <div className="mt-3 grid gap-3">
              {([
                {
                  id: "new-feed" as const,
                  title: "Tích hợp feed mới",
                  detail: "Parser, order book, interval feature và kiểm thử phát hành.",
                },
                {
                  id: "migration-incident" as const,
                  title: "Chuyển đổi & sự cố",
                  detail: "Đối soát, replay, cutover/rollback và giao tiếp khi có rủi ro.",
                },
              ]).map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onBlueprint(scenario.id)}
                  aria-pressed={blueprintId === scenario.id}
                  className={`rounded-2xl border p-4 text-left transition ${
                    blueprintId === scenario.id
                      ? "border-[#65e6d2] bg-[#65e6d2]/12"
                      : "border-white/12 bg-white/5 hover:bg-white/9"
                  }`}
                >
                  <strong>{scenario.title}</strong>
                  <span className="mt-1 block text-[10px] font-normal text-white/50">
                    {scenario.detail}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 text-xs leading-5 text-white/65">
              <strong className="text-white">
                {plan?.questions.length ?? 0} câu ·{" "}
                {plan?.scheduledMinutes ?? 0}/{duration} phút
              </strong>
              <span className="mt-1 block">
                Đề gồm {plannedCompetencies.length} năng lực · đánh giá tối đa{" "}
                {plannedRoleWeight}% nội dung quan trọng của vị trí. Thứ tự câu
                hỏi được giữ cố định theo vị trí, phạm vi, bộ đề và phiên bản
                nội dung.
              </span>
            </div>
            <button
              type="button"
              onClick={onStart}
              disabled={
                !historyAvailable ||
                !plan ||
                plan.questions.length < 3
              }
              className="mt-5 w-full rounded-2xl bg-[#65e6d2] px-5 py-3.5 text-sm font-bold text-[#0f3a69] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {!historyAvailable
                ? "Lịch sử trực tuyến chưa sẵn sàng"
                : plan && plan.questions.length >= 3
                ? `Bắt đầu buổi phỏng vấn ${
                    mode === "targeted" ? "trọng tâm" : "toàn diện"
                  } →`
                : "Chưa đủ 3 câu đã duyệt"}
            </button>
            <Link
              href={`/worldquant/full-round?role=${roleProfileId}`}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/18 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/9"
            >
              Luyện có hướng dẫn theo vòng đầy đủ
            </Link>
            <p className="mt-4 text-center text-[11px] leading-5 text-white/45">
              Đồng hồ và câu trả lời được lưu trên trình duyệt, vì vậy F5
              không làm mất buổi đang thực hiện.
            </p>
          </aside>
        </section>

        <section className="grid gap-5 pb-10 lg:grid-cols-2">
          <article className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-6 sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
              Câu hỏi cho bộ đề tiếp theo
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {bankQuestionCount} câu đã duyệt sẵn sàng để tạo thêm bộ
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {eligibleCompetencies.map((competency) => (
                <div
                  key={competency}
                  className={`rounded-xl p-3 ${
                    coverage[competency]
                      ? "bg-[#e6f8f5] text-[#16865a]"
                      : "bg-[#f1e6dc] text-[#c43d3d]"
                  }`}
                >
                  <span className="block font-mono text-lg font-bold">
                    {coverage[competency]}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4">
                    {worldQuantCompetencies[competency].shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[#a65c0e]/18 bg-[#fff4df] p-6 sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
              Kiểm soát mức bao phủ
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Không giả định ngân hàng câu hỏi đã đầy đủ
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#6b5648]">
              Các tình huống về C++ hiện đại, dữ liệu tick, chuyển đổi hệ thống
              và tiếng Anh được biên soạn từ các tình huống kỹ sư C++ phổ biến.
              Báo cáo chỉ chấm theo các tiêu chí đã nêu; đây không phải câu hỏi
              tuyển dụng thật hoặc đại diện cho bất kỳ công ty nào.
            </p>
            {plan?.contentGaps.length ? (
              <p className="mt-4 text-xs leading-5 text-[#c43d3d]">
                Bộ đề hiện thiếu câu đủ điều kiện cho:{" "}
                <strong>
                  {plan.contentGaps
                    .map(
                      (gap) =>
                        worldQuantCompetencies[gap.competency].shortLabel,
                    )
                    .join(", ")}
                </strong>
                . Đây là phần nội dung còn thiếu, không phải bằng chứng cho
                thấy ứng viên yếu.
              </p>
            ) : null}
          </article>
        </section>

        <section className="mb-10 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
                Lịch sử phỏng vấn
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Những lượt đã hoàn thành
              </h2>
            </div>
            <span className="text-xs text-[#526276]">
              {historyAvailable
                ? "Lịch sử trực tuyến theo tài khoản"
                : "Lịch sử trực tuyến chưa được cấu hình"}
            </span>
          </div>
          {historyError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-xs text-[#c43d3d]"
            >
              {historyError}
            </p>
          ) : null}
          {visibleHistory.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {visibleHistory.slice(0, 6).map((entry) => (
                <article
                  key={entry.attemptId}
                  className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {worldQuantRoleProfileById(
                          entry.artifact.profileId,
                        ).label}
                      </p>
                      <p className="mt-1 text-xs text-[#526276]">
                        {entry.artifact.plan.mode === "targeted"
                          ? `Trọng tâm · ${
                              worldQuantCompetencies[
                                entry.artifact.plan.targetCompetency!
                              ].shortLabel
                            }`
                          : "Toàn diện"}{" "}
                        · {entry.artifact.plan.durationMinutes} phút ·{" "}
                        {formatDateTime(entry.artifact.completedAt)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#526276]">
                        {
                          entry.artifact.debrief
                            .assessedWeightPercent
                        }
                        % nội dung quan trọng của vị trí đã được hỏi
                        {entry.artifact.profileVersion !== role.version
                          ? " · blueprint lịch sử, không so trực tiếp với v2"
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#65e6d2]/65 px-3 py-1 font-mono text-xs font-bold">
                      {entry.artifact.debrief.roleInterviewScore ?? "—"}
                    </span>
                  </div>
                  <details className="mt-3 text-xs text-[#43546a]">
                    <summary className="cursor-pointer font-bold">
                      Xem bằng chứng
                    </summary>
                    <div className="mt-2 grid gap-1">
                      {entry.artifact.debrief.competencies
                        .filter((item) => item.roleWeight > 0)
                        .map((item) => (
                          <p key={item.competency}>
                            {
                              worldQuantCompetencies[item.competency]
                                .shortLabel
                            }
                            :{" "}
                            {item.status === "assessed"
                              ? `${item.score}/100`
                              : "chưa hỏi"}
                          </p>
                        ))}
                    </div>
                  </details>
                  {historyAvailable ? (
                    <button
                      type="button"
                      onClick={() => onDeleteHistory(entry.attemptId)}
                      className="mt-3 text-xs font-bold text-[#c43d3d] underline decoration-[#c43d3d]/30 underline-offset-4"
                    >
                      Xóa lượt phỏng vấn
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#526276]">
              Chưa có lượt phỏng vấn hoàn chỉnh ở phiên bản mới. Báo cáo cũ
              vẫn được giữ trong bộ nhớ trước đây và không tự động gán vào tài
              khoản này.
            </p>
          )}
        </section>

        <p className="pb-8 text-center text-xs leading-5 text-[#526276]">
          {WORLDQUANT_PROFILE.disclaimer}
        </p>
      </div>
    </main>
  );
}

function MockReport({
  account,
  session,
  questions,
  remediation,
  remediationMinutes,
  remediationMessage,
  historyWarning,
  missionReturnHref,
  missionStartRequired,
  onReset,
  onStartMissionMock,
  onReplay,
  onRemediate,
  onRemediationMinutes,
}: {
  account: MockInterviewAppProps["account"];
  session: MockInterviewSessionV4;
  questions: WorldQuantMockQuestion[];
  remediation: WorldQuantMockRemediation | null;
  remediationMinutes: number;
  remediationMessage: string | null;
  historyWarning: string | null;
  missionReturnHref: string | null;
  missionStartRequired: boolean;
  onReset: () => void;
  onStartMissionMock: () => void;
  onReplay: () => void;
  onRemediate: (
    option: WorldQuantMockRemediation["recommendations"][number],
  ) => void;
  onRemediationMinutes: (minutes: number) => void;
}) {
  const report = session.report;
  const debrief = session.debrief;
  if (!report || !debrief) return null;
  const role = worldQuantRoleProfileById(session.profileId);
  const assessmentById = new Map(
    report.questionAssessments.map((assessment) => [
      assessment.questionId,
      assessment,
    ]),
  );
  const questionNumberById = new Map(
    questions.map((question, index) => [question.id, index + 1]),
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="ui-page-width">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Về trang chủ cppinterview"
              title="Về trang chủ cppinterview"
              className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              WQ
            </Link>
            <div>
              <p className="font-bold">Báo cáo phỏng vấn thử</p>
              <p className="text-xs text-[#526276]">
                {role.label}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e6f8f5] px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-[#285f86] uppercase">
              Đã hoàn thành
            </span>
            {missionStartRequired ? (
              <button
                type="button"
                onClick={onStartMissionMock}
                className="min-h-11 rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
              >
                Tạo buổi phỏng vấn theo nhiệm vụ
              </button>
            ) : (
              <Link
                href={missionReturnHref ?? "/practice"}
                className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold ${
                  missionReturnHref
                    ? "bg-[#0f3a69] text-white"
                    : "border border-[#0f3a69]/15 bg-white/65"
                }`}
              >
                {missionReturnHref
                  ? "Tiếp tục bước tiếp theo trong nhiệm vụ"
                  : "Về luyện tập"}
              </Link>
            )}
            <Link
              href="/"
              className="rounded-xl border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-sm font-bold"
            >
              Luyện thẻ
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-sm font-bold"
            >
              Chọn bộ khác
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
            >
              Luyện lại bộ này
            </button>
            <span className="rounded-full border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
              @{account.login ?? account.displayName}
            </span>
          </div>
        </header>

        <section className="grid gap-5 py-8 lg:grid-cols-[minmax(17rem,.34fr)_minmax(0,1fr)]">
          <article className="rounded-[1.25rem] bg-[#0f3a69] p-7 text-white shadow-[0_22px_80px_rgb(15_58_105_/_16%)] sm:p-8">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#65e6d2] uppercase">
              {debrief.scope === "targeted_evidence"
                ? `Trọng tâm · ${
                    worldQuantCompetencies[
                      session.plan.targetCompetency!
                    ].shortLabel
                  }`
                : "Đánh giá toàn diện theo vị trí"}
            </p>
            <p className="mt-4 font-mono text-6xl font-bold text-[#65e6d2]">
              {debrief.roleInterviewScore ?? "—"}
            </p>
            <p className="mt-1 text-xs text-white/45">/ 100</p>
            <h1 className="mt-5 text-2xl font-semibold">
              Điểm trên phần đã hỏi
            </h1>
            <p className="mt-2 text-xs text-white/45">
              Đã kiểm tra {debrief.assessedWeightPercent}% nội dung quan trọng
              của vị trí. Điểm này không cộng vào chỉ số chuẩn bị.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Đây không phải kết luận về mức độ chuẩn bị hay quyết định tuyển
              dụng. Năng lực “Chưa hỏi” không bị tính là 0.
            </p>
            <div className="mt-6 border-t border-white/12 pt-4 font-mono text-[10px] leading-5 text-white/42">
              <p>
                {session.plan.mode === "targeted" ? "trọng tâm" : "toàn diện"} · {" "}
                {session.plan.blueprintId === "migration-incident"
                  ? "chuyển đổi & sự cố"
                  : "tích hợp feed mới"} · phiên bản {session.plan.version}
              </p>
              <p>
                {session.plan.durationMinutes} phút · {questions.length} câu
              </p>
              <p>{session.reportModel ?? "Mô hình AI"}</p>
              <p>
                {session.reportProvider ?? "Nhà cung cấp AI"} · chấm một lần
                vào cuối buổi
              </p>
            </div>
            {remediation?.recommendations[0] ? (
              <a
                href="#next-training"
                className="mt-6 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/16"
              >
                <span>Xem bước ôn tiếp theo</span>
                <span aria-hidden="true" className="text-[#65e6d2]">↓</span>
              </a>
            ) : null}
          </article>

          <article className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/75 p-7 sm:p-8">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              Tổng kết phỏng vấn
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Một buổi đã hoàn thành.
            </h2>
            <p className="mt-4 leading-7 text-[#43546a]">{report.summary}</p>
            {!report.interviewDimensions?.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ReportList
                  title="Tín hiệu tốt"
                  items={report.strengths}
                  tone="positive"
                />
                <ReportList
                  title="Nội dung AI cho rằng cần làm rõ"
                  items={report.priorityGaps}
                  tone="warning"
                />
              </div>
            ) : null}
          </article>
        </section>

        {historyWarning ? (
          <p
            role="alert"
            className="mb-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
          >
            {historyWarning}
          </p>
        ) : null}

        {session.gates ? (
          <section className="mb-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#285f86] uppercase">
                  Cổng bằng chứng
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Điều kiện không thể suy diễn
                </h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-[#526276]">
                Phiên trọng tâm và phiên ngắn chỉ đo phần đã hỏi. Hệ thống không
                đưa ra kết luận sẵn sàng cho vị trí từ các kết quả này.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {session.gates.gates.map((gate) => (
                <article
                  key={gate.key}
                  className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{gate.label}</h3>
                    <span
                      className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold ${
                        gate.status === "passed"
                          ? "bg-[#e6f8f5] text-[#16865a]"
                          : gate.status === "needs_work"
                            ? "bg-[#fff1f1] text-[#c43d3d]"
                            : "bg-[#eaf2f8] text-[#526276]"
                      }`}
                    >
                      {gate.status === "passed"
                        ? "Đủ bằng chứng"
                        : gate.status === "needs_work"
                          ? "Cần cải thiện"
                          : "Chưa đánh giá"}
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold text-[#0f3a69]">
                    {gate.score ?? "—"}
                    {gate.score !== null ? <span className="text-xs"> / 100</span> : null}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#43546a]">
                    {gate.reason}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {report.interviewDimensions?.length ? (
          <section className="mb-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#285f86] uppercase">
                  Báo cáo có bằng chứng
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Tám tiêu chí phỏng vấn
                </h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-[#526276]">
                Mỗi nhận xét bên dưới đều dẫn về mã, kết quả kiểm thử hoặc câu trả lời cụ thể của bạn.
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {report.interviewDimensions.map((dimension) => (
                <article
                  key={dimension.key}
                  className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">
                      {interviewDimensionLabels[dimension.key]}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                        dimension.status === "assessed"
                          ? "bg-[#e6f8f5] text-[#16865a]"
                          : "bg-[#eaf2f8] text-[#526276]"
                      }`}
                    >
                      {dimension.status === "assessed"
                        ? `${dimension.score}/100`
                        : "Chưa đánh giá"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#43546a]">
                    {dimension.summary}
                  </p>
                  {dimension.status === "assessed" ? (
                    <>
                      <ReportEvidence
                        evidence={dimension.evidence}
                        questionNumberById={questionNumberById}
                      />
                      <div className="mt-4 space-y-3">
                        {dimension.observations.map((observation, index) => (
                          <div
                            key={`${dimension.key}-${index}`}
                            className="rounded-xl border border-[#0f3a69]/10 bg-white/75 p-3"
                          >
                            <p className="text-sm leading-6 text-[#43546a]">
                              {observation.feedback}
                            </p>
                            <ReportEvidence
                              evidence={observation.evidence}
                              questionNumberById={questionNumberById}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {debrief.competencies
            .filter(
              (competency) =>
                competency.roleWeight > 0 ||
                competency.status === "assessed",
            )
            .map((result) => {
            return (
              <article
                key={result.competency}
                className="rounded-2xl border border-[#0f3a69]/12 bg-white/62 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#526276] uppercase">
                      Năng lực
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {
                        worldQuantCompetencies[result.competency]
                          .shortLabel
                      }
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                      result.status === "assessed"
                        ? "bg-[#65e6d2]/70 text-[#16865a]"
                        : "bg-[#eaf2f8] text-[#526276]"
                    }`}
                  >
                    {result.status === "assessed"
                      ? `${result.score}/100`
                      : "Chưa hỏi"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#43546a]">
                  {result.status === "assessed"
                    ? `${result.evidenceCount} câu làm bằng chứng · điểm còn thiếu ${result.scoreDeficit} · mức ưu tiên ${result.weightedDeficit}`
                    : "Buổi phỏng vấn này chưa kiểm tra năng lực này."}
                </p>
              </article>
            );
          })}
        </section>

        <section id="next-training" className="mt-5 scroll-mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-6 sm:p-7">
          <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
            Bước ôn tập tiếp theo
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {report.nextPracticeActions?.length
              ? "Ba việc cần luyện tiếp"
              : "Kế hoạch ôn tiếp"}
          </h2>
          {report.nextPracticeActions?.length ? (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#43546a]">
                Ba việc này được ghi vào hàng chờ lỗi cần ôn sau khi lịch sử trực tuyến được xác nhận. Hệ thống chỉ tạo bản nháp, không tự xuất bản thẻ.
              </p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {report.nextPracticeActions.map((action) => (
                  <article
                    key={action.priority}
                    className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#a65c0e]">
                      Việc #{action.priority}
                    </span>
                    <h3 className="mt-1 font-semibold">{action.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#43546a]">
                      {action.action}
                    </p>
                    <ReportEvidence
                      evidence={action.evidence}
                      questionNumberById={questionNumberById}
                      compact
                    />
                  </article>
                ))}
              </div>
            </>
          ) : null}
          {!report.nextPracticeActions?.length ? (
            <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#526276]">Thời lượng:</span>
            {[15, 30, 45, 60].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onRemediationMinutes(minutes)}
                aria-pressed={remediationMinutes === minutes}
                className={`rounded-full border px-3 py-1.5 font-bold ${
                  remediationMinutes === minutes
                    ? "border-[#0f3a69] bg-[#0f3a69] text-white"
                    : "border-[#0f3a69]/15 bg-white"
                }`}
              >
                {minutes} phút
              </button>
            ))}
          </div>
          {remediation?.recommendations.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {remediation.recommendations.slice(0, 3).map((option) => {
                const guide = option.plan.fallbacks.find(
                  (fallback) => fallback.kind === "guide",
                );
                return (
                  <article
                    key={option.competency}
                    className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#a65c0e]">
                      Điểm cần cải thiện #{option.rank} · mức ưu tiên{" "}
                      {option.weightedDeficit}
                    </span>
                    <h3 className="mt-1 font-semibold">
                      {
                        worldQuantCompetencies[option.competency]
                          .shortLabel
                      }
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#526276]">
                      {option.availability === "focus_sprint"
                        ? `${option.plan.questions.length} thẻ đã duyệt · ~${option.plan.scheduledMinutes} phút`
                        : option.availability === "guide"
                          ? "Chưa đủ thẻ; đã có bài hướng dẫn nền tảng."
                          : option.availability === "content_gap"
                            ? "Thiếu nội dung: chưa đủ thẻ hoặc bài hướng dẫn đã duyệt."
                            : "Hiện không có thẻ đến hạn hoặc phương án thay thế phù hợp."}
                    </p>
                    {option.availability === "focus_sprint" ? (
                      <button
                        type="button"
                        onClick={() => onRemediate(option)}
                        className="mt-4 rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white"
                      >
                        Tạo phiên ôn trọng tâm
                      </button>
                    ) : guide?.kind === "guide" ? (
                      <Link
                        href={guide.href}
                        className="mt-4 inline-flex rounded-xl border border-[#0f3a69]/15 px-4 py-2 text-xs font-bold"
                      >
                        Mở bài hướng dẫn
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {remediationMessage ? (
            <p className="mt-4 rounded-xl bg-[#fff4df] px-4 py-3 text-xs text-[#c43d3d]">
              {remediationMessage}
            </p>
          ) : null}
              <h3 className="mt-7 text-sm font-bold text-[#285f86]">
                Gợi ý tham khảo từ AI
              </h3>
              {report.studyPlan.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {report.studyPlan.map((item) => (
                <div
                  key={`${item.priority}:${item.topic}`}
                  className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                >
                  <span className="font-mono text-[10px] font-bold text-[#a65c0e]">
                    Ưu tiên {item.priority}
                  </span>
                  <h3 className="mt-1 font-semibold">{item.topic}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#43546a]">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
              ) : (
                <p className="mt-4 text-sm text-[#526276]">
                  Báo cáo chưa đề xuất thêm hành động.
                </p>
              )}
            </>
          ) : null}
        </section>

        <section className="mt-5 pb-10">
          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#285f86] uppercase">
              Xem lại câu hỏi
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Xem lại từng câu</h2>
          </div>
          <div className="space-y-3">
            {questions.map((question, index) => {
              const assessment = assessmentById.get(question.id);
              const answer = session.answers[question.id];
              const hiddenExecution =
                session.hiddenCodeRuns[question.id];
              if (!assessment) return null;
              return (
                <details
                  key={question.id}
                  className="group rounded-2xl border border-[#0f3a69]/12 bg-white/62 p-5"
                >
                  <summary className="flex list-none cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-mono text-[10px] text-[#526276]">
                        Câu {index + 1}
                      </span>
                      <p className="mt-1 line-clamp-2 font-semibold">
                        {question.prompt}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e6f8f5] px-3 py-1 font-mono text-xs font-bold text-[#16865a]">
                      {assessment.score} · {verdictLabels[assessment.verdict]}
                    </span>
                  </summary>
                  <div className="mt-5 space-y-5 border-t border-[#0f3a69]/10 pt-5">
                    {hiddenExecution ? (
                      <div>
                        <p className="text-xs font-bold text-[#285f86]">
                          Kiểm thử ẩn trong môi trường cô lập
                        </p>
                        <ExecutionResultPanel
                          result={hiddenExecution}
                          compact
                        />
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs font-bold text-[#285f86]">
                        Câu trả lời của bạn
                      </p>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#092c51] p-4 font-mono text-xs leading-6 text-[#e6f8f5]">
                        {answer
                          ? candidateAnswer(question, answer) || "(Bỏ trống)"
                          : "(Bỏ trống)"}
                      </pre>
                    </div>
                    {report.interviewDimensions?.length ? (
                      <p className="rounded-xl bg-[#eaf2f8] px-4 py-3 text-sm leading-6 text-[#43546a]">
                        Các nhận xét chi tiết có bằng chứng được tổng hợp ở tám tiêu chí phía trên.
                      </p>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-bold text-[#285f86]">
                            Nhận xét
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#43546a]">
                            {assessment.summary}
                          </p>
                        </div>
                        {assessment.missedCriteria.length ? (
                          <ReportList
                            title="Ý còn thiếu"
                            items={assessment.missedCriteria}
                            tone="warning"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        tone === "positive" ? "bg-[#e6f8f5]" : "bg-[#fff1f1]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          tone === "positive" ? "text-[#16865a]" : "text-[#c43d3d]"
        }`}
      >
        {title}
      </p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#43546a]">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span>{tone === "positive" ? "✓" : "→"}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#526276]">Chưa có bằng chứng.</p>
      )}
    </div>
  );
}

function ReportEvidence({
  evidence,
  questionNumberById,
  compact = false,
}: {
  evidence: readonly MockReportEvidence[];
  questionNumberById: ReadonlyMap<string, number>;
  compact?: boolean;
}) {
  if (!evidence.length) return null;
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} space-y-2`}>
      {evidence.map((item) => {
        const questionNumber = questionNumberById.get(item.questionId);
        const code = ["candidate_code", "question_code"].includes(item.kind);
        return (
          <div
            key={item.id}
            className="rounded-lg border border-[#0f3a69]/10 bg-[#eaf2f8]/65 px-3 py-2"
          >
            <p className="font-mono text-[10px] font-bold tracking-[0.08em] text-[#285f86] uppercase">
              {questionNumber ? `Câu ${questionNumber} · ` : ""}
              {item.label}
            </p>
            <pre
              className={`mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[#43546a] ${
                code ? "font-mono" : "font-sans"
              }`}
            >
              {item.excerpt}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

const executionStatusLabels: Record<
  CodeExecutionResult["status"],
  string
> = {
  passed: "Đã qua",
  tests_failed: "Không đạt kiểm thử ẩn hoặc kiểm thử mẫu",
  compile_error: "Lỗi biên dịch",
  runtime_error: "Lỗi khi chạy",
  time_limit: "Quá thời gian",
  memory_limit: "Quá bộ nhớ",
  output_limit: "Kết quả xuất ra quá lớn",
  sandbox_error: "Lỗi hạ tầng môi trường cô lập",
};

function ExecutionResultPanel({
  result,
  compact,
}: {
  result: CodeExecutionResult;
  compact: boolean;
}) {
  const positive = result.status === "passed";
  const infrastructureError = result.status === "sandbox_error";
  return (
    <div
      className={`mt-3 rounded-xl border p-4 ${
        positive
          ? "border-[#138f8c]/25 bg-[#e6f8f5]"
          : infrastructureError
            ? "border-[#0f3a69]/12 bg-[#eaf2f8]"
            : "border-[#a65c0e]/20 bg-[#fff1f1]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong
          className={
            positive
              ? "text-[#16865a]"
              : infrastructureError
                ? "text-[#43546a]"
                : "text-[#c43d3d]"
          }
        >
          {executionStatusLabels[result.status]}
        </strong>
        <span className="font-mono text-[10px] text-[#526276]">
          {result.passedTests}/{result.totalTests} kiểm thử ·{" "}
          {result.durationMs}ms · {result.toolchain}
        </span>
      </div>
      {result.suite === "sample" && result.cases.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[#43546a]">
          {result.cases.map((testCase) => (
            <li key={testCase.name} className="flex gap-2">
              <span
                className={
                  testCase.passed
                    ? "text-[#67a41d]"
                    : "text-[#a65c0e]"
                }
              >
                {testCase.passed ? "✓" : "×"}
              </span>
              <span>
                <strong>{testCase.name}</strong>
                {testCase.message ? ` — ${testCase.message}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {!compact && result.diagnostics ? (
        <div className="mt-3">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#526276] uppercase">
            Thông báo của trình biên dịch
          </p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[#092c51] p-3 font-mono text-[11px] leading-5 text-[#e6f8f5]">
            {result.diagnostics}
          </pre>
        </div>
      ) : null}
      {!compact && result.output ? (
        <div className="mt-3">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#526276] uppercase">
            Kết quả kiểm thử
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#092c51] p-3 font-mono text-[11px] leading-5 text-[#e6f8f5]">
            {result.output}
          </pre>
        </div>
      ) : null}
      {result.suite === "hidden" ? (
        <p className="mt-2 text-[11px] leading-5 text-[#526276]">
          Chỉ hiển thị kết quả tổng hợp để không làm lộ các trường hợp kiểm
          thử ẩn.
        </p>
      ) : null}
    </div>
  );
}

function InlineCode({ text }: { text: string }) {
  const segments = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {segments.map((segment, index) =>
        segment.startsWith("`") && segment.endsWith("`") ? (
          <code
            key={`${index}:${segment}`}
            className="rounded-md bg-[#eaf2f8] px-1.5 py-0.5 font-mono text-[0.88em] text-[#16865a]"
          >
            {segment.slice(1, -1)}
          </code>
        ) : (
          <span key={`${index}:${segment}`}>{segment}</span>
        ),
      )}
    </>
  );
}

function commitCurrentQuestionTime(
  session: MockInterviewSessionV4,
  nowMs: number,
  nextIndex: number,
): MockInterviewSessionV4 {
  const currentQuestionId = session.questions[session.currentIndex]?.id;
  if (!currentQuestionId) return session;
  const delta = Math.max(
    0,
    Math.floor(
      (nowMs - new Date(session.activeQuestionStartedAt).getTime()) / 1000,
    ),
  );
  return {
    ...session,
    currentIndex: nextIndex,
    elapsedByQuestion: {
      ...session.elapsedByQuestion,
      [currentQuestionId]:
        (session.elapsedByQuestion[currentQuestionId] ?? 0) + delta,
    },
    activeQuestionStartedAt: new Date(nowMs).toISOString(),
  };
}

function candidateAnswer(
  question: WorldQuantMockQuestion,
  answer: { response: string; explanation: string },
) {
  const normalized = draftForSubmission(question, answer);
  if (question.responseMode === "text") {
    return normalized.response.trim();
  }
  const language = "cpp";
  const response = normalized.response.trim();
  const explanation = normalized.explanation.trim();
  if (!response && !explanation) return "";
  return `\`\`\`${language}\n${response}\n\`\`\`${
    explanation ? `\n\nGiải thích của ứng viên:\n${explanation}` : ""
  }`;
}

function draftForSubmission(
  question: WorldQuantMockQuestion,
  draft: { response: string; explanation: string },
) {
  const untouchedStarter =
    question.responseMode === "code" &&
    Boolean(question.code) &&
    draft.response.trim() === question.code?.trim();
  return {
    response: untouchedStarter ? "" : draft.response,
    explanation: draft.explanation,
  };
}

function toPublicHiddenExecutionResult(
  result: CodeExecutionResult,
) {
  return {
    suite: "hidden" as const,
    codeHash: result.codeHash,
    specRevision: result.specRevision,
    language: result.language,
    status: result.status,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    durationMs: result.durationMs,
    toolchain: result.toolchain,
    completedAt: result.completedAt,
  };
}

function isQuestionAnswered(
  question: WorldQuantMockQuestion,
  draft: { response: string; explanation: string },
) {
  const normalized = draftForSubmission(question, draft);
  return Boolean(
    normalized.response.trim() || normalized.explanation.trim(),
  );
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
