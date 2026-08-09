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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#102d26]/55 px-4 py-6 backdrop-blur-sm sm:px-7 sm:py-10"
    >
      <form
        className="mx-auto w-full max-w-4xl rounded-[2rem] border border-[#d7ff91]/35 bg-[#f7f9f2] p-5 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate({ prompt, referenceAnswer });
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
              Ngân hàng câu hỏi
            </p>
            <h2 id="manual-question-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#173f35]">
              Thêm câu hỏi thủ công
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64736c]">
              Câu hỏi sẽ được lưu trong Supabase dưới dạng bản nháp, có revision và audit riêng. Chỉ cần đề bài và đáp án tham khảo; không cần liên kết bài học, section hay file .md.
            </p>
          </div>
          <span className="rounded-full border border-[#173f35]/15 bg-white px-3 py-1.5 font-mono text-xs text-[#64736c]">
            bản nháp mới
          </span>
        </div>

        <FieldTextarea label="Đề bài" value={prompt} onChange={setPrompt} rows={4} />
        <FieldTextarea label="Đáp án tham khảo" value={referenceAnswer} onChange={setReferenceAnswer} rows={8} />

        {error ? <p role="alert" className="mt-4 rounded-xl border border-[#ba4b2f]/25 bg-[#f8e8df] px-3 py-2 text-sm text-[#8e3825]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#356b58] disabled:opacity-50">Hủy</button>
          <button type="submit" disabled={saving || prompt.trim().length < 10 || referenceAnswer.trim().length < 20} className="rounded-xl bg-[#173f35] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang tạo…" : "Tạo bản nháp"}</button>
        </div>
      </form>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, rows, required = true }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return <label className="mt-3 block text-xs font-bold text-[#52645c]">{label}<textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1.5 w-full resize-y rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal leading-6" /></label>;
}
