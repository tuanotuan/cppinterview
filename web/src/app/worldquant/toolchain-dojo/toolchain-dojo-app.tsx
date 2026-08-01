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
  gradeToolchainProject,
  toolchainProjects,
  type ToolchainGrade,
} from "@/lib/worldquant/toolchain-dojo";

export function ToolchainDojoApp({ accountId }: { accountId: string | null }) {
  const storageKey = useMemo(
    () => appliedActivityProgressStorageKey(accountId),
    [accountId],
  );
  const [progress, setProgress] = useState<AppliedActivityProgress>(
    EMPTY_APPLIED_ACTIVITY_PROGRESS,
  );
  const [projectId, setProjectId] = useState(toolchainProjects[0].id);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<ToolchainGrade | null>(null);
  const project = toolchainProjects.find((item) => item.id === projectId) ?? toolchainProjects[0];

  useEffect(() => {
    const parsed = parseAppliedActivityProgress(window.localStorage.getItem(storageKey));
    const saved = parsed.attempts[project.id];
    const timer = window.setTimeout(() => {
      setProgress(parsed);
      setSelections(saved?.activityVersion === project.version ? saved.selections : {});
      setGrade(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [project.id, project.version, storageKey]);

  const completed = new Set(
    toolchainProjects.flatMap((item) => {
      const attempt = progress.attempts[item.id];
      return attempt?.activityVersion === item.version && attempt.completedAt && gradeToolchainProject(item.id, attempt.selections).passed ? [item.id] : [];
    }),
  );
  const projectIndex = toolchainProjects.findIndex((item) => item.id === project.id);
  const unlocked = projectIndex === 0 || completed.has(toolchainProjects[projectIndex - 1].id);

  function submit() {
    const nextGrade = gradeToolchainProject(project.id, selections);
    setGrade(nextGrade);
    const next = recordAppliedActivityAttempt(progress, {
      activityId: project.id,
      activityVersion: project.version,
      selections,
      passedCheckIds: nextGrade.checks.filter((item) => item.passed).map((item) => item.id),
      completedAt: nextGrade.passed ? new Date().toISOString() : progress.attempts[project.id]?.completedAt ?? null,
    });
    setProgress(next);
    window.localStorage.setItem(storageKey, serializeAppliedActivityProgress(next));
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">TD</span><span><span className="block font-bold">Toolchain Dojo</span><span className="block text-xs text-[#64736c]">C++ & CMake thực hành</span></span></Link>
          <nav className="flex flex-wrap gap-2 text-sm font-bold"><Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/learn/cmake">Đọc bài CMake</Link><Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/worldquant/mission">Nhiệm vụ hôm nay</Link></nav>
        </header>
        <section className="mt-7 rounded-[2.25rem] bg-[#173f35] p-6 text-white shadow-[0_24px_90px_rgb(23_63_53_/_16%)] sm:p-9"><p className="font-mono text-xs font-bold tracking-[.18em] text-[#d7ff91] uppercase">{completed.size}/{toolchainProjects.length} project hoàn tất</p><h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-.045em] sm:text-6xl">Dựng toolchain như một phần của sản phẩm.</h1><p className="mt-5 max-w-3xl leading-7 text-white/68">Mỗi project kiểm tra một quyết định target-based. Kết quả cho biết bạn đã luyện quy tắc nào, không phải chứng nhận năng lực tuyển dụng.</p></section>
        <section className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.75rem] border border-[#173f35]/12 bg-white/60 p-3 lg:sticky lg:top-5"><p className="px-3 py-2 font-mono text-[10px] font-bold tracking-[.16em] text-[#64736c] uppercase">Project</p><div className="space-y-2">{toolchainProjects.map((item, index) => { const available = index === 0 || completed.has(toolchainProjects[index - 1].id); return <button key={item.id} type="button" disabled={!available} onClick={() => setProjectId(item.id)} className={`w-full rounded-2xl px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${item.id === project.id ? "bg-[#173f35] text-white" : "bg-white/65 hover:bg-white"}`}><span className="font-mono text-[10px] opacity-65">{completed.has(item.id) ? "✓ Hoàn tất" : `Project ${index + 1}`}</span><span className="mt-1 block text-sm font-bold">{item.title}</span></button>; })}</div></aside>
          <section className="rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-5 shadow-[0_18px_70px_rgb(23_63_53_/_7%)] sm:p-8"><p className="font-mono text-xs font-bold tracking-[.16em] text-[#ba4b2f] uppercase">{project.title}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Chọn cấu hình có thể vận hành lâu dài</h2><p className="mt-3 max-w-3xl leading-7 text-[#64736c]">{project.summary}</p>{unlocked ? <div className="mt-7 space-y-6">{project.checks.map((check, index) => <fieldset key={check.id} className="rounded-2xl border border-[#173f35]/10 bg-[#f8faf5] p-4 sm:p-5"><legend className="px-2 text-sm font-bold">{index + 1}. {check.prompt}</legend><div className="mt-3 grid gap-2">{check.options.map((option) => <label key={option.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${selections[check.id] === option.id ? "border-[#356b58] bg-[#eaf8cf]" : "border-[#173f35]/10 bg-white"}`}><input type="radio" name={check.id} checked={selections[check.id] === option.id} onChange={() => { setSelections((current) => ({ ...current, [check.id]: option.id })); setGrade(null); }} /><code className="break-all font-mono text-xs">{option.label}</code></label>)}</div></fieldset>)}</div> : <p className="mt-7 rounded-2xl border border-dashed border-[#173f35]/20 p-5 text-sm text-[#64736c]">Hoàn tất project trước để mở phần này.</p>}<div className="mt-6 flex items-center gap-3"><button type="button" disabled={!unlocked || project.checks.some((check) => !selections[check.id])} onClick={submit} className="min-h-12 rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Kiểm tra cấu hình</button><span className="text-xs text-[#64736c]">{Object.keys(selections).length}/{project.checks.length} quyết định</span></div>{grade ? <div aria-live="polite" className={`mt-5 rounded-2xl border p-5 ${grade.passed ? "border-[#79b82a]/30 bg-[#eaf8cf]" : "border-[#ba4b2f]/20 bg-[#f8e8df]"}`}><h3 className="text-xl font-semibold">{grade.passed ? "Cấu hình đạt các điều kiện chính." : "Cấu hình còn có điểm cần sửa."}</h3><ul className="mt-4 space-y-3">{grade.checks.map((check) => <li key={check.id} className="flex gap-3 text-sm leading-6"><span className={check.passed ? "text-[#579318]" : "text-[#ba4b2f]"}>{check.passed ? "✓" : "×"}</span><span><strong>{check.label}</strong><span className="block text-[#64736c]">{check.message}</span></span></li>)}</ul></div> : null}</section>
        </section>
      </div>
    </main>
  );
}
