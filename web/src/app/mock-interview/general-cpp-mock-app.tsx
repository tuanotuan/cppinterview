"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/app/brand-mark";
import { LanguageSwitcher } from "@/app/language-switcher";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  buildGeneralCppInterviewPlan,
  generalCppCompetencies,
  generalCppQuestionCounts,
  generalCppStandards,
  type GeneralCppDuration,
  type GeneralCppInterviewQuestion,
  type GeneralCppStandard,
} from "@/lib/mock-interview/general-catalog";
import {
  generalCppCompletedArtifactSchema,
  generalCppHistoryDetailSchema,
  generalCppReviewSnapshotSchema,
  type GeneralCppCompletedArtifact,
  type GeneralCppHistoryDetail,
  type GeneralCppReportRequest,
  type GeneralCppReviewSnapshot,
} from "@/lib/mock-interview/contracts-v5";
import {
  clearGeneralCppSession,
  generalCppHistoryStorageKey,
  generalCppSessionStorageKey,
  parseGeneralCppLocalHistory,
  parseGeneralCppSession,
  prependGeneralCppLocalHistory,
  saveGeneralCppSession,
  type GeneralCppSession,
} from "@/lib/mock-interview/session-v5";

export type GeneralCppHistorySummary = {
  attemptId: string;
  sessionId: string;
  completedAt: string;
  durationMinutes: GeneralCppDuration;
  overallScore: number;
  readiness: GeneralCppCompletedArtifact["report"]["readiness"];
  standardScores: GeneralCppCompletedArtifact["report"]["standardScores"];
  detail: GeneralCppHistoryDetail;
};

type Props = {
  account: { id: string; displayName: string } | null;
  sourceRevision: string;
  catalog: GeneralCppInterviewQuestion[];
  coverage: Record<GeneralCppStandard, number>;
  publicationAvailable: boolean;
  initialHistory: GeneralCppHistorySummary[];
  historyAvailable: boolean;
  locale: Locale;
};

type ApiSuccess = {
  ok: true;
  artifact: GeneralCppCompletedArtifact;
  review: GeneralCppReviewSnapshot;
  historySaved: boolean;
  quota: { remaining: number | null; resetsAt: string | null };
};

class ReportRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ReportRequestError";
  }
}

const terminalReportErrorCodes = new Set([
  "catalog_changed",
  "idempotency_conflict",
  "invalid_ai_report",
  "outcome_unknown",
  "plan_stale",
  "request_not_repeatable",
]);

const copy = {
  vi: {
    eyebrow: "Phỏng vấn thử C++",
    title: "Luyện phỏng vấn C++ từ C++11 đến C++23",
    intro:
      "Một vị trí duy nhất: C++ Engineer. Mỗi phiên lấy câu từ ngân hàng đã duyệt và cân bằng nhiều mảng kiến thức qua năm chuẩn C++.",
    role: "Vị trí",
    roleName: "C++ Engineer",
    roleDetail:
      "Ngôn ngữ hiện đại, vòng đời và ownership, STL, template, concurrency, hiệu năng và chất lượng build.",
    duration: "Thời lượng",
    questions: "câu",
    coverage: "Phạm vi ngân hàng đã duyệt",
    start: "Bắt đầu phỏng vấn",
    continue: "Tiếp tục phiên đang làm",
    signInTitle: "Không cần đăng nhập để luyện",
    signInBody:
      "Khách vẫn làm đủ phiên và nhận báo cáo AI. Đăng nhập nếu bạn muốn lưu lịch sử trên cloud.",
    signIn: "Đăng nhập để lưu lịch sử",
    bankUnavailable:
      "Dịch vụ xuất bản câu hỏi chưa sẵn sàng; hiện chỉ dùng được các câu đã verified trong repo.",
    bankInsufficient:
      "Ngân hàng đã duyệt chưa đủ câu cho mọi phiên bản C++. Hãy duyệt thêm câu hỏi rồi tải lại trang.",
    sessionEyebrow: "Phiên C++ Engineer",
    question: "Câu hỏi",
    remaining: "Còn lại",
    overtime: "Quá giờ",
    answer: "Câu trả lời của bạn",
    placeholder:
      "Trả lời như trong một buổi phỏng vấn thật. Có thể để trống nếu chưa biết.",
    previous: "Câu trước",
    next: "Câu tiếp theo",
    submit: "Nộp và nhận báo cáo AI",
    submitConfirm: "Nộp phiên này để AI chấm ngay?",
    blankConfirm:
      "Một số câu đang để trống. AI sẽ chấm chúng như phần kiến thức còn thiếu. Vẫn nộp?",
    evaluating: "Luna đang chấm toàn bộ phiên phỏng vấn…",
    resumeEvaluation:
      "Phiên chấm đang chờ khôi phục. Hãy thử gửi lại đúng yêu cầu cũ.",
    retry: "Thử gửi lại",
    edit: "Quay lại câu trả lời",
    newSession: "Tạo phiên mới",
    reportEyebrow: "Báo cáo phỏng vấn",
    historyReportEyebrow: "Báo cáo đã lưu",
    reportTitle: "Kết quả C++ Engineer",
    completedAt: "Hoàn thành",
    overall: "Điểm tổng",
    byStandard: "Theo phiên bản C++",
    competencies: "Theo nhóm năng lực",
    dimensions: "Kỹ năng thể hiện trong câu trả lời",
    questionFeedback: "Nhận xét từng câu",
    submittedAnswer: "Câu trả lời đã nộp",
    blankSubmittedAnswer: "Không có câu trả lời.",
    timeSpent: "Thời gian",
    positiveFeedback: "Điểm làm tốt",
    improvementFeedback: "Điểm còn thiếu",
    snapshotUnavailable:
      "Phiên cũ này chưa lưu bản chụp đề bài và câu trả lời. Phần chấm AI bên dưới vẫn là báo cáo gốc.",
    strengths: "Điểm mạnh",
    gaps: "Ưu tiên cải thiện",
    actions: "3 bước tiếp theo",
    history: "Lịch sử gần đây",
    localHistory: "Được lưu trên trình duyệt này",
    cloudHistory: "Được lưu riêng tư trên cloud",
    viewReport: "Xem báo cáo",
    backToHistory: "Quay lại lịch sử",
    noHistory: "Chưa có phiên hoàn thành.",
    savedCloud: "Báo cáo đã được lưu vào lịch sử cloud.",
    savedLocal: "Báo cáo được lưu trên trình duyệt này.",
  },
  en: {
    eyebrow: "C++ mock interview",
    title: "Practice C++ interviews from C++11 through C++23",
    intro:
      "One role: C++ Engineer. Every session draws from the published question bank and balances knowledge across five C++ standards.",
    role: "Role",
    roleName: "C++ Engineer",
    roleDetail:
      "Modern language features, lifetime and ownership, STL, templates, concurrency, performance, and build quality.",
    duration: "Duration",
    questions: "questions",
    coverage: "Published bank coverage",
    start: "Start interview",
    continue: "Continue current session",
    signInTitle: "No sign-in required",
    signInBody:
      "Guests can complete a full session and receive an AI report. Sign in only if you want cloud history.",
    signIn: "Sign in for cloud history",
    bankUnavailable:
      "Question publication is not available; only repository-verified questions can be used right now.",
    bankInsufficient:
      "The published bank does not yet cover every C++ standard. Approve more questions and reload this page.",
    sessionEyebrow: "C++ Engineer session",
    question: "Question",
    remaining: "Remaining",
    overtime: "Overtime",
    answer: "Your answer",
    placeholder:
      "Answer as you would in a real interview, or leave it blank if you do not know.",
    previous: "Previous",
    next: "Next question",
    submit: "Submit for AI report",
    submitConfirm: "Submit this interview for AI grading now?",
    blankConfirm:
      "Some answers are blank. AI will score them as missing knowledge. Submit anyway?",
    evaluating: "Luna is grading the full interview…",
    resumeEvaluation:
      "This grading request is waiting to resume. Retry the same saved request.",
    retry: "Retry submission",
    edit: "Return to answers",
    newSession: "Start a new session",
    reportEyebrow: "Interview report",
    historyReportEyebrow: "Saved interview report",
    reportTitle: "C++ Engineer results",
    completedAt: "Completed",
    overall: "Overall score",
    byStandard: "By C++ standard",
    competencies: "By competency",
    dimensions: "Skills demonstrated in your answers",
    questionFeedback: "Question-by-question feedback",
    submittedAnswer: "Submitted answer",
    blankSubmittedAnswer: "No answer was submitted.",
    timeSpent: "Time",
    positiveFeedback: "What went well",
    improvementFeedback: "What was missing",
    snapshotUnavailable:
      "This older session did not save a question-and-answer snapshot. The AI feedback below is still the original report.",
    strengths: "Strengths",
    gaps: "Priority gaps",
    actions: "Your next 3 actions",
    history: "Recent history",
    localHistory: "Saved in this browser",
    cloudHistory: "Saved privately to cloud",
    viewReport: "View report",
    backToHistory: "Back to history",
    noHistory: "No completed sessions yet.",
    savedCloud: "This report was saved to cloud history.",
    savedLocal: "This report is saved in this browser.",
  },
} as const;

const competencyLabels = {
  vi: {
    language_core: "Ngôn ngữ C++ cốt lõi",
    lifetime_ownership: "Vòng đời và ownership",
    templates_generic: "Template và generic programming",
    stl_algorithms: "STL, iterator và thuật toán",
    concurrency_memory: "Concurrency và memory model",
    performance_systems: "Hiệu năng và lập trình hệ thống",
    build_quality: "Build, kiểm thử và chất lượng",
  },
  en: {
    language_core: "Core C++ language",
    lifetime_ownership: "Lifetime and ownership",
    templates_generic: "Templates and generic programming",
    stl_algorithms: "STL, iterators, and algorithms",
    concurrency_memory: "Concurrency and memory model",
    performance_systems: "Performance and systems",
    build_quality: "Build, testing, and quality",
  },
} as const;

const dimensionLabels = {
  vi: {
    correctness: "Tính đúng đắn",
    complexity: "Độ phức tạp",
    idiomatic_cpp: "C++ chuẩn và tự nhiên",
    lifetime_ownership: "Vòng đời và ownership",
    testing_debugging: "Kiểm thử và gỡ lỗi",
    communication: "Giao tiếp",
    requirement_clarification: "Làm rõ yêu cầu",
    tradeoff_reasoning: "Phân tích đánh đổi",
  },
  en: {
    correctness: "Correctness",
    complexity: "Complexity",
    idiomatic_cpp: "Idiomatic C++",
    lifetime_ownership: "Lifetime and ownership",
    testing_debugging: "Testing and debugging",
    communication: "Communication",
    requirement_clarification: "Requirement clarification",
    tradeoff_reasoning: "Trade-off reasoning",
  },
} as const;

const readinessLabels = {
  vi: {
    needs_foundation: "Cần củng cố nền tảng",
    developing: "Đang phát triển",
    interview_ready: "Sẵn sàng phỏng vấn",
    strong: "Nền tảng vững",
  },
  en: {
    needs_foundation: "Needs stronger foundations",
    developing: "Developing",
    interview_ready: "Interview ready",
    strong: "Strong",
  },
} as const;

export function GeneralCppMockApp(props: Props) {
  const t = copy[props.locale];
  const accountScope = props.account?.id ?? "guest";
  const [duration, setDuration] = useState<GeneralCppDuration>(45);
  const [session, setSession] = useState<GeneralCppSession | null>(null);
  const [localHistory, setLocalHistory] = useState<
    GeneralCppHistoryDetail[]
  >([]);
  const [selectedHistory, setSelectedHistory] =
    useState<GeneralCppHistoryDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(readClock);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeQuestionStartedAt = useRef(0);

  const catalogById = useMemo(
    () => new Map(props.catalog.map((question) => [question.id, question])),
    [props.catalog],
  );
  const bankReady =
    props.catalog.length >= generalCppQuestionCounts[duration] &&
    generalCppStandards.every((standard) => props.coverage[standard] > 0);

  useEffect(() => {
    const stored = parseGeneralCppSession(
      window.localStorage.getItem(generalCppSessionStorageKey(accountScope)),
    );
    const canRestore = Boolean(
      stored &&
        stored.accountScope === accountScope &&
        stored.sourceRevision === props.sourceRevision &&
        stored.plan.questions.every((question) => catalogById.has(question.id)),
    );
    if (stored && !canRestore) {
      clearGeneralCppSession(accountScope);
    }
    const storedHistory = parseGeneralCppLocalHistory(
      window.localStorage.getItem(generalCppHistoryStorageKey(accountScope)),
    );
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (stored && canRestore) {
        setSession(stored);
        setDuration(stored.plan.durationMinutes);
        if (stored.status === "evaluating") {
          setError(copy[props.locale].resumeEvaluation);
          setErrorCode("network_unknown");
        }
      }
      setLocalHistory(storedHistory);
      activeQuestionStartedAt.current = readClock();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [accountScope, catalogById, props.locale, props.sourceRevision]);

  useEffect(() => {
    if (!session) return;
    saveGeneralCppSession(session);
  }, [session]);

  useEffect(() => {
    if (!session || session.status === "completed") return;
    const timer = window.setInterval(() => setNow(readClock()), 1_000);
    return () => window.clearInterval(timer);
  }, [session]);

  const question = session
    ? catalogById.get(session.plan.questions[session.currentIndex]?.id)
    : null;
  const report = session?.report ?? null;
  const history = mergeHistory(localHistory, props.initialHistory);

  function startSession() {
    setError(null);
    setErrorCode(null);
    setNotice(null);
    setSelectedHistory(null);
    try {
      const plan = buildGeneralCppInterviewPlan({
        catalog: props.catalog,
        catalogRevision: props.sourceRevision,
        durationMinutes: duration,
        seed: crypto.randomUUID(),
      });
      const startedAt = new Date();
      const next: GeneralCppSession = {
        schemaVersion: 5,
        accountScope,
        sessionId: crypto.randomUUID(),
        sourceRevision: props.sourceRevision,
        plan,
        status: "in_progress",
        startedAt: startedAt.toISOString(),
        deadlineAt: new Date(
          startedAt.getTime() + duration * 60_000,
        ).toISOString(),
        currentIndex: 0,
        answers: Object.fromEntries(
          plan.questions.map((item) => [
            item.id,
            { response: "", elapsedSeconds: 0 },
          ]),
        ),
      };
      clearGeneralCppSession(accountScope);
      saveGeneralCppSession(next);
      activeQuestionStartedAt.current = readClock();
      setNow(readClock());
      setSession(next);
    } catch {
      setError(t.bankInsufficient);
    }
  }

  function moveTo(index: number) {
    if (!session || session.status !== "in_progress") return;
    const next = commitQuestionTime(session);
    activeQuestionStartedAt.current = readClock();
    setSession({
      ...next,
      currentIndex: Math.max(0, Math.min(index, next.plan.questions.length - 1)),
    });
  }

  function updateAnswer(response: string) {
    if (!session || !question || session.status !== "in_progress") return;
    setSession({
      ...session,
      answers: {
        ...session.answers,
        [question.id]: {
          ...(session.answers[question.id] ?? {
            response: "",
            elapsedSeconds: 0,
          }),
          response,
        },
      },
    });
  }

  async function submitSession() {
    if (!session || session.status !== "in_progress") return;
    const committed = commitQuestionTime(session);
    const blankCount = committed.plan.questions.filter(
      (item) => !committed.answers[item.id]?.response.trim(),
    ).length;
    if (blankCount > 0 && !window.confirm(t.blankConfirm)) return;
    if (blankCount === 0 && !window.confirm(t.submitConfirm)) return;

    const submittedAt = new Date().toISOString();
    const pendingRequest: GeneralCppReportRequest = {
      schemaVersion: 5,
      responseLocale: props.locale,
      idempotencyKey: crypto.randomUUID(),
      sessionId: committed.sessionId,
      sourceRevision: committed.sourceRevision,
      startedAt: committed.startedAt,
      submittedAt,
      elapsedSeconds: Math.max(
        0,
        Math.round(
          (new Date(submittedAt).getTime() -
            new Date(committed.startedAt).getTime()) /
            1_000,
        ),
      ),
      plan: committed.plan,
      items: committed.plan.questions.map((item) => ({
        question: item,
        response: committed.answers[item.id]?.response ?? "",
        elapsedSeconds: committed.answers[item.id]?.elapsedSeconds ?? 0,
      })),
    };
    const evaluating: GeneralCppSession = {
      ...committed,
      status: "evaluating",
      pendingRequest,
    };
    setSession(evaluating);
    saveGeneralCppSession(evaluating);
    await sendReport(evaluating, pendingRequest);
  }

  async function retryReport() {
    if (!session?.pendingRequest) return;
    await sendReport(session, session.pendingRequest);
  }

  async function sendReport(
    evaluating: GeneralCppSession,
    pendingRequest: GeneralCppReportRequest,
  ) {
    setError(null);
    setErrorCode(null);
    setNotice(null);
    try {
      const response = await fetch("/api/mock-interview/general-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRequest),
      });
      const body = (await response.json()) as
        | ApiSuccess
        | { ok?: false; code?: string; error?: string };
      if (!response.ok || !body.ok) {
        throw new ReportRequestError(
          "error" in body && typeof body.error === "string"
            ? body.error
            : props.locale === "en"
              ? "The report could not be generated."
              : "Chưa thể tạo báo cáo.",
          "code" in body && typeof body.code === "string"
            ? body.code
            : "request_failed",
        );
      }
      const artifact = generalCppCompletedArtifactSchema.parse(body.artifact);
      const review = generalCppReviewSnapshotSchema.parse(body.review);
      const detail = generalCppHistoryDetailSchema.parse({ artifact, review });
      const completed: GeneralCppSession = {
        ...evaluating,
        status: "completed",
        pendingRequest: undefined,
        report: artifact,
        review,
      };
      setSession(completed);
      saveGeneralCppSession(completed);
      setLocalHistory(
        prependGeneralCppLocalHistory(accountScope, detail),
      );
      setNotice(body.historySaved ? t.savedCloud : t.savedLocal);
    } catch (caught) {
      setErrorCode(
        caught instanceof ReportRequestError
          ? caught.code
          : "network_unknown",
      );
      setError(
        caught instanceof Error
          ? caught.message
          : props.locale === "en"
            ? "The report could not be generated."
            : "Chưa thể tạo báo cáo.",
      );
    }
  }

  function editAfterFailure() {
    if (!session || session.status !== "evaluating") return;
    const next: GeneralCppSession = {
      ...session,
      status: "in_progress",
      pendingRequest: undefined,
    };
    activeQuestionStartedAt.current = readClock();
    setError(null);
    setErrorCode(null);
    setSession(next);
  }

  function resetSession() {
    clearGeneralCppSession(accountScope);
    setSession(null);
    setError(null);
    setErrorCode(null);
    setNotice(null);
    setSelectedHistory(null);
  }

  function commitQuestionTime(current: GeneralCppSession) {
    const item = current.plan.questions[current.currentIndex];
    if (!item) return current;
    const elapsed = Math.max(
      0,
      Math.round((readClock() - activeQuestionStartedAt.current) / 1_000),
    );
    return {
      ...current,
      answers: {
        ...current.answers,
        [item.id]: {
          response: current.answers[item.id]?.response ?? "",
          elapsedSeconds: Math.min(
            2 * 60 * 60,
            (current.answers[item.id]?.elapsedSeconds ?? 0) + elapsed,
          ),
        },
      },
    };
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-12">
        <p className="text-sm text-[#526276]" aria-live="polite">
          {props.locale === "en" ? "Loading interview…" : "Đang tải phiên phỏng vấn…"}
        </p>
      </main>
    );
  }

  if (selectedHistory) {
    return (
      <ReportView
        artifact={selectedHistory.artifact}
        review={selectedHistory.review}
        locale={props.locale}
        notice={null}
        history={history}
        historyLabel={
          props.account && props.historyAvailable
            ? t.cloudHistory
            : t.localHistory
        }
        onBack={() => setSelectedHistory(null)}
        onNew={resetSession}
        onOpenHistory={setSelectedHistory}
      />
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-4 border-b border-[#0f3a69]/10 pb-5">
            <BrandMark size="md" />
            <LanguageSwitcher compact hideOnMock={false} />
          </header>

          <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#0f3a69] px-6 py-10 text-white shadow-[0_28px_90px_rgb(15_58_105_/_20%)] sm:px-10 lg:px-14 lg:py-14">
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-[#69e0d1] uppercase">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              {t.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">
              {t.intro}
            </p>
          </section>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
            <section className="rounded-[1.75rem] border border-[#0f3a69]/12 bg-white/80 p-6 shadow-[0_18px_60px_rgb(15_58_105_/_7%)] sm:p-8">
              <p className="text-xs font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                {t.role}
              </p>
              <div className="mt-3 rounded-2xl border-2 border-[#22b8a7] bg-[#e9fbf7] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0f3a69] font-mono text-sm font-bold text-white">
                    C++
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-[#08264a]">
                      {t.roleName}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#526276]">
                      {t.roleDetail}
                    </p>
                  </div>
                </div>
              </div>

              <fieldset className="mt-8">
                <legend className="text-xs font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                  {t.duration}
                </legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([30, 45, 60] as const).map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDuration(minutes)}
                      aria-pressed={duration === minutes}
                      className={`min-h-14 rounded-2xl border px-3 py-2 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#22b8a7] ${
                        duration === minutes
                          ? "border-[#0f3a69] bg-[#0f3a69] text-white"
                          : "border-[#0f3a69]/15 bg-white text-[#0f3a69] hover:border-[#22b8a7]"
                      }`}
                    >
                      {minutes} min
                      <span className="mt-0.5 block text-[11px] font-medium opacity-70">
                        {generalCppQuestionCounts[minutes]} {t.questions}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-8">
                <p className="text-xs font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                  {t.coverage}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {generalCppStandards.map((standard) => (
                    <div
                      key={standard}
                      className="rounded-xl border border-[#0f3a69]/10 bg-[#f5f8fb] px-3 py-3 text-center"
                    >
                      <strong className="block text-sm text-[#08264a]">
                        {standard.replace("cpp", "C++")}
                      </strong>
                      <span className="text-xs text-[#64748b]">
                        {props.coverage[standard]} {t.questions}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!props.publicationAvailable ? (
                <p className="mt-5 rounded-2xl border border-[#d8892d]/30 bg-[#fff6e8] px-4 py-3 text-sm leading-6 text-[#8a4b08]" role="status">
                  {t.bankUnavailable}
                </p>
              ) : null}
              {!bankReady ? (
                <p className="mt-5 rounded-2xl border border-[#e85d4a]/30 bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#a53024]" role="alert">
                  {t.bankInsufficient}
                </p>
              ) : null}
              {error ? (
                <p className="mt-5 rounded-2xl border border-[#e85d4a]/30 bg-[#fff0ed] px-4 py-3 text-sm text-[#a53024]" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!bankReady}
                onClick={startSession}
                className="mt-6 min-h-12 w-full rounded-2xl bg-[#22c7b5] px-5 py-3 text-sm font-extrabold text-[#08264a] shadow-[0_12px_30px_rgb(34_199_181_/_24%)] transition hover:bg-[#69e0d1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0f3a69] disabled:cursor-not-allowed disabled:bg-[#d7e2e8] disabled:text-[#6b7c8a] disabled:shadow-none"
              >
                {t.start}
              </button>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[1.75rem] border border-[#0f3a69]/12 bg-[#edf7f5] p-6">
                <h2 className="text-lg font-semibold text-[#08264a]">
                  {t.signInTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#526276]">
                  {t.signInBody}
                </p>
                {!props.account ? (
                  <Link
                    href="/auth?next=%2Fmock-interview"
                    className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-sm font-bold text-[#0f3a69] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#22b8a7]"
                  >
                    {t.signIn}
                  </Link>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-[#087d70]">
                    {props.account.displayName}
                  </p>
                )}
              </section>
              <HistoryPanel
                history={history}
                locale={props.locale}
                title={t.history}
                empty={t.noHistory}
                cloud={props.account && props.historyAvailable ? t.cloudHistory : t.localHistory}
                onOpen={setSelectedHistory}
              />
            </aside>
          </div>
        </div>
      </main>
    );
  }

  if (report) {
    return (
      <ReportView
        artifact={report}
        review={session.review ?? null}
        locale={props.locale}
        notice={notice}
        history={history}
        historyLabel={
          props.account && props.historyAvailable
            ? t.cloudHistory
            : t.localHistory
        }
        onNew={resetSession}
        onOpenHistory={setSelectedHistory}
      />
    );
  }

  const secondsLeft = Math.round(
    (new Date(session.deadlineAt).getTime() - now) / 1_000,
  );
  const answered = session.plan.questions.filter(
    (item) => session.answers[item.id]?.response.trim(),
  ).length;
  const reportErrorIsTerminal = errorCode
    ? terminalReportErrorCodes.has(errorCode)
    : false;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/10 pb-5">
          <BrandMark size="md" />
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1.5 font-mono text-xs font-bold ${secondsLeft >= 0 ? "bg-[#e9fbf7] text-[#087d70]" : "bg-[#fff0ed] text-[#b23c2e]"}`}>
              {secondsLeft >= 0 ? t.remaining : t.overtime}: {formatClock(Math.abs(secondsLeft))}
            </span>
            <LanguageSwitcher compact hideOnMock={false} />
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-[1.75rem] border border-[#0f3a69]/12 bg-white/85 p-5 shadow-[0_18px_60px_rgb(15_58_105_/_8%)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#0a897a] uppercase">
                  {t.sessionEyebrow}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#08264a] sm:text-3xl">
                  {t.question} {session.currentIndex + 1}/{session.plan.questions.length}
                </h1>
              </div>
              <span className="text-sm font-semibold text-[#64748b]">
                {answered}/{session.plan.questions.length}
              </span>
            </div>
            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-[#e4ebf0]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={session.plan.questions.length}
              aria-valuenow={session.currentIndex + 1}
              aria-label={`${t.question} ${session.currentIndex + 1}`}
            >
              <div
                className="h-full rounded-full bg-[#22b8a7] transition-[width]"
                style={{
                  width: `${((session.currentIndex + 1) / session.plan.questions.length) * 100}%`,
                }}
              />
            </div>

            {question ? (
              <div className="mt-8">
                <p className="text-xl leading-8 font-semibold text-[#08264a] sm:text-2xl sm:leading-9">
                  {question.prompt}
                </p>
                {question.code ? (
                  <pre className="mt-5 max-h-80 overflow-auto rounded-2xl bg-[#0b315c] p-5 text-sm leading-6 text-[#ecfeff]">
                    <code>{question.code}</code>
                  </pre>
                ) : null}
                <label htmlFor="mock-answer" className="mt-8 block text-sm font-bold text-[#0f3a69]">
                  {t.answer}
                </label>
                <textarea
                  id="mock-answer"
                  value={session.answers[question.id]?.response ?? ""}
                  onChange={(event) => updateAnswer(event.target.value)}
                  placeholder={t.placeholder}
                  className="mt-2 min-h-56 w-full resize-y rounded-2xl border border-[#0f3a69]/20 bg-[#fbfdff] px-4 py-4 text-base leading-7 text-[#10243f] outline-none transition placeholder:text-[#8b9aac] focus:border-[#22b8a7] focus:ring-4 focus:ring-[#22b8a7]/15"
                  maxLength={8_000}
                />
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-[#e85d4a]/30 bg-[#fff0ed] p-4" role="alert">
                <p className="text-sm leading-6 text-[#a53024]">{error}</p>
                {session.status === "evaluating" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!reportErrorIsTerminal ? (
                      <button type="button" onClick={() => void retryReport()} className="min-h-11 rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white">
                        {t.retry}
                      </button>
                    ) : null}
                    {errorCode === "ai_failed" ? (
                      <button type="button" onClick={editAfterFailure} className="min-h-11 rounded-xl border border-[#0f3a69]/20 bg-white px-4 py-2 text-sm font-bold text-[#0f3a69]">
                        {t.edit}
                      </button>
                    ) : null}
                    <button type="button" onClick={resetSession} className="min-h-11 rounded-xl border border-[#e85d4a]/30 bg-white px-4 py-2 text-sm font-bold text-[#a53024]">
                      {t.newSession}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {session.status === "evaluating" && !error ? (
              <div className="mt-5 rounded-2xl border border-[#22b8a7]/30 bg-[#e9fbf7] px-4 py-4 text-sm font-semibold text-[#087d70]" role="status" aria-live="polite">
                {t.evaluating}
              </div>
            ) : null}

            <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-[#0f3a69]/10 pt-5">
              <button
                type="button"
                disabled={session.currentIndex === 0 || session.status !== "in_progress"}
                onClick={() => moveTo(session.currentIndex - 1)}
                className="min-h-11 rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-sm font-bold text-[#0f3a69] disabled:opacity-40"
              >
                ← {t.previous}
              </button>
              {session.currentIndex < session.plan.questions.length - 1 ? (
                <button
                  type="button"
                  disabled={session.status !== "in_progress"}
                  onClick={() => moveTo(session.currentIndex + 1)}
                  className="min-h-11 rounded-xl bg-[#0f3a69] px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {t.next} →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={session.status !== "in_progress"}
                  onClick={() => void submitSession()}
                  className="min-h-11 rounded-xl bg-[#22c7b5] px-5 py-2 text-sm font-extrabold text-[#08264a] disabled:opacity-40"
                >
                  {t.submit}
                </button>
              )}
            </div>
          </section>

          <aside className="rounded-[1.5rem] border border-[#0f3a69]/12 bg-white/70 p-4 lg:sticky lg:top-6 lg:self-start">
            <p className="px-2 text-xs font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
              {t.question}
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-2">
              {session.plan.questions.map((item, index) => {
                const isAnswered = Boolean(session.answers[item.id]?.response.trim());
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={session.status !== "in_progress"}
                    onClick={() => moveTo(index)}
                    aria-current={index === session.currentIndex ? "step" : undefined}
                    aria-label={`${t.question} ${index + 1}${isAnswered ? " ✓" : ""}`}
                    className={`min-h-11 rounded-xl border text-sm font-bold ${index === session.currentIndex ? "border-[#0f3a69] bg-[#0f3a69] text-white" : isAnswered ? "border-[#22b8a7]/40 bg-[#e9fbf7] text-[#087d70]" : "border-[#0f3a69]/10 bg-[#f7f9fb] text-[#64748b]"}`}
                  >
                    {index + 1}{isAnswered ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReportView({
  artifact,
  review,
  locale,
  notice,
  history,
  historyLabel,
  onBack,
  onNew,
  onOpenHistory,
}: {
  artifact: GeneralCppCompletedArtifact;
  review: GeneralCppReviewSnapshot | null;
  locale: Locale;
  notice: string | null;
  history: GeneralCppHistorySummary[];
  historyLabel: string | null | false;
  onBack?: () => void;
  onNew: () => void;
  onOpenHistory: (detail: GeneralCppHistoryDetail) => void;
}) {
  const t = copy[locale];
  const report = artifact.report;
  const reviewByQuestionId = new Map(
    review?.items.map((item) => [item.questionId, item]) ?? [],
  );
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/10 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <BrandMark size="md" />
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="min-h-11 rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-sm font-bold text-[#0f3a69] transition hover:border-[#22b8a7] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#22b8a7]"
              >
                ← {t.backToHistory}
              </button>
            ) : null}
          </div>
          <LanguageSwitcher compact hideOnMock={false} />
        </header>
        <section className="mt-7 rounded-[2rem] bg-[#0f3a69] p-7 text-white shadow-[0_24px_80px_rgb(15_58_105_/_18%)] sm:p-10">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#69e0d1] uppercase">
            {onBack ? t.historyReportEyebrow : t.reportEyebrow}
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                {t.reportTitle}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-white/75">
                {report.summary}
              </p>
              <p className="mt-3 text-sm font-semibold text-white/60">
                {t.completedAt}: {formatDate(artifact.completedAt, locale)}
              </p>
            </div>
            <div className="min-w-40 rounded-2xl bg-white/10 px-5 py-4 text-center">
              <span className="text-xs font-bold tracking-[0.14em] text-white/60 uppercase">
                {t.overall}
              </span>
              <strong className="mt-1 block text-5xl text-[#69e0d1]">
                {report.overallScore}
              </strong>
              <span className="mt-1 block text-sm font-semibold">
                {readinessLabels[locale][report.readiness]}
              </span>
            </div>
          </div>
        </section>
        {notice ? (
          <p className="mt-5 rounded-2xl border border-[#22b8a7]/30 bg-[#e9fbf7] px-4 py-3 text-sm text-[#087d70]" role="status">
            {notice}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <ReportSection title={t.byStandard}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {report.standardScores.map((item) => (
                  <ScoreCard key={item.standard} label={item.standard.replace("cpp", "C++")} score={item.score} />
                ))}
              </div>
            </ReportSection>

            <ReportSection title={t.competencies}>
              <div className="grid gap-3 sm:grid-cols-2">
                {generalCppCompetencies.map((key) => {
                  const item = report.competencies[key];
                  return (
                    <article key={key} className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-[#08264a]">{competencyLabels[locale][key]}</h3>
                        <span className="rounded-full bg-[#e9fbf7] px-2.5 py-1 font-mono text-xs font-bold text-[#087d70]">
                          {item.score === null ? "—" : item.score}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#526276]">{item.summary}</p>
                    </article>
                  );
                })}
              </div>
            </ReportSection>

            <ReportSection title={t.dimensions}>
              <div className="space-y-3">
                {report.interviewDimensions.map((item) => (
                  <div key={item.key} className="grid gap-2 rounded-2xl border border-[#0f3a69]/10 p-4 sm:grid-cols-[12rem_3rem_minmax(0,1fr)] sm:items-start">
                    <strong className="text-sm text-[#08264a]">{dimensionLabels[locale][item.key]}</strong>
                    <span className="font-mono text-sm font-bold text-[#087d70]">{item.score ?? "—"}</span>
                    <p className="text-sm leading-6 text-[#526276]">{item.summary}</p>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection title={t.questionFeedback}>
              {!review ? (
                <p className="mb-4 rounded-2xl border border-[#d8892d]/25 bg-[#fff8eb] px-4 py-3 text-sm leading-6 text-[#7b4a12]" role="note">
                  {t.snapshotUnavailable}
                </p>
              ) : null}
              <div className="space-y-4">
                {report.questionAssessments.map((item, index) => {
                  const reviewItem = reviewByQuestionId.get(item.questionId);
                  return (
                    <article key={item.questionId} className="rounded-2xl border border-[#0f3a69]/10 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold text-[#08264a]">{t.question} {index + 1}</h3>
                        <span className="rounded-full bg-[#0f3a69] px-3 py-1 font-mono text-xs font-bold text-white">{item.score}/100</span>
                      </div>
                      {reviewItem ? (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs font-bold text-[#087d70]">
                            <span>{reviewItem.standard.replace("cpp", "C++")}</span>
                            <span>{t.timeSpent}: {formatClock(reviewItem.elapsedSeconds)}</span>
                          </div>
                          <p className="mt-3 text-base leading-7 font-semibold text-[#08264a]">
                            {reviewItem.prompt}
                          </p>
                          {reviewItem.code ? (
                            <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-[#0b315c] p-4 text-sm leading-6 text-[#ecfeff]">
                              <code>{reviewItem.code}</code>
                            </pre>
                          ) : null}
                          <SubmittedAnswer
                            label={t.submittedAnswer}
                            response={reviewItem.response}
                            empty={t.blankSubmittedAnswer}
                          />
                        </div>
                      ) : null}
                      <div className="mt-4 border-t border-[#0f3a69]/10 pt-4">
                        <p className="text-sm leading-6 text-[#526276]">{item.summary}</p>
                        {item.strengths.length ? (
                          <div className="mt-3">
                            <p className="text-xs font-bold tracking-[0.1em] text-[#087d70] uppercase">{t.positiveFeedback}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#35645d]">
                              {item.strengths.map((strength) => <li key={strength}>{strength}</li>)}
                            </ul>
                          </div>
                        ) : null}
                        {item.missedCriteria.length ? (
                          <div className="mt-3">
                            <p className="text-xs font-bold tracking-[0.1em] text-[#9a5816] uppercase">{t.improvementFeedback}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#7b3f15]">
                              {item.missedCriteria.map((gap) => <li key={gap}>{gap}</li>)}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </ReportSection>
          </div>

          <aside className="space-y-6">
            <ReportList title={t.strengths} items={report.strengths} tone="green" />
            <ReportList title={t.gaps} items={report.priorityGaps} tone="amber" />
            <section className="rounded-[1.5rem] border border-[#0f3a69]/12 bg-white/80 p-5">
              <h2 className="text-lg font-semibold text-[#08264a]">{t.actions}</h2>
              <ol className="mt-4 space-y-4">
                {report.nextActions.map((action) => (
                  <li key={action.priority} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#22b8a7] text-sm font-bold text-[#08264a]">{action.priority}</span>
                    <div>
                      <strong className="text-sm text-[#08264a]">{action.title}</strong>
                      <p className="mt-1 text-sm leading-6 text-[#526276]">{action.action}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <button type="button" onClick={onNew} className="min-h-12 w-full rounded-2xl bg-[#22c7b5] px-5 py-3 text-sm font-extrabold text-[#08264a]">
              {t.newSession}
            </button>
            <HistoryPanel
              history={history}
              locale={locale}
              title={t.history}
              empty={t.noHistory}
              cloud={historyLabel}
              onOpen={onOpenHistory}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-[#0f3a69]/12 bg-white/80 p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-[#08264a]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-2xl bg-[#edf7f5] px-3 py-4 text-center">
      <span className="block text-xs font-bold text-[#526276]">{label}</span>
      <strong className="mt-1 block text-2xl text-[#087d70]">{score}</strong>
    </div>
  );
}

function ReportList({ title, items, tone }: { title: string; items: string[]; tone: "green" | "amber" }) {
  return (
    <section className={`rounded-[1.5rem] border p-5 ${tone === "green" ? "border-[#22b8a7]/25 bg-[#edf9f6]" : "border-[#d8892d]/25 bg-[#fff8eb]"}`}>
      <h2 className="text-lg font-semibold text-[#08264a]">{title}</h2>
      {items.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#526276]">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export function SubmittedAnswer({
  label,
  response,
  empty,
}: {
  label: string;
  response: string;
  empty: string;
}) {
  const hasResponse = Boolean(response.trim());
  return (
    <div className="mt-4 rounded-2xl bg-[#f5f8fb] p-4">
      <p className="text-xs font-bold tracking-[0.12em] text-[#64748b] uppercase">
        {label}
      </p>
      <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${hasResponse ? "text-[#10243f]" : "italic text-[#7b8797]"}`}>
        {hasResponse ? response : empty}
      </p>
    </div>
  );
}

export function HistoryPanel({
  history,
  locale,
  title,
  empty,
  cloud,
  onOpen,
}: {
  history: GeneralCppHistorySummary[];
  locale: Locale;
  title: string;
  empty: string;
  cloud: string | null | false;
  onOpen: (detail: GeneralCppHistoryDetail) => void;
}) {
  const viewLabel = copy[locale].viewReport;
  return (
    <section className="rounded-[1.5rem] border border-[#0f3a69]/12 bg-white/75 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-[#08264a]">{title}</h2>
        {cloud ? <span className="text-[11px] leading-4 text-[#64748b]">{cloud}</span> : null}
      </div>
      {history.length ? (
        <ol className="mt-4 space-y-3">
          {history.slice(0, 5).map((item) => (
            <li key={`${item.attemptId}:${item.sessionId}`}>
              <button
                type="button"
                onClick={() => onOpen(item.detail)}
                aria-label={`${viewLabel}: ${item.overallScore}/100, ${formatDate(item.completedAt, locale)}`}
                className="group min-h-16 w-full rounded-xl bg-[#f5f8fb] p-3 text-left transition hover:bg-[#eaf4f3] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#22b8a7]"
              >
                <span className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-[#08264a]">{item.overallScore}/100</strong>
                  <span className="text-xs text-[#64748b]">{item.durationMinutes} min</span>
                </span>
                <span className="mt-1 flex items-end justify-between gap-3">
                  <span className="text-xs text-[#64748b]">{formatDate(item.completedAt, locale)}</span>
                  <span className="text-xs font-bold text-[#087d70] group-hover:underline">{viewLabel} →</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#64748b]">{empty}</p>
      )}
    </section>
  );
}

function mergeHistory(
  local: readonly GeneralCppHistoryDetail[],
  cloud: readonly GeneralCppHistorySummary[],
) {
  const localSummaries = local.map((detail): GeneralCppHistorySummary => {
    const artifact = detail.artifact;
    return {
      attemptId: `local-${artifact.sessionId}`,
      sessionId: artifact.sessionId,
      completedAt: artifact.completedAt,
      durationMinutes: artifact.plan.durationMinutes,
      overallScore: artifact.report.overallScore,
      readiness: artifact.report.readiness,
      standardScores: artifact.report.standardScores,
      detail,
    };
  });
  const merged = new Map<string, GeneralCppHistorySummary>();
  [...localSummaries, ...cloud]
    .sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    )
    .forEach((item) => {
      const existing = merged.get(item.sessionId);
      if (!existing || (!existing.detail.review && item.detail.review)) {
        merged.set(item.sessionId, item);
      }
    });
  return [...merged.values()];
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readClock() {
  return Date.now();
}
