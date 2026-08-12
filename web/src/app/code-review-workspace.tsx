"use client";

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
          <p className="text-sm font-semibold text-[#344a40]">Bản review của bạn</p>
          <p className="mt-1 text-xs leading-5 text-[#64736c]">
            Chọn một dòng, nêu vấn đề, tác động và cách sửa. Nhận xét tự lưu như câu trả lời của bạn.
          </p>
        </div>
        <span className="rounded-full bg-[#edf3e9] px-3 py-1 font-mono text-[11px] font-semibold text-[#356b58]">
          {comments.length} nhận xét
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#173f35]/16 bg-[#0b241d] shadow-[0_18px_55px_rgba(7,27,22,0.16)]">
        <div className="border-b border-white/10 bg-[#102f27] px-4 py-3 font-mono text-[11px] font-bold tracking-wide text-[#d7ff91] uppercase">
          Mã cần review
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
                    ? "border-[#d7ff91] bg-white/10"
                    : hasComment
                      ? "border-[#7fb43d] bg-[#d7ff91]/10"
                      : "border-transparent hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLine(lineNumber);
                    setDraft(commentsByLine.get(lineNumber)?.comment ?? "");
                  }}
                  aria-label={`Nhận xét dòng ${lineNumber}`}
                  className={`relative border-r border-white/8 px-3 text-right text-xs transition ${
                    selected ? "text-[#d7ff91]" : "text-white/35 hover:text-white/75"
                  }`}
                >
                  {lineNumber}
                  {hasComment ? (
                    <span aria-hidden="true" className="absolute top-2.5 right-1 size-1.5 rounded-full bg-[#d7ff91]" />
                  ) : null}
                </button>
                <code className="min-h-6 whitespace-pre px-4 text-[#e8f4ec]">{line || " "}</code>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 rounded-2xl border border-[#173f35]/14 bg-[#f5f8ee] p-4">
        <label htmlFor="code-review-comment" className="text-sm font-bold text-[#29493d]">
          {selectedLine ? `Nhận xét dòng ${selectedLine}` : "Chọn một dòng để bắt đầu"}
        </label>
        <textarea
          id="code-review-comment"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!selectedLine}
          rows={4}
          placeholder="Ví dụ: dereference ở đây có thể không hợp lệ khi…"
          className="mt-2 w-full resize-y rounded-xl border border-[#173f35]/18 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-[#89978f] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45 disabled:cursor-not-allowed disabled:bg-[#edf1ea]"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addComment}
            disabled={!selectedLine || !draft.trim()}
            className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#245748] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Lưu nhận xét
          </button>
        </div>
      </div>

      {comments.length ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          {comments.map((item) => (
            <article key={item.line} className="flex items-start justify-between gap-3 rounded-xl border border-[#173f35]/12 bg-white/65 px-4 py-3">
              <div>
                <p className="font-mono text-[11px] font-bold text-[#356b58]">DÒNG {item.line}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#465c52]">{item.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => removeComment(item.line)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#a0442d] transition hover:bg-[#f8e8df]"
              >
                Xóa
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
