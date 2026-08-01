"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  analyzeRecordedEnglishVoice,
  buildWorldQuantFullRound,
  isRoundDeadlineExpired,
  remainingRoundSeconds,
  worldQuantFullRoundBlueprintV1,
  type EnglishVoiceMetrics,
} from "@/lib/worldquant/full-round";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import {
  addFullRoundSummary,
  EMPTY_WORLDQUANT_TRAINING_STATE,
  readWorldQuantTrainingState,
  syncWorldQuantTrainingStateToCloud,
  subscribeToWorldQuantTrainingState,
  writeWorldQuantTrainingStateLocked,
  type WorldQuantTrainingState,
} from "@/lib/worldquant/training-state";
import {
  worldQuantCompetencies,
  worldQuantRoleProfiles,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

type SessionStage = "setup" | "running" | "summary";
type VoicePhase = "idle" | "listening" | "stopping";
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function WorldQuantFullRoundApp({
  accountId,
  initialRoleId,
}: {
  accountId: string | null;
  initialRoleId: WorldQuantRoleProfileId;
}) {
  useEffect(() => {
    void syncWorldQuantTrainingStateToCloud(accountId);
  }, [accountId]);
  const [roleId, setRoleId] = useState(initialRoleId);
  const [stage, setStage] = useState<SessionStage>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundDeadlineMs, setRoundDeadlineMs] = useState<number | null>(
    null,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [rubricByRound, setRubricByRound] = useState<
    Record<string, number[]>
  >({});
  const [trainingState, setTrainingState] =
    useState<WorldQuantTrainingState>(
      EMPTY_WORLDQUANT_TRAINING_STATE,
    );
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [storagePending, setStoragePending] = useState(false);
  const [result, setResult] = useState<{
    rubricPassed: number;
    rubricTotal: number;
    english: EnglishVoiceMetrics | null;
  } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const microphoneSegmentStartedAtRef = useRef<number | null>(null);
  const microphoneElapsedMsRef = useRef(0);
  const voiceTranscriptRef = useRef("");
  const voiceStopPendingRef = useRef(false);
  const voiceSupported = useSyncExternalStore(
    subscribeToSpeechCapability,
    hasSpeechCapability,
    getServerSpeechCapability,
  );

  const rounds = useMemo(
    () => buildWorldQuantFullRound(roleId),
    [roleId],
  );
  const currentRound = rounds[roundIndex];
  const currentAnswer = currentRound
    ? answers[currentRound.id] ?? ""
    : "";
  const currentRubric = useMemo(
    () => new Set(rubricByRound[currentRound?.id ?? ""] ?? []),
    [currentRound?.id, rubricByRound],
  );
  const totalMinutes = rounds.reduce(
    (sum, round) => sum + round.durationMinutes,
    0,
  );
  const roundExpired =
    stage === "running" &&
    roundDeadlineMs !== null &&
    remainingSeconds === 0;

  useEffect(() => {
    const refresh = () =>
      setTrainingState(readWorldQuantTrainingState(accountId));
    refresh();
    return subscribeToWorldQuantTrainingState(accountId, refresh);
  }, [accountId]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          // The browser may already have stopped the recognition session.
        }
      }
      recognitionRef.current = null;
      voiceStopPendingRef.current = false;
      microphoneSegmentStartedAtRef.current = null;
      microphoneElapsedMsRef.current = 0;
      voiceTranscriptRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (stage !== "running" || roundDeadlineMs === null) return;
    let intervalId: number | null = null;
    const refresh = () => {
      const next = remainingRoundSeconds(
        roundDeadlineMs,
        Date.now(),
      );
      setRemainingSeconds(next);
      if (
        next === 0 &&
        voicePhase === "listening" &&
        !voiceStopPendingRef.current &&
        recognitionRef.current
      ) {
        const recognition = recognitionRef.current;
        voiceStopPendingRef.current = true;
        const segmentStartedAt =
          microphoneSegmentStartedAtRef.current;
        if (segmentStartedAt !== null) {
          microphoneElapsedMsRef.current += Math.max(
            0,
            Date.now() - segmentStartedAt,
          );
          microphoneSegmentStartedAtRef.current = null;
        }
        setVoicePhase("stopping");
        try {
          recognition.stop();
        } catch {
          detachRecognition(recognition);
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }
          voiceStopPendingRef.current = false;
          setVoicePhase("idle");
          setVoiceInterim("");
        }
      }
      if (next === 0 && intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    refresh();
    if (Date.now() < roundDeadlineMs) {
      intervalId = window.setInterval(refresh, 250);
    }
    return () => {
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [roundDeadlineMs, stage, voicePhase]);

  function startSession() {
    discardVoice();
    microphoneElapsedMsRef.current = 0;
    voiceTranscriptRef.current = "";
    const firstRound = rounds[0];
    setSessionId(crypto.randomUUID());
    setStartedAt(new Date().toISOString());
    setRoundIndex(0);
    startRoundClock(firstRound.durationMinutes);
    setAnswers({});
    setRubricByRound({});
    setVoiceInterim("");
    setNotice(null);
    setResult(null);
    setStage("running");
    window.scrollTo({ top: 0 });
  }

  function toggleRubric(index: number) {
    if (!currentRound || isRoundExpired()) return;
    setRubricByRound((current) => {
      const selected = new Set(current[currentRound.id] ?? []);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      return {
        ...current,
        [currentRound.id]: [...selected].sort(
          (left, right) => left - right,
        ),
      };
    });
  }

  async function completeRound() {
    const expired = isRoundExpired();
    if (
      !currentRound ||
      (!expired && currentAnswer.trim().length < 20) ||
      !sessionId ||
      !startedAt ||
      storagePending
    ) {
      setNotice(
        "Hãy ghi lại câu trả lời tối thiểu 20 ký tự trước khi tự chấm.",
      );
      return;
    }
    if (recognitionRef.current) {
      setNotice(
        "Hãy dừng ghi lời và chờ trình duyệt hoàn tất bản ghi trước khi kết thúc chặng.",
      );
      return;
    }
    discardVoice();
    if (roundIndex + 1 < rounds.length) {
      const nextIndex = roundIndex + 1;
      setAnswers((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([roundId]) => roundId !== currentRound.id,
          ),
        ),
      );
      setRoundIndex(nextIndex);
      startRoundClock(rounds[nextIndex].durationMinutes);
      setVoiceInterim("");
      setNotice(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const completedAt = new Date().toISOString();
    const rubricPassed = rounds.reduce(
      (sum, round) =>
        sum + (rubricByRound[round.id]?.length ?? 0),
      0,
    );
    const rubricTotal = rounds.reduce(
      (sum, round) => sum + round.drill.rubric.length,
      0,
    );
    const english = analyzeRecordedEnglishVoice(
      voiceTranscriptRef.current,
      microphoneElapsedMsRef.current,
    );
    const blueprint = worldQuantFullRoundBlueprintV1(roleId);
    const nextTrainingState = addFullRoundSummary(trainingState, {
      sessionId,
      roleProfileId: roleId,
      roleProfileVersion: blueprint.roleProfileVersion,
      fullRoundVersion: blueprint.fullRoundVersion,
      startedAt,
      completedAt,
      completedRoundIds: rounds.map((round) => round.id),
      completedRounds: blueprint.rounds,
      rubricPassed,
      rubricTotal,
      englishWordCount: english?.wordCount ?? 0,
      englishFillerCount: english?.fillerCount ?? 0,
      transcriptDeleted: true,
    });
    setStoragePending(true);
    const persisted = await writeWorldQuantTrainingStateLocked(
      accountId,
      nextTrainingState,
    ).catch(() => null);
    setStoragePending(false);
    if (!persisted) {
      setNotice(
        "Chưa lưu được kết quả tóm tắt. Câu trả lời vẫn còn trong trang; hãy thử lưu kết quả lại.",
      );
      return;
    }
    setTrainingState(persisted);
    setNotice(null);
    setResult({ rubricPassed, rubricTotal, english });
    setAnswers({});
    setVoiceInterim("");
    voiceTranscriptRef.current = "";
    microphoneElapsedMsRef.current = 0;
    microphoneSegmentStartedAtRef.current = null;
    setRoundDeadlineMs(null);
    setRemainingSeconds(0);
    setStage("summary");
  }

  function startVoice() {
    if (
      !currentRound?.englishVoice ||
      voicePhase !== "idle" ||
      voiceStopPendingRef.current ||
      recognitionRef.current ||
      isRoundExpired()
    ) {
      return;
    }
    const Constructor =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;
    if (!Constructor) {
      setNotice(
        "Trình duyệt này không hỗ trợ tính năng nhận dạng giọng nói; bạn vẫn có thể nhập câu trả lời.",
      );
      return;
    }
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      let finalText = "";
      let interimText = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const resultItem = event.results[index];
        const transcript = resultItem[0]?.transcript ?? "";
        if (resultItem.isFinal) finalText += ` ${transcript}`;
        else interimText += ` ${transcript}`;
      }
      const normalizedFinalText = finalText.trim();
      if (normalizedFinalText) {
        voiceTranscriptRef.current = appendTranscript(
          voiceTranscriptRef.current,
          normalizedFinalText,
        );
        setAnswers((current) => ({
          ...current,
          [currentRound.id]: appendTranscript(
            current[currentRound.id] ?? "",
            normalizedFinalText,
          ),
        }));
      }
      setVoiceInterim(interimText.trim());
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      settleMicrophoneElapsed();
      detachRecognition(recognition);
      recognitionRef.current = null;
      voiceStopPendingRef.current = false;
      try {
        recognition.stop();
      } catch {
        // The browser may already have stopped the recognition session.
      }
      setVoicePhase("idle");
      setVoiceInterim("");
      setNotice(
        `${speechRecognitionErrorMessage(event.error)} Bạn có thể tiếp tục bằng ô nhập bên dưới.`,
      );
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      settleMicrophoneElapsed();
      detachRecognition(recognition);
      recognitionRef.current = null;
      voiceStopPendingRef.current = false;
      setVoicePhase("idle");
      setVoiceInterim("");
    };
    recognitionRef.current = recognition;
    voiceStopPendingRef.current = false;
    try {
      recognition.start();
      microphoneSegmentStartedAtRef.current = new Date().getTime();
      setVoicePhase("listening");
      setNotice(null);
    } catch {
      detachRecognition(recognition);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      voiceStopPendingRef.current = false;
      microphoneSegmentStartedAtRef.current = null;
      setVoicePhase("idle");
      setNotice(
        "Không khởi động được micro; hãy kiểm tra quyền của trình duyệt hoặc gõ tay.",
      );
    }
  }

  function stopVoice() {
    const recognition = recognitionRef.current;
    if (
      !recognition ||
      voicePhase !== "listening" ||
      voiceStopPendingRef.current
    ) {
      return;
    }
    voiceStopPendingRef.current = true;
    settleMicrophoneElapsed();
    setVoicePhase("stopping");
    try {
      recognition.stop();
    } catch {
      detachRecognition(recognition);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      voiceStopPendingRef.current = false;
      setVoicePhase("idle");
      setVoiceInterim("");
    }
  }

  function discardVoice() {
    const recognition = recognitionRef.current;
    settleMicrophoneElapsed();
    if (recognition) {
      detachRecognition(recognition);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      try {
        recognition.stop();
      } catch {
        // The browser may already have stopped the recognition session.
      }
    }
    voiceStopPendingRef.current = false;
    setVoicePhase("idle");
    setVoiceInterim("");
  }

  function deleteCurrentTranscript() {
    if (!currentRound) return;
    discardVoice();
    voiceTranscriptRef.current = "";
    microphoneElapsedMsRef.current = 0;
    microphoneSegmentStartedAtRef.current = null;
    setAnswers((current) => ({
      ...current,
      [currentRound.id]: "",
    }));
    setNotice(
      "Bản ghi của chặng này đã bị xóa khỏi bộ nhớ trang.",
    );
  }

  function isRoundExpired() {
    return isRoundDeadlineExpired(
      roundDeadlineMs,
      readWallClockMs(),
    );
  }

  function startRoundClock(durationMinutes: number) {
    const now = readWallClockMs();
    const deadline = now + durationMinutes * 60 * 1000;
    setRoundDeadlineMs(deadline);
    setRemainingSeconds(remainingRoundSeconds(deadline, now));
  }

  function settleMicrophoneElapsed() {
    const segmentStartedAt = microphoneSegmentStartedAtRef.current;
    if (segmentStartedAt === null) return;
    microphoneElapsedMsRef.current += Math.max(
      0,
      readWallClockMs() - segmentStartedAt,
    );
    microphoneSegmentStartedAtRef.current = null;
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <span>
              <span className="block font-bold">
                Buổi mô phỏng phỏng vấn đầy đủ
              </span>
              <span className="block text-xs text-[#64736c]">
                5 chặng · có giới hạn thời gian · đánh giá dựa trên kết quả
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/mission",
                roleId,
              )}
            >
              Nhiệm vụ hôm nay
            </HeaderLink>
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
                "/mock-interview",
                roleId,
              )}
            >
              Phỏng vấn thử với AI
            </HeaderLink>
          </nav>
        </header>

        {stage === "setup" ? (
          <SetupScreen
            roleId={roleId}
            onRoleChange={setRoleId}
            rounds={rounds}
            totalMinutes={totalMinutes}
            priorRounds={trainingState.fullRounds.length}
            onStart={startSession}
          />
        ) : null}

        {stage === "running" && currentRound ? (
          <section className="py-7">
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="h-fit rounded-[2rem] border border-[#173f35]/12 bg-white/60 p-5 xl:sticky xl:top-5">
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                  Tiến trình phỏng vấn
                </p>
                <div className="mt-4 space-y-2">
                  {rounds.map((round, index) => (
                    <div
                      key={round.id}
                      className={`rounded-xl border p-3 ${
                        index === roundIndex
                          ? "border-[#356b58] bg-[#eaf8cf]"
                          : index < roundIndex
                            ? "border-[#173f35]/8 bg-white/45 text-[#64736c]"
                            : "border-[#173f35]/8 bg-transparent text-[#8b9690]"
                      }`}
                    >
                      <p className="font-mono text-[10px]">
                        {index < roundIndex ? "✓" : index + 1} ·{" "}
                        {round.durationMinutes} phút
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {round.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-5 rounded-2xl p-4 text-center ${
                    remainingSeconds === 0
                      ? "bg-[#f1d6c9] text-[#8e3825]"
                      : "bg-[#173f35] text-white"
                  }`}
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                    {remainingSeconds === 0
                      ? "Đã hết giờ"
                      : "Thời gian còn lại"}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-bold">
                    {formatDuration(remainingSeconds)}
                  </p>
                </div>
              </aside>

              <article className="min-w-0 rounded-[2rem] border border-[#173f35]/12 bg-white/68 p-5 shadow-[0_24px_80px_rgb(23_63_53_/_8%)] sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                      Chặng {roundIndex + 1}/{rounds.length} ·{" "}
                      {
                        worldQuantCompetencies[
                          currentRound.competency
                        ].label
                      }
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                      {currentRound.drill.title}
                    </h1>
                    <p className="mt-2 text-sm text-[#64736c]">
                      {currentRound.brief}
                    </p>
                  </div>
                  {currentRound.englishVoice ? (
                    <span className="rounded-full bg-[#d7ff91]/70 px-3 py-1 font-mono text-[10px] font-bold text-[#245748]">
                      trả lời bằng tiếng Anh
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-[#173f35]/10 bg-[#f4f3ec] p-5 leading-7">
                  {currentRound.drill.prompt}
                </div>
                {currentRound.drill.starterCode ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#102d26] p-5 font-mono text-[13px] leading-6 text-[#e8f4ec]">
                    <code>{currentRound.drill.starterCode}</code>
                  </pre>
                ) : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {currentRound.drill.followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="rounded-xl border border-[#173f35]/10 bg-white/55 p-3 text-sm text-[#52645c]"
                    >
                      <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
                        Câu hỏi tiếp nối
                      </span>
                      <p className="mt-1">{followUp.prompt}</p>
                    </div>
                  ))}
                </div>

                {currentRound.englishVoice ? (
                  <div className="mt-6 rounded-2xl border border-[#356b58]/20 bg-[#edf3e7] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {voiceSupported ? (
                        <button
                          type="button"
                          onClick={
                            voicePhase === "listening"
                              ? stopVoice
                              : startVoice
                          }
                          disabled={
                            voicePhase === "stopping" ||
                            roundExpired
                          }
                          className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {voicePhase === "stopping"
                            ? "Đang hoàn tất bản ghi…"
                            : voicePhase === "listening"
                            ? "■ Dừng ghi lời"
                            : "● Luyện nói tiếng Anh"}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-[#52645c]">
                          Tính năng nhận dạng giọng nói không có sẵn — hãy dùng
                          ô nhập bên dưới.
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={deleteCurrentTranscript}
                        className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-sm font-bold"
                      >
                         Xóa bản ghi ngay
                      </button>
                    </div>
                    {voiceInterim ? (
                      <p className="mt-3 text-sm italic text-[#64736c]">
                        {voiceInterim}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs leading-5 text-[#64736c]">
                      Recall không lưu hoặc tải âm thanh lên máy chủ. Bản ghi
                      chỉ ở trong bộ nhớ trang và bị xóa khi hoàn tất. Tính năng
                      nhận dạng giọng nói trên web do trình duyệt hoặc hệ điều
                      hành cung cấp, nên âm thanh có thể chịu chính sách xử lý
                      của nhà cung cấp. Tốc độ nói chỉ tính phần bản ghi do
                      micro tạo trong thời gian ghi thực; phần gõ tay không được
                      tính thành tốc độ nói.
                    </p>
                  </div>
                ) : null}

                <label className="mt-6 block text-sm font-bold text-[#344a40]">
                  {currentRound.englishVoice
                    ? "Bản ghi tiếng Anh có thể chỉnh sửa"
                    : "Ghi chú / câu trả lời phỏng vấn"}
                  <textarea
                    value={currentAnswer}
                    onChange={(event) => {
                      if (isRoundExpired()) return;
                      setAnswers((current) => ({
                        ...current,
                        [currentRound.id]: event.target.value,
                      }));
                    }}
                    disabled={roundExpired}
                    maxLength={8000}
                    className="mt-2 min-h-56 w-full resize-y rounded-2xl border border-[#173f35]/18 bg-[#fbfaf5] px-4 py-3 font-normal leading-7 outline-none focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45 disabled:cursor-not-allowed disabled:opacity-65"
                    placeholder={
                      currentRound.englishVoice
                        ? "Nói hoặc nhập câu trả lời bằng tiếng Anh…"
                        : "Lập luận thành lời; nêu ràng buộc, độ phức tạp và các đánh đổi…"
                    }
                  />
                </label>
                <p className="mt-2 font-mono text-[10px] text-[#64736c]">
                   {currentAnswer.length}/8000 · chỉ lưu trong bộ nhớ · không
                   gửi đến máy chủ Recall
                </p>

                {currentAnswer.trim().length >= 20 ? (
                  <fieldset className="mt-6 rounded-2xl border border-[#173f35]/12 bg-white/55 p-5">
                    <legend className="px-2 text-sm font-bold text-[#173f35]">
                       Tiêu chí tự chấm
                    </legend>
                    <div className="space-y-3">
                      {currentRound.drill.rubric.map(
                        (criterion, index) => (
                          <label
                            key={criterion}
                            className="flex cursor-pointer gap-3 rounded-xl border border-[#173f35]/8 bg-white/65 p-3 text-sm leading-6"
                          >
                            <input
                              type="checkbox"
                              checked={currentRubric.has(index)}
                              onChange={() => toggleRubric(index)}
                              disabled={roundExpired}
                              className="mt-1 size-4 accent-[#356b58]"
                            />
                            <span>{criterion}</span>
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                ) : (
                  <p className="mt-6 rounded-2xl border border-dashed border-[#173f35]/20 p-5 text-sm text-[#64736c]">
                     Tiêu chí chấm sẽ mở sau khi bạn ghi câu trả lời, để tránh
                     đọc gợi ý trước khi tự lập luận.
                  </p>
                )}

                {notice ? (
                  <p
                    role="status"
                    className="mt-4 rounded-xl bg-[#f8e8df] p-3 text-sm text-[#713929]"
                  >
                    {notice}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#64736c]">
                     Tiêu chí đạt: {currentRubric.size}/
                    {currentRound.drill.rubric.length}
                  </p>
                  <button
                    type="button"
                    onClick={completeRound}
                    disabled={
                      storagePending || voicePhase !== "idle"
                    }
                    className="rounded-2xl bg-[#173f35] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {storagePending
                       ? "Đang lưu kết quả…"
                      : voicePhase === "stopping"
                         ? "Đang hoàn tất bản ghi…"
                        : roundExpired
                          ? roundIndex + 1 === rounds.length
                             ? "Hết giờ — lưu vòng phỏng vấn"
                             : "Hết giờ — chuyển chặng"
                      : roundIndex + 1 === rounds.length
                       ? "Hoàn tất vòng phỏng vấn"
                       : "Kết thúc chặng và tiếp tục →"}
                  </button>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {stage === "summary" && result ? (
          <SummaryScreen
            result={result}
            notice={notice}
            onRestart={startSession}
            roleId={roleId}
          />
        ) : null}
      </div>
    </main>
  );
}

function SetupScreen({
  roleId,
  onRoleChange,
  rounds,
  totalMinutes,
  priorRounds,
  onStart,
}: {
  roleId: WorldQuantRoleProfileId;
  onRoleChange: (role: WorldQuantRoleProfileId) => void;
  rounds: ReturnType<typeof buildWorldQuantFullRound>;
  totalMinutes: number;
  priorRounds: number;
  onStart: () => void;
}) {
  return (
    <section className="py-9">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
             Mô phỏng phỏng vấn WorldQuant
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Một mạch từ C++ chuyên sâu đến trình bày cách xử lý công việc bằng
            tiếng Anh.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#64736c]">
             5 chặng có đồng hồ, tình huống riêng và tiêu chí tự chấm. Không
             dùng AI, không tốn hạn mức; câu trả lời chỉ tồn tại trong bộ nhớ
             của trang.
          </p>
          <label className="mt-7 block max-w-md text-sm font-bold">
             Vị trí mục tiêu
            <select
              value={roleId}
              onChange={(event) =>
                onRoleChange(
                  event.target.value as WorldQuantRoleProfileId,
                )
              }
              className="mt-2 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3"
            >
              {worldQuantRoleProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="rounded-2xl bg-[#173f35] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Bắt đầu {totalMinutes} phút
            </button>
            <span className="font-mono text-xs text-[#64736c]">
               {priorRounds} buổi mô phỏng phỏng vấn đầy đủ đã hoàn tất
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {rounds.map((round, index) => (
            <article
              key={round.id}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-4 rounded-2xl border border-[#173f35]/12 bg-white/62 p-4"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-[#edf3e7] font-mono font-bold text-[#356b58]">
                {index + 1}
              </span>
              <div>
                <h2 className="font-bold">{round.label}</h2>
                <p className="mt-1 text-sm text-[#64736c]">
                  {round.brief}
                </p>
              </div>
              <span className="font-mono text-xs text-[#64736c]">
                 {round.durationMinutes} phút
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryScreen({
  result,
  notice,
  onRestart,
  roleId,
}: {
  result: {
    rubricPassed: number;
    rubricTotal: number;
    english: EnglishVoiceMetrics | null;
  };
  notice: string | null;
  onRestart: () => void;
  roleId: WorldQuantRoleProfileId;
}) {
  const score = Math.round(
    (result.rubricPassed / result.rubricTotal) * 100,
  );
  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-[#173f35]/12 bg-white/68 p-6 text-center shadow-[0_28px_90px_rgb(23_63_53_/_10%)] sm:p-10">
        <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
           Đã hoàn thành vòng phỏng vấn
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
           Đạt {score}% tiêu chí chấm
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#64736c]">
           Bản ghi và mọi câu trả lời đã bị xóa khỏi bộ nhớ của phiên.
           Chỉ kết quả tổng hợp dạng số được giữ lại.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResultMetric
             label="Tiêu chí"
            value={`${result.rubricPassed}/${result.rubricTotal}`}
          />
          <ResultMetric
             label="Số từ đã nói"
            value={result.english ? `${result.english.wordCount}` : "—"}
          />
          <ResultMetric
             label="Từ đệm"
            value={result.english ? `${result.english.fillerCount}` : "—"}
          />
          <ResultMetric
             label="Tốc độ nói"
            value={
              result.english
                 ? `${result.english.wordsPerMinute} từ/phút`
                 : "chỉ gõ tay"
            }
          />
        </div>
        {!result.english ? (
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#64736c]">
             Không có bản ghi lời nói kèm thời gian dùng micro, nên vòng
            này không ước tính tốc độ nói từ phần nhập bằng bàn phím.
          </p>
        ) : null}
        {notice ? (
          <p className="mt-5 rounded-xl bg-[#f8e8df] p-3 text-sm text-[#713929]">
            {notice}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={worldQuantRoleHref("/mock-interview", roleId)}
            className="rounded-2xl bg-[#173f35] px-6 py-3 text-sm font-bold text-white"
          >
            Tiếp tục phỏng vấn thử với AI để nhận phản hồi
          </Link>
          <Link
            href="/worldquant"
            className="rounded-2xl border border-[#173f35]/15 bg-white px-6 py-3 text-sm font-bold"
          >
             Về Trung tâm chuẩn bị
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl border border-[#173f35]/15 bg-white px-6 py-3 text-sm font-bold"
          >
            Luyện lại
          </button>
        </div>
      </div>
    </section>
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

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f4f3ec] p-4">
      <p className="font-mono text-[9px] font-bold tracking-[0.12em] text-[#64736c] uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function subscribeToSpeechCapability() {
  return () => undefined;
}

function hasSpeechCapability() {
  return Boolean(
    window.SpeechRecognition ?? window.webkitSpeechRecognition,
  );
}

function getServerSpeechCapability() {
  return false;
}

function speechRecognitionErrorMessage(code: string) {
  const messages: Record<string, string> = {
    aborted: "Quá trình ghi đã bị dừng.",
    "audio-capture": "Không thu được âm thanh từ micro.",
    "bad-grammar": "Trình duyệt không xử lý được cấu hình nhận dạng giọng nói.",
    "language-not-supported":
      "Trình duyệt không hỗ trợ ngôn ngữ nhận dạng đã chọn.",
    network: "Kết nối mạng gặp lỗi khi nhận dạng giọng nói.",
    "no-speech": "Không phát hiện lời nói.",
    "not-allowed": "Trình duyệt chưa được cấp quyền dùng micro.",
    "service-not-allowed":
      "Dịch vụ nhận dạng giọng nói không được phép hoạt động.",
  };

  return messages[code] ?? "Tính năng nhận dạng giọng nói đã dừng.";
}

function detachRecognition(recognition: SpeechRecognitionLike) {
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
}

function appendTranscript(current: string, addition: string) {
  return `${current} ${addition}`.trim().slice(0, 8000);
}

function readWallClockMs() {
  return Date.now();
}
