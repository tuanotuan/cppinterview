"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { QuestionLearningState } from "@/lib/practice/learning-state";
import { buildLearningStates } from "@/lib/practice/learning-state";
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
} from "@/lib/worldquant/mission";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import {
  ensureWorldQuantMissionSnapshot,
  forgetTabMissionSnapshotFallback,
  readTabMissionSnapshotFallback,
  readWorldQuantMissionSnapshot,
  rememberTabMissionSnapshotFallback,
  restoreOrBuildWorldQuantMission,
  subscribeToWorldQuantMissionSnapshot,
} from "@/lib/worldquant/mission-snapshot";
import {
  parseWorldQuantTrainingState,
  readWorldQuantTrainingStateSnapshot,
  recordMissionCompletion,
  resolveRepairCard,
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
}: {
  accountId: string | null;
  initialRoleId: WorldQuantRoleProfileId;
  initialMinutes: number;
  questions: ReadinessQuestionSummary[];
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  today: string;
  initialMockCompletions: MissionMockCompletion[];
}) {
  const [roleId, setRoleId] = useState(initialRoleId);
  const [minutes, setMinutes] = useState(initialMinutes);
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
    subscribeToPracticeProgress,
    readPracticeProgressSnapshot,
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
    () => mergeProgress(initialCloudProgress, localProgress),
    [initialCloudProgress, localProgress],
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
        build: () =>
          buildWorldQuantMission({
            roleProfileId: roleId,
            questions,
            states: planningStates,
            trainingState,
            today,
            timeBudgetMinutes: minutes,
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
      hydrated,
      minutes,
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
            : "Không lưu được mission snapshot; plan vẫn khóa trong tab này nhưng có thể được build lại sau reload.",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshotWarning(
            "Không lưu được mission snapshot; plan vẫn khóa trong tab này nhưng có thể được build lại sau reload.",
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
            attempt.drillId === item.drill.id &&
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

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <p className="font-mono text-sm text-[#64736c]">
          Đang khôi phục exact mission snapshot…
        </p>
      </main>
    );
  }

  function startFlashcards(
    item: Extract<WorldQuantMissionItem, { kind: "flashcards" }>,
  ) {
    const destination = prepareFocusSprint(item.focusPlan);
    if (
      destination.kind === "practice" ||
      destination.kind === "guide"
    ) {
      window.location.assign(destination.href);
      return;
    }
    setNotice(destination.message);
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
        "Không lưu được repair completion; item chưa được đánh dấu xong. Hãy thử lại.",
      );
      return;
    }
    setNotice(null);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1350px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <span>
              <span className="block font-bold">
                Today&apos;s Mission
              </span>
              <span className="block text-xs text-[#64736c]">
                {today} · deterministic plan
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/drills",
                roleId,
              )}
            >
              Scenario Lab
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/curriculum",
                roleId,
              )}
            >
              Curriculum
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/full-round",
                roleId,
              )}
            >
              Full Round
            </HeaderLink>
          </nav>
        </header>

        <section className="grid gap-6 py-9 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              Mission v1
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Một queue cho cả nhớ, sửa lỗi và transfer.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#64736c]">
              Mỗi item nói rõ vì sao được chọn. Content gap được báo riêng;
              mock evidence không bị trộn vào Preparation Index.
            </p>
          </div>
          <div className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-5">
            <label className="block text-xs font-bold">
              Role
              <select
                value={roleId}
                onChange={(event) => {
                  const nextRole =
                    event.target.value as WorldQuantRoleProfileId;
                  setSnapshotWarning(null);
                  setRoleId(nextRole);
                  updateMissionUrl(nextRole, minutes);
                }}
                className="mt-2 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2"
              >
                {worldQuantRoleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold">
              Budget: {minutes} phút
              <input
                type="range"
                min={15}
                max={120}
                step={15}
                value={minutes}
                onChange={(event) => {
                  const nextMinutes = Number(event.target.value);
                  setSnapshotWarning(null);
                  setMinutes(nextMinutes);
                  updateMissionUrl(roleId, nextMinutes);
                }}
                className="mt-2 w-full"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Đã xong"
            value={`${completedCount}/${actionableItems.length}`}
          />
          <Metric
            label="Planned"
            value={`${mission.plannedMinutes} phút`}
          />
          <Metric
            label="Primary gap"
            value={
              worldQuantCompetencies[mission.primaryCompetency]
                .shortLabel
            }
          />
        </section>

        {notice ? (
          <p className="mt-5 rounded-xl border border-[#ba4b2f]/20 bg-[#f8e8df] p-3 text-sm text-[#8e3825]">
            {notice}
          </p>
        ) : null}
        {snapshotWarning ? (
          <p className="mt-5 rounded-xl border border-[#b8882f]/25 bg-[#f8edcf] p-3 text-sm text-[#70551e]">
            {snapshotWarning}
          </p>
        ) : null}

        <section className="mt-6 space-y-4">
          {mission.items.map((item, index) => {
            const completed = derivedCompletedIds.has(item.id);
            return (
              <article
                key={item.id}
                className={`rounded-[2rem] border p-5 sm:p-7 ${
                  completed
                    ? "border-[#356b58]/20 bg-[#edf3e7]"
                    : "border-[#173f35]/12 bg-white/65"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#173f35] font-mono text-xs font-bold text-white">
                      {completed ? "✓" : index + 1}
                    </span>
                    <div>
                      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#ba4b2f] uppercase">
                        {item.kind.replaceAll("_", " ")}
                        {item.estimatedMinutes
                          ? ` · ${item.estimatedMinutes} phút`
                          : ""}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {itemTitle(item)}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736c]">
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
}: {
  item: WorldQuantMissionItem;
  completed: boolean;
  revealedRepair: boolean;
  onRevealRepair: () => void;
  onCompleteRepair: () => void;
  onStartFlashcards: () => void;
  roleId: WorldQuantRoleProfileId;
}) {
  if (completed) {
    return (
      <span className="rounded-full bg-[#d7ff91] px-3 py-1 text-xs font-bold">
        Hoàn thành
      </span>
    );
  }
  if (item.kind === "repair") {
    return (
      <div className="flex gap-2">
        {!revealedRepair ? (
          <button
            type="button"
            onClick={onRevealRepair}
            className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
          >
            Mở feedback
          </button>
        ) : (
          <button
            type="button"
            onClick={onCompleteRepair}
            className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
          >
            Đã retrieval lại
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
        className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
      >
        Bắt đầu Focus
      </button>
    );
  }
  if (item.kind === "drill") {
    return (
      <Link
        href={`/worldquant/drills?role=${roleId}&competency=${item.competency}&drill=${item.drill.id}`}
        className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
      >
        Làm drill
      </Link>
    );
  }
  if (item.kind === "mock") {
    return (
      <Link
        href={item.href}
        className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
      >
        Bắt đầu mock
      </Link>
    );
  }
  return item.href ? (
    <Link
      href={item.href}
      className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold"
    >
      Mở nguồn
    </Link>
  ) : (
    <span className="text-xs text-[#64736c]">
      Cần bổ sung content
    </span>
  );
}

function itemTitle(item: WorldQuantMissionItem) {
  if (item.kind === "repair") return item.repairCard.prompt;
  if (item.kind === "flashcards") {
    return `${item.focusPlan.questions.length} approved flashcard`;
  }
  if (item.kind === "drill") return item.drill.title;
  if (item.kind === "mock") return "Balanced mock checkpoint";
  return `Content gap: ${worldQuantCompetencies[item.competency].label}`;
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
    <div className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-4">
      <p className="font-mono text-[10px] font-bold text-[#64736c] uppercase">
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
