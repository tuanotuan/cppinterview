"use client";

import { useState } from "react";

import type { ManualQuestionRequest } from "@/lib/content/question-overrides";

export function ManualQuestionDialog({
  saving,
  error,
  onClose,
  onCreate,
}: {
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: ManualQuestionRequest) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [referenceAnswer, setReferenceAnswer] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-question-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#092c51]/55 px-4 py-6 backdrop-blur-sm sm:px-7 sm:py-10"
    >
      <form
        className="mx-auto w-full max-w-4xl rounded-[1.25rem] border border-[#65e6d2]/35 bg-[#f8fafc] p-5 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate({ prompt, referenceAnswer });
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
              Ngân hàng câu hỏi
            </p>
            <h2 id="manual-question-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0f3a69]">
              Thêm câu hỏi thủ công
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526276]">
              Câu hỏi sẽ được lưu trong Supabase dưới dạng bản nháp, có revision và audit riêng. Chỉ cần đề bài và đáp án tham khảo; không cần liên kết bài học, section hay file .md.
            </p>
          </div>
          <span className="rounded-full border border-[#0f3a69]/15 bg-white px-3 py-1.5 font-mono text-xs text-[#526276]">
            bản nháp mới
          </span>
        </div>

        <FieldTextarea label="Đề bài" value={prompt} onChange={setPrompt} rows={4} />
        <FieldTextarea label="Đáp án tham khảo" value={referenceAnswer} onChange={setReferenceAnswer} rows={8} />

        {error ? <p role="alert" className="mt-4 rounded-xl border border-[#a65c0e]/25 bg-[#fff1f1] px-3 py-2 text-sm text-[#c43d3d]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#285f86] disabled:opacity-50">Hủy</button>
          <button type="submit" disabled={saving || prompt.trim().length < 10 || referenceAnswer.trim().length < 20} className="rounded-xl bg-[#0f3a69] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang tạo…" : "Tạo bản nháp"}</button>
        </div>
      </form>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, rows, required = true }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return <label className="mt-3 block text-xs font-bold text-[#43546a]">{label}<textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1.5 w-full resize-y rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm font-normal leading-6" /></label>;
}
