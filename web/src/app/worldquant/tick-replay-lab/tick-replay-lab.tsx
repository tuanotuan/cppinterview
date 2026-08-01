"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  appliedActivityProgressStorageKey,
  EMPTY_APPLIED_ACTIVITY_PROGRESS,
  parseAppliedActivityProgress,
  recordAppliedActivityAttempt,
  serializeAppliedActivityProgress,
  type AppliedActivityProgress,
} from "@/lib/worldquant/applied-activity-progress";
import {
  gradeTickReplayScenario,
  tickReplayActionLabel,
  tickReplayActionsForEvent,
  tickReplayScenarios,
  type TickReplayGrade,
} from "@/lib/worldquant/tick-replay";

export function TickReplayLab({
  accountId,
}: {
  accountId: string | null;
}) {
  const storageKey = useMemo(
    () => appliedActivityProgressStorageKey(accountId),
    [accountId],
  );
  const [progress, setProgress] = useState<AppliedActivityProgress>(
    EMPTY_APPLIED_ACTIVITY_PROGRESS,
  );
  const [scenarioId, setScenarioId] = useState(tickReplayScenarios[0].id);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<TickReplayGrade | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const scenario =
    tickReplayScenarios.find((item) => item.id === scenarioId) ??
    tickReplayScenarios[0];

  useEffect(() => {
    let parsed = EMPTY_APPLIED_ACTIVITY_PROGRESS;
    let notice: string | null = null;
    try {
      parsed = parseAppliedActivityProgress(
        window.localStorage.getItem(storageKey),
      );
    } catch {
      notice =
        "Trình duyệt không đọc được tiến độ cũ; bài luyện vẫn dùng được trong thẻ này.";
    }
    const attempt = parsed.attempts[scenario.id];
    const timer = window.setTimeout(() => {
      setProgress(parsed);
      setStorageNotice(notice);
      setSelections(
        attempt?.activityVersion === scenario.version
          ? attempt.selections
          : {},
      );
      setGrade(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scenario.id, scenario.version, storageKey]);

  const completedIds = new Set(
    tickReplayScenarios.flatMap((item) => {
      const attempt = progress.attempts[item.id];
      if (
        attempt?.activityVersion !== item.version ||
        !attempt.completedAt
      ) {
        return [];
      }
      return gradeTickReplayScenario(item.id, attempt.selections).passed
        ? [item.id]
        : [];
    }),
  );

  function submitScenario() {
    const result = gradeTickReplayScenario(scenario.id, selections);
    setGrade(result);
    const previous = progress.attempts[scenario.id];
    const next = recordAppliedActivityAttempt(progress, {
      activityId: scenario.id,
      activityVersion: scenario.version,
      selections,
      passedCheckIds: result.checks
        .filter((check) => check.passed)
        .map((check) => check.id),
      completedAt: result.passed
        ? new Date().toISOString()
        : previous?.completedAt ?? null,
    });
    setProgress(next);
    try {
      window.localStorage.setItem(
        storageKey,
        serializeAppliedActivityProgress(next),
      );
      setStorageNotice(null);
    } catch {
      setStorageNotice(
        "Không lưu được tiến độ vào trình duyệt; kết quả trong thẻ này vẫn được giữ.",
      );
    }
  }

  function openScenario(nextScenarioId: string) {
    const nextScenario =
      tickReplayScenarios.find((item) => item.id === nextScenarioId) ??
      tickReplayScenarios[0];
    const attempt = progress.attempts[nextScenario.id];
    setScenarioId(nextScenarioId);
    setSelections(
      attempt?.activityVersion === nextScenario.version
        ? attempt.selections
        : {},
    );
    setGrade(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              TR
            </span>
            <span>
              <span className="block font-bold">Tick Replay Lab</span>
              <span className="block text-xs text-[#64736c]">
                Phát lại dữ liệu xác định
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/learn/tick-data-order-book">
              Đọc bài dữ liệu tick
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/worldquant/mission">
              Nhiệm vụ hôm nay
            </Link>
          </nav>
        </header>

        <section className="mt-7 overflow-hidden rounded-[2.25rem] bg-[#173f35] p-6 text-white shadow-[0_24px_90px_rgb(23_63_53_/_16%)] sm:p-9">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#d7ff91] uppercase">
            Lab thực hành · {completedIds.size}/{tickReplayScenarios.length} tình huống
          </p>
          <div className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
                Giữ sổ lệnh đúng khi feed không hoàn hảo.
              </h1>
              <p className="mt-5 max-w-3xl leading-7 text-white/68">
                Chọn hành động cho từng sự kiện. Bộ máy phát lại sẽ kiểm tra
                sequence, phiên snapshot, hàng đợi khôi phục và bất biến bid/ask.
                Các điều kiện chấm chỉ hiện sau khi nộp.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/72">
              <strong className="block text-[#d7ff91]">
                Đây là bài mô phỏng xác định
              </strong>
              Kết quả chứng minh bạn đã luyện quy trình, không tự động xác nhận
              mức sẵn sàng tuyển dụng.
            </div>
          </div>
        </section>

        {storageNotice ? (
          <p role="status" className="mt-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]">
            {storageNotice}
          </p>
        ) : null}

        <section className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.75rem] border border-[#173f35]/12 bg-white/60 p-3 lg:sticky lg:top-5">
            <p className="px-3 py-2 font-mono text-[10px] font-bold tracking-[0.16em] text-[#64736c] uppercase">
              Tình huống
            </p>
            <div className="space-y-2">
              {tickReplayScenarios.map((item, index) => {
                const active = item.id === scenario.id;
                const completed = completedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openScenario(item.id)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none ${
                      active
                        ? "bg-[#173f35] text-white"
                        : "bg-white/65 hover:bg-white"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase opacity-65">
                      {completed ? "✓ Hoàn tất" : `Bước ${index + 1}`}
                    </span>
                    <span className="mt-1 block text-sm font-bold">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <section className="rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-5 shadow-[0_18px_70px_rgb(23_63_53_/_7%)] sm:p-8">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                {scenario.title}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Quyết định như bộ xử lý feed production
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#64736c]">
                {scenario.summary}
              </p>

              <div className="mt-7 space-y-4">
                {scenario.events.map((event, index) => (
                  <fieldset
                    key={event.id}
                    className="rounded-2xl border border-[#173f35]/10 bg-[#f8faf5] p-4 sm:p-5"
                  >
                    <legend className="px-2 text-sm font-bold">
                      {index + 1}. {event.label}
                    </legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {tickReplayActionsForEvent(event).map((action) => (
                        <label
                          key={action}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                            selections[event.id] === action
                              ? "border-[#356b58] bg-[#eaf8cf] text-[#245748]"
                              : "border-[#173f35]/10 bg-white hover:border-[#356b58]/35"
                          }`}
                        >
                          <input
                            type="radio"
                            name={event.id}
                            value={action}
                            checked={selections[event.id] === action}
                            onChange={() => {
                              setSelections((current) => ({
                                ...current,
                                [event.id]: action,
                              }));
                              setGrade(null);
                            }}
                          />
                          <span className="font-semibold">
                            {tickReplayActionLabel(action)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={submitScenario}
                  disabled={scenario.events.some(
                    (event) => !selections[event.id],
                  )}
                  className="min-h-12 rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Nộp và chạy phát lại
                </button>
                <span className="text-xs text-[#64736c]">
                  {Object.keys(selections).length}/{scenario.events.length} quyết định
                </span>
              </div>
            </section>

            {grade ? (
              <section
                aria-live="polite"
                className={`mt-5 rounded-[2rem] border p-5 sm:p-7 ${
                  grade.passed
                    ? "border-[#79b82a]/30 bg-[#eaf8cf]"
                    : "border-[#ba4b2f]/20 bg-[#f8e8df]"
                }`}
              >
                <h2 className="text-2xl font-semibold">
                  {grade.passed
                    ? "Phát lại thành công và có kết quả xác định."
                    : "Luồng còn vi phạm bất biến."}
                </h2>
                <ul className="mt-5 space-y-3">
                  {grade.checks.map((check) => (
                    <li key={check.id} className="flex gap-3 text-sm leading-6">
                      <span className={check.passed ? "text-[#579318]" : "text-[#ba4b2f]"}>
                        {check.passed ? "✓" : "×"}
                      </span>
                      <span>
                        <strong>{check.label}</strong>
                        <span className="block text-[#64736c]">
                          {check.message}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 break-all rounded-xl bg-white/55 p-3 font-mono text-[10px] text-[#52645c]">
                  Chữ ký trạng thái: {grade.signature}
                </p>
              </section>
            ) : null}

            {completedIds.size === tickReplayScenarios.length ? (
              <section className="mt-5 rounded-[2rem] border border-[#356b58]/20 bg-[#173f35] p-6 text-white">
                <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
                  Hoàn tất Tick Replay Lab
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Tiếp theo: đưa các bất biến này vào mã C++.
                </h2>
                <Link
                  href="/mock-interview?mode=targeted&focus=tick_market_data"
                  className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#d7ff91] px-4 py-2 text-sm font-bold text-[#173f35]"
                >
                  Luyện câu C++ dữ liệu tick
                </Link>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
