"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_APPLIED_ACTIVITY_PROGRESS,
  appliedActivityProgressStorageKey,
  parseAppliedActivityProgress,
  recordAppliedActivityAttempt,
  serializeAppliedActivityProgress,
  type AppliedActivityProgress,
} from "@/lib/worldquant/applied-activity-progress";
import {
  gradeLegacyModernCapstone,
  legacyModernCapstonePhases,
  type CapstoneGrade,
} from "@/lib/worldquant/legacy-modern-capstone";

export function LegacyModernCapstoneApp({
  accountId,
}: {
  accountId: string | null;
}) {
  const key = useMemo(
    () => appliedActivityProgressStorageKey(accountId),
    [accountId],
  );
  const [progress, setProgress] = useState<AppliedActivityProgress>(
    EMPTY_APPLIED_ACTIVITY_PROGRESS,
  );
  const [id, setId] = useState(legacyModernCapstonePhases[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<CapstoneGrade | null>(null);
  const phase =
    legacyModernCapstonePhases.find((item) => item.id === id) ??
    legacyModernCapstonePhases[0];
  useEffect(() => {
    const saved = parseAppliedActivityProgress(
      window.localStorage.getItem(key),
    );
    const attempt = saved.attempts[phase.id];
    const timer = window.setTimeout(() => {
      setProgress(saved);
      setAnswers(
        attempt?.activityVersion === phase.version ? attempt.selections : {},
      );
      setGrade(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, phase.id, phase.version]);
  const done = new Set(
    legacyModernCapstonePhases.flatMap((item) => {
      const attempt = progress.attempts[item.id];
      return attempt?.activityVersion === item.version &&
        attempt.completedAt &&
        gradeLegacyModernCapstone(item.id, attempt.selections).passed
        ? [item.id]
        : [];
    }),
  );
  const index = legacyModernCapstonePhases.findIndex(
    (item) => item.id === phase.id,
  );
  const unlocked =
    index === 0 || done.has(legacyModernCapstonePhases[index - 1].id);
  function submit() {
    const result = gradeLegacyModernCapstone(phase.id, answers);
    setGrade(result);
    const next = recordAppliedActivityAttempt(progress, {
      activityId: phase.id,
      activityVersion: phase.version,
      selections: answers,
      passedCheckIds: result.checks
        .filter((item) => item.passed)
        .map((item) => item.id),
      completedAt: result.passed
        ? new Date().toISOString()
        : (progress.attempts[phase.id]?.completedAt ?? null),
    });
    setProgress(next);
    localStorage.setItem(key, serializeAppliedActivityProgress(next));
  }
  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <header className="flex items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="font-bold"
          >
            ← Trang chủ cppinterview
          </Link>
        </header>
        <section className="mt-7 rounded-[1.25rem] bg-[#0f3a69] p-7 text-white">
          <p className="font-mono text-xs font-bold tracking-[.16em] text-[#65e6d2] uppercase">
            {done.size}/{legacyModernCapstonePhases.length} checkpoint hoàn tất
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Legacy → Modern C++ Capstone
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-white/70">
            Luyện cách chuyển tick-data platform cũ sang modern C++ mà không mất
            dữ liệu, che mismatch hay bỏ đường rollback. Đây là bài luyện quyết
            định kỹ thuật, không phải chứng nhận tuyển dụng.
          </p>
        </section>
        <section className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/60 p-3">
            {legacyModernCapstonePhases.map((item, i) => {
              const available =
                i === 0 || done.has(legacyModernCapstonePhases[i - 1].id);
              return (
                <button
                  key={item.id}
                  disabled={!available}
                  onClick={() => setId(item.id)}
                  className={`w-full rounded-2xl p-3 text-left text-sm disabled:opacity-40 ${item.id === phase.id ? "bg-[#0f3a69] text-white" : "bg-white"}`}
                >
                  {done.has(item.id) ? "✓ " : `${i + 1}. `}
                  {item.title}
                </button>
              );
            })}
          </aside>
          <section className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/70 p-6">
            <p className="font-mono text-xs font-bold text-[#a65c0e] uppercase">
              {phase.title}
            </p>
            <h2 className="mt-3 text-3xl font-semibold">{phase.summary}</h2>
            {unlocked ? (
              <>
                {phase.checks.map((check, i) => (
                  <fieldset
                    key={check.id}
                    className="mt-6 rounded-2xl border border-[#0f3a69]/10 p-4"
                  >
                    <legend className="px-2 font-bold">
                      {i + 1}. {check.prompt}
                    </legend>
                    {check.options.map((option) => (
                      <label
                        key={option.id}
                        className="mt-2 flex cursor-pointer gap-3 rounded-xl border p-3 text-sm"
                      >
                        <input
                          type="radio"
                          name={check.id}
                          checked={answers[check.id] === option.id}
                          onChange={() => {
                            setAnswers((value) => ({
                              ...value,
                              [check.id]: option.id,
                            }));
                            setGrade(null);
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                ))}
                <button
                  type="button"
          disabled={phase.checks.some((item) => !answers[item.id])}
                  onClick={submit}
                  className="mt-6 rounded-xl bg-[#0f3a69] px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                  Kiểm tra checkpoint
                </button>
                {grade && (
                  <div
                    className={`mt-5 rounded-2xl p-5 ${grade.passed ? "bg-[#e6f8f5]" : "bg-[#fff1f1]"}`}
                  >
                    <strong>
                      {grade.passed
                        ? "Checkpoint đạt."
                        : "Cần sửa trước khi qua checkpoint."}
                    </strong>
                    {grade.checks.map((item) => (
                      <p key={item.id} className="mt-3 text-sm">
                        {item.passed ? "✓" : "×"} {item.message}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-6">Hoàn tất checkpoint trước để mở phần này.</p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
