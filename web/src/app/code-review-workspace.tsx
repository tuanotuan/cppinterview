"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  parseCodeReviewComments,
  renderCodeReviewComments,
} from "@/lib/practice/code-review-comments";

export function CodeReviewWorkspace({
  code,
  value,
  onChange,
}: {
  code: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Practice");
  const comments = useMemo(() => parseCodeReviewComments(value), [value]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const lines = code.split("\n");
  const commentsByLine = new Map(comments.map((item) => [item.line, item]));

  function addComment() {
    if (!selectedLine || !draft.trim()) return;
    const next = [
      ...comments.filter((item) => item.line !== selectedLine),
      { line: selectedLine, comment: draft.trim() },
    ];
    onChange(renderCodeReviewComments(next));
    setDraft("");
  }

  function removeComment(line: number) {
    onChange(renderCodeReviewComments(comments.filter((item) => item.line !== line)));
  }

  return (
    <section id="practice-answer-area" className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#43546a]">{t("codeReview.title")}</p>
          <p className="mt-1 text-xs leading-5 text-[#526276]">
            {t("codeReview.description")}
          </p>
        </div>
        <span className="rounded-full bg-[#eaf2f8] px-3 py-1 font-mono text-[11px] font-semibold text-[#285f86]">
          {t("codeReview.comments", { count: comments.length })}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#0f3a69]/16 bg-[#092c51] shadow-[0_18px_55px_rgba(7,27,22,0.16)]">
        <div className="border-b border-white/10 bg-[#092c51] px-4 py-3 font-mono text-[11px] font-bold tracking-wide text-[#65e6d2] uppercase">
          {t("codeReview.code")}
        </div>
        <ol className="max-h-[34rem] overflow-auto py-3 font-mono text-[13px] leading-6 sm:text-sm">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const hasComment = commentsByLine.has(lineNumber);
            const selected = selectedLine === lineNumber;
            return (
              <li
                key={`${lineNumber}:${line}`}
                className={`grid grid-cols-[3.25rem_minmax(0,1fr)] border-l-2 transition ${
                  selected
                    ? "border-[#65e6d2] bg-white/10"
                    : hasComment
                      ? "border-[#138f8c] bg-[#65e6d2]/10"
                      : "border-transparent hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLine(lineNumber);
                    setDraft(commentsByLine.get(lineNumber)?.comment ?? "");
                  }}
                  aria-label={t("codeReview.lineAria", { line: lineNumber })}
                  className={`relative border-r border-white/8 px-3 text-right text-xs transition ${
                    selected ? "text-[#65e6d2]" : "text-white/35 hover:text-white/75"
                  }`}
                >
                  {lineNumber}
                  {hasComment ? (
                    <span aria-hidden="true" className="absolute top-2.5 right-1 size-1.5 rounded-full bg-[#65e6d2]" />
                  ) : null}
                </button>
                <code className="min-h-6 whitespace-pre px-4 text-[#e6f8f5]">{line || " "}</code>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 rounded-2xl border border-[#0f3a69]/14 bg-[#f8fafc] p-4">
        <label htmlFor="code-review-comment" className="text-sm font-bold text-[#285f86]">
          {selectedLine
            ? t("codeReview.selectedLine", { line: selectedLine })
            : t("codeReview.selectLine")}
        </label>
        <textarea
          id="code-review-comment"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!selectedLine}
          rows={4}
          placeholder={t("codeReview.placeholder")}
          className="mt-2 w-full resize-y rounded-xl border border-[#0f3a69]/18 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45 disabled:cursor-not-allowed disabled:bg-[#eaf2f8]"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addComment}
            disabled={!selectedLine || !draft.trim()}
            className="rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#16865a] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t("codeReview.save")}
          </button>
        </div>
      </div>

      {comments.length ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          {comments.map((item) => (
            <article key={item.line} className="flex items-start justify-between gap-3 rounded-xl border border-[#0f3a69]/12 bg-white/65 px-4 py-3">
              <div>
                <p className="font-mono text-[11px] font-bold text-[#285f86]">
                  {t("codeReview.line", { line: item.line })}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#526276]">{item.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => removeComment(item.line)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#a0442d] transition hover:bg-[#fff1f1]"
              >
                {t("codeReview.delete")}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
