"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  MOCK_INTERVIEW_STORAGE_KEY,
  parseMockInterviewSession,
} from "@/lib/mock-interview/session";
import {
  mockInterviewStorageKey,
  parseMockInterviewSessionV4,
} from "@/lib/mock-interview/session-v4";
import {
  mockCompetencyKeys,
  mockCompetencyLabels,
} from "@/lib/mock-interview/profile";
import {
  mockInterviewCompletedArtifactV4Schema,
  type MockInterviewCompletedArtifactV4,
} from "@/lib/mock-interview/contracts-v4";
import {
  buildWorldQuantMockTrends,
  type MockInterviewHistoryEntry,
  type MockInterviewTrendDuration,
} from "@/lib/mock-interview/trends";
import type { PracticeAccount } from "@/lib/practice/cloud-server";
import {
  buildAnkiDailyQueue,
  buildLearningStates,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
import { FOCUS_SESSION_STORAGE_KEY } from "@/lib/practice/focus-session";
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
import { buildWorldQuantMockRemediation } from "@/lib/worldquant/mock-remediation";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import { openOrReconcileGapFromMock } from "@/lib/worldquant/gap-closure";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
  gapForCompetency,
  readWorldQuantTrainingState,
  subscribeToWorldQuantTrainingState,
  writeWorldQuantTrainingStateLocked,
  type WorldQuantTrainingState,
} from "@/lib/worldquant/training-state";
import {
  buildWorldQuantReadiness,
  DEFAULT_WORLDQUANT_ROLE_PROFILE_ID,
  isValidReadinessDateKey,
  mapLegacyMockCompetency,
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

const HUB_PREFERENCES_STORAGE_KEY = "recall:worldquant-hub:v1";
const HUB_PREFERENCES_CHANGED_EVENT = "recall:worldquant-hub-changed";
const EMPTY_STORAGE_SNAPSHOT = "__empty__";

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
  mock_ready: "Sẵn sàng luyện mock",
  well_rehearsed: "Đã luyện vững",
};

const competencyStatusLabels = {
  no_evidence: "Chưa có content",
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
  mockHistoryAvailable: boolean;
  initialRoleId: WorldQuantRoleProfileId | null;
}) {
  const [focusFeedback, setFocusFeedback] =
    useState<FocusFeedback | null>(null);
  const [routeRoleId, setRouteRoleId] =
    useState<WorldQuantRoleProfileId | null>(initialRoleId);
  const [trainingState, setTrainingState] =
    useState<WorldQuantTrainingState>(
      EMPTY_WORLDQUANT_TRAINING_STATE,
    );
  const progressSnapshot = useSyncExternalStore(
    subscribeToPracticeProgress,
    readPracticeProgressSnapshot,
    () => null,
  );
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToHubPreferences,
    readHubPreferencesSnapshot,
    () => null,
  );
  const mockSnapshot = useSyncExternalStore(
    subscribeToMockSession,
    readMockSessionSnapshot,
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
    subscribeToFocusSession,
    readFocusSessionSnapshot,
    () => null,
  );
  const preferences = useMemo(() => {
    const stored = parseHubPreferences(preferencesSnapshot, today);
    return routeRoleId
      ? { ...stored, roleId: routeRoleId }
      : stored;
  }, [preferencesSnapshot, routeRoleId, today]);
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
    const resetCutoffs = new Map(
      initialQuestionStates
        .filter((state) => state.historyResetOn)
        .map((state) => [state.questionId, state.historyResetOn!]),
    );
    const merged = mergeProgress(initialCloudProgress, local);
    return {
      ...merged,
      reviews: merged.reviews.filter((review) => {
        const resetOn = resetCutoffs.get(review.questionId);
        return !resetOn || review.reviewedOn > resetOn;
      }),
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
      }),
    [learningStates, preferences.roleId, questions, today],
  );
  const focusPlan = useMemo(
    () =>
      buildWorldQuantFocusPlan({
        profileId: preferences.roleId,
        questions,
        states: learningStates,
        today,
        timeBudgetMinutes: preferences.minutesPerDay,
      }),
    [
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
          focusSessionSnapshot === EMPTY_STORAGE_SNAPSHOT
            ? null
            : focusSessionSnapshot,
        profileId: preferences.roleId,
        questions,
      }),
    [focusSessionSnapshot, preferences.roleId, questions],
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
  const mockSession = useMemo(
    () =>
      mockSnapshot === null || mockSnapshot === EMPTY_STORAGE_SNAPSHOT
        ? null
        : parseMockInterviewSession(mockSnapshot),
    [mockSnapshot],
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
  const completedMock =
    mockSession?.status === "completed" && mockSession.report
      ? mockSession
      : null;
  const activeV4Mock =
    v4MockSnapshot &&
    v4MockSnapshot !== EMPTY_STORAGE_SNAPSHOT
      ? parseMockInterviewSessionV4(v4MockSnapshot)
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

  useEffect(() => {
    const accountId = account?.id ?? null;
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
      account?.id ?? null,
      () => void refresh(),
    );
  }, [account?.id, initialMockHistory, preferences.roleId]);

  function updatePreferences(next: Partial<HubPreferences>) {
    if (next.roleId) {
      setRouteRoleId(next.roleId);
      const url = new URL(window.location.href);
      url.searchParams.set("role", next.roleId);
      window.history.replaceState(null, "", url);
    }
    writeHubPreferences({ ...preferences, ...next });
  }

  function startFocusSprint(
    selectedPlan: WorldQuantFocusPlan,
    competency: WorldQuantCompetencyKey | null = null,
  ) {
    setFocusFeedback(null);
    const destination = prepareFocusSprint(selectedPlan);
    if (
      destination.kind === "practice" ||
      destination.kind === "guide"
    ) {
      window.location.assign(destination.href);
      return;
    }
    setFocusFeedback({ competency, message: destination.message });
  }

  function resumeFocusSprint() {
    if (!activeFocusSession) return;
    setFocusFeedback(null);
    const destination = prepareFocusSprintResume(activeFocusSession);
    if (destination.kind === "practice") {
      window.location.assign(destination.href);
      return;
    }
    if (
      destination.kind === "storage_error" ||
      destination.kind === "unavailable"
    ) {
      setFocusFeedback({ competency: null, message: destination.message });
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto w-full min-w-0 max-w-[1440px]">
        <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <span>
              <span className="block font-bold">Recall Readiness</span>
              <span className="block text-xs text-[#64736c]">
                WorldQuant C++ track
              </span>
            </span>
          </Link>
          <nav
            className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
            aria-label="Điều hướng"
          >
            <HeaderLink href="/">Luyện thẻ</HeaderLink>
            <HeaderLink href="/learn/tick-data-order-book">
              Học Tick
            </HeaderLink>
            <HeaderLink href="/learn/cmake">Học CMake</HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/curriculum",
                preferences.roleId,
              )}
            >
              Curriculum
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/drills",
                preferences.roleId,
              )}
            >
              Drill Lab
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/mission",
                preferences.roleId,
              )}
            >
              Today&apos;s Mission
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/full-round",
                preferences.roleId,
              )}
            >
              Full Round
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/mock-interview",
                preferences.roleId,
              )}
            >
              Mock interview
            </HeaderLink>
            <HeaderLink href="/stats">Thống kê</HeaderLink>
            {account ? (
              <HeaderLink href="/admin">Duyệt question</HeaderLink>
            ) : null}
            {account ? (
              <span className="rounded-full border border-[#173f35]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
                @{account.login ?? account.displayName}
              </span>
            ) : (
              <span className="rounded-full border border-[#173f35]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
                Local mode
              </span>
            )}
          </nav>
        </header>

        {cloudError ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
          >
            Cloud đang lỗi nên hub tạm dùng dữ liệu trong trình duyệt. Không có
            tiến độ nào bị ghi đè.
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-7 py-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-stretch">
          <div className="min-w-0 rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-6 shadow-[0_24px_80px_rgb(23_63_53_/_8%)] sm:p-9">
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              WorldQuant Readiness Hub
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Biết chính xác nên học gì tiếp theo.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#64736c]">
              Chọn role mục tiêu, rồi hub ghép question bank đã kiểm chứng với
              lịch sử ôn thật của mày. Coverage thấp là thiếu content; progress
              thấp mới là phần cần luyện.
            </p>

            <label className="mt-7 block max-w-xl">
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#64736c] uppercase">
                Role profile
              </span>
              <select
                value={preferences.roleId}
                onChange={(event) =>
                  updatePreferences({
                    roleId: parseWorldQuantRoleProfile(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbfaf4] px-4 py-3 font-bold outline-none focus:border-[#356b58]"
              >
                {worldQuantRoleProfiles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 max-w-3xl rounded-2xl bg-[#edf3e7] p-5">
              <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#356b58] uppercase">
                {profile.eyebrow}
              </p>
              <p className="mt-2 font-semibold">{profile.summary}</p>
            </div>
            <p className="mt-5 max-w-3xl text-xs leading-5 text-[#64736c]">
              Đây là lộ trình tự xây từ JD mày cung cấp và các theme công khai,
              không phải rubric tuyển dụng nội bộ hay xác suất đậu WorldQuant.
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Hàng đợi hôm nay"
            value={`${dailyQueue.length} thẻ`}
            note={`${readiness.dueCount} đến hạn · ${readiness.newCount} thẻ mới`}
          />
          <MetricCard
            label="Đã học trong bank"
            value={`${readiness.learnedCount}/${readiness.questionCount}`}
            note={`${readiness.matureCount} thẻ mature (≥21 ngày)`}
          />
          <MetricCard
            label="Coverage theo role"
            value={`${readiness.coveragePercent}%`}
            note="Có giới hạn 2 thẻ cho mỗi lesson"
          />
          <MetricCard
            label="Mock gần nhất"
            value={
              latestV4Artifact
                ? `${latestV4Artifact.debrief.roleInterviewScore ?? "—"}/100`
                : completedMock
                  ? `${completedMock.report!.overallScore}/100`
                  : "Chưa có"
            }
            note={
              latestV4Artifact
                ? `${latestV4Artifact.debrief.assessedWeightPercent}% trọng số role đã hỏi · tách khỏi index`
                : completedMock
                  ? "Legacy v3 · hiển thị riêng, chưa trộn vào index"
                  : "Làm mock để thêm bằng chứng phỏng vấn"
            }
          />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel eyebrow="Focus Sprint" title="Queue đúng gap, đúng thứ tự">
            <p className="mt-3 text-sm leading-6 text-[#64736c]">
              Planner ưu tiên thẻ quá hạn, relearning và leech trong bank đã
              duyệt, rồi mới đến thẻ đang học hoặc thẻ mới. Rating vẫn đi qua
              scheduler bình thường; sprint không tự sửa tiến độ.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#edf3e7] px-3 py-1.5 font-bold text-[#356b58]">
                {focusPlan.questions.length} thẻ · ~
                {focusPlan.scheduledMinutes} phút
              </span>
              <span className="rounded-full border border-[#173f35]/10 px-3 py-1.5 text-[#64736c]">
                Budget {focusPlan.requestedMinutes} phút · trần{" "}
                {focusPlan.budgetCeilingMinutes} phút
              </span>
              <span className="rounded-full border border-[#173f35]/10 px-3 py-1.5 text-[#64736c]">
                Daily queue chuẩn: {dailyQueue.length} thẻ
              </span>
            </div>

            {activeFocusSession ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#356b58]/20 bg-[#edf3e7] p-4">
                <div>
                  <p className="font-semibold">Có một sprint đang làm dở.</p>
                  <p className="mt-1 text-xs text-[#64736c]">
                    {activeFocusSession.completedQuestions.length}/
                    {activeFocusSession.plan.questions.length} thẻ đã xong ·{" "}
                    {activeFocusSession.remainingQuestions.length} thẻ còn lại
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resumeFocusSprint}
                  className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
                >
                  Tiếp tục sprint
                </button>
              </div>
            ) : null}

            {focusPlan.questions.length > 0 ? (
              <ol className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {focusPlan.questions.map((step, index) => (
                  <li
                    key={step.question.id}
                    className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f1d6c9] font-mono text-xs font-bold text-[#8e3825]">
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
                          <span className="text-[11px] text-[#64736c]">
                            ~{step.question.estimatedMinutes} phút
                          </span>
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] text-[#173f35]">
                          {step.question.id}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#64736c]">
                          <span className="font-semibold text-[#8e3825]">
                            {focusQueueReasonLabel(step.queueReason)}
                          </span>
                          <span>{step.question.deckId}</span>
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
              <p className="mt-5 rounded-2xl border border-dashed border-[#173f35]/20 p-5 text-sm leading-6 text-[#64736c]">
                Không có thẻ đã duyệt nào đủ điều kiện cho sprint hôm nay.
                Planner sẽ chỉ mở guide thật nếu competency đó có guide; nó
                không tạo queue giả.
              </p>
            )}

            {focusPlan.fallbacks.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-[#d08a36]/25 bg-[#fff4df] p-4">
                <p className="text-xs font-bold text-[#8e5a1f]">
                  Phần bank chưa phủ đủ
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
                          ? `${fallback.label} — đây là guide, không phải thẻ đã duyệt.`
                          : fallback.label}
                        {pendingCount > 0
                          ? ` · ${pendingCount} draft đang chờ owner review.`
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
                    className="mt-3 inline-flex rounded-xl border border-[#8e5a1f]/20 bg-white/65 px-3 py-2 text-xs font-bold text-[#8e5a1f]"
                  >
                    Mở Review Queue
                  </Link>
                ) : null}
              </div>
            ) : null}

            {focusFeedback?.competency === null ? (
              <p
                id="focus-sprint-feedback"
                role="alert"
                className="mt-4 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
              >
                {focusFeedback.message}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => startFocusSprint(focusPlan)}
                className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
              >
                {focusPlanCtaLabel(focusPlan, Boolean(activeFocusSession))}
              </button>
              <Link
                href={balancedMockHref}
                className="rounded-2xl border border-[#173f35]/15 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#356b58]/40"
              >
                Luyện mock interview
              </Link>
            </div>
          </Panel>

          <Panel eyebrow="Target date" title="Nhịp học đến phỏng vấn">
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-[#64736c]">
                  Ngày phỏng vấn
                </span>
                <input
                  type="date"
                  value={preferences.targetDate}
                  onChange={(event) =>
                    updatePreferences({ targetDate: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbfaf4] px-4 py-3 font-semibold outline-none focus:border-[#356b58]"
                />
              </label>
              <label>
                <span className="text-xs font-bold text-[#64736c]">
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
                  className="mt-2 w-full rounded-2xl border border-[#173f35]/15 bg-[#fbfaf4] px-4 py-3 font-semibold outline-none focus:border-[#356b58]"
                />
              </label>
            </div>
            <div className="mt-5 rounded-2xl bg-[#173f35] p-5 text-white">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#d7ff91] uppercase">
                    Còn lại
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {targetPlan.daysRemaining} ngày
                  </p>
                </div>
                <p className="font-mono text-xs text-white/55">
                  {targetPlan.availableHours} giờ khả dụng
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
            eyebrow="Competency model v1"
            title={`Ma trận ${profile.label}`}
          >
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#64736c]">
              <span>
                <b className="text-[#173f35]">Coverage</b> = content đã kiểm
                chứng
              </span>
              <span>
                <b className="text-[#173f35]">Prepared</b> = bằng chứng học đã
                tích lũy
              </span>
              <span>Core competency cần ≥50% coverage</span>
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
          <Panel eyebrow="Priority gaps" title="Ba việc đáng làm nhất">
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
                });
                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f1d6c9] font-mono text-xs font-bold text-[#8e3825]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{definition.label}</p>
                        <p className="mt-1 text-xs text-[#64736c]">
                          {gapDescription(competency.gapKind)}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#52645c]">
                          Gap closure: {closureGap?.status ?? "chưa mở"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startFocusSprint(competencyPlan, key)}
                      className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      {targetedFocusCtaLabel(competencyPlan)}
                    </button>
                    <Link
                      href={mockInterviewHref({
                        roleId: preferences.roleId,
                        mode: "targeted",
                        competency: key,
                      })}
                      className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      Mock đúng gap
                    </Link>
                    <Link
                      href={`/worldquant/drills?role=${preferences.roleId}&competency=${key}`}
                      className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      Scenario drill
                    </Link>
                    {focusFeedback?.competency === key ? (
                      <p
                        role="alert"
                        className="basis-full rounded-xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-3 py-2 text-xs leading-5 text-[#8e3825]"
                      >
                        {focusFeedback.message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel eyebrow="Interview evidence" title="Mock gần nhất">
            {activeV4Mock &&
            activeV4Mock.status !== "completed" ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#356b58]/20 bg-[#edf3e7] p-4">
                <div>
                  <p className="text-sm font-semibold">
                    Có một mock v4 đang làm dở.
                  </p>
                  <p className="mt-1 text-xs text-[#64736c]">
                    {worldQuantRoleProfileById(activeV4Mock.profileId).label} ·{" "}
                    câu {activeV4Mock.currentIndex + 1}/
                    {activeV4Mock.questions.length} ·{" "}
                    {activeV4Mock.status === "evaluating"
                      ? "đang chấm report"
                      : "đang phỏng vấn"}
                  </p>
                </div>
                <Link
                  href="/mock-interview"
                  className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
                >
                  Tiếp tục mock
                </Link>
              </div>
            ) : null}
            {latestV4Artifact && latestV4Mock ? (
              <>
                <div className="mt-5 rounded-2xl bg-[#edf3e7] p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-semibold">
                        {latestV4Artifact.debrief.roleInterviewScore ?? "—"}
                        <span className="text-lg text-[#64736c]">/100</span>
                      </p>
                      <p className="mt-2 text-sm text-[#64736c]">
                        {latestV4Artifact.plan.mode === "targeted"
                          ? `Targeted · ${
                              worldQuantCompetencies[
                                latestV4Artifact.plan.targetCompetency!
                              ].shortLabel
                            }`
                          : "Balanced role sample"}{" "}
                        · {latestV4Artifact.plan.durationMinutes} phút ·{" "}
                        {latestV4Artifact.debrief.assessedWeightPercent}% trọng
                        số role đã hỏi
                      </p>
                      <p className="mt-1 text-xs text-[#64736c]">
                        Hoàn thành{" "}
                        {formatDateTime(latestV4Artifact.completedAt)}
                      </p>
                    </div>
                    <Link
                      href={balancedMockHref}
                      className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white"
                    >
                      Làm balanced mock
                    </Link>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#52645c]">
                    Đây là điểm trên phần đã hỏi, không phải kết luận sẵn sàng
                    tuyển dụng và không được cộng vào Preparation Index.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {latestV4Artifact.debrief.competencies
                    .filter((item) => item.roleWeight > 0)
                    .map((item) => (
                      <div
                        key={item.competency}
                        className="rounded-xl border border-[#173f35]/10 px-4 py-3"
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
                        <p className="mt-1 text-[10px] text-[#64736c]">
                          {item.status === "assessed"
                            ? `${item.evidenceCount} câu evidence · role weight ${item.roleWeight}%`
                            : `Không có evidence trong attempt này · role weight ${item.roleWeight}%`}
                        </p>
                      </div>
                    ))}
                </div>

                {assessedMockTrends.length ? (
                  <div className="mt-4 rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4">
                    <p className="text-xs font-bold">
                      Trend cùng role/profile,{" "}
                      {mockTrends.planMode === "targeted"
                        ? `targeted ${
                            worldQuantCompetencies[
                              mockTrends.targetCompetency!
                            ].shortLabel
                          }`
                        : "balanced"}{" "}
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
                              · n={trend.count}
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[10px] leading-4 text-[#64736c]">
                      Chỉ so competency đã được chấm; “Chưa hỏi” không bị biến
                      thành 0. Có {mockTrends.comparableAttemptCount} attempt
                      cùng version để đối chiếu.
                    </p>
                  </div>
                ) : null}

                {latestMockRemediation?.recommendations.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold">
                      Remediation từ gap đã được chấm
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {latestMockRemediation.recommendations
                        .slice(0, 2)
                        .map((option) => (
                          <div
                            key={option.competency}
                            className="rounded-xl border border-[#173f35]/10 p-3"
                          >
                            <p className="text-xs font-semibold">
                              #{option.rank}{" "}
                              {
                                worldQuantCompetencies[
                                  option.competency
                                ].shortLabel
                              }
                            </p>
                            <p className="mt-1 text-[10px] text-[#64736c]">
                              {option.availability === "focus_sprint"
                                ? `${option.plan.questions.length} thẻ approved`
                                : option.availability === "guide"
                                  ? "Có guide nền tảng"
                                  : option.availability === "content_gap"
                                    ? "Question bank chưa có card/guide phù hợp"
                                    : "Hiện chưa có item đến hạn cho gap này"}
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
                                className="mt-3 rounded-lg bg-[#173f35] px-3 py-2 text-[10px] font-bold text-white"
                              >
                                {option.availability === "focus_sprint"
                                  ? "Tạo Focus Sprint"
                                  : "Mở guide"}
                              </button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-xs leading-5 text-[#64736c]">
                  {mockHistoryAvailable
                    ? `${roleMockHistory.length} attempt v4 của role này được lưu theo account.`
                    : "Cloud history chưa cấu hình; Hub chỉ hiện dữ liệu server đã tải được."}
                </p>
              </>
            ) : completedMock ? (
              <>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-[#edf3e7] p-5">
                  <div>
                    <p className="text-4xl font-semibold">
                      {completedMock.report!.overallScore}
                      <span className="text-lg text-[#64736c]">/100</span>
                    </p>
                    <p className="mt-2 text-sm text-[#64736c]">
                      {formatMockReadiness(completedMock.report!.readiness)} ·
                      bắt đầu {formatDateTime(completedMock.startedAt)}
                    </p>
                  </div>
                  <Link
                    href={balancedMockHref}
                    className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white"
                  >
                    Xem / làm lại
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {mockCompetencyKeys
                    .map((key) => ({
                      legacyKey: key,
                      assessment: completedMock.report!.competencies[key],
                      mapped: mapLegacyMockCompetency({ key }),
                    }))
                    .filter(
                      (item) =>
                        item.assessment.status === "assessed" &&
                        item.assessment.score !== null,
                    )
                    .map((item) => (
                      <div
                        key={item.legacyKey}
                        className="rounded-xl border border-[#173f35]/10 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold">
                            {mockCompetencyLabels[item.legacyKey]}
                          </span>
                          <span className="font-mono text-xs font-bold">
                            {item.assessment.score}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-[#64736c]">
                          Map sang{" "}
                          {worldQuantCompetencies[item.mapped.key].shortLabel}
                          {item.mapped.granularity === "legacy_fallback"
                            ? " (legacy)"
                            : ""}
                        </p>
                      </div>
                    ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-[#64736c]">
                  Mock v3 chỉ lưu report gần nhất trong browser. Điểm này được
                  hiển thị riêng và chưa cộng vào Preparation Index để tránh
                  trộn bằng chứng không tương đương.
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#173f35]/20 p-6">
                <p className="font-semibold">Chưa có mock report hoàn chỉnh.</p>
                <p className="mt-2 text-sm leading-6 text-[#64736c]">
                  Làm một set 30 phút để có rubric feedback cho C++, Tick,
                  performance, engineering quality và ownership.
                </p>
                <Link
                  href={balancedMockHref}
                  className="mt-5 inline-flex rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white"
                >
                  Bắt đầu mock
                </Link>
              </div>
            )}
          </Panel>
        </section>

        {!account ? (
          <section className="mt-5 rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-semibold">
                Tiến độ hiện đang nằm trong trình duyệt này.
              </p>
              <p className="mt-1 text-sm text-[#64736c]">
                {cloudEnabled
                  ? "Đăng nhập GitHub để merge tiến độ cloud khi đổi thiết bị."
                  : "Supabase chưa được cấu hình; hub vẫn dùng đầy đủ ở local mode."}
              </p>
            </div>
            {cloudEnabled ? (
              <form
                action={`/auth/login?next=${encodeURIComponent("/worldquant")}`}
                method="post"
                className="mt-4 sm:mt-0"
              >
                <button className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white">
                  Đăng nhập GitHub
                </button>
              </form>
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
    <article className="flex min-w-0 flex-col justify-between rounded-[2rem] bg-[#173f35] p-7 text-white shadow-[0_24px_80px_rgb(23_63_53_/_18%)] sm:p-9">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
            Preparation Index
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
          Chỉ số evidence trong app, không phải xác suất đậu. Khi coverage thấp,
          điểm thấp chủ yếu nói rằng bank chưa đủ dữ liệu.
        </p>
      </div>
      <div className="mt-8">
        <div className="flex items-center justify-between text-xs">
          <span>Weighted coverage</span>
          <span className="font-mono font-bold">{coveragePercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#d7ff91]"
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/45">
          {verifiedCount} repo-verified · {approvedCount} owner-approved
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
    <article className="min-w-0 rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{definition.label}</h3>
            {core ? (
              <span className="rounded-full bg-[#f1d6c9] px-2 py-1 font-mono text-[9px] font-bold text-[#8e3825] uppercase">
                Core
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#64736c]">
            {definition.description}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold">{competency.weight}%</p>
          <p className="text-[10px] text-[#64736c]">role weight</p>
        </div>
      </div>
      <ProgressRow
        label="Prepared"
        value={competency.preparedPercent}
        tone="green"
      />
      <ProgressRow
        label="Coverage"
        value={competency.coveragePercent}
        tone="orange"
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64736c]">
        <span>
          {competency.effectiveCount}/{competency.target} evidence ·{" "}
          {competency.matureCount} mature
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
        className="mt-4 inline-flex rounded-xl border border-[#173f35]/15 bg-white px-3 py-2 text-[11px] font-bold text-[#173f35]"
      >
        Luyện targeted mock
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
        <span className="font-semibold text-[#64736c]">{label}</span>
        <span className="font-mono font-bold">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#173f35]/8">
        <div
          className={`h-full rounded-full ${
            tone === "green" ? "bg-[#356b58]" : "bg-[#d08a36]"
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
    <section className="min-w-0 rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-6 shadow-[0_18px_60px_rgb(23_63_53_/_6%)] sm:p-7">
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
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
    <article className="min-w-0 rounded-2xl border border-[#173f35]/10 bg-white/65 p-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#64736c] uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[#64736c]">{note}</p>
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
      className="rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-white/60"
    >
      {children}
    </Link>
  );
}

function subscribeToHubPreferences(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === HUB_PREFERENCES_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(HUB_PREFERENCES_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HUB_PREFERENCES_CHANGED_EVENT, callback);
  };
}

function readHubPreferencesSnapshot() {
  try {
    return (
      window.localStorage.getItem(HUB_PREFERENCES_STORAGE_KEY) ??
      EMPTY_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_STORAGE_SNAPSHOT;
  }
}

function writeHubPreferences(preferences: HubPreferences) {
  try {
    window.localStorage.setItem(
      HUB_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
    window.dispatchEvent(new Event(HUB_PREFERENCES_CHANGED_EVENT));
  } catch {
    // The hub remains usable with defaults when browser storage is unavailable.
  }
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
  if (!raw || raw === EMPTY_STORAGE_SNAPSHOT) return fallback;
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

function subscribeToMockSession(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === MOCK_INTERVIEW_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readMockSessionSnapshot() {
  try {
    return (
      window.localStorage.getItem(MOCK_INTERVIEW_STORAGE_KEY) ??
      EMPTY_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_STORAGE_SNAPSHOT;
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

function subscribeToFocusSession(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FOCUS_SESSION_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readFocusSessionSnapshot() {
  try {
    return (
      window.localStorage.getItem(FOCUS_SESSION_STORAGE_KEY) ??
      EMPTY_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_STORAGE_SNAPSHOT;
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
    "Ưu tiên gap có weight cao nhất, review queue mỗi ngày và một mock mỗi tuần.";
  if (daysRemaining === 0) {
    message =
      "Target date đã tới hoặc đã qua. Giữ review ngắn, làm một mock và tập trung vào 2 gap có weight cao nhất.";
  } else if (daysRemaining <= 14) {
    message = `Sprint ngắn: ${learningGaps} learning gap cần luyện trực tiếp; ${contentGaps} content gap nên bù bằng guide và mock thay vì hiểu nhầm là điểm yếu cá nhân.`;
  } else if (readiness.coveragePercent < 60) {
    message = `Bank còn ${contentGaps} content gap. Dùng guide cho phần thiếu, giữ review hằng ngày và chuyển dần sang mock khi coverage tăng.`;
  }
  return { daysRemaining, availableHours, message };
}

function focusQueueReasonLabel(reason: FocusQueueReason) {
  return {
    due_relearning: "Quá hạn · relearning",
    due_leech: "Quá hạn · leech",
    due: "Đến hạn",
    relearning: "Đang relearning",
    leech: "Leech cần củng cố",
    learning: "Đang học",
    new: "Thẻ mới",
  }[reason];
}

function focusPlanCtaLabel(
  plan: WorldQuantFocusPlan,
  hasActiveSession: boolean,
) {
  if (plan.questions.length > 0) {
    return hasActiveSession ? "Bắt đầu sprint mới" : "Bắt đầu Focus Sprint";
  }
  if (plan.fallbacks.some((fallback) => fallback.kind === "guide")) {
    return "Mở guide phù hợp";
  }
  return "Xem giới hạn content";
}

function targetedFocusCtaLabel(plan: WorldQuantFocusPlan) {
  if (plan.questions.length > 0) return "Luyện gap này";
  if (plan.fallbacks.some((fallback) => fallback.kind === "guide")) {
    return "Mở guide";
  }
  return "Chưa có bank";
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
    return "Content gap: bank chưa đủ bằng chứng đã kiểm chứng.";
  }
  if (gapKind === "mixed") {
    return "Mixed gap: bank còn thiếu và phần hiện có cũng chưa được luyện đủ.";
  }
  return "Learning gap: content đã có nhưng chưa được luyện đủ.";
}

function gapLabel(gapKind: CompetencyReadiness["gapKind"]) {
  if (gapKind === "mixed") return "content + learning gap";
  return gapKind === "content" ? "content gap" : "learning gap";
}

function gapToneClass(gapKind: CompetencyReadiness["gapKind"]) {
  return gapKind === "learning"
    ? "font-bold text-[#356b58]"
    : "font-bold text-[#8e3825]";
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

function formatMockReadiness(
  readiness: "not_ready" | "developing" | "interview_ready" | "strong",
) {
  return {
    not_ready: "Cần luyện thêm",
    developing: "Đang phát triển",
    interview_ready: "Interview-ready",
    strong: "Strong",
  }[readiness];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
