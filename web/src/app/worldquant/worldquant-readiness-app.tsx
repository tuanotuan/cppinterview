"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  mockInterviewSessionMatchesAccount,
  mockInterviewStorageKey,
  parseMockInterviewSessionV4,
} from "@/lib/mock-interview/session-v4";
import {
  mockInterviewCompletedArtifactV4Schema,
  type MockInterviewCompletedArtifactV4,
} from "@/lib/mock-interview/contracts-v4";
import { PRACTICE_DECKS } from "@/lib/content/decks";
import type { EvidenceProjection } from "@/lib/evidence/engine";
import {
  buildWorldQuantMockTrends,
  type MockInterviewHistoryEntry,
  type MockInterviewTrendDuration,
} from "@/lib/mock-interview/trends";
import type { PracticeAccount } from "@/lib/practice/cloud-server";
import {
  buildAnkiDailyQueue,
  buildLearningStates,
  filterReviewsForLearningHistory,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
import {
  EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
  readFocusSessionSnapshot,
  subscribeToFocusSession,
} from "@/lib/practice/focus-session";
import {
  addDays,
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
  buildWorldQuantFocusPlan,
  type FocusQueueReason,
  type WorldQuantFocusPlan,
} from "@/lib/worldquant/focus-plan";
import { WORLDQUANT_DRILL_CATALOG_VERSION } from "@/lib/worldquant/drills";
import {
  completeWorldQuantGuidedOnboarding,
  normalizeWorldQuantMissionMinutes,
  parseWorldQuantGuidedModeState,
  serializeWorldQuantGuidedModeState,
  withWorldQuantMissionReturn,
  worldQuantGuidedMissionHref,
  worldQuantGuidedModeStorageKey,
} from "@/lib/worldquant/guided-mode";
import {
  EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT,
  readWorldQuantHubPreferencesSnapshot,
  subscribeToWorldQuantHubPreferences,
  writeWorldQuantHubPreferencesSnapshot,
} from "@/lib/worldquant/hub-preferences";
import { buildWorldQuantMockRemediation } from "@/lib/worldquant/mock-remediation";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import { openOrReconcileGapFromMock } from "@/lib/worldquant/gap-closure";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
  gapForCompetency,
  readWorldQuantTrainingState,
  syncWorldQuantTrainingStateToCloud,
  subscribeToWorldQuantTrainingState,
  writeWorldQuantTrainingStateLocked,
  type WorldQuantTrainingState,
} from "@/lib/worldquant/training-state";
import {
  buildWorldQuantReadiness,
  DEFAULT_WORLDQUANT_ROLE_PROFILE_ID,
  isValidReadinessDateKey,
  parseWorldQuantRoleProfile,
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfiles,
  type CompetencyReadiness,
  type ReadinessHeadlineStatus,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

import {
  prepareFocusSprint,
  prepareFocusSprintResume,
  restoreMatchingFocusSession,
} from "./focus-sprint";

const GUIDED_MODE_CHANGED_EVENT = "recall:worldquant-guided-changed";
const EMPTY_STORAGE_SNAPSHOT = "__empty__";
const GUIDED_MISSION_MINUTE_OPTIONS = [
  15, 30, 45, 60, 75, 90, 105, 120,
] as const;

type HubPreferences = {
  roleId: WorldQuantRoleProfileId;
  targetDate: string;
  minutesPerDay: number;
};

type FocusFeedback = {
  competency: WorldQuantCompetencyKey | null;
  message: string;
};

const headlineLabels: Record<ReadinessHeadlineStatus, string> = {
  limited_evidence: "Chưa đủ bằng chứng",
  foundation: "Đang xây nền",
  building: "Đang tăng tốc",
  mock_ready: "Sẵn sàng phỏng vấn thử",
  well_rehearsed: "Đã luyện vững",
};

const competencyStatusLabels = {
  no_evidence: "Chưa có học liệu",
  starting: "Mới bắt đầu",
  developing: "Đang phát triển",
  practiced: "Đã luyện",
  strong: "Vững",
} as const;

export function WorldQuantReadinessApp({
  questions,
  pendingReviewCounts,
  initialCloudProgress,
  initialQuestionStates,
  account,
  cloudEnabled,
  cloudError,
  today,
  initialMockHistory,
  initialEvidenceProjection,
  mockHistoryAvailable,
  initialRoleId,
}: {
  questions: ReadinessQuestionSummary[];
  pendingReviewCounts: Partial<Record<WorldQuantCompetencyKey, number>>;
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  account: PracticeAccount | null;
  cloudEnabled: boolean;
  cloudError: boolean;
  today: string;
  initialMockHistory: MockInterviewHistoryEntry[];
  initialEvidenceProjection: EvidenceProjection;
  mockHistoryAvailable: boolean;
  initialRoleId: WorldQuantRoleProfileId | null;
}) {
  useEffect(() => {
    void syncWorldQuantTrainingStateToCloud(account?.id ?? null);
  }, [account?.id]);
  const accountId = account?.id ?? null;
  const subscribeToScopedProgress = useMemo(
    () => (callback: () => void) =>
      subscribeToPracticeProgress(accountId, callback),
    [accountId],
  );
  const readScopedProgress = useMemo(
    () => () => readPracticeProgressSnapshot(accountId),
    [accountId],
  );
  const subscribeToScopedHubPreferences = useMemo(
    () => (callback: () => void) =>
      subscribeToWorldQuantHubPreferences(accountId, callback),
    [accountId],
  );
  const readScopedHubPreferences = useMemo(
    () => () => readWorldQuantHubPreferencesSnapshot(accountId),
    [accountId],
  );
  const subscribeToScopedFocusSession = useMemo(
    () => (callback: () => void) =>
      subscribeToFocusSession(accountId, callback),
    [accountId],
  );
  const readScopedFocusSession = useMemo(
    () => () => readFocusSessionSnapshot(accountId),
    [accountId],
  );
  const [focusFeedback, setFocusFeedback] =
    useState<FocusFeedback | null>(null);
  const [guideOverrideOpen, setGuideOverrideOpen] = useState(false);
  const [guidedStorageError, setGuidedStorageError] =
    useState<string | null>(null);
  const [routeRoleId, setRouteRoleId] =
    useState<WorldQuantRoleProfileId | null>(initialRoleId);
  const [trainingState, setTrainingState] =
    useState<WorldQuantTrainingState>(
      EMPTY_WORLDQUANT_TRAINING_STATE,
    );
  const hasHistoricalDrillEvidence =
    trainingState.attempts.some(
      (attempt) =>
        attempt.drillVersion !== WORLDQUANT_DRILL_CATALOG_VERSION,
    ) ||
    trainingState.checkpointExposures.some(
      (exposure) =>
        exposure.drillVersion !== WORLDQUANT_DRILL_CATALOG_VERSION,
    ) ||
    trainingState.fullRounds.some((summary) =>
      summary.completedRounds.some(
        (round) =>
          round.drillVersion !== WORLDQUANT_DRILL_CATALOG_VERSION,
      ),
    );
  const progressSnapshot = useSyncExternalStore(
    subscribeToScopedProgress,
    readScopedProgress,
    () => null,
  );
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToScopedHubPreferences,
    readScopedHubPreferences,
    () => null,
  );
  const guidedModeStorageKey = worldQuantGuidedModeStorageKey(
    accountId,
  );
  const subscribeToGuidedModeSnapshot = useMemo(
    () => (callback: () => void) =>
      subscribeToGuidedMode(guidedModeStorageKey, callback),
    [guidedModeStorageKey],
  );
  const readGuidedModeSnapshot = useMemo(
    () => () => readStorageKey(guidedModeStorageKey),
    [guidedModeStorageKey],
  );
  const guidedModeSnapshot = useSyncExternalStore(
    subscribeToGuidedModeSnapshot,
    readGuidedModeSnapshot,
    () => null,
  );
  const v4MockStorageKey = account
    ? mockInterviewStorageKey(account.id)
    : null;
  const subscribeToV4Mock = useMemo(
    () => (callback: () => void) =>
      subscribeToStorageKey(v4MockStorageKey, callback),
    [v4MockStorageKey],
  );
  const readV4Mock = useMemo(
    () => () => readStorageKey(v4MockStorageKey),
    [v4MockStorageKey],
  );
  const v4MockSnapshot = useSyncExternalStore(
    subscribeToV4Mock,
    readV4Mock,
    () => null,
  );
  const focusSessionSnapshot = useSyncExternalStore(
    subscribeToScopedFocusSession,
    readScopedFocusSession,
    () => null,
  );
  const preferences = useMemo(() => {
    const stored = parseHubPreferences(preferencesSnapshot, today);
    return routeRoleId
      ? { ...stored, roleId: routeRoleId }
      : stored;
  }, [preferencesSnapshot, routeRoleId, today]);
  const guidedMode = useMemo(
    () => parseWorldQuantGuidedModeState(guidedModeSnapshot),
    [guidedModeSnapshot],
  );
  const profile = worldQuantRoleProfileById(preferences.roleId);
  const roleQuestions = useMemo(
    () =>
      questions.filter(
        (question) => profile.weights[question.competency] > 0,
      ),
    [profile, questions],
  );
  const mergedProgress = useMemo(() => {
    const local = parseProgress(
      progressSnapshot === null ||
        progressSnapshot === EMPTY_PROGRESS_STORAGE_SNAPSHOT
        ? null
        : progressSnapshot,
    );
    const merged = mergeProgress(initialCloudProgress, local);
    return {
      ...merged,
      reviews: filterReviewsForLearningHistory(
        merged.reviews,
        initialQuestionStates,
      ),
    };
  }, [initialCloudProgress, initialQuestionStates, progressSnapshot]);
  const learningStates = useMemo(
    () =>
      buildLearningStates(
        questions.map((question) => ({
          id: question.id,
          version: question.version,
          sourceHash: question.sourceHash,
        })),
        mergedProgress.reviews,
        initialQuestionStates,
      ),
    [initialQuestionStates, mergedProgress.reviews, questions],
  );
  const readiness = useMemo(
    () =>
      buildWorldQuantReadiness({
        profileId: preferences.roleId,
        questions,
        states: learningStates,
        today,
        attemptEvidence: initialEvidenceProjection,
      }),
    [initialEvidenceProjection, learningStates, preferences.roleId, questions, today],
  );
  const focusPlan = useMemo(
    () =>
      buildWorldQuantFocusPlan({
        profileId: preferences.roleId,
        questions,
        states: learningStates,
        today,
        timeBudgetMinutes: preferences.minutesPerDay,
        attemptEvidence: initialEvidenceProjection,
      }),
    [
      initialEvidenceProjection,
      learningStates,
      preferences.minutesPerDay,
      preferences.roleId,
      questions,
      today,
    ],
  );
  const activeFocusSession = useMemo(
    () =>
      restoreMatchingFocusSession({
        raw:
          focusSessionSnapshot === null ||
          focusSessionSnapshot ===
            EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT
            ? null
            : focusSessionSnapshot,
        accountId,
        profileId: preferences.roleId,
        questions,
      }),
    [accountId, focusSessionSnapshot, preferences.roleId, questions],
  );
  const dailyQueue = useMemo(
    () => {
      const roleQuestionIds = new Set(
        roleQuestions.map((question) => question.id),
      );
      const roleLearningStates = new Map(
        [...learningStates].filter(([questionId]) =>
          roleQuestionIds.has(questionId),
        ),
      );
      return buildAnkiDailyQueue(roleLearningStates, today, {
        newLimit: 1,
        reviewLimit: 5,
      })
        .map((questionId) =>
          roleQuestions.find((question) => question.id === questionId),
        )
        .filter(
          (question): question is ReadinessQuestionSummary =>
            Boolean(question),
        );
    },
    [learningStates, roleQuestions, today],
  );
  const activeCompetencies = readiness.competencies
    .filter((competency) => competency.weight > 0)
    .sort(
      (left, right) =>
        right.weight - left.weight || left.key.localeCompare(right.key),
    );
  const targetPlan = buildTargetPlan({
    today,
    targetDate: preferences.targetDate,
    minutesPerDay: preferences.minutesPerDay,
    readiness,
  });
  const parsedV4Mock =
    v4MockSnapshot &&
    v4MockSnapshot !== EMPTY_STORAGE_SNAPSHOT
      ? parseMockInterviewSessionV4(v4MockSnapshot)
      : null;
  const activeV4Mock =
    parsedV4Mock &&
    account &&
    mockInterviewSessionMatchesAccount(parsedV4Mock, account.id)
      ? parsedV4Mock
      : null;
  const roleMockHistory = useMemo(
    () =>
      initialMockHistory
        .filter(
          (entry) =>
            entry.status === "completed" &&
            entry.roleProfileId === preferences.roleId &&
            entry.completedAt !== null,
        )
        .sort(compareMockHistoryNewestFirst),
    [initialMockHistory, preferences.roleId],
  );
  const latestV4Mock = roleMockHistory[0] ?? null;
  const latestV4Artifact =
    latestV4Mock?.report as MockInterviewCompletedArtifactV4 | undefined;
  const latestV4Duration =
    latestV4Mock?.durationMinutes as
      | MockInterviewTrendDuration
      | undefined;
  const mockTrends = useMemo(
    () =>
      buildWorldQuantMockTrends({
        entries: initialMockHistory,
        roleProfileId: preferences.roleId,
        durationMinutes: latestV4Duration ?? null,
      }),
    [
      initialMockHistory,
      latestV4Duration,
      preferences.roleId,
    ],
  );
  const assessedMockTrends = worldQuantCompetencyKeys
    .map((key) => ({ key, ...mockTrends.competencies[key] }))
    .filter((trend) => trend.count > 0);
  const latestMockRemediation = latestV4Artifact
    ? buildWorldQuantMockRemediation({
        debrief: latestV4Artifact.debrief,
        approvedQuestions: questions,
        states: learningStates,
        today,
        timeBudgetMinutes: preferences.minutesPerDay,
      })
    : null;
  const balancedMockHref = mockInterviewHref({
    roleId: preferences.roleId,
    mode: "balanced",
  });
  const guidedMissionMinutes = normalizeWorldQuantMissionMinutes(
    preferences.minutesPerDay,
  );
  const todayMissionHref = worldQuantGuidedMissionHref(
    preferences.roleId,
    guidedMissionMinutes,
  );
  const showGuidedOnboarding =
    guidedModeSnapshot !== null &&
    (guidedMode.onboardingCompletedAt === null || guideOverrideOpen);

  useEffect(() => {
    const refresh = async () => {
      const current = readWorldQuantTrainingState(accountId);
      let reconciled = current;
      for (const entry of initialMockHistory) {
        if (
          entry.status !== "completed" ||
          !entry.completedAt ||
          entry.roleProfileId !== preferences.roleId
        ) {
          continue;
        }
        const report =
          mockInterviewCompletedArtifactV4Schema.safeParse(
            entry.report,
          );
        if (!report.success) continue;
        for (const competency of report.data.debrief.competencies) {
          reconciled = openOrReconcileGapFromMock(reconciled, {
            attemptId: entry.attemptId,
            completedAt: entry.completedAt,
            roleProfileId: entry.roleProfileId,
            roleProfileVersion: report.data.profileVersion,
            competency: competency.competency,
            status: competency.status,
            score: competency.score,
            // Mock v4 can repeat a deterministic blueprint, so it may open a
            // gap but cannot claim unseen verification by itself.
            unseen: false,
          });
        }
      }
      if (JSON.stringify(reconciled) !== JSON.stringify(current)) {
        const persisted = await writeWorldQuantTrainingStateLocked(
          accountId,
          reconciled,
        ).catch(() => null);
        setTrainingState(persisted ?? current);
        return;
      }
      setTrainingState(reconciled);
    };
    void refresh();
    return subscribeToWorldQuantTrainingState(
      accountId,
      () => void refresh(),
    );
  }, [accountId, initialMockHistory, preferences.roleId]);

  function updatePreferences(next: Partial<HubPreferences>) {
    if (next.roleId) {
      setRouteRoleId(next.roleId);
      const url = new URL(window.location.href);
      url.searchParams.set("role", next.roleId);
      window.history.replaceState(null, "", url);
    }
    writeWorldQuantHubPreferencesSnapshot(
      accountId,
      JSON.stringify({ ...preferences, ...next }),
    );
  }

  function startFocusSprint(
    selectedPlan: WorldQuantFocusPlan,
    competency: WorldQuantCompetencyKey | null = null,
  ) {
    setFocusFeedback(null);
    const destination = prepareFocusSprint(selectedPlan, {
      accountId,
    });
    if (
      destination.kind === "practice" ||
      destination.kind === "guide"
    ) {
      window.location.assign(destination.href);
      return;
    }
    setFocusFeedback({ competency, message: destination.message });
  }

  async function resumeFocusSprint() {
    if (!activeFocusSession) return;
    setFocusFeedback(null);
    const destination = await prepareFocusSprintResume(
      activeFocusSession,
      { accountId },
    );
    if (destination.kind === "practice") {
      window.location.assign(
        withWorldQuantMissionReturn(
          destination.href,
          preferences.roleId,
          preferences.minutesPerDay,
        ),
      );
      return;
    }
    if (
      destination.kind === "storage_error" ||
      destination.kind === "unavailable"
    ) {
      setFocusFeedback({ competency: null, message: destination.message });
    }
  }

  function dismissGuidedOnboarding() {
    const persisted = writeGuidedModeState(
      guidedModeStorageKey,
      completeWorldQuantGuidedOnboarding(),
    );
    if (!persisted) {
      setGuidedStorageError(
        "Không lưu được trạng thái hướng dẫn; phần giới thiệu sẽ hiện lại sau khi tải trang.",
      );
      return;
    }
    setGuidedStorageError(null);
    setGuideOverrideOpen(false);
  }

  function openGuidedOnboarding() {
    setGuideOverrideOpen(true);
    window.requestAnimationFrame(() => {
      const heading = document.getElementById("guided-onboarding-title");
      heading?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      heading?.focus({ preventScroll: true });
    });
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto w-full min-w-0 max-w-[1440px]">
        <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex min-w-0 items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
              WQ
            </span>
            <span>
              <span className="block font-bold">
                Trung tâm chuẩn bị WorldQuant
              </span>
              <span className="block text-xs text-[#526276]">
                Lộ trình C++ WorldQuant
              </span>
            </span>
          </Link>
          <nav
            className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
            aria-label="Điều hướng WorldQuant"
          >
            <Link
              href={todayMissionHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16865a] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              Hôm nay
            </Link>
            <HeaderLink href="/">Luyện thẻ</HeaderLink>
            <button
              type="button"
              onClick={openGuidedOnboarding}
              className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-white/60 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              Cách dùng
            </button>
            <details className="group relative w-full sm:w-auto">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-[#0f3a69]/12 bg-white/65 px-4 py-2 text-sm font-bold transition hover:border-[#285f86]/35 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none sm:justify-start [&::-webkit-details-marker]:hidden">
                Nâng cao
                <span
                  aria-hidden="true"
                  className="transition group-open:rotate-180"
                >
                  ↓
                </span>
              </summary>
              <div className="mt-2 grid w-full grid-cols-1 gap-1 rounded-2xl border border-[#0f3a69]/12 bg-[#f8fafc] p-2 shadow-[0_18px_60px_rgb(15_58_105_/_12%)] sm:absolute sm:right-0 sm:z-30 sm:w-80 sm:grid-cols-2">
                <AdvancedLink href="/learn">
                  Thư viện bài học
                </AdvancedLink>
                <AdvancedLink
                  href={worldQuantRoleHref(
                    "/worldquant/curriculum",
                    preferences.roleId,
                  )}
                >
                  Lộ trình kiến thức
                </AdvancedLink>
                <AdvancedLink
                  href={worldQuantRoleHref(
                    "/worldquant/drills",
                    preferences.roleId,
                  )}
                >
                  Phòng luyện tình huống
                </AdvancedLink>
                <AdvancedLink
                  href={worldQuantRoleHref(
                    "/worldquant/full-round",
                    preferences.roleId,
                  )}
                >
                  Buổi mô phỏng phỏng vấn đầy đủ
                </AdvancedLink>
                <AdvancedLink
                  href={worldQuantRoleHref(
                    "/mock-interview",
                    preferences.roleId,
                  )}
                >
                  Phỏng vấn thử
                </AdvancedLink>
                <AdvancedLink href="/learn/tick-data-order-book">
                  Học dữ liệu tick
                </AdvancedLink>
                <AdvancedLink href="/worldquant/tick-replay-lab">
                  Tick Replay Lab
                </AdvancedLink>
                <AdvancedLink href="/worldquant/legacy-modern-capstone">
                  Legacy → Modern C++ Capstone
                </AdvancedLink>
                <AdvancedLink href="/stats">Thống kê</AdvancedLink>
                {account ? (
                  <AdvancedLink href="/admin">
                    Duyệt câu hỏi
                  </AdvancedLink>
                ) : null}
              </div>
            </details>
            {account ? (
              <span
                title={`@${account.login ?? account.displayName}`}
                className="max-w-full min-w-0 truncate rounded-full border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-xs font-semibold"
              >
                @{account.login ?? account.displayName}
              </span>
            ) : (
              <span className="rounded-full border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
                Dùng trên thiết bị
              </span>
            )}
          </nav>
        </header>

        {cloudError ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
          >
            Dịch vụ đồng bộ đang lỗi nên hệ thống tạm dùng dữ liệu trong trình
            duyệt. Không có tiến độ nào bị ghi đè.
          </p>
        ) : null}

        {hasHistoricalDrillEvidence ? (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-[#9d6b16]/20 bg-[#fff4d8] px-4 py-3 text-sm leading-6 text-[#6d4b13]"
          >
            Nội dung bài luyện đã được viết lại cho rõ hơn. Lịch sử cũ vẫn
            được giữ, nhưng bài kiểm tra xác nhận phải dùng phiên bản hiện tại
            nên một số năng lực có thể cần được xác nhận lại.
          </p>
        ) : null}

        <section
          aria-labelledby="guided-session-title"
          className="mt-6 w-full min-w-0 max-w-full rounded-[1.25rem] border border-[#0f3a69]/12 bg-[#0f3a69] p-5 text-white shadow-[0_24px_80px_rgb(15_58_105_/_16%)] sm:p-8"
        >
          <div className="grid min-w-0 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-7">
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
                Chế độ hướng dẫn · {today}
              </p>
              <h1
                id="guided-session-title"
                className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-4xl"
              >
                Chỉ cần bắt đầu, nhiệm vụ sẽ chọn đúng việc tiếp theo.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
                {profile.label} · hệ thống tự xếp ôn lại → thẻ ghi nhớ → bài
                luyện theo kết quả hiện tại. Bạn không cần tự chọn công cụ.
              </p>
              <div className="mt-5 hidden flex-wrap gap-2 text-xs sm:flex">
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {dailyQueue.length} thẻ trong danh sách
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Điểm cần ưu tiên cải thiện:{" "}
                  {
                    worldQuantCompetencies[
                      readiness.priorityCompetencies[0] ??
                        profile.coreCompetencies[0] ??
                        "modern_cpp"
                    ].shortLabel
                  }
                </span>
              </div>
            </div>
            <div className="w-full min-w-0 max-w-full rounded-2xl bg-white/10 p-4 lg:w-80">
              <label className="block text-xs font-bold text-white/72">
                Thời gian hôm nay
                <select
                  value={guidedMissionMinutes}
                  onChange={(event) =>
                    updatePreferences({
                      minutesPerDay: Number(event.target.value),
                    })
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#244a40] px-3 py-2 font-bold text-white focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                >
                  {GUIDED_MISSION_MINUTE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} phút
                    </option>
                  ))}
                </select>
              </label>
              {activeFocusSession ? (
                <button
                  type="button"
                  onClick={resumeFocusSprint}
                  className="mt-3 min-h-12 w-full rounded-xl bg-[#65e6d2] px-5 py-3 text-sm font-bold text-[#0f3a69] transition hover:bg-[#8eebdc] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
                >
                  Tiếp tục phiên ôn thẻ đang làm
                </button>
              ) : (
                <Link
                  href={todayMissionHref}
                  className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#65e6d2] px-5 py-3 text-center text-sm font-bold text-[#0f3a69] transition hover:bg-[#8eebdc] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
                >
                  Bắt đầu buổi học hôm nay
                </Link>
              )}
              {activeFocusSession ? (
                <Link
                  href={todayMissionHref}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-white/18 px-4 py-2 text-center text-xs font-bold text-white"
                >
                  Xem toàn bộ nhiệm vụ
                </Link>
              ) : null}
              <p className="mt-3 text-center text-[11px] leading-5 text-white/52">
                Khi tải lại, hệ thống vẫn khôi phục đúng ngày, vị trí và thời
                lượng này.
              </p>
            </div>
          </div>
          {focusFeedback?.competency === null ? (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-[#a65c0e]/30 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
            >
              {focusFeedback.message}
            </p>
          ) : null}
        </section>

        {showGuidedOnboarding ? (
          <section
            id="cach-dung"
            aria-labelledby="guided-onboarding-title"
            className="mt-5 rounded-[1.25rem] border border-[#285f86]/18 bg-[#eaf2f8] p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
                  Bắt đầu tại đây · 3 bước
                </p>
                <h2
                  id="guided-onboarding-title"
                  tabIndex={-1}
                  className="mt-2 text-2xl font-semibold tracking-tight"
                >
                  Cách dùng cppinterview mỗi ngày
                </h2>
              </div>
              <button
                type="button"
                onClick={dismissGuidedOnboarding}
                className="min-h-11 rounded-xl border border-[#0f3a69]/15 bg-white/70 px-4 py-2 text-sm font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
              >
                Đã hiểu
              </button>
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              <GuidedStep
                number={1}
                title="Mở nhiệm vụ"
                description="Chọn vị trí và số phút, rồi bấm nút bắt đầu ở trên."
              />
              <GuidedStep
                number={2}
                title="Làm đúng bước tiếp theo"
                description="Nhiệm vụ tự chuyển từ sửa lỗi sang thẻ và bài vận dụng."
              />
              <GuidedStep
                number={3}
                title="Quay lại nhiệm vụ"
                description="Xong phiên ôn tập, bài luyện hoặc phỏng vấn thử sẽ có nút về đúng kế hoạch cũ."
              />
            </ol>
            {guidedStorageError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
              >
                {guidedStorageError}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="grid w-full min-w-0 max-w-full grid-cols-1 gap-7 py-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-stretch">
          <div className="w-full min-w-0 max-w-full rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/65 p-6 shadow-[0_24px_80px_rgb(15_58_105_/_8%)] sm:p-9">
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              Trung tâm chuẩn bị WorldQuant
            </p>
            <h2 className="mt-4 max-w-3xl break-words text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Biết chính xác nên học gì tiếp theo.
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-[#526276]">
              Chọn vị trí mục tiêu, rồi hệ thống ghép kho câu hỏi đã kiểm chứng
              với lịch sử ôn thực tế của bạn. Mức bao phủ thấp nghĩa là học
              liệu còn thiếu; tiến độ thấp mới là phần cần luyện.
            </p>

            <label className="mt-7 block max-w-xl">
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#526276] uppercase">
                Vị trí mục tiêu
              </span>
              <select
                value={preferences.roleId}
                onChange={(event) =>
                  updatePreferences({
                    roleId: parseWorldQuantRoleProfile(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-[#0f3a69]/15 bg-[#f8fafc] px-3 py-3 text-sm font-bold focus-visible:border-[#285f86] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none sm:px-4 sm:text-base"
              >
                {worldQuantRoleProfiles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 max-w-3xl rounded-2xl bg-[#eaf2f8] p-5">
              <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#285f86] uppercase">
                {profile.eyebrow}
              </p>
              <p className="mt-2 font-semibold">{profile.summary}</p>
            </div>
            <p className="mt-5 max-w-3xl text-xs leading-5 text-[#526276]">
              Đây là lộ trình được xây từ mô tả công việc bạn cung cấp và các
              chủ đề công khai, không phải tiêu chí tuyển dụng nội bộ hay dự
              đoán khả năng trúng tuyển WorldQuant.
            </p>
          </div>

          <ScoreCard
            preparationIndex={readiness.preparationIndex}
            coveragePercent={readiness.coveragePercent}
            status={readiness.status}
            verifiedCount={readiness.repositoryVerifiedCount}
            approvedCount={readiness.ownerApprovedCount}
          />
        </section>

        <details className="group mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/45 p-3 sm:p-4">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-white/65 px-4 py-3 font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>
              Phân tích và công cụ nâng cao
              <span className="mt-1 block text-xs font-normal text-[#526276]">
                Mức bao phủ, năng lực, phiên ôn tập trọng tâm, ngày mục tiêu và
                lịch sử phỏng vấn thử
              </span>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 transition group-open:rotate-180"
            >
              ↓
            </span>
          </summary>
          <div className="pt-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Danh sách ôn hôm nay"
            value={`${dailyQueue.length} thẻ`}
            note={`${readiness.dueCount} đến hạn · ${readiness.newCount} thẻ mới`}
          />
          <MetricCard
            label="Đã học trong kho câu hỏi"
            value={`${readiness.learnedCount}/${readiness.questionCount}`}
            note={`${readiness.matureCount} thẻ đã ghi nhớ lâu (≥21 ngày)`}
          />
          <MetricCard
            label="Mức bao phủ theo vị trí"
            value={`${readiness.coveragePercent}%`}
            note="Tối đa 2 thẻ cho mỗi bài học"
          />
          <MetricCard
            label="Phỏng vấn thử gần nhất"
            value={
              latestV4Artifact
                ? `${latestV4Artifact.debrief.roleInterviewScore ?? "—"}/100`
                : "Chưa có"
            }
            note={
              latestV4Artifact
                ? `${latestV4Artifact.debrief.assessedWeightPercent}% nội dung quan trọng của vị trí đã được hỏi · theo dõi riêng`
                : "Làm phỏng vấn thử để thêm kết quả phỏng vấn"
            }
          />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel
            eyebrow="Phiên ôn tập trọng tâm"
            title="Đúng ưu tiên, đúng thứ tự"
          >
            <p className="mt-3 text-sm leading-6 text-[#526276]">
              Hệ thống ưu tiên thẻ quá hạn, thẻ đang học lại và thẻ khó nhớ
              trong kho đã duyệt, rồi mới đến thẻ đang học hoặc thẻ mới. Đánh
              giá vẫn đi qua lịch ôn bình thường; phiên học không tự ý thay đổi
              tiến độ.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#eaf2f8] px-3 py-1.5 font-bold text-[#285f86]">
                {focusPlan.questions.length} thẻ · ~
                {focusPlan.scheduledMinutes} phút
              </span>
              <span className="rounded-full border border-[#0f3a69]/10 px-3 py-1.5 text-[#526276]">
                Thời lượng {focusPlan.requestedMinutes} phút · tối đa{" "}
                {focusPlan.budgetCeilingMinutes} phút
              </span>
              <span className="rounded-full border border-[#0f3a69]/10 px-3 py-1.5 text-[#526276]">
                Danh sách hằng ngày: {dailyQueue.length} thẻ
              </span>
            </div>

            {activeFocusSession ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#285f86]/20 bg-[#eaf2f8] p-4">
                <div>
                  <p className="font-semibold">
                    Có một phiên ôn tập đang làm dở.
                  </p>
                  <p className="mt-1 text-xs text-[#526276]">
                    {activeFocusSession.completedQuestions.length}/
                    {activeFocusSession.plan.questions.length} thẻ đã xong ·{" "}
                    {activeFocusSession.remainingQuestions.length} thẻ còn lại
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resumeFocusSprint}
                  className="rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white"
                >
                  Tiếp tục phiên ôn
                </button>
              </div>
            ) : null}

            {focusPlan.questions.length > 0 ? (
              <ol className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {focusPlan.questions.map((step, index) => (
                  <li
                    key={step.question.id}
                    className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fee7e7] font-mono text-xs font-bold text-[#c43d3d]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {
                              worldQuantCompetencies[step.competency]
                                .shortLabel
                            }
                          </p>
                          <span className="text-[11px] text-[#526276]">
                            ~{step.question.estimatedMinutes} phút
                          </span>
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] text-[#0f3a69]">
                          {step.question.id}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#526276]">
                          <span className="font-semibold text-[#c43d3d]">
                            {focusQueueReasonLabel(step.queueReason)}
                          </span>
                          <span>
                            {PRACTICE_DECKS[step.question.deckId].label}
                          </span>
                          <span>
                            v{step.question.version} ·{" "}
                            {step.question.sourceHash.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-[#0f3a69]/20 p-5 text-sm leading-6 text-[#526276]">
                Không có thẻ đã duyệt nào đủ điều kiện cho phiên ôn hôm nay.
                Hệ thống chỉ mở hướng dẫn nếu năng lực đó có tài liệu phù hợp;
                hệ thống không tạo danh sách giả.
              </p>
            )}

            {focusPlan.fallbacks.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-[#d08a36]/25 bg-[#fff4df] p-4">
                <p className="text-xs font-bold text-[#a65c0e]">
                  Kho câu hỏi chưa đủ nội dung
                </p>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-[#765c39]">
                  {focusPlan.fallbacks.map((fallback) => {
                    const pendingCount =
                      pendingReviewCounts[fallback.competency] ?? 0;
                    return (
                      <li key={fallback.competency}>
                        <b>
                          {
                            worldQuantCompetencies[fallback.competency]
                              .shortLabel
                          }
                          :
                        </b>{" "}
                        {fallback.kind === "guide"
                          ? `${fallback.label} — đây là hướng dẫn, không phải thẻ đã duyệt.`
                          : fallback.label}
                        {pendingCount > 0
                          ? ` · ${pendingCount} bản nháp đang chờ người quản lý duyệt.`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
                {account &&
                Object.values(pendingReviewCounts).some(
                  (count) => (count ?? 0) > 0,
                ) ? (
                  <Link
                    href="/admin"
                    className="mt-3 inline-flex rounded-xl border border-[#a65c0e]/20 bg-white/65 px-3 py-2 text-xs font-bold text-[#a65c0e]"
                  >
                    Mở danh sách chờ duyệt
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => startFocusSprint(focusPlan)}
                className="rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a]"
              >
                {focusPlanCtaLabel(focusPlan, Boolean(activeFocusSession))}
              </button>
              <Link
                href={balancedMockHref}
                className="rounded-2xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#285f86]/40"
              >
                Luyện phỏng vấn thử
              </Link>
            </div>
          </Panel>

          <Panel eyebrow="Ngày mục tiêu" title="Nhịp học đến phỏng vấn">
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-[#526276]">
                  Ngày phỏng vấn
                </span>
                <input
                  type="date"
                  value={preferences.targetDate}
                  onChange={(event) =>
                    updatePreferences({ targetDate: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-[#0f3a69]/15 bg-[#f8fafc] px-4 py-3 font-semibold outline-none focus:border-[#285f86]"
                />
              </label>
              <label>
                <span className="text-xs font-bold text-[#526276]">
                  Phút mỗi ngày
                </span>
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={preferences.minutesPerDay}
                  onChange={(event) =>
                    updatePreferences({
                      minutesPerDay: clampMinutes(
                        Number(event.target.value),
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-[#0f3a69]/15 bg-[#f8fafc] px-4 py-3 font-semibold outline-none focus:border-[#285f86]"
                />
              </label>
            </div>
            <div className="mt-5 rounded-2xl bg-[#0f3a69] p-5 text-white">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#65e6d2] uppercase">
                    Còn lại
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {targetPlan.daysRemaining} ngày
                  </p>
                </div>
                <p className="font-mono text-xs text-white/55">
                  {targetPlan.availableHours} giờ có thể học
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">
                {targetPlan.message}
              </p>
            </div>
          </Panel>
        </section>

        <section className="mt-5">
          <Panel
            eyebrow="Mô hình năng lực v1"
            title={`Ma trận ${profile.label}`}
          >
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#526276]">
              <span>
                <b className="text-[#0f3a69]">Mức bao phủ</b> = học liệu đã
                kiểm chứng
              </span>
              <span>
                <b className="text-[#0f3a69]">Mức chuẩn bị</b> = kết quả học
                đã tích lũy
              </span>
              <span>Năng lực cốt lõi cần mức bao phủ ≥50%</span>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {activeCompetencies.map((competency) => (
                <CompetencyCard
                  key={competency.key}
                  competency={competency}
                  core={profile.coreCompetencies.includes(competency.key)}
                  mockHref={mockInterviewHref({
                    roleId: preferences.roleId,
                    mode: "targeted",
                    competency: competency.key,
                  })}
                />
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel
            eyebrow="Điểm cần ưu tiên cải thiện"
            title="Ba việc đáng làm nhất"
          >
            <div className="mt-5 space-y-3">
              {readiness.priorityCompetencies.map((key, index) => {
                const competency = readiness.competencies.find(
                  (item) => item.key === key,
                )!;
                const definition = worldQuantCompetencies[key];
                const closureGap = gapForCompetency(
                  trainingState,
                  preferences.roleId,
                  key,
                );
                const competencyPlan = buildWorldQuantFocusPlan({
                  profileId: preferences.roleId,
                  questions,
                  states: learningStates,
                  today,
                  timeBudgetMinutes: preferences.minutesPerDay,
                  focusCompetency: key,
                  attemptEvidence: initialEvidenceProjection,
                });
                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fee7e7] font-mono text-xs font-bold text-[#c43d3d]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{definition.label}</p>
                        <p className="mt-1 text-xs text-[#526276]">
                          {gapDescription(competency.gapKind)}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#43546a]">
                          Tiến độ cải thiện:{" "}
                          {gapClosureStatusLabel(closureGap?.status)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startFocusSprint(competencyPlan, key)}
                      className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      {targetedFocusCtaLabel(competencyPlan)}
                    </button>
                    <Link
                      href={mockInterviewHref({
                        roleId: preferences.roleId,
                        mode: "targeted",
                        competency: key,
                      })}
                      className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      Phỏng vấn thử năng lực này
                    </Link>
                    <Link
                      href={`/worldquant/drills?role=${preferences.roleId}&competency=${key}`}
                      className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      Bài luyện tình huống
                    </Link>
                    {focusFeedback?.competency === key ? (
                      <p
                        role="alert"
                        className="basis-full rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] px-3 py-2 text-xs leading-5 text-[#c43d3d]"
                      >
                        {focusFeedback.message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            eyebrow="Kết quả phỏng vấn"
            title="Phỏng vấn thử gần nhất"
          >
            {activeV4Mock &&
            activeV4Mock.status !== "completed" ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#285f86]/20 bg-[#eaf2f8] p-4">
                <div>
                  <p className="text-sm font-semibold">
                    Có một buổi phỏng vấn thử đang làm dở.
                  </p>
                  <p className="mt-1 text-xs text-[#526276]">
                    {worldQuantRoleProfileById(activeV4Mock.profileId).label} ·{" "}
                    câu {activeV4Mock.currentIndex + 1}/
                    {activeV4Mock.questions.length} ·{" "}
                    {activeV4Mock.status === "evaluating"
                       ? "đang chấm kết quả"
                      : "đang phỏng vấn"}
                  </p>
                </div>
                <Link
                  href="/mock-interview"
                  className="rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white"
                >
                  Tiếp tục phỏng vấn thử
                </Link>
              </div>
            ) : null}
            {latestV4Artifact && latestV4Mock ? (
              <>
                <div className="mt-5 rounded-2xl bg-[#eaf2f8] p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-semibold">
                        {latestV4Artifact.debrief.roleInterviewScore ?? "—"}
                        <span className="text-lg text-[#526276]">/100</span>
                      </p>
                      <p className="mt-2 text-sm text-[#526276]">
                        {latestV4Artifact.plan.mode === "targeted"
                          ? `Theo năng lực · ${
                              worldQuantCompetencies[
                                latestV4Artifact.plan.targetCompetency!
                              ].shortLabel
                            }`
                          : "Mẫu tổng hợp theo vị trí"}{" "}
                        · {latestV4Artifact.plan.durationMinutes} phút ·{" "}
                        {latestV4Artifact.debrief.assessedWeightPercent}% trọng
                        số vị trí đã hỏi
                      </p>
                      <p className="mt-1 text-xs text-[#526276]">
                        Hoàn thành{" "}
                        {formatDateTime(latestV4Artifact.completedAt)}
                      </p>
                    </div>
                    <Link
                      href={balancedMockHref}
                      className="rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
                    >
                      Làm phỏng vấn thử tổng hợp
                    </Link>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#43546a]">
                    Đây là điểm trên phần đã hỏi, không phải kết luận sẵn sàng
                    tuyển dụng và không được cộng vào Chỉ số chuẩn bị.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {latestV4Artifact.debrief.competencies
                    .filter((item) => item.roleWeight > 0)
                    .map((item) => (
                      <div
                        key={item.competency}
                        className="rounded-xl border border-[#0f3a69]/10 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold">
                            {
                              worldQuantCompetencies[item.competency]
                                .shortLabel
                            }
                          </span>
                          <span className="font-mono text-xs font-bold">
                            {item.status === "assessed"
                              ? `${item.score}/100`
                              : "Chưa hỏi"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-[#526276]">
                          {item.status === "assessed"
                            ? `${item.evidenceCount} câu đã chấm · mức độ quan trọng với vị trí ${item.roleWeight}%`
                            : `Không có kết quả trong lượt này · mức độ quan trọng với vị trí ${item.roleWeight}%`}
                        </p>
                      </div>
                    ))}
                </div>

                {assessedMockTrends.length ? (
                  <div className="mt-4 rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4">
                    <p className="text-xs font-bold">
                      Xu hướng cùng vị trí/cấu hình,{" "}
                      {mockTrends.planMode === "targeted"
                        ? `theo năng lực ${
                            worldQuantCompetencies[
                              mockTrends.targetCompetency!
                            ].shortLabel
                          }`
                        : "tổng hợp"}{" "}
                      và cùng {latestV4Duration} phút
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {assessedMockTrends
                        .filter(
                          (trend) => profile.weights[trend.key] > 0,
                        )
                        .map((trend) => (
                          <div
                            key={trend.key}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span>
                              {
                                worldQuantCompetencies[trend.key]
                                  .shortLabel
                              }
                            </span>
                            <span className="font-mono font-bold">
                              {trend.latest}
                              {trend.delta === null
                                ? ""
                                : ` (${trend.delta >= 0 ? "+" : ""}${trend.delta})`}{" "}
                              · {trend.count} lượt
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[10px] leading-4 text-[#526276]">
                      Chỉ so các năng lực đã được chấm; “Chưa hỏi” không bị
                      biến thành 0. Có {mockTrends.comparableAttemptCount} lượt
                      cùng phiên bản để đối chiếu.
                    </p>
                  </div>
                ) : null}

                {latestMockRemediation?.recommendations.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold">
                      Gợi ý ôn lại từ phần đã được chấm
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {latestMockRemediation.recommendations
                        .slice(0, 2)
                        .map((option) => (
                          <div
                            key={option.competency}
                            className="rounded-xl border border-[#0f3a69]/10 p-3"
                          >
                            <p className="text-xs font-semibold">
                              #{option.rank}{" "}
                              {
                                worldQuantCompetencies[
                                  option.competency
                                ].shortLabel
                              }
                            </p>
                            <p className="mt-1 text-[10px] text-[#526276]">
                              {option.availability === "focus_sprint"
                                ? `${option.plan.questions.length} thẻ đã duyệt`
                                : option.availability === "guide"
                                  ? "Có hướng dẫn nền tảng"
                                  : option.availability === "content_gap"
                                    ? "Kho câu hỏi chưa có thẻ hoặc hướng dẫn phù hợp"
                                    : "Hiện chưa có bài đến hạn cho phần này"}
                            </p>
                            {option.availability === "focus_sprint" ||
                            option.availability === "guide" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  startFocusSprint(
                                    option.plan,
                                    option.competency,
                                  )
                                }
                                className="mt-3 rounded-lg bg-[#0f3a69] px-3 py-2 text-[10px] font-bold text-white"
                              >
                                {option.availability === "focus_sprint"
                                  ? "Tạo phiên ôn tập trọng tâm"
                                  : "Mở hướng dẫn"}
                              </button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-xs leading-5 text-[#526276]">
                  {mockHistoryAvailable
                    ? `${roleMockHistory.length} lượt của vị trí này được lưu theo tài khoản.`
                    : "Lịch sử đồng bộ chưa được cấu hình; hệ thống chỉ hiện dữ liệu máy chủ đã tải được."}
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#0f3a69]/20 p-6">
                <p className="font-semibold">
                  Chưa có kết quả phỏng vấn thử hoàn chỉnh.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#526276]">
                  Làm một buổi 30 phút để nhận đánh giá theo tiêu chí cho C++,
                  Dữ liệu tick, hiệu năng, chất lượng kỹ thuật và tinh thần làm
                  chủ công việc.
                </p>
                <Link
                  href={balancedMockHref}
                  className="mt-5 inline-flex rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
                >
                  Bắt đầu phỏng vấn thử
                </Link>
              </div>
            )}
          </Panel>
        </section>
          </div>
        </details>

        {!account ? (
          <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/65 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-semibold">
                Tiến độ hiện đang nằm trong trình duyệt này.
              </p>
              <p className="mt-1 text-sm text-[#526276]">
                {cloudEnabled
                  ? "Đăng nhập để hợp nhất tiến độ khi đổi thiết bị."
                  : "Supabase chưa được cấu hình; hệ thống vẫn hoạt động đầy đủ trên thiết bị."}
              </p>
            </div>
            {cloudEnabled ? (
              <Link
                href="/auth?next=%2Fworldquant"
                className="mt-4 inline-flex rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white sm:mt-0"
              >
                Đăng nhập
              </Link>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ScoreCard({
  preparationIndex,
  coveragePercent,
  status,
  verifiedCount,
  approvedCount,
}: {
  preparationIndex: number;
  coveragePercent: number;
  status: ReadinessHeadlineStatus;
  verifiedCount: number;
  approvedCount: number;
}) {
  return (
    <article className="flex w-full min-w-0 max-w-full flex-col justify-between rounded-[1.25rem] bg-[#0f3a69] p-7 text-white shadow-[0_24px_80px_rgb(15_58_105_/_18%)] sm:p-9">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
            Chỉ số chuẩn bị
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            {headlineLabels[status]}
          </span>
        </div>
        <p className="mt-7 text-7xl font-semibold tracking-[-0.06em]">
          {preparationIndex}
          <span className="ml-1 text-2xl text-white/45">/100</span>
        </p>
        <p className="mt-3 text-sm leading-6 text-white/64">
          Chỉ số dựa trên kết quả trong ứng dụng, không phải xác suất trúng
          tuyển. Khi mức bao phủ thấp, điểm thấp chủ yếu cho biết kho câu hỏi
          chưa đủ dữ liệu.
        </p>
      </div>
      <div className="mt-8">
        <div className="flex items-center justify-between text-xs">
          <span>Mức bao phủ có trọng số</span>
          <span className="font-mono font-bold">{coveragePercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#65e6d2]"
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/45">
          {verifiedCount} câu đã xác minh trong kho · {approvedCount} câu đã
          được duyệt
        </p>
      </div>
    </article>
  );
}

function CompetencyCard({
  competency,
  core,
  mockHref,
}: {
  competency: CompetencyReadiness;
  core: boolean;
  mockHref: string;
}) {
  const definition = worldQuantCompetencies[competency.key];
  return (
    <article className="min-w-0 rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{definition.label}</h3>
            {core ? (
              <span className="rounded-full bg-[#fee7e7] px-2 py-1 font-mono text-[9px] font-bold text-[#c43d3d] uppercase">
                Cốt lõi
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#526276]">
            {definition.description}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold">{competency.weight}%</p>
          <p className="text-[10px] text-[#526276]">mức độ quan trọng</p>
        </div>
      </div>
      <ProgressRow
        label="Mức chuẩn bị"
        value={competency.preparedPercent}
        tone="green"
      />
      <ProgressRow
        label="Mức bao phủ"
        value={competency.coveragePercent}
        tone="orange"
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#526276]">
        <span>
          {competency.effectiveCount}/{competency.target} câu hỏi đủ điều kiện ·{" "}
          {competency.matureCount} thẻ đã nhớ lâu
        </span>
        <span
          className={gapToneClass(competency.gapKind)}
        >
          {competencyStatusLabels[competency.status]} ·{" "}
          {gapLabel(competency.gapKind)}
        </span>
      </div>
      <Link
        href={mockHref}
        className="mt-4 inline-flex rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-[11px] font-bold text-[#0f3a69]"
      >
        Phỏng vấn thử theo năng lực
      </Link>
    </article>
  );
}

function ProgressRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "orange";
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-[#526276]">{label}</span>
        <span className="font-mono font-bold">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#0f3a69]/8">
        <div
          className={`h-full rounded-full ${
            tone === "green" ? "bg-[#285f86]" : "bg-[#d08a36]"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/65 p-6 shadow-[0_18px_60px_rgb(15_58_105_/_6%)] sm:p-7">
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#526276] uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[#526276]">{note}</p>
    </article>
  );
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-white/60 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function AdvancedLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function GuidedStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex min-w-0 gap-3 rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0f3a69] font-mono text-xs font-bold text-white">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block break-words font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#526276]">
          {description}
        </span>
      </span>
    </li>
  );
}

function parseHubPreferences(
  raw: string | null,
  today: string,
): HubPreferences {
  const fallback: HubPreferences = {
    roleId: DEFAULT_WORLDQUANT_ROLE_PROFILE_ID,
    targetDate: addDays(today, 60),
    minutesPerDay: 45,
  };
  if (
    !raw ||
    raw === EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT
  ) {
    return fallback;
  }
  try {
    const value = JSON.parse(raw) as Partial<HubPreferences>;
    return {
      roleId: parseWorldQuantRoleProfile(value.roleId),
      targetDate:
        isValidReadinessDateKey(value.targetDate)
          ? value.targetDate
          : fallback.targetDate,
      minutesPerDay: clampMinutes(value.minutesPerDay),
    };
  } catch {
    return fallback;
  }
}

function subscribeToStorageKey(
  storageKey: string | null,
  callback: () => void,
) {
  const onStorage = (event: StorageEvent) => {
    if (storageKey && event.key === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readStorageKey(storageKey: string | null) {
  if (!storageKey) return EMPTY_STORAGE_SNAPSHOT;
  try {
    return (
      window.localStorage.getItem(storageKey) ??
      EMPTY_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_STORAGE_SNAPSHOT;
  }
}

function subscribeToGuidedMode(
  storageKey: string,
  callback: () => void,
) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GUIDED_MODE_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GUIDED_MODE_CHANGED_EVENT, callback);
  };
}

function writeGuidedModeState(
  storageKey: string,
  state: ReturnType<typeof completeWorldQuantGuidedOnboarding>,
) {
  try {
    window.localStorage.setItem(
      storageKey,
      serializeWorldQuantGuidedModeState(state),
    );
    window.dispatchEvent(new Event(GUIDED_MODE_CHANGED_EVENT));
    return true;
  } catch {
    return false;
  }
}

function buildTargetPlan({
  today,
  targetDate,
  minutesPerDay,
  readiness,
}: {
  today: string;
  targetDate: string;
  minutesPerDay: number;
  readiness: ReturnType<typeof buildWorldQuantReadiness>;
}) {
  const daysRemaining = Math.max(0, dateDifferenceDays(today, targetDate));
  const availableHours = Math.round(
    ((daysRemaining * minutesPerDay) / 60) * 10,
  ) / 10;
  const contentGaps = readiness.competencies.filter(
    (competency) =>
      competency.weight > 0 && competency.gapKind !== "learning",
  ).length;
  const learningGaps = readiness.competencies.filter(
    (competency) =>
      competency.weight > 0 && competency.gapKind !== "content",
  ).length;
  let message =
    "Ưu tiên điểm cần cải thiện quan trọng nhất với vị trí, ôn thẻ mỗi ngày và làm một buổi phỏng vấn thử mỗi tuần.";
  if (daysRemaining === 0) {
    message =
      "Ngày mục tiêu đã tới hoặc đã qua. Hãy ôn ngắn, làm một buổi phỏng vấn thử và tập trung vào hai điểm cần cải thiện quan trọng nhất với vị trí.";
  } else if (daysRemaining <= 14) {
    message = `Giai đoạn nước rút: ${learningGaps} phần cần luyện trực tiếp; ${contentGaps} phần học liệu còn thiếu nên được bù bằng hướng dẫn và phỏng vấn thử, không nên hiểu nhầm là điểm yếu cá nhân.`;
  } else if (readiness.coveragePercent < 60) {
    message = `Kho câu hỏi còn ${contentGaps} phần học liệu chưa đủ. Hãy dùng hướng dẫn cho phần thiếu, duy trì ôn hằng ngày và chuyển dần sang phỏng vấn thử khi mức bao phủ tăng.`;
  }
  return { daysRemaining, availableHours, message };
}

function focusQueueReasonLabel(reason: FocusQueueReason) {
  return {
    evidence_repair: "Cần sửa theo lần làm gần nhất",
    due_relearning: "Quá hạn · đang học lại",
    due_leech: "Quá hạn · thẻ khó nhớ",
    due: "Đến hạn",
    evidence_refresh: "Bằng chứng cần làm mới",
    relearning: "Đang học lại",
    leech: "Thẻ khó nhớ cần củng cố",
    learning: "Đang học",
    new: "Thẻ mới",
  }[reason];
}

function focusPlanCtaLabel(
  plan: WorldQuantFocusPlan,
  hasActiveSession: boolean,
) {
  if (plan.questions.length > 0) {
    return hasActiveSession
      ? "Bắt đầu phiên ôn mới"
      : "Bắt đầu phiên ôn tập trọng tâm";
  }
  if (plan.fallbacks.some((fallback) => fallback.kind === "guide")) {
    return "Mở hướng dẫn phù hợp";
  }
  return "Xem phần học liệu còn thiếu";
}

function targetedFocusCtaLabel(plan: WorldQuantFocusPlan) {
  if (plan.questions.length > 0) return "Luyện năng lực này";
  if (plan.fallbacks.some((fallback) => fallback.kind === "guide")) {
    return "Mở hướng dẫn";
  }
  return "Kho câu hỏi chưa đủ";
}

function dateDifferenceDays(from: string, to: string) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.ceil(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}

function clampMinutes(value: number | undefined) {
  if (!Number.isFinite(value)) return 45;
  return Math.min(180, Math.max(15, Math.round(value!)));
}

function gapDescription(
  gapKind: CompetencyReadiness["gapKind"],
): string {
  if (gapKind === "content") {
    return "Phần học liệu còn thiếu: kho câu hỏi chưa đủ nội dung đã kiểm chứng.";
  }
  if (gapKind === "mixed") {
    return "Cần bổ sung cả học liệu và luyện tập: kho còn thiếu, phần hiện có cũng chưa được luyện đủ.";
  }
  return "Cần luyện thêm: học liệu đã có nhưng chưa được ôn đủ.";
}

function gapLabel(gapKind: CompetencyReadiness["gapKind"]) {
  if (gapKind === "mixed") return "thiếu học liệu + cần luyện thêm";
  return gapKind === "content" ? "học liệu còn thiếu" : "cần luyện thêm";
}

function gapClosureStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    open: "cần luyện",
    learning: "đang học",
    transfer_ready: "sẵn sàng xác nhận",
    verified: "đã xác nhận",
  };
  return status ? (labels[status] ?? status) : "chưa mở";
}

function gapToneClass(gapKind: CompetencyReadiness["gapKind"]) {
  return gapKind === "learning"
    ? "font-bold text-[#285f86]"
    : "font-bold text-[#c43d3d]";
}

function mockInterviewHref({
  roleId,
  mode,
  competency,
}: {
  roleId: WorldQuantRoleProfileId;
  mode: "balanced" | "targeted";
  competency?: WorldQuantCompetencyKey;
}) {
  const query = new URLSearchParams({ role: roleId, mode });
  if (competency) query.set("focus", competency);
  return `/mock-interview?${query.toString()}`;
}

function compareMockHistoryNewestFirst(
  left: MockInterviewHistoryEntry,
  right: MockInterviewHistoryEntry,
) {
  const leftTime = Date.parse(left.completedAt ?? "");
  const rightTime = Date.parse(right.completedAt ?? "");
  const timeOrder =
    Number.isFinite(leftTime) && Number.isFinite(rightTime)
      ? rightTime - leftTime
      : 0;
  return timeOrder || right.attemptId.localeCompare(left.attemptId);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
