"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  MOCK_INTERVIEW_STORAGE_KEY,
  parseMockInterviewSession,
} from "@/lib/mock-interview/session";
import {
  mockCompetencyKeys,
  mockCompetencyLabels,
} from "@/lib/mock-interview/profile";
import type { PracticeAccount } from "@/lib/practice/cloud-server";
import {
  buildAnkiDailyQueue,
  buildLearningStates,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
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
  buildWorldQuantReadiness,
  DEFAULT_WORLDQUANT_ROLE_PROFILE_ID,
  isValidReadinessDateKey,
  mapLegacyMockCompetency,
  parseWorldQuantRoleProfile,
  worldQuantCompetencies,
  worldQuantRoleProfileById,
  worldQuantRoleProfiles,
  type CompetencyReadiness,
  type ReadinessHeadlineStatus,
  type ReadinessQuestionSummary,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

const HUB_PREFERENCES_STORAGE_KEY = "recall:worldquant-hub:v1";
const HUB_PREFERENCES_CHANGED_EVENT = "recall:worldquant-hub-changed";
const EMPTY_STORAGE_SNAPSHOT = "__empty__";

type HubPreferences = {
  roleId: WorldQuantRoleProfileId;
  targetDate: string;
  minutesPerDay: number;
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
  initialCloudProgress,
  initialQuestionStates,
  account,
  cloudEnabled,
  cloudError,
  today,
}: {
  questions: ReadinessQuestionSummary[];
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  account: PracticeAccount | null;
  cloudEnabled: boolean;
  cloudError: boolean;
  today: string;
}) {
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
  const preferences = useMemo(
    () => parseHubPreferences(preferencesSnapshot, today),
    [preferencesSnapshot, today],
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
  const plan = buildTargetPlan({
    today,
    targetDate: preferences.targetDate,
    minutesPerDay: preferences.minutesPerDay,
    readiness,
  });
  const completedMock =
    mockSession?.status === "completed" && mockSession.report
      ? mockSession
      : null;

  function updatePreferences(next: Partial<HubPreferences>) {
    writeHubPreferences({ ...preferences, ...next });
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
            <HeaderLink href="/mock-interview">Mock interview</HeaderLink>
            <HeaderLink href="/stats">Thống kê</HeaderLink>
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
              completedMock ? `${completedMock.report!.overallScore}/100` : "Chưa có"
            }
            note={
              completedMock
                ? "Hiển thị riêng, chưa trộn vào index"
                : "Làm mock để thêm bằng chứng phỏng vấn"
            }
          />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel eyebrow="Next action" title="Kế hoạch hôm nay">
            {dailyQueue.length > 0 ? (
              <>
                <p className="mt-3 text-sm leading-6 text-[#64736c]">
                  Queue dùng đúng giới hạn toàn app: tối đa 1 thẻ mới và 5 thẻ
                  review, không nhân quota theo từng competency.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dailyQueue.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-[10px] font-bold text-[#ba4b2f] uppercase">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-[#64736c]">
                          ~{question.estimatedMinutes} phút
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">
                        {worldQuantCompetencies[question.competency].shortLabel}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-[#64736c]">
                        {question.id}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-[#173f35]/20 p-5 text-sm text-[#64736c]">
                Queue hôm nay đã trống. Dùng custom study hoặc làm mock để tiếp
                tục luyện theo gap.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
              >
                Bắt đầu review
              </Link>
              <Link
                href="/mock-interview"
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
                    {plan.daysRemaining} ngày
                  </p>
                </div>
                <p className="font-mono text-xs text-white/55">
                  {plan.availableHours} giờ khả dụng
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">
                {plan.message}
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
                      </div>
                    </div>
                    <Link
                      href={definition.practiceHref}
                      className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
                    >
                      {definition.practiceLabel}
                    </Link>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel eyebrow="Interview evidence" title="Mock gần nhất">
            {completedMock ? (
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
                    href="/mock-interview"
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
                  href="/mock-interview"
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
}: {
  competency: CompetencyReadiness;
  core: boolean;
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
