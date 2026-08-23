"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { EvidenceProjection } from "@/lib/evidence/engine";
import type { QuestionLearningState } from "@/lib/practice/learning-state";
import {
  buildLearningStates,
  filterReviewsForLearningHistory,
} from "@/lib/practice/learning-state";
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
  buildWorldQuantMission,
  type WorldQuantMissionItem,
  worldQuantAttemptMatchesDrill,
} from "@/lib/worldquant/mission";
import {
  isWorldQuantMissionComplete,
  nextWorldQuantMissionStep,
  withWorldQuantMissionReturn,
} from "@/lib/worldquant/guided-mode";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import {
  ensureWorldQuantMissionSnapshot,
  forgetTabMissionSnapshotFallback,
  readTabMissionSnapshotFallback,
  readWorldQuantMissionSnapshot,
  rememberTabMissionSnapshotFallback,
  restoreOrBuildWorldQuantMission,
  syncWorldQuantMissionSnapshotToCloud,
  subscribeToWorldQuantMissionSnapshot,
} from "@/lib/worldquant/mission-snapshot";
import {
  parseWorldQuantTrainingState,
  readWorldQuantTrainingStateSnapshot,
  recordMissionCompletion,
  resolveRepairCard,
  syncWorldQuantTrainingStateToCloud,
  subscribeToWorldQuantTrainingState,
  writeWorldQuantTrainingStateLocked,
} from "@/lib/worldquant/training-state";
import {
  worldQuantCompetencies,
  worldQuantRoleProfiles,
  type ReadinessQuestionSummary,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

import { prepareFocusSprint } from "../focus-sprint";

export type MissionMockCompletion = {
  roleProfileId: string;
  roleProfileVersion: number;
  durationMinutes: number;
  mode: "balanced" | "targeted";
  targetCompetency: string | null;
  completedAt: string;
  completedOn: string;
};

export function WorldQuantMissionApp({
  accountId,
  initialRoleId,
  initialMinutes,
  questions,
  initialCloudProgress,
  initialQuestionStates,
  today,
  initialMockCompletions,
  initialEvidenceProjection,
  mockAvailable,
}: {
  accountId: string | null;
  initialRoleId: WorldQuantRoleProfileId;
  initialMinutes: number;
  questions: ReadinessQuestionSummary[];
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  today: string;
  initialMockCompletions: MissionMockCompletion[];
  initialEvidenceProjection: EvidenceProjection;
  mockAvailable: boolean;
}) {
  useEffect(() => {
    void syncWorldQuantTrainingStateToCloud(accountId);
  }, [accountId]);
  const subscribeToScopedProgress = useMemo(
    () => (callback: () => void) =>
      subscribeToPracticeProgress(accountId, callback),
    [accountId],
  );
  const readScopedProgress = useMemo(
    () => () => readPracticeProgressSnapshot(accountId),
    [accountId],
  );
  const [roleId, setRoleId] = useState(initialRoleId);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [draftRoleId, setDraftRoleId] = useState(initialRoleId);
  const [draftMinutes, setDraftMinutes] = useState(initialMinutes);
  const [snapshotWarning, setSnapshotWarning] =
    useState<string | null>(null);
  const [revealedRepairs, setRevealedRepairs] = useState<Set<string>>(
    () => new Set(),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const progressSnapshot = useSyncExternalStore(
    subscribeToScopedProgress,
    readScopedProgress,
    () => null,
  );
  const localProgress = useMemo(
    () =>
      parseProgress(
        progressSnapshot === EMPTY_PROGRESS_STORAGE_SNAPSHOT
          ? null
          : progressSnapshot,
      ),
    [progressSnapshot],
  );
  const subscribeToTraining = useMemo(
    () => (callback: () => void) =>
      subscribeToWorldQuantTrainingState(accountId, callback),
    [accountId],
  );
  const readTrainingSnapshot = useMemo(
    () => () => readWorldQuantTrainingStateSnapshot(accountId),
    [accountId],
  );
  const trainingSnapshot = useSyncExternalStore(
    subscribeToTraining,
    readTrainingSnapshot,
    () => null,
  );
  const trainingState = useMemo(
    () => parseWorldQuantTrainingState(trainingSnapshot),
    [trainingSnapshot],
  );
  const missionScope = useMemo(
    () => ({
      accountId,
      date: today,
      roleProfileId: roleId,
      timeBudgetMinutes: minutes,
    }),
    [accountId, minutes, roleId, today],
  );
  useEffect(() => {
    void syncWorldQuantMissionSnapshotToCloud(missionScope);
  }, [missionScope]);
  const subscribeToMissionSnapshot = useMemo(
    () => (callback: () => void) =>
      subscribeToWorldQuantMissionSnapshot(
        missionScope,
        callback,
      ),
    [missionScope],
  );
  const readMissionSnapshot = useMemo(
    () => () => readWorldQuantMissionSnapshot(missionScope),
    [missionScope],
  );
  const rawMissionSnapshot = useSyncExternalStore(
    subscribeToMissionSnapshot,
    readMissionSnapshot,
    () => null,
  );

  const progress = useMemo(
    () => {
      const merged = mergeProgress(
        initialCloudProgress,
        localProgress,
      );
      return {
        ...merged,
        reviews: filterReviewsForLearningHistory(
          merged.reviews,
          initialQuestionStates,
        ),
      };
    },
    [initialCloudProgress, initialQuestionStates, localProgress],
  );
  const planningStates = useMemo(
    () =>
      buildLearningStates(
        questions.map((question) => ({
          id: question.id,
          version: question.version,
          sourceHash: question.sourceHash,
        })),
        progress.reviews,
        initialQuestionStates,
      ),
    [initialQuestionStates, progress.reviews, questions],
  );

  const frozenMission = useMemo(
    () => {
      const cachedRaw = hydrated
        ? readTabMissionSnapshotFallback(
            missionScope,
            rawMissionSnapshot,
          )
        : null;
      const useCached = cachedRaw !== null;
      const restored = restoreOrBuildWorldQuantMission({
        rawSnapshot: useCached
          ? cachedRaw
          : rawMissionSnapshot,
        scope: {
          date: today,
          roleProfileId: roleId,
          timeBudgetMinutes: minutes,
        },
        questions,
        trainingState,
        mockAvailable,
        attemptEvidence: initialEvidenceProjection,
        build: () =>
          buildWorldQuantMission({
            roleProfileId: roleId,
            questions,
            states: planningStates,
            trainingState,
            today,
            timeBudgetMinutes: minutes,
            mockAvailable,
            attemptEvidence: initialEvidenceProjection,
            daysSinceComparableMock: daysSinceLatestMock(
              initialMockCompletions,
              roleId,
              today,
            ),
          }),
      });
      return {
        ...restored,
        restoredFromStorage: restored.restored && !useCached,
      };
    },
    [
      initialMockCompletions,
      initialEvidenceProjection,
      hydrated,
      minutes,
      mockAvailable,
      missionScope,
      planningStates,
      questions,
      rawMissionSnapshot,
      roleId,
      today,
      trainingState,
    ],
  );
  const mission = frozenMission.mission;

  useEffect(() => {
    if (!hydrated || frozenMission.restoredFromStorage) return;
    let cancelled = false;
    rememberTabMissionSnapshotFallback(
      missionScope,
      rawMissionSnapshot,
      frozenMission.snapshot,
    );
    void ensureWorldQuantMissionSnapshot(
      missionScope,
      frozenMission.snapshot,
      { replaceExisting: rawMissionSnapshot !== null },
    )
      .then((persisted) => {
        if (cancelled) return;
        if (persisted) {
          forgetTabMissionSnapshotFallback(missionScope);
        }
        setSnapshotWarning(
          persisted
            ? null
            : "Không lưu được bản kế hoạch; kế hoạch vẫn được giữ trong trang này nhưng có thể được tạo lại sau khi tải lại.",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshotWarning(
            "Không lưu được bản kế hoạch; kế hoạch vẫn được giữ trong trang này nhưng có thể được tạo lại sau khi tải lại.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    frozenMission,
    hydrated,
    missionScope,
    rawMissionSnapshot,
  ]);

  const completedIds = useMemo(
    () =>
      new Set(
        trainingState.missionCompletions
          .filter(
            (completion) =>
              completion.missionId === mission.missionId,
          )
          .map((completion) => completion.itemId),
      ),
    [mission.missionId, trainingState.missionCompletions],
  );
  const derivedCompletedIds = useMemo(() => {
    const derived = new Set(completedIds);
    for (const item of mission.items) {
      if (
        item.kind === "flashcards" &&
        item.focusPlan.questions.every((planned) =>
          progress.reviews.some(
            (review) =>
              review.questionId === planned.question.id &&
              review.reviewedOn === today &&
              review.questionVersion ===
                planned.question.version &&
              review.sourceHash ===
                planned.question.sourceHash,
          ),
        )
      ) {
        derived.add(item.id);
      }
      if (
        item.kind === "drill" &&
        trainingState.attempts.some(
          (attempt) =>
            worldQuantAttemptMatchesDrill(attempt, item.drill) &&
            vietnamDateKey(new Date(attempt.completedAt)) ===
              today,
        )
      ) {
        derived.add(item.id);
      }
      if (
        item.kind === "mock" &&
        initialMockCompletions.some(
          (completion) =>
            mockCompletionMatches(
              completion,
              item,
              roleId,
            ) && completion.completedOn === today,
        )
      ) {
        derived.add(item.id);
      }
    }
    return derived;
  }, [
    completedIds,
    initialMockCompletions,
    mission.items,
    progress.reviews,
    roleId,
    today,
    trainingState.attempts,
  ]);
  const actionableItems = mission.items.filter(
    (item) => item.kind !== "content_gap",
  );
  const completedCount = actionableItems.filter((item) =>
    derivedCompletedIds.has(item.id),
  ).length;
  const contentGapItems = mission.items.filter(
    (item): item is Extract<
      WorldQuantMissionItem,
      { kind: "content_gap" }
    > => item.kind === "content_gap",
  );
  const nextStep = nextWorldQuantMissionStep(
    mission.items,
    derivedCompletedIds,
  );
  const missionComplete = isWorldQuantMissionComplete(
    mission.items,
    derivedCompletedIds,
  );

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <p className="font-mono text-sm text-[#526276]">
          Đang khôi phục đúng kế hoạch đã lưu…
        </p>
      </main>
    );
  }

  function startFlashcards(
    item: Extract<WorldQuantMissionItem, { kind: "flashcards" }>,
  ) {
    const destination = prepareFocusSprint(item.focusPlan, {
      accountId,
    });
    if (destination.kind === "practice") {
      window.location.assign(
        withWorldQuantMissionReturn(
          destination.href,
          roleId,
          minutes,
        ),
      );
      return;
    }
    if (destination.kind === "guide") {
      window.location.assign(destination.href);
      return;
    }
    setNotice(destination.message);
  }

  function applyMissionSettings() {
    setSnapshotWarning(null);
    setRoleId(draftRoleId);
    setMinutes(draftMinutes);
    updateMissionUrl(draftRoleId, draftMinutes);
  }

  async function completeRepair(
    item: Extract<WorldQuantMissionItem, { kind: "repair" }>,
  ) {
    let next = resolveRepairCard(
      trainingState,
      item.repairCard.id,
      new Date().toISOString(),
    );
    next = recordMissionCompletion(next, {
      missionId: mission.missionId,
      itemId: item.id,
      completedAt: new Date().toISOString(),
    });
    const persisted = await writeWorldQuantTrainingStateLocked(
      accountId,
      next,
    ).catch(() => null);
    if (!persisted) {
      setNotice(
        "Không lưu được kết quả ôn lại; bước này chưa được đánh dấu hoàn tất. Hãy thử lại.",
      );
      return;
    }
    setNotice(null);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1350px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
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
                Nhiệm vụ hôm nay
              </span>
              <span className="block text-xs text-[#526276]">
                {today} · kế hoạch được giữ nguyên trong ngày
              </span>
            </span>
          </Link>
          <nav
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
            aria-label="Điều hướng nhiệm vụ"
          >
            <HeaderLink
              href={worldQuantRoleHref("/worldquant", roleId)}
            >
              Trung tâm chuẩn bị
            </HeaderLink>
            <HeaderLink href="/">Luyện thẻ</HeaderLink>
            <details className="group relative w-full sm:w-auto">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-[#0f3a69]/12 bg-white/65 px-4 py-2 text-sm font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none sm:justify-start [&::-webkit-details-marker]:hidden">
                Nâng cao
                <span
                  aria-hidden="true"
                  className="transition group-open:rotate-180"
                >
                  ↓
                </span>
              </summary>
              <div className="mt-2 grid w-full gap-1 rounded-2xl border border-[#0f3a69]/12 bg-[#f8fafc] p-2 shadow-[0_18px_60px_rgb(15_58_105_/_12%)] sm:absolute sm:right-0 sm:z-30 sm:w-64">
                <HeaderLink
                  href={worldQuantRoleHref(
                    "/worldquant/drills",
                    roleId,
                  )}
                >
                  Phòng luyện tình huống
                </HeaderLink>
                <HeaderLink
                  href={worldQuantRoleHref(
                    "/worldquant/curriculum",
                    roleId,
                  )}
                >
                  Lộ trình kiến thức
                </HeaderLink>
                <HeaderLink
                  href={worldQuantRoleHref(
                    "/worldquant/full-round",
                    roleId,
                  )}
                >
                  Buổi mô phỏng phỏng vấn đầy đủ
                </HeaderLink>
                <HeaderLink href="/stats">Thống kê</HeaderLink>
              </div>
            </details>
          </nav>
        </header>

        {notice ? (
          <p className="mt-5 rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] p-3 text-sm text-[#c43d3d]">
            {notice}
          </p>
        ) : null}
        {snapshotWarning ? (
          <p className="mt-5 rounded-xl border border-[#b8882f]/25 bg-[#f8edcf] p-3 text-sm text-[#70551e]">
            {snapshotWarning}
          </p>
        ) : null}

        <section
          aria-live="polite"
          className={`mt-6 w-full min-w-0 max-w-full rounded-[1.25rem] border p-6 shadow-[0_20px_70px_rgb(15_58_105_/_8%)] sm:p-8 ${
            nextStep
              ? "border-[#0f3a69]/12 bg-[#0f3a69] text-white"
              : missionComplete
                ? "border-[#285f86]/20 bg-[#eaf2f8]"
                : "border-[#b8882f]/25 bg-[#f8edcf]"
          }`}
        >
          {nextStep ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 max-w-3xl">
                  <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
                    Bước tiếp theo · {nextStep.position}/{nextStep.total}
                  </p>
                  <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                    {itemTitle(nextStep.item)}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    {nextStep.item.reason}
                  </p>
                </div>
                <MissionAction
                  item={nextStep.item}
                  completed={false}
                  prominent
                  revealedRepair={revealedRepairs.has(
                    nextStep.item.id,
                  )}
                  onRevealRepair={() =>
                    setRevealedRepairs((current) => {
                      const next = new Set(current);
                      next.add(nextStep.item.id);
                      return next;
                    })
                  }
                  onCompleteRepair={() =>
                    nextStep.item.kind === "repair"
                      ? completeRepair(nextStep.item)
                      : undefined
                  }
                  onStartFlashcards={() =>
                    nextStep.item.kind === "flashcards"
                      ? startFlashcards(nextStep.item)
                      : undefined
                  }
                  roleId={roleId}
                  missionMinutes={minutes}
                />
              </div>
              {nextStep.item.kind === "repair" &&
              revealedRepairs.has(nextStep.item.id) ? (
                <div className="mt-5 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/82">
                  {nextStep.item.repairCard.explanation}
                </div>
              ) : null}
            </>
          ) : missionComplete ? (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#285f86] uppercase">
                  Nhiệm vụ hoàn tất
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Xong buổi học hôm nay.
                </h1>
                <p className="mt-2 text-sm text-[#526276]">
                  Kết quả đã được lưu. Ngày mai nhiệm vụ sẽ tự chọn danh sách
                  học mới.
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                <Link
                  href={worldQuantRoleHref("/worldquant", roleId)}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#0f3a69] px-5 py-3 text-center text-sm font-bold text-white sm:flex-none"
                >
                   Về Trung tâm chuẩn bị
                </Link>
                <Link
                  href={worldQuantRoleHref(
                    "/worldquant/full-round",
                    roleId,
                  )}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-center text-sm font-bold sm:flex-none"
                >
                  Luyện buổi mô phỏng phỏng vấn đầy đủ
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="min-w-0 max-w-3xl">
                <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                  Chưa thể hoàn tất toàn bộ nhiệm vụ
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  {actionableItems.length > 0
                    ? "Các bước luyện có thể làm đã xong."
                    : "Hôm nay chưa có bước luyện nào có thể làm."}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#765c39]">
                  {contentGapItems.length > 0
                    ? `Còn ${contentGapItems.length} phần học liệu chưa đủ trong kho câu hỏi. Đây là giới hạn nội dung, không phải bằng chứng rằng bạn đã thành thạo năng lực đó.`
                    : "Thời lượng hiện tại chưa xếp được bước phù hợp. Hãy tăng thời gian hoặc quay lại Trung tâm chuẩn bị để đổi kế hoạch."}
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                {contentGapItems[0]?.href ? (
                  <Link
                    href={contentGapItems[0].href}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#0f3a69] px-5 py-3 text-center text-sm font-bold text-white sm:flex-none"
                  >
                    Mở học liệu còn thiếu
                  </Link>
                ) : null}
                <Link
                  href={worldQuantRoleHref("/worldquant", roleId)}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-center text-sm font-bold sm:flex-none"
                >
                   Về Trung tâm chuẩn bị
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 py-9 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              Nhiệm vụ hôm nay
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
               Một danh sách cho cả ghi nhớ, sửa lỗi và vận dụng.
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-[#526276]">
              Mỗi bước đều nói rõ lý do được chọn. Phần học liệu còn thiếu được
              báo riêng; kết quả phỏng vấn thử được theo dõi riêng và không tính
              vào chỉ số chuẩn bị.
            </p>
          </div>
          <details className="rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-3">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span>
                {worldQuantRoleProfiles.find(
                  (profile) => profile.id === roleId,
                )?.label ?? roleId}
                <span className="mt-1 block text-xs font-normal text-[#526276]">
                  {minutes} phút · bấm để tùy chỉnh
                </span>
              </span>
              <span aria-hidden="true">⚙</span>
            </summary>
            <div className="border-t border-[#0f3a69]/10 px-3 pt-4">
              <label className="block text-xs font-bold">
                 Vị trí
                <select
                  value={draftRoleId}
                  onChange={(event) =>
                    setDraftRoleId(
                      event.target.value as WorldQuantRoleProfileId,
                    )
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                >
                  {worldQuantRoleProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-xs font-bold">
                 Thời lượng: {draftMinutes} phút
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={draftMinutes}
                  onChange={(event) =>
                    setDraftMinutes(Number(event.target.value))
                  }
                  className="mt-2 w-full accent-[#0f3a69]"
                />
              </label>
              <button
                type="button"
                onClick={applyMissionSettings}
                disabled={
                  draftRoleId === roleId && draftMinutes === minutes
                }
                className="mt-4 min-h-11 w-full rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                Áp dụng kế hoạch
              </button>
            </div>
          </details>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Đã xong"
            value={`${completedCount}/${actionableItems.length}`}
          />
          <Metric
             label="Đã lên kế hoạch"
            value={`${mission.plannedMinutes} phút`}
          />
          <Metric
            label="Điểm cần ưu tiên cải thiện"
            value={
              worldQuantCompetencies[mission.primaryCompetency]
                .shortLabel
            }
          />
        </section>

        <details className="group mt-6 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/45 p-3 sm:p-4">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-white/65 px-4 py-3 font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <span>
              Xem toàn bộ kế hoạch
              <span className="mt-1 block text-xs font-normal text-[#526276]">
                {completedCount}/{actionableItems.length} bước đã xong
                {contentGapItems.length > 0
                  ? ` · ${contentGapItems.length} phần học liệu còn thiếu`
                  : ""}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="transition group-open:rotate-180"
            >
              ↓
            </span>
          </summary>
          <section className="mt-4 space-y-4">
            {mission.items.map((item, index) => {
              const completed = derivedCompletedIds.has(item.id);
              const isNext = item.id === nextStep?.item.id;
              return (
                <article
                  key={item.id}
                  aria-current={isNext ? "step" : undefined}
                  className={`rounded-[1.25rem] border p-5 sm:p-7 ${
                    completed
                      ? "border-[#285f86]/20 bg-[#eaf2f8]"
                      : isNext
                        ? "border-[#a65c0e]/35 bg-[#fff6ed]"
                        : "border-[#0f3a69]/12 bg-white/65"
                  }`}
                >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0f3a69] font-mono text-xs font-bold text-white">
                      {completed ? "✓" : index + 1}
                    </span>
                    <div>
                      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#a65c0e] uppercase">
                         {missionItemKindLabel(item.kind)}
                        {item.estimatedMinutes
                          ? ` · ${item.estimatedMinutes} phút`
                          : ""}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {itemTitle(item)}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526276]">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                  <MissionAction
                    item={item}
                    completed={completed}
                    revealedRepair={revealedRepairs.has(item.id)}
                    onRevealRepair={() =>
                      setRevealedRepairs((current) => {
                        const next = new Set(current);
                        next.add(item.id);
                        return next;
                      })
                    }
                    onCompleteRepair={() =>
                      item.kind === "repair"
                        ? completeRepair(item)
                        : undefined
                    }
                    onStartFlashcards={() =>
                      item.kind === "flashcards"
                        ? startFlashcards(item)
                        : undefined
                    }
                    roleId={roleId}
                    missionMinutes={minutes}
                  />
                </div>
                {item.kind === "repair" &&
                revealedRepairs.has(item.id) ? (
                  <div className="mt-4 ml-0 rounded-xl bg-white/75 p-4 text-sm leading-6 sm:ml-13">
                    {item.repairCard.explanation}
                  </div>
                ) : null}
                </article>
              );
            })}
          </section>
        </details>
      </div>
    </main>
  );
}

function MissionAction({
  item,
  completed,
  revealedRepair,
  onRevealRepair,
  onCompleteRepair,
  onStartFlashcards,
  roleId,
  missionMinutes,
  prominent = false,
}: {
  item: WorldQuantMissionItem;
  completed: boolean;
  revealedRepair: boolean;
  onRevealRepair: () => void;
  onCompleteRepair: () => void;
  onStartFlashcards: () => void;
  roleId: WorldQuantRoleProfileId;
  missionMinutes: number;
  prominent?: boolean;
}) {
  const primaryClass = prominent
    ? "flex min-h-12 w-full items-center justify-center rounded-xl bg-[#65e6d2] px-6 py-3 text-sm font-bold text-[#0f3a69] transition hover:bg-[#8eebdc] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none sm:w-auto"
    : "min-h-11 rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none";
  const secondaryClass = prominent
    ? "flex min-h-12 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none sm:w-auto"
    : "min-h-11 rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-xs font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none";
  if (completed) {
    return (
      <span className="rounded-full bg-[#65e6d2] px-3 py-1 text-xs font-bold">
        Hoàn thành
      </span>
    );
  }
  if (item.kind === "repair") {
    return (
      <div className="flex w-full gap-2 sm:w-auto">
        {!revealedRepair ? (
          <button
            type="button"
            onClick={onRevealRepair}
            className={secondaryClass}
          >
             Xem giải thích
          </button>
        ) : (
          <button
            type="button"
            onClick={onCompleteRepair}
            className={primaryClass}
          >
            Đã ôn xong
          </button>
        )}
      </div>
    );
  }
  if (item.kind === "flashcards") {
    return (
      <button
        type="button"
        onClick={onStartFlashcards}
        className={primaryClass}
      >
         Bắt đầu phiên ôn trọng tâm
      </button>
    );
  }
  if (item.kind === "drill") {
    return (
      <Link
        href={withWorldQuantMissionReturn(
          `/worldquant/drills?role=${roleId}&competency=${item.competency}&drill=${item.drill.id}`,
          roleId,
          missionMinutes,
        )}
        className={primaryClass}
      >
         Làm bài luyện
      </Link>
    );
  }
  if (item.kind === "mock") {
    return (
      <Link
        href={withWorldQuantMissionReturn(
          item.href,
          roleId,
          missionMinutes,
        )}
        className={primaryClass}
      >
         Bắt đầu phỏng vấn thử
      </Link>
    );
  }
  return item.href ? (
    <Link
      href={item.href}
      className={secondaryClass}
    >
      Mở học liệu
    </Link>
  ) : (
    <span className="text-xs text-[#526276]">
       Cần bổ sung học liệu
    </span>
  );
}

function itemTitle(item: WorldQuantMissionItem) {
  if (item.kind === "repair") return item.repairCard.prompt;
  if (item.kind === "flashcards") {
    return `${item.focusPlan.questions.length} thẻ ghi nhớ đã duyệt`;
  }
  if (item.kind === "drill") return item.drill.title;
  if (item.kind === "mock") return "Bài phỏng vấn thử tổng hợp";
  return `Học liệu còn thiếu: ${worldQuantCompetencies[item.competency].label}`;
}

function missionItemKindLabel(kind: WorldQuantMissionItem["kind"]) {
  const labels: Record<WorldQuantMissionItem["kind"], string> = {
    repair: "ôn lại phần còn thiếu",
    flashcards: "thẻ ghi nhớ",
    drill: "bài luyện tình huống",
    mock: "phỏng vấn thử",
    content_gap: "học liệu còn thiếu",
  };
  return labels[kind];
}

function daysSinceLatestMock(
  completions: MissionMockCompletion[],
  roleProfileId: WorldQuantRoleProfileId,
  today: string,
) {
  const latest = completions
    .filter(
      (completion) =>
        completion.roleProfileId === roleProfileId &&
        completion.roleProfileVersion === 1 &&
        completion.durationMinutes === 30 &&
        completion.mode === "balanced" &&
        completion.targetCompetency === null,
    )
    .sort((left, right) =>
      right.completedAt.localeCompare(left.completedAt),
    )[0];
  if (!latest) return null;
  const from = Date.parse(`${latest.completedOn}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

function mockCompletionMatches(
  completion: MissionMockCompletion,
  item: Extract<WorldQuantMissionItem, { kind: "mock" }>,
  roleProfileId: WorldQuantRoleProfileId,
) {
  return (
    completion.roleProfileId === roleProfileId &&
    completion.roleProfileVersion === item.roleProfileVersion &&
    completion.durationMinutes === item.durationMinutes &&
    completion.mode === item.mode &&
    completion.targetCompetency === item.targetCompetency
  );
}

function vietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function updateMissionUrl(
  roleId: WorldQuantRoleProfileId,
  minutes: number,
) {
  const url = new URL(window.location.href);
  url.searchParams.set("role", roleId);
  url.searchParams.set("minutes", String(minutes));
  window.history.replaceState(null, "", url);
}

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-4">
      <p className="font-mono text-[10px] font-bold text-[#526276] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
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
      className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
    >
      {children}
    </Link>
  );
}
