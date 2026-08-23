"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { WorldQuantConceptId } from "@/lib/worldquant/curriculum";
import {
  completeDrillAndReconcileGap,
} from "@/lib/worldquant/gap-closure";
import {
  drillsForCompetency,
  worldQuantDrillPacks,
  worldQuantDrills,
  type WorldQuantDrill,
} from "@/lib/worldquant/drills";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import {
  EMPTY_WORLDQUANT_TRAINING_STATE,
  gapForCompetency,
  isCheckpointRetestEligible,
  mutateWorldQuantTrainingStateLocked,
  readWorldQuantTrainingState,
  recordCheckpointExposureLocked,
  syncWorldQuantTrainingStateToCloud,
  subscribeToWorldQuantTrainingState,
  wasCheckpointExposed,
  type WorldQuantTrainingState,
} from "@/lib/worldquant/training-state";
import {
  worldQuantCompetencies,
  worldQuantRoleProfileById,
  worldQuantRoleProfiles,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

export type DrillWarmupCard = {
  id: string;
  version: number;
  sourceHash: string;
  competency: WorldQuantCompetencyKey;
  conceptIds: WorldQuantConceptId[];
  prompt: string;
  hint: string;
  answer: string;
  personalRemediation: boolean;
};

type DrillStage =
  | "overview"
  | "warmup"
  | "scenario"
  | "followup"
  | "rubric"
  | "result";

export function WorldQuantDrillApp({
  accountId,
  initialRoleId,
  initialCompetency,
  initialDrillId,
  missionReturnHref,
  warmupCards,
}: {
  accountId: string | null;
  initialRoleId: WorldQuantRoleProfileId;
  initialCompetency: WorldQuantCompetencyKey;
  initialDrillId: string | null;
  missionReturnHref: string | null;
  warmupCards: DrillWarmupCard[];
}) {
  useEffect(() => {
    void syncWorldQuantTrainingStateToCloud(accountId);
  }, [accountId]);
  const [roleId, setRoleId] = useState(initialRoleId);
  const [selectedCompetency, setSelectedCompetency] =
    useState(initialCompetency);
  const [selectedDrillId, setSelectedDrillId] = useState(
    initialDrillId ??
      worldQuantDrillPacks.find(
        (item) => item.competency === initialCompetency,
      )!.practice.id,
  );
  const [trainingState, setTrainingState] =
    useState<WorldQuantTrainingState>(
      EMPTY_WORLDQUANT_TRAINING_STATE,
    );
  const [stage, setStage] = useState<DrillStage>("overview");
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [warmupRevealed, setWarmupRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState(["", ""]);
  const [rubricChecked, setRubricChecked] = useState<Set<number>>(
    () => new Set(),
  );
  const [confidence, setConfidence] = useState(60);
  const [hintUsed, setHintUsed] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [unseenAtStart, setUnseenAtStart] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(
    null,
  );
  const [storagePending, setStoragePending] = useState(false);
  const storagePendingRef = useRef(false);
  const [result, setResult] = useState<{
    passed: boolean;
    gapStatus: string | null;
    repairCount: number;
    unseenCheckpoint: boolean;
    checkpointVerificationKind:
      | "unseen"
      | "spaced_retest"
      | "repeat"
      | null;
  } | null>(null);
  const role = worldQuantRoleProfileById(roleId);
  const availablePacks = worldQuantDrillPacks.filter(
    (drillPack) => role.weights[drillPack.competency] > 0,
  );
  const selectedDrill =
    worldQuantDrills.find((drill) => drill.id === selectedDrillId) ??
    availablePacks[0].practice;
  const gap = gapForCompetency(
    trainingState,
    roleId,
    selectedDrill.competency,
  );
  const checkpointUnlocked =
    selectedDrill.variant !== "checkpoint" ||
    gap?.status === "transfer_ready" ||
    gap?.status === "verified";
  const matchingWarmups = useMemo(
    () =>
      warmupCards
        .filter(
          (card) =>
            card.competency === selectedDrill.competency &&
            card.conceptIds.some((conceptId) =>
              selectedDrill.conceptIds.includes(conceptId),
            ),
        )
        .sort(
          (left, right) =>
            Number(right.personalRemediation) -
              Number(left.personalRemediation) ||
            left.id.localeCompare(right.id),
        )
        .slice(0, 3),
    [selectedDrill, warmupCards],
  );

  useEffect(() => {
    const refresh = () =>
      setTrainingState(readWorldQuantTrainingState(accountId));
    refresh();
    return subscribeToWorldQuantTrainingState(accountId, refresh);
  }, [accountId]);

  function selectCompetency(competency: WorldQuantCompetencyKey) {
    if (storagePendingRef.current) return;
    const drillPack = worldQuantDrillPacks.find(
      (item) => item.competency === competency,
    );
    if (!drillPack) return;
    setSelectedCompetency(competency);
    setSelectedDrillId(drillPack.practice.id);
    resetDrill("overview");
  }

  function selectDrill(drill: WorldQuantDrill) {
    if (storagePendingRef.current) return;
    setSelectedCompetency(drill.competency);
    setSelectedDrillId(drill.id);
    resetDrill("overview");
  }

  function setStorageBusy(pending: boolean) {
    storagePendingRef.current = pending;
    setStoragePending(pending);
  }

  function resetDrill(nextStage: DrillStage) {
    setStage(nextStage);
    setWarmupIndex(0);
    setWarmupRevealed(false);
    setAnswer("");
    setFollowUpAnswers(["", ""]);
    setRubricChecked(new Set());
    setConfidence(60);
    setHintUsed(false);
    setStartedAt(null);
    setUnseenAtStart(false);
    setStorageError(null);
    setResult(null);
  }

  async function startDrill() {
    if (!checkpointUnlocked || storagePendingRef.current) return;
    if (matchingWarmups.length) {
      resetDrill("warmup");
      return;
    }
    resetDrill("overview");
    await openScenario();
  }

  async function openScenario() {
    if (!checkpointUnlocked || storagePendingRef.current) return;
    const now = new Date().toISOString();
    let checkpointUnseen = false;
    if (selectedDrill.variant === "checkpoint") {
      setStorageBusy(true);
      const exposure = await recordCheckpointExposureLocked(
        accountId,
        selectedDrill.id,
        now,
      ).catch(() => null);
      setStorageBusy(false);
      if (!exposure) {
        setStorageError(
          "Không lưu được lần mở bài kiểm tra xác nhận. Đề bài vẫn được khóa để tránh xác nhận nhầm là chưa từng thấy.",
        );
        return;
      }
      checkpointUnseen = exposure.unseen;
      setTrainingState(exposure.state);
    } else {
      setUnseenAtStart(false);
    }
    setStartedAt(now);
    setUnseenAtStart(checkpointUnseen);
    setStorageError(null);
    setStage("scenario");
  }

  async function nextWarmup() {
    if (warmupIndex + 1 < matchingWarmups.length) {
      setWarmupIndex((index) => index + 1);
      setWarmupRevealed(false);
      return;
    }
    await openScenario();
  }

  async function finishDrill() {
    if (!startedAt || !answer.trim() || storagePendingRef.current) {
      return;
    }
    const failedRubricIndexes = selectedDrill.rubric
      .map((_, index) => index)
      .filter((index) => !rubricChecked.has(index));
    const attemptId = crypto.randomUUID();
    const completedAt = new Date().toISOString();
    setStorageBusy(true);
    const saved = await mutateWorldQuantTrainingStateLocked(
      accountId,
      (current) => {
        const completion = completeDrillAndReconcileGap(current, {
          roleProfileId: roleId,
          attempt: {
            attemptId,
            drillId: selectedDrill.id,
            drillVersion: selectedDrill.version,
            variant: selectedDrill.variant,
            competency: selectedDrill.competency,
            conceptIds: [...selectedDrill.conceptIds],
            startedAt,
            completedAt,
            rubricPassed: rubricChecked.size,
            rubricTotal: selectedDrill.rubric.length,
            followUpsCompleted: followUpAnswers.filter(
              (item) => item.trim().length >= 10,
            ).length,
            confidencePercent: confidence,
            hintUsed,
            answerPresent: answer.trim().length >= 20,
            unseenAtStart,
          },
          failedRubricIndexes,
          now: completedAt,
          today: localDateKey(new Date(completedAt)),
          createId: () => crypto.randomUUID(),
        });
        return { state: completion.state, value: completion };
      },
    ).catch(() => null);
    setStorageBusy(false);
    if (!saved) {
      setStorageError(
        "Không lưu được lượt làm; điểm cần cải thiện chưa được cập nhật. Hãy giữ trang này và thử lưu kết quả lại.",
      );
      return;
    }
    const completion = saved.value;
    setTrainingState(saved.state);
    setStorageError(null);
    setResult({
      passed: completion.passed,
      gapStatus: completion.gap?.status ?? null,
      repairCount: completion.repairCards.length,
      unseenCheckpoint: completion.unseenCheckpoint,
      checkpointVerificationKind:
        completion.checkpointVerificationKind,
    });
    setStage("result");
  }

  const warmup = matchingWarmups[warmupIndex];

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
              WQ
            </span>
            <span>
              <span className="block font-bold">Phòng luyện tình huống</span>
              <span className="block text-xs text-[#526276]">
                Nhớ lại → vận dụng → bảo vệ lập luận
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/curriculum",
                roleId,
              )}
            >
              Lộ trình kiến thức
            </HeaderLink>
            <HeaderLink
              href={
                missionReturnHref ??
                worldQuantRoleHref(
                  "/worldquant/mission",
                  roleId,
                )
              }
            >
              Nhiệm vụ hôm nay
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/full-round",
                roleId,
              )}
            >
              Buổi mô phỏng phỏng vấn đầy đủ
            </HeaderLink>
          </nav>
        </header>

        <section className="grid gap-5 py-7 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/60 p-5">
            <label className="block text-xs font-bold text-[#526276]">
              Vị trí mục tiêu
              <select
                value={roleId}
                onChange={(event) => {
                  if (storagePendingRef.current) return;
                  const next = event.target
                    .value as WorldQuantRoleProfileId;
                  setRoleId(next);
                  const firstPack = worldQuantDrillPacks.find(
                    (item) =>
                      worldQuantRoleProfileById(next).weights[
                        item.competency
                      ] > 0,
                  )!;
                  selectCompetency(firstPack.competency);
                }}
                disabled={storagePending}
                className="mt-2 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {worldQuantRoleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 space-y-2">
              {availablePacks.map((drillPack) => {
                const packGap = gapForCompetency(
                  trainingState,
                  roleId,
                  drillPack.competency,
                );
                return (
                  <button
                    key={drillPack.id}
                    type="button"
                    disabled={storagePending}
                    onClick={() =>
                      selectCompetency(drillPack.competency)
                    }
                    className={`w-full rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${
                      selectedCompetency === drillPack.competency
                        ? "border-[#285f86] bg-[#eaf2f8]"
                        : "border-[#0f3a69]/10 bg-white/65"
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      {
                        worldQuantCompetencies[
                          drillPack.competency
                        ].shortLabel
                      }
                    </span>
                    <span className="mt-1 block text-[10px] text-[#526276]">
                      Tiến độ: {gapStatusLabel(packGap?.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/65 p-5 shadow-[0_24px_80px_rgb(15_58_105_/_8%)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                  {worldQuantCompetencies[selectedDrill.competency].label}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  {selectedDrill.title}
                </h1>
                <p className="mt-2 text-sm text-[#526276]">
                  {drillKindLabel(selectedDrill.kind)} ·{" "}
                  {drillLanguageLabel(selectedDrill.language)} ·{" "}
                  {selectedDrill.estimatedMinutes} phút
                </p>
              </div>
              <div className="flex gap-2">
                {worldQuantDrillPacks
                  .find(
                    (item) =>
                      item.competency === selectedDrill.competency,
                  )
                  ?.[
                    selectedDrill.variant === "practice"
                      ? "checkpoint"
                      : "practice"
                  ] ? (
                  <button
                    type="button"
                    disabled={storagePending}
                    onClick={() => {
                      const pack = worldQuantDrillPacks.find(
                        (item) =>
                          item.competency ===
                          selectedDrill.competency,
                      )!;
                      selectDrill(
                        selectedDrill.variant === "practice"
                          ? preferredCheckpointDrill(
                              trainingState,
                              selectedDrill.competency,
                              new Date().toISOString(),
                            )
                          : pack.practice,
                      );
                    }}
                    className="rounded-xl border border-[#0f3a69]/15 px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {selectedDrill.variant === "practice"
                      ? "Đề kiểm tra mới"
                      : "Bản luyện tập"}
                  </button>
                ) : null}
              </div>
            </div>

            {stage === "overview" ? (
              <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="rounded-2xl bg-[#f8fafc] p-5">
                  <p className="text-sm leading-7">
                    {selectedDrill.variant === "checkpoint"
                      ? "Đề bài được ẩn cho tới khi bấm Bắt đầu. Lần mở đề vẫn được ghi nhận ngay cả khi bạn bỏ dở."
                      : selectedDrill.prompt}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedDrill.conceptIds.map((conceptId) => (
                      <span
                        key={conceptId}
                        className="rounded-full border border-[#0f3a69]/10 bg-white px-3 py-1 text-[10px]"
                      >
                        {conceptId}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#0f3a69]/10 p-5">
                  <p className="text-xs font-bold">
                    {selectedDrill.variant === "checkpoint"
                      ? "Xác nhận bằng đề mới"
                      : "Luyện tập có chủ đích"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#526276]">
                    {selectedDrill.variant === "checkpoint"
                      ? checkpointUnlocked
                        ? "Năng lực đã sẵn sàng để xác nhận. Bạn cần đạt ngay lần đầu, trả lời đủ câu hỏi tiếp nối và không dùng gợi ý."
                        : "Bài kiểm tra xác nhận bị khóa cho tới khi bản luyện tập đạt yêu cầu vận dụng."
                      : `${matchingWarmups.length} thẻ khởi động đã duyệt phù hợp trước bài tình huống.`}
                  </p>
                  <button
                    type="button"
                    disabled={!checkpointUnlocked || storagePending}
                    onClick={startDrill}
                    className="mt-5 w-full rounded-xl bg-[#0f3a69] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Bắt đầu bài luyện
                  </button>
                  {storageError ? (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl bg-[#fff1f1] p-3 text-xs text-[#9f2f2f]"
                    >
                      {storageError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {stage === "warmup" && warmup ? (
              <div className="mt-7 rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-6">
                <p className="font-mono text-[10px] font-bold text-[#a65c0e] uppercase">
                  Khởi động {warmupIndex + 1}/{matchingWarmups.length}
                  {warmup.personalRemediation ? " · thẻ sửa lỗi" : ""}
                </p>
                <h2 className="mt-4 text-xl font-semibold leading-8">
                  {warmup.prompt}
                </h2>
                {warmupRevealed ? (
                  <div className="mt-5 rounded-xl bg-[#eaf2f8] p-4 text-sm leading-6">
                    {warmup.answer}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWarmupRevealed(true)}
                    className="mt-5 rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-sm font-bold"
                  >
                    Đã suy nghĩ xong, xem đáp án
                  </button>
                )}
                <button
                  type="button"
                  disabled={!warmupRevealed || storagePending}
                  onClick={nextWarmup}
                  className="mt-5 ml-2 rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  Tiếp tục
                </button>
                {storageError ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl bg-[#fff1f1] p-3 text-xs text-[#9f2f2f]"
                  >
                    {storageError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {stage === "scenario" ? (
              <div className="mt-7">
                <StageLabel>Tình huống</StageLabel>
                <p className="mt-3 text-lg leading-8">
                  {selectedDrill.prompt}
                </p>
                {selectedDrill.starterCode ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#092c51] p-5 text-sm leading-6 text-[#e6f8f5]">
                    <code>{selectedDrill.starterCode}</code>
                  </pre>
                ) : null}
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={selectedDrill.starterCode ? 14 : 10}
                  placeholder="Tự trả lời đầy đủ như khi đang nói với người phỏng vấn..."
                  className="mt-4 w-full rounded-2xl border border-[#0f3a69]/15 bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-[#285f86]"
                />
                {selectedDrill.variant === "practice" ? (
                  <button
                    type="button"
                    onClick={() => setHintUsed(true)}
                    className="mt-3 text-xs font-bold text-[#526276] underline"
                  >
                    {hintUsed
                      ? `Gợi ý cần xem xét: ${selectedDrill.rubric[0]}`
                      : "Cần một gợi ý để xem xét"}
                  </button>
                ) : null}
                <label className="mt-5 block rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4">
                  <span className="text-xs font-bold">
                    Mức tự tin với câu trả lời hiện tại:{" "}
                    {confidence}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={confidence}
                    onChange={(event) =>
                      setConfidence(Number(event.target.value))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <button
                  type="button"
                  disabled={answer.trim().length < 20}
                  onClick={() => setStage("followup")}
                  className="mt-5 block rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  Người phỏng vấn hỏi sâu
                </button>
              </div>
            ) : null}

            {stage === "followup" ? (
              <div className="mt-7">
                <StageLabel>Câu hỏi tiếp nối của người phỏng vấn</StageLabel>
                <div className="mt-4 space-y-5">
                  {selectedDrill.followUps.map((followUp, index) => (
                    <label key={followUp.id} className="block">
                      <span className="font-semibold">
                        {index + 1}. {followUp.prompt}
                      </span>
                      <textarea
                        value={followUpAnswers[index]}
                        onChange={(event) =>
                          setFollowUpAnswers((current) =>
                            current.map((value, itemIndex) =>
                              itemIndex === index
                                ? event.target.value
                                : value,
                            ),
                          )
                        }
                        rows={5}
                        className="mt-2 w-full rounded-2xl border border-[#0f3a69]/15 bg-white p-4 text-sm leading-6"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={followUpAnswers.some(
                    (item) => item.trim().length < 10,
                  )}
                  onClick={() => setStage("rubric")}
                  className="mt-5 rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  Tự chấm theo tiêu chí
                </button>
              </div>
            ) : null}

            {stage === "rubric" ? (
              <div className="mt-7">
                <StageLabel>Tiêu chí tự chấm</StageLabel>
                <p className="mt-3 text-sm text-[#526276]">
                  Chỉ chọn tiêu chí đã thể hiện rõ trong câu trả lời, không
                  chọn chỉ vì bạn đã nghĩ tới. Đây là kết quả tự đánh giá,
                  không phải đánh giá tuyển dụng độc lập.
                </p>
                <div className="mt-4 space-y-3">
                  {selectedDrill.rubric.map((rubric, index) => (
                    <label
                      key={rubric}
                      className="flex items-start gap-3 rounded-xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                    >
                      <input
                        type="checkbox"
                        checked={rubricChecked.has(index)}
                        onChange={(event) =>
                          setRubricChecked((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(index);
                            else next.delete(index);
                            return next;
                          })
                        }
                        className="mt-1 size-4"
                      />
                      <span className="text-sm leading-6">{rubric}</span>
                    </label>
                  ))}
                </div>
                {storageError ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-[#fff1f1] p-3 text-sm text-[#9f2f2f]"
                  >
                    {storageError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={finishDrill}
                  disabled={storagePending}
                  className="mt-5 rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white"
                >
                  {storagePending ? "Đang lưu…" : "Lưu kết quả"}
                </button>
              </div>
            ) : null}

            {stage === "result" && result ? (
              <div className="mt-7 rounded-2xl bg-[#eaf2f8] p-6">
                <StageLabel>Đã hoàn thành bài luyện</StageLabel>
                <h2 className="mt-3 text-3xl font-semibold">
                  {result.passed ? "Đạt yêu cầu bài luyện" : "Cần ôn lại"}
                </h2>
                <p className="mt-3 leading-7 text-[#43546a]">
                  Trạng thái năng lực:{" "}
                  <b>{gapStatusLabel(result.gapStatus)}</b>. Đã tạo{" "}
                  {result.repairCount} câu ôn lại từ tiêu chí còn thiếu.
                  {selectedDrill.variant === "checkpoint"
                    ? result.checkpointVerificationKind ===
                      "spaced_retest"
                      ? " Đây là lần kiểm tra lại sau đủ thời gian; có thể xác nhận nếu đạt mà không dùng gợi ý."
                      : result.unseenCheckpoint
                        ? " Đây là lần đầu bạn thấy bài kiểm tra này."
                        : " Bài kiểm tra này đã được làm gần đây nên chưa thể dùng để xác nhận."
                    : ""}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => resetDrill("overview")}
                    className="rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
                  >
                    Về danh sách bài luyện
                  </button>
                  <Link
                    href={
                      missionReturnHref ??
                      worldQuantRoleHref(
                        "/worldquant/mission",
                        roleId,
                      )
                    }
                    className="inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2 text-sm font-bold"
                  >
                    Tiếp tục bước tiếp theo trong nhiệm vụ
                  </Link>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
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

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
      {children}
    </p>
  );
}

function gapStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    open: "cần luyện",
    learning: "đang học",
    transfer_ready: "sẵn sàng xác nhận",
    verified: "đã xác nhận",
  };
  return status ? (labels[status] ?? status) : "chưa mở";
}

function drillKindLabel(kind: WorldQuantDrill["kind"]) {
  const labels: Record<WorldQuantDrill["kind"], string> = {
    explain: "giải thích",
    diagnose: "chẩn đoán",
    implement: "viết mã",
    design: "thiết kế",
    incident: "xử lý sự cố",
  };
  return labels[kind];
}

function drillLanguageLabel(language: WorldQuantDrill["language"]) {
  const labels: Record<WorldQuantDrill["language"], string> = {
    cpp: "C++",
    cmake: "CMake",
    python: "Python",
    shell: "Tập lệnh shell",
    english: "Tiếng Anh",
  };
  return labels[language];
}

function preferredCheckpointDrill(
  state: WorldQuantTrainingState,
  competency: WorldQuantCompetencyKey,
  at: string,
) {
  const checkpoints = drillsForCompetency(competency).filter(
    (drill) => drill.variant === "checkpoint",
  );
  const selected =
    checkpoints.find(
      (drill) =>
        !wasCheckpointExposed(state, drill.id, drill.version),
    ) ??
    checkpoints.find((drill) =>
      isCheckpointRetestEligible(state, drill.id, at),
    ) ??
    checkpoints[0];
  if (!selected) {
    throw new Error(`Missing checkpoint drill for ${competency}`);
  }
  return selected;
}

function localDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
