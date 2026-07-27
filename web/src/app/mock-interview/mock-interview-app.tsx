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
import {
  targetedMockCandidates,
  WORLDQUANT_CURATED_CATALOG,
  type WorldQuantMockQuestion,
} from "@/lib/mock-interview/catalog";
import {
  WORLDQUANT_PROFILE,
  type MockInterviewDuration,
} from "@/lib/mock-interview/profile";
import {
  createMockInterviewSessionV4,
  mockInterviewStorageKey,
  parseMockInterviewSessionV4,
  serializeMockInterviewSessionV4,
  type MockInterviewSessionV4,
} from "@/lib/mock-interview/session-v4";
import {
  buildWorldQuantTargetedMockPlan,
  type TargetedMockMode,
  type TargetedMockPlan,
  type TargetedMockVariant,
} from "@/lib/mock-interview/target-plan";
import {
  buildLearningStates,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
import { FOCUS_SESSION_STORAGE_KEY } from "@/lib/practice/focus-session";
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

type MockInterviewHistoryEntry = {
  attemptId: string;
  artifact: MockInterviewCompletedArtifactV4;
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
  initialMode: TargetedMockMode;
  initialTargetCompetency: WorldQuantCompetencyKey | null;
  initialHistory: MockInterviewHistoryEntry[];
  historyAvailable: boolean;
  codeRunnerAvailable: boolean;
};

const EMPTY_MOCK_SESSION = "__empty_mock_session__";
const mockSessionListeners = new Set<() => void>();

function subscribeToMockSession(callback: () => void) {
  mockSessionListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    mockSessionListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
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

function saveMockSession(
  storageKey: string,
  session: MockInterviewSessionV4,
  options: { replace?: boolean } = {},
) {
  const current = parseMockInterviewSessionV4(
    window.localStorage.getItem(storageKey),
  );
  if (
    current &&
    !options.replace &&
    (current.sessionId !== session.sessionId ||
      current.sessionRevision > session.sessionRevision)
  ) {
    return false;
  }
  const next =
    current?.sessionId === session.sessionId &&
    current.sessionRevision === session.sessionRevision
      ? { ...session, sessionRevision: session.sessionRevision + 1 }
      : session;
  window.localStorage.setItem(
    storageKey,
    serializeMockInterviewSessionV4(next),
  );
  mockSessionListeners.forEach((listener) => listener());
  return true;
}

function clearMockSession(storageKey: string) {
  window.localStorage.removeItem(storageKey);
  mockSessionListeners.forEach((listener) => listener());
}

function readStoredMockSession(storageKey: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  return raw ? parseMockInterviewSessionV4(raw) : null;
}

function withoutKey<T>(record: Record<string, T>, key: string) {
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => entryKey !== key),
  ) as Record<string, T>;
}

function clearPendingCodeRun(
  storageKey: string,
  sessionId: string,
  questionId: string,
) {
  const latest = readStoredMockSession(storageKey);
  if (!latest || latest.sessionId !== sessionId) return;
  saveMockSession(storageKey, {
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

export function MockInterviewApp({
  account,
  sourceRevision,
  bankQuestions,
  readinessQuestions,
  initialCloudProgress,
  initialQuestionStates,
  today,
  initialRoleProfileId,
  initialMode,
  initialTargetCompetency,
  initialHistory,
  historyAvailable,
  codeRunnerAvailable,
}: MockInterviewAppProps) {
  const [duration, setDuration] = useState<MockInterviewDuration>(45);
  const [roleProfileId, setRoleProfileId] =
    useState<WorldQuantRoleProfileId>(initialRoleProfileId);
  const [mode, setMode] = useState<TargetedMockMode>(initialMode);
  const [targetCompetency, setTargetCompetency] =
    useState<WorldQuantCompetencyKey | null>(
      initialMode === "targeted" ? initialTargetCompetency : null,
    );
  const [variant, setVariant] = useState<TargetedMockVariant>(1);
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
  const evaluationInFlight = useRef(false);
  const autoSubmitted = useRef(false);
  const storageKey = useMemo(
    () => mockInterviewStorageKey(account.id),
    [account.id],
  );
  const sessionSnapshot = useSyncExternalStore(
    subscribeToMockSession,
    () => getMockSessionSnapshot(storageKey),
    getServerMockSessionSnapshot,
  );
  const progressSnapshot = useSyncExternalStore(
    subscribeToPracticeProgress,
    readPracticeProgressSnapshot,
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
    () =>
      sessionSnapshot && sessionSnapshot !== EMPTY_MOCK_SESSION
        ? parseMockInterviewSessionV4(sessionSnapshot)
        : null,
    [sessionSnapshot],
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
  const hydrated = sessionSnapshot !== null;
  const notice = staleSession
    ? "Nội dung bộ đề hoặc question bank đã đổi nên buổi cũ không được khôi phục để tránh chấm sai version."
    : sessionSnapshot !== null &&
        sessionSnapshot !== EMPTY_MOCK_SESSION &&
        !storedSession
      ? "Dữ liệu buổi mock cũ bị lỗi nên đã được bỏ qua."
      : null;
  const visibleReportError =
    reportError ??
    (interruptedEvaluation
      ? "Lần chấm trước bị ngắt hoặc gặp lỗi. Submission đã được khóa; nhấn “Thử report lại” để gửi lại đúng dữ liệu cũ."
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
  ]);
  const currentLearningStates = useMemo(() => {
    const local = parseProgress(
      progressSnapshot === null ||
        progressSnapshot === EMPTY_PROGRESS_STORAGE_SNAPSHOT
        ? null
        : progressSnapshot,
    );
    const resetCutoffs = new Map(
      initialQuestionStates
        .filter((state) => state.historyResetOn)
        .map((state) => [state.questionId, state.historyResetOn!]),
    );
    const merged = mergeProgress(initialCloudProgress, local);
    const reviews = merged.reviews.filter((review) => {
      const resetOn = resetCutoffs.get(review.questionId);
      return !resetOn || review.reviewedOn > resetOn;
    });
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

  function startInterview(selectedPlan: TargetedMockPlan) {
    if (selectedPlan.questions.length < 3) {
      setReportError(
        "Blueprint này chưa đủ 3 câu đã duyệt để chấm report đáng tin cậy.",
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
    autoSubmitted.current = false;
    evaluationInFlight.current = false;
    setReportError(null);
    setHistoryError(null);
    setCodeRunError(null);
    setRunningQuestionId(null);
    setNow(startedAt.getTime());
    saveMockSession(storageKey, nextSession, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAnswer(
    questionId: string,
    field: "response" | "explanation",
    value: string,
  ) {
    if (!session || session.status !== "in_progress") return;
    const answer = session.answers[questionId] ?? {
      response: "",
      explanation: "",
    };
    const sourceChanged =
      field === "response" && answer.response !== value;
    const sampleCodeRuns = sourceChanged
      ? withoutKey(session.sampleCodeRuns, questionId)
      : session.sampleCodeRuns;
    const hiddenCodeRuns = sourceChanged
      ? withoutKey(session.hiddenCodeRuns, questionId)
      : session.hiddenCodeRuns;
    const pendingCodeRuns = sourceChanged
      ? withoutKey(session.pendingCodeRuns, questionId)
      : session.pendingCodeRuns;
    if (sourceChanged) setCodeRunError(null);
    saveMockSession(storageKey, {
      ...session,
      answers: {
        ...session.answers,
        [questionId]: { ...answer, [field]: value },
      },
      sampleCodeRuns,
      hiddenCodeRuns,
      pendingCodeRuns,
      reportIdempotencyKey: sourceChanged
        ? undefined
        : session.reportIdempotencyKey,
    });
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
        "Sandbox runner chưa được cấu hình trên Vercel.",
      );
      return;
    }
    const source =
      session.answers[currentQuestion.id]?.response ?? "";
    if (!source.trim()) {
      setCodeRunError("Viết code trước khi chạy sample tests.");
      return;
    }

    const identity = session.questions[session.currentIndex];
    if (!identity || identity.id !== currentQuestion.id) return;
    const pending =
      session.pendingCodeRuns[currentQuestion.id] ?? {
        idempotencyKey: crypto.randomUUID(),
        requestedAt: new Date().toISOString(),
      };
    saveMockSession(storageKey, {
      ...session,
      pendingCodeRuns: {
        ...session.pendingCodeRuns,
        [currentQuestion.id]: pending,
      },
    });
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
          clearPendingCodeRun(
            storageKey,
            session.sessionId,
            currentQuestion.id,
          );
        }
        throw new Error(
          payload.error || "Sandbox chưa trả kết quả hợp lệ.",
        );
      }

      const latest = readStoredMockSession(storageKey);
      if (
        latest?.sessionId === session.sessionId &&
        latest.answers[currentQuestion.id]?.response === source
      ) {
        saveMockSession(storageKey, {
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
          : "Sandbox chưa chạy được. Thử lại sau.",
      );
    } finally {
      setRunningQuestionId(null);
    }
  }

  function moveToQuestion(nextIndex: number) {
    if (
      !session ||
      session.status !== "in_progress" ||
      nextIndex < 0 ||
      nextIndex >= session.questions.length
    ) {
      return;
    }
    saveMockSession(
      storageKey,
      commitCurrentQuestionTime(session, Date.now(), nextIndex),
    );
    setCodeRunError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishInterview(timerExpired = false) {
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
    if (
      unanswered > 0 &&
      !timerExpired &&
      !window.confirm(
        `Còn ${unanswered} câu chưa trả lời. Nộp luôn và tính các câu đó là 0 điểm?`,
      )
    ) {
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
    saveMockSession(storageKey, evaluatingSession);

    try {
      const response = await fetch("/api/mock-interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingReportRequest),
      });
      const payload = (await response.json()) as {
        report?: MockInterviewScopedReportV4;
        debrief?: MockInterviewSessionV4["debrief"];
        completedAt?: string;
        model?: string;
        provider?: "openai" | "gemini";
        historyPersisted?: boolean;
        historyAttemptId?: string | null;
        historyWarning?: string | null;
        executionResults?: Array<{
          questionId: string;
          result: unknown;
        }>;
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.report || !payload.debrief) {
        const requestError = new Error(
          payload.error || "AI chưa tạo được report.",
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
      const latest = readStoredMockSession(storageKey);
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
        reportModel: payload.model,
        reportProvider: payload.provider,
      };
      saveMockSession(storageKey, completed);
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
          model: completed.reportModel ?? "AI model",
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
      setHistoryError(payload.historyWarning ?? null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      autoSubmitted.current = true;
      const requestCode =
        error instanceof Error && "code" in error
          ? (error as Error & { code?: string }).code
          : undefined;
      const latest = readStoredMockSession(storageKey);
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
        saveMockSession(storageKey, retryable);
      }
      setReportError(
        error instanceof Error
          ? error.message
          : "AI chưa tạo được report. Thử lại sau.",
      );
    } finally {
      evaluationInFlight.current = false;
    }
  }

  function launchRemediation(
    option: WorldQuantMockRemediation["recommendations"][number],
  ) {
    setRemediationMessage(null);
    if (
      window.localStorage.getItem(FOCUS_SESSION_STORAGE_KEY) &&
      !window.confirm(
        "Đang có Focus Sprint khác trong browser. Tạo remediation sprint mới và thay session đó?",
      )
    ) {
      return;
    }
    const destination = prepareFocusSprint(option.plan);
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

  async function deleteHistoryEntry(attemptId: string) {
    if (!window.confirm("Xóa attempt này khỏi cloud history?")) return;
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
        throw new Error(payload.error || "Không xóa được attempt.");
      }
      setHistory((current) =>
        current.filter((entry) => entry.attemptId !== attemptId),
      );
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Không xóa được attempt.",
      );
    }
  }

  function resetInterview() {
    if (
      session?.status !== "completed" &&
      session &&
      !window.confirm("Xóa buổi mock đang làm và tạo buổi mới?")
    ) {
      return;
    }
    if (session) {
      setDuration(session.plan.durationMinutes);
      setRoleProfileId(session.profileId);
      setMode(session.plan.mode);
      setTargetCompetency(session.plan.targetCompetency);
      setVariant(session.plan.variant);
    }
    clearMockSession(storageKey);
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
        <p className="font-mono text-xs text-[#64736c]">
          Đang khôi phục phòng phỏng vấn…
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <MockSetup
        account={account}
        duration={duration}
        roleProfileId={roleProfileId}
        mode={mode}
        targetCompetency={targetCompetency}
        variant={variant}
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
        onVariant={setVariant}
        onStart={() => plan && startInterview(plan)}
        bankQuestionCount={bankQuestions.length}
        catalog={allQuestions}
        history={history}
        historyAvailable={historyCloudAvailable}
        historyError={historyError}
        onDeleteHistory={deleteHistoryEntry}
        notice={notice}
      />
    );
  }

  if (session.status === "completed" && session.report) {
    return (
      <MockReport
        account={account}
        session={session}
        questions={sessionQuestions}
        remediation={remediation}
        remediationMinutes={remediationMinutes}
        remediationMessage={remediationMessage}
        historyWarning={historyError}
        onReset={resetInterview}
        onReplay={() => startInterview(session.plan)}
        onRemediate={launchRemediation}
        onRemediationMinutes={setRemediationMinutes}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section className="max-w-lg rounded-3xl border border-[#ba4b2f]/20 bg-white/70 p-8 text-center">
          <h1 className="text-2xl font-semibold">Không khôi phục được câu hỏi</h1>
          <p className="mt-3 text-[#64736c]">
            Question bank đã đổi. Tạo buổi mới để tránh chấm nhầm version.
          </p>
          <button
            type="button"
            onClick={resetInterview}
            className="mt-6 rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white"
          >
            Tạo buổi mới
          </button>
        </section>
      </main>
    );
  }

  const currentDraft = session.answers[currentQuestion.id] ?? {
    response: "",
    explanation: "",
  };
  const answeredCount = session.questions.filter((identity) => {
    const question = questionByIdentity.get(
      `${identity.origin}:${identity.id}`,
    );
    return Boolean(
      question &&
        isQuestionAnswered(
          question,
          session.answers[identity.id] ?? {
            response: "",
            explanation: "",
          },
        ),
    );
  }).length;
  const progress =
    ((session.currentIndex + 1) / session.questions.length) * 100;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-xs font-bold text-[#d7ff91]">
              WQ
            </span>
            <div>
              <p className="font-semibold">Mock interview</p>
              <p className="text-xs text-[#64736c]">
                {worldQuantRoleProfileById(session.profileId).label} ·{" "}
                {session.plan.mode === "targeted" ? "Targeted" : "Balanced"} ·{" "}
                {session.plan.durationMinutes} phút
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-4 py-2 font-mono text-sm font-bold ${
                remainingSeconds <= 300
                  ? "border-[#ba4b2f]/30 bg-[#f8e8df] text-[#8e3825]"
                  : "border-[#173f35]/15 bg-white/65 text-[#245748]"
              }`}
            >
              {formatClock(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={resetInterview}
              disabled={
                session.status === "evaluating" &&
                !visibleReportError
              }
              className="rounded-xl border border-[#173f35]/15 bg-white/60 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Dừng
            </button>
          </div>
        </header>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs text-[#64736c]">
            <span className="font-mono font-bold">
              Câu {session.currentIndex + 1}/{session.questions.length}
            </span>
            <span>{answeredCount} câu đã trả lời · tự lưu khi F5</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#173f35]/10">
            <div
              className="h-full rounded-full bg-[#79b82a] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section className="py-7">
          <article className="overflow-hidden rounded-[2rem] border border-[#173f35]/15 bg-white/68 shadow-[0_22px_80px_rgb(23_63_53_/_8%)]">
            <div className="border-b border-[#173f35]/10 bg-[#173f35] px-6 py-4 text-white sm:px-9">
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#d7ff91] uppercase">
                Interviewer
              </p>
              <p className="mt-1 text-sm text-white/65">
                Không hint · không tag · không feedback giữa buổi
              </p>
            </div>
            <div className="p-6 sm:p-9">
              <h1 className="max-w-4xl text-2xl leading-[1.35] font-semibold tracking-[-0.025em] sm:text-3xl">
                <InlineCode text={currentQuestion.prompt} />
              </h1>

              {currentQuestion.code &&
              currentQuestion.responseMode !== "code" ? (
                <pre className="mt-7 max-h-[26rem] overflow-auto rounded-2xl bg-[#102d26] p-5 font-mono text-[13px] leading-6 text-[#e8f4ec]">
                  <code>{currentQuestion.code}</code>
                </pre>
              ) : null}

              <div className="mt-8">
                {currentQuestion.responseMode === "code" ? (
                  <div className="space-y-5">
                    <div className="overflow-hidden rounded-2xl border border-[#173f35]/15 bg-[#0b241d]">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                        <span className="font-mono text-xs font-bold text-[#d7ff91]">
                          Candidate solution
                        </span>
                        <span className="text-[10px] text-white/45">
                          {currentQuestion.execution
                            ? codeRunnerAvailable
                              ? "Sandbox cô lập · sample tests"
                              : "Sandbox chưa được cấu hình"
                            : "AI review · không có executable contract"}
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
                        placeholder="Viết solution của mày ở đây…"
                      />
                    </div>
                    {currentQuestion.execution ? (
                      <div className="rounded-2xl border border-[#173f35]/15 bg-[#f8faf5] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#29493d]">
                              Chạy code thật
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#64736c]">
                              Sample tests hiện chi tiết; hidden tests chỉ chạy
                              khi kết thúc buổi.
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
                            className="rounded-xl bg-[#173f35] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-45"
                          >
                            {runningQuestionId === currentQuestion.id
                              ? "Đang compile & test…"
                              : "Chạy sample tests"}
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
                            className="mt-3 rounded-xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-3 py-2 text-xs leading-5 text-[#8e3825]"
                          >
                            {codeRunError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="block text-sm font-bold text-[#29493d]">
                      Complexity, assumptions và trade-offs
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
                        placeholder="Giải thích như đang nói với interviewer…"
                        className="mt-2 w-full resize-y rounded-2xl border border-[#173f35]/15 bg-white/80 px-4 py-3 font-normal leading-7 outline-none focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block text-sm font-bold text-[#29493d]">
                    Câu trả lời của mày
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
                      placeholder="Trả lời thành tiếng hoặc viết như đang trao đổi với interviewer…"
                      className="mt-2 w-full resize-y rounded-2xl border border-[#173f35]/15 bg-white/80 px-4 py-3 font-normal leading-7 outline-none focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45"
                    />
                  </label>
                )}
              </div>
            </div>
          </article>

          {visibleReportError ? (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
            >
              {visibleReportError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveToQuestion(session.currentIndex - 1)}
              disabled={
                session.currentIndex === 0 || session.status === "evaluating"
              }
              className="rounded-xl border border-[#173f35]/15 bg-white/70 px-5 py-3 text-sm font-bold disabled:opacity-35"
            >
              ← Câu trước
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {session.currentIndex < session.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => moveToQuestion(session.currentIndex + 1)}
                  disabled={session.status === "evaluating"}
                  className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50"
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
                className="rounded-xl bg-[#d7ff91] px-5 py-3 text-sm font-bold text-[#173f35] shadow-sm disabled:cursor-wait disabled:opacity-55"
              >
                {session.status === "evaluating"
                  ? visibleReportError
                    ? "Thử report lại"
                    : "Đang chạy hidden tests & tạo report…"
                  : remainingSeconds === 0
                    ? "Thử tạo report lại"
                    : "Kết thúc & tạo report"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MockSetup({
  account,
  duration,
  roleProfileId,
  mode,
  targetCompetency,
  variant,
  plan,
  onDuration,
  onRole,
  onMode,
  onTargetCompetency,
  onVariant,
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
  variant: TargetedMockVariant;
  plan: TargetedMockPlan | null;
  onDuration: (duration: MockInterviewDuration) => void;
  onRole: (profileId: WorldQuantRoleProfileId) => void;
  onMode: (mode: TargetedMockMode) => void;
  onTargetCompetency: (competency: WorldQuantCompetencyKey) => void;
  onVariant: (variant: TargetedMockVariant) => void;
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
      entry.artifact.profileVersion === 1 &&
      entry.artifact.plan.durationMinutes === duration &&
      entry.artifact.plan.mode === mode &&
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
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <div>
              <p className="font-bold">Recall Mock Interview</p>
              <p className="text-xs text-[#64736c]">WorldQuant role profile</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/worldquant"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              WQ Hub
            </Link>
            <Link
              href="/learn/tick-data-order-book"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Học Tick data
            </Link>
            <Link
              href="/learn/cmake"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Học CMake
            </Link>
            <Link
              href="/"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Luyện tập
            </Link>
            <Link
              href="/stats"
              className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
            >
              Thống kê
            </Link>
            <span className="rounded-full border border-[#173f35]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
              @{account.login ?? account.displayName}
            </span>
          </nav>
        </header>

        {notice ? (
          <p className="mt-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]">
            {notice}
          </p>
        ) : null}

        <section className="grid gap-7 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              Target role
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {role.label}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#52645c]">
              {role.summary} Một lượt mô phỏng không lộ hint hay feedback;
              report chỉ xuất hiện sau khi kết thúc toàn bộ buổi.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {role.coreCompetencies.map((competency) => (
                <div
                  key={competency}
                  className="flex gap-3 rounded-2xl border border-[#173f35]/10 bg-white/55 p-4 text-sm leading-6"
                >
                  <span className="mt-1 text-[#79a72e]">◆</span>
                  <span>
                    <strong>
                      {worldQuantCompetencies[competency].shortLabel}
                    </strong>
                    <span className="mt-1 block text-xs text-[#64736c]">
                      Trọng số role {role.weights[competency]}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#173f35]/15 bg-[#173f35] p-6 text-white shadow-[0_22px_80px_rgb(23_63_53_/_16%)] sm:p-7">
            <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
              Chọn role
            </p>
            <select
              value={roleProfileId}
              onChange={(event) =>
                onRole(event.target.value as WorldQuantRoleProfileId)
              }
              className="mt-3 w-full rounded-2xl border border-white/15 bg-[#214f42] px-4 py-3 text-sm font-bold text-white outline-none"
            >
              {worldQuantRoleProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <p className="mt-6 font-mono text-[11px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
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
                        ? "border-[#d7ff91] bg-white/12"
                        : "border-white/12 bg-white/5 hover:bg-white/9"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <strong>{option.minutes} phút</strong>
                      <span
                        className={`size-3 rounded-full border ${
                          active
                            ? "border-[#d7ff91] bg-[#d7ff91]"
                            : "border-white/30"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-6 font-mono text-[11px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
              Evidence scope
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
                      ? "border-[#d7ff91] bg-[#d7ff91]/12"
                      : "border-white/12 bg-white/5 hover:bg-white/9"
                  }`}
                >
                  <strong>
                    {scope === "balanced" ? "Balanced" : "Targeted"}
                  </strong>
                  <span className="mt-1 block text-[10px] text-white/50">
                    {scope === "balanced"
                      ? "Phân bổ theo trọng số role"
                      : "Chỉ chấm một competency"}
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
                className="mt-3 w-full rounded-2xl border border-white/15 bg-[#214f42] px-4 py-3 text-sm font-bold text-white outline-none"
              >
                {eligibleCompetencies.map((competency) => (
                  <option key={competency} value={competency}>
                    {worldQuantCompetencies[competency].shortLabel} ·{" "}
                    {role.weights[competency]}%
                  </option>
                ))}
              </select>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([1, 2] as const).map((nextVariant) => (
                <button
                  key={nextVariant}
                  type="button"
                  onClick={() => onVariant(nextVariant)}
                  aria-pressed={variant === nextVariant}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                    variant === nextVariant
                      ? "border-[#d7ff91] text-[#d7ff91]"
                      : "border-white/12 text-white/65"
                  }`}
                >
                  Bộ đề {nextVariant}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 text-xs leading-5 text-white/65">
              <strong className="text-white">
                {plan?.questions.length ?? 0} câu ·{" "}
                {plan?.scheduledMinutes ?? 0}/{duration} phút
              </strong>
              <span className="mt-1 block">
                Sample {plannedCompetencies.length} competency · tối đa{" "}
                {plannedRoleWeight}% trọng số role có evidence. Exact queue
                được khóa theo role, mode, variant và content revision.
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
              className="mt-5 w-full rounded-2xl bg-[#d7ff91] px-5 py-3.5 text-sm font-bold text-[#173f35] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {!historyAvailable
                ? "Cloud history v4 chưa sẵn sàng"
                : plan && plan.questions.length >= 3
                ? `Bắt đầu ${mode === "targeted" ? "targeted" : "balanced"} mock →`
                : "Chưa đủ 3 câu đã duyệt"}
            </button>
            <p className="mt-4 text-center text-[11px] leading-5 text-white/45">
              Timer và câu trả lời được tự lưu local nên F5 không làm mất buổi.
            </p>
          </aside>
        </section>

        <section className="grid gap-5 pb-10 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-[#173f35]/12 bg-white/62 p-6 sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
              Question bank cho bộ mới
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
                      ? "bg-[#eaf8cf] text-[#245748]"
                      : "bg-[#f1e6dc] text-[#8e3825]"
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

          <article className="rounded-[2rem] border border-[#ba4b2f]/18 bg-[#fff4df] p-6 sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
              Coverage guard
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Không giả vờ question bank đã biết mọi thứ
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#6b5648]">
              Các tình huống tick data, migration, CMake, Python và English được
              curate từ chính JD. Report chỉ chấm explicit rubric; không nhận
              chúng là câu hỏi thật của WorldQuant.
            </p>
            {plan?.contentGaps.length ? (
              <p className="mt-4 text-xs leading-5 text-[#8e3825]">
                Blueprint hiện thiếu câu đủ điều kiện cho:{" "}
                <strong>
                  {plan.contentGaps
                    .map(
                      (gap) =>
                        worldQuantCompetencies[gap.competency].shortLabel,
                    )
                    .join(", ")}
                </strong>
                . Đây là content gap, không phải bằng chứng ứng viên yếu.
              </p>
            ) : null}
          </article>
        </section>

        <section className="mb-10 rounded-[2rem] border border-[#173f35]/12 bg-white/62 p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
                Interview history
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Những attempt đã hoàn thành
              </h2>
            </div>
            <span className="text-xs text-[#64736c]">
              {historyAvailable
                ? "Cloud history theo account"
                : "Cloud history chưa cấu hình"}
            </span>
          </div>
          {historyError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-xs text-[#8e3825]"
            >
              {historyError}
            </p>
          ) : null}
          {visibleHistory.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {visibleHistory.slice(0, 6).map((entry) => (
                <article
                  key={entry.attemptId}
                  className="rounded-2xl border border-[#173f35]/10 bg-[#f8faf5] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {worldQuantRoleProfileById(
                          entry.artifact.profileId,
                        ).label}
                      </p>
                      <p className="mt-1 text-xs text-[#64736c]">
                        {entry.artifact.plan.mode === "targeted"
                          ? `Targeted · ${
                              worldQuantCompetencies[
                                entry.artifact.plan.targetCompetency!
                              ].shortLabel
                            }`
                          : "Balanced"}{" "}
                        · {entry.artifact.plan.durationMinutes} phút ·{" "}
                        {formatDateTime(entry.artifact.completedAt)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#64736c]">
                        {
                          entry.artifact.debrief
                            .assessedWeightPercent
                        }
                        % trọng số role đã hỏi
                      </p>
                    </div>
                    <span className="rounded-full bg-[#d7ff91]/65 px-3 py-1 font-mono text-xs font-bold">
                      {entry.artifact.debrief.roleInterviewScore ?? "—"}
                    </span>
                  </div>
                  <details className="mt-3 text-xs text-[#52645c]">
                    <summary className="cursor-pointer font-bold">
                      Xem evidence
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
                      className="mt-3 text-xs font-bold text-[#8e3825] underline decoration-[#8e3825]/30 underline-offset-4"
                    >
                      Xóa attempt
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#64736c]">
              Chưa có attempt v4 hoàn chỉnh. Report cũ v3 vẫn được giữ nguyên
              trong storage legacy và không bị tự gán sang account này.
            </p>
          )}
        </section>

        <p className="pb-8 text-center text-xs leading-5 text-[#64736c]">
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
  onReset,
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
  onReset: () => void;
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

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <div>
              <p className="font-bold">Mock Interview Report</p>
              <p className="text-xs text-[#64736c]">
                {role.label}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/worldquant"
              className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 text-sm font-bold"
            >
              WQ Hub
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 text-sm font-bold"
            >
              Luyện tập
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 text-sm font-bold"
            >
              Chọn bộ khác
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white"
            >
              Luyện lại bộ này
            </button>
            <span className="rounded-full border border-[#173f35]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
              @{account.login ?? account.displayName}
            </span>
          </div>
        </header>

        <section className="grid gap-5 py-8 lg:grid-cols-[0.38fr_0.62fr]">
          <article className="rounded-[2rem] bg-[#173f35] p-7 text-white shadow-[0_22px_80px_rgb(23_63_53_/_16%)]">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#d7ff91] uppercase">
              {debrief.scope === "targeted_evidence"
                ? `Targeted · ${
                    worldQuantCompetencies[
                      session.plan.targetCompetency!
                    ].shortLabel
                  }`
                : "Balanced role sample"}
            </p>
            <p className="mt-4 font-mono text-6xl font-bold text-[#d7ff91]">
              {debrief.roleInterviewScore ?? "—"}
            </p>
            <p className="mt-1 text-xs text-white/45">/ 100</p>
            <h1 className="mt-5 text-2xl font-semibold">
              Điểm trên phần đã hỏi
            </h1>
            <p className="mt-2 text-xs text-white/45">
              Đã kiểm tra {debrief.assessedWeightPercent}% trọng số role. Điểm
              này không cộng vào Preparation Index.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Đây không phải readiness verdict hay quyết định tuyển dụng.
              Competency “Chưa hỏi” không bị tính là 0.
            </p>
            <div className="mt-6 border-t border-white/12 pt-4 font-mono text-[10px] leading-5 text-white/42">
              <p>
                {session.plan.mode} · bộ {session.plan.variant} · blueprint v
                {session.plan.version}
              </p>
              <p>
                {session.plan.durationMinutes} phút · {questions.length} câu
              </p>
              <p>{session.reportModel ?? "AI model"}</p>
              <p>{session.reportProvider ?? "provider"} · chấm một lần cuối buổi</p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              Interview summary
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Báo cáo tổng hợp
            </h2>
            <p className="mt-4 leading-7 text-[#52645c]">{report.summary}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ReportList
                title="Tín hiệu tốt"
                items={report.strengths}
                tone="positive"
              />
              <ReportList
                title="Nhận xét cần làm rõ (AI, định tính)"
                items={report.priorityGaps}
                tone="warning"
              />
            </div>
          </article>
        </section>

        {historyWarning ? (
          <p
            role="alert"
            className="mb-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
          >
            {historyWarning}
          </p>
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
                className="rounded-[1.75rem] border border-[#173f35]/12 bg-white/62 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#64736c] uppercase">
                      Competency
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
                        ? "bg-[#d7ff91]/70 text-[#245748]"
                        : "bg-[#edf0e8] text-[#64736c]"
                    }`}
                  >
                    {result.status === "assessed"
                      ? `${result.score}/100`
                      : "Chưa hỏi"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#52645c]">
                  {result.status === "assessed"
                    ? `${result.evidenceCount} câu evidence · deficit ${result.scoreDeficit} · impact ${result.weightedDeficit}`
                    : "Buổi mock này chưa kiểm tra competency này."}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 rounded-[2rem] border border-[#173f35]/12 bg-white/62 p-6 sm:p-7">
          <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
            Next preparation
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Kế hoạch ôn tiếp</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#64736c]">Budget:</span>
            {[15, 30, 45, 60].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onRemediationMinutes(minutes)}
                aria-pressed={remediationMinutes === minutes}
                className={`rounded-full border px-3 py-1.5 font-bold ${
                  remediationMinutes === minutes
                    ? "border-[#173f35] bg-[#173f35] text-white"
                    : "border-[#173f35]/15 bg-white"
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
                    className="rounded-2xl border border-[#173f35]/10 bg-[#f8faf5] p-4"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
                      Gap #{option.rank} · impact {option.weightedDeficit}
                    </span>
                    <h3 className="mt-1 font-semibold">
                      {
                        worldQuantCompetencies[option.competency]
                          .shortLabel
                      }
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#64736c]">
                      {option.availability === "focus_sprint"
                        ? `${option.plan.questions.length} thẻ approved · ~${option.plan.scheduledMinutes} phút`
                        : option.availability === "guide"
                          ? "Chưa đủ card; có guide nền tảng."
                          : option.availability === "content_gap"
                            ? "Content gap: chưa đủ card/guide approved."
                            : "Hiện không có card đến hạn hoặc fallback phù hợp."}
                    </p>
                    {option.availability === "focus_sprint" ? (
                      <button
                        type="button"
                        onClick={() => onRemediate(option)}
                        className="mt-4 rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
                      >
                        Tạo Focus Sprint
                      </button>
                    ) : guide?.kind === "guide" ? (
                      <Link
                        href={guide.href}
                        className="mt-4 inline-flex rounded-xl border border-[#173f35]/15 px-4 py-2 text-xs font-bold"
                      >
                        Mở guide
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {remediationMessage ? (
            <p className="mt-4 rounded-xl bg-[#fff4df] px-4 py-3 text-xs text-[#8e3825]">
              {remediationMessage}
            </p>
          ) : null}
          <h3 className="mt-7 text-sm font-bold text-[#356b58]">
            Gợi ý định tính từ interviewer
          </h3>
          {report.studyPlan.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {report.studyPlan.map((item) => (
                <div
                  key={`${item.priority}:${item.topic}`}
                  className="rounded-2xl border border-[#173f35]/10 bg-[#f8faf5] p-4"
                >
                  <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
                    P{item.priority}
                  </span>
                  <h3 className="mt-1 font-semibold">{item.topic}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#52645c]">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#64736c]">
              Report chưa đề xuất thêm action.
            </p>
          )}
        </section>

        <section className="mt-5 pb-10">
          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#356b58] uppercase">
              Question review
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
                  className="group rounded-2xl border border-[#173f35]/12 bg-white/62 p-5"
                >
                  <summary className="flex list-none cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-mono text-[10px] text-[#64736c]">
                        Câu {index + 1}
                      </span>
                      <p className="mt-1 line-clamp-2 font-semibold">
                        {question.prompt}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eaf8cf] px-3 py-1 font-mono text-xs font-bold text-[#245748]">
                      {assessment.score} · {verdictLabels[assessment.verdict]}
                    </span>
                  </summary>
                  <div className="mt-5 space-y-5 border-t border-[#173f35]/10 pt-5">
                    {hiddenExecution ? (
                      <div>
                        <p className="text-xs font-bold text-[#356b58]">
                          Hidden tests trong sandbox
                        </p>
                        <ExecutionResultPanel
                          result={hiddenExecution}
                          compact
                        />
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs font-bold text-[#356b58]">
                        Câu trả lời của mày
                      </p>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#102d26] p-4 font-mono text-xs leading-6 text-[#e8f4ec]">
                        {answer
                          ? candidateAnswer(question, answer) || "(Bỏ trống)"
                          : "(Bỏ trống)"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#356b58]">
                        Nhận xét
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#52645c]">
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
        tone === "positive" ? "bg-[#eaf8cf]" : "bg-[#f8e8df]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          tone === "positive" ? "text-[#245748]" : "text-[#8e3825]"
        }`}
      >
        {title}
      </p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#52645c]">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span>{tone === "positive" ? "✓" : "→"}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#64736c]">Chưa có evidence.</p>
      )}
    </div>
  );
}

const executionStatusLabels: Record<
  CodeExecutionResult["status"],
  string
> = {
  passed: "Đã qua",
  tests_failed: "Sai hidden/sample test",
  compile_error: "Lỗi biên dịch",
  runtime_error: "Lỗi khi chạy",
  time_limit: "Quá thời gian",
  memory_limit: "Quá bộ nhớ",
  output_limit: "Output quá lớn",
  sandbox_error: "Lỗi hạ tầng sandbox",
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
          ? "border-[#79b82a]/25 bg-[#eaf8cf]"
          : infrastructureError
            ? "border-[#173f35]/12 bg-[#edf0e8]"
            : "border-[#ba4b2f]/20 bg-[#f8e8df]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong
          className={
            positive
              ? "text-[#245748]"
              : infrastructureError
                ? "text-[#52645c]"
                : "text-[#8e3825]"
          }
        >
          {executionStatusLabels[result.status]}
        </strong>
        <span className="font-mono text-[10px] text-[#64736c]">
          {result.passedTests}/{result.totalTests} tests ·{" "}
          {result.durationMs}ms · {result.toolchain}
        </span>
      </div>
      {result.suite === "sample" && result.cases.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[#52645c]">
          {result.cases.map((testCase) => (
            <li key={testCase.name} className="flex gap-2">
              <span
                className={
                  testCase.passed
                    ? "text-[#67a41d]"
                    : "text-[#ba4b2f]"
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
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#64736c] uppercase">
            Compiler diagnostics
          </p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[#102d26] p-3 font-mono text-[11px] leading-5 text-[#e8f4ec]">
            {result.diagnostics}
          </pre>
        </div>
      ) : null}
      {!compact && result.output ? (
        <div className="mt-3">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#64736c] uppercase">
            Test output
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#102d26] p-3 font-mono text-[11px] leading-5 text-[#e8f4ec]">
            {result.output}
          </pre>
        </div>
      ) : null}
      {result.suite === "hidden" ? (
        <p className="mt-2 text-[11px] leading-5 text-[#64736c]">
          Chỉ hiện tổng hợp để không làm lộ hidden test cases.
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
            className="rounded-md bg-[#e8ede8] px-1.5 py-0.5 font-mono text-[0.88em] text-[#245748]"
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
  const language =
    question.language === "cpp"
      ? "cpp"
      : question.language === "python"
        ? "python"
        : "cmake";
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
