"use client";

import { useMemo, useState } from "react";

import type { AdminLessonCoverage } from "@/lib/admin/dashboard";
import type { EditableQuestionContent } from "@/lib/content/question-overrides";

export function ManualQuestionDialog({
  lessons,
  saving,
  error,
  onClose,
  onCreate,
}: {
  lessons: AdminLessonCoverage[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: {
    lessonId: string;
    sourceSectionIds: string[];
    content: EditableQuestionContent;
  }) => Promise<void>;
}) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [sourceSectionIds, setSourceSectionIds] = useState<string[]>([]);
  const [type, setType] = useState<EditableQuestionContent["type"]>("recall");
  const [responseMode, setResponseMode] = useState<
    EditableQuestionContent["responseMode"]
  >("text");
  const [difficulty, setDifficulty] = useState<
    EditableQuestionContent["difficulty"]
  >("intermediate");
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [detailedAnswer, setDetailedAnswer] = useState("");
  const [required, setRequired] = useState("");
  const [bonus, setBonus] = useState("");
  const [misconceptions, setMisconceptions] = useState("");
  const lesson = useMemo(
    () => lessons.find((item) => item.id === lessonId) ?? null,
    [lessonId, lessons],
  );

  function changeLesson(nextLessonId: string) {
    setLessonId(nextLessonId);
    setSourceSectionIds([]);
  }

  function toggleSource(sectionId: string) {
    setSourceSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  }

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
          if (!lessonId || !sourceSectionIds.length) return;
          void onCreate({
            lessonId,
            sourceSectionIds,
            content: {
              type,
              responseMode,
              difficulty,
              estimatedMinutes,
              prompt,
              code: code.trim() || null,
              hint,
              answer: { short: shortAnswer, detailed: detailedAnswer },
              rubric: {
                required: lines(required),
                bonus: lines(bonus),
                misconceptions: lines(misconceptions),
              },
            },
          });
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
              Câu hỏi sẽ được lưu trong Supabase dưới dạng bản nháp, có revision và audit riêng. Hãy chọn đúng bài học và ít nhất một mục nguồn trước khi gửi vào danh sách chờ duyệt.
            </p>
          </div>
          <span className="rounded-full border border-[#173f35]/15 bg-white px-3 py-1.5 font-mono text-xs text-[#64736c]">
            bản nháp mới
          </span>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <FieldSelect
            label="Bài học nguồn"
            value={lessonId}
            onChange={changeLesson}
            options={lessons.map((item) => [item.id, `${item.standard} · ${item.title}`])}
          />
          <div className="rounded-xl border border-[#173f35]/12 bg-white/70 px-4 py-3 text-xs leading-5 text-[#64736c]">
            ID sẽ được tạo tự động theo dạng <span className="font-mono">{lessonId || "lesson"}-manual-001</span>. Câu này không bị ghi đè khi repository đồng bộ.
          </div>
        </div>

        <fieldset className="mt-4 rounded-2xl border border-[#173f35]/12 bg-white/55 p-4">
          <legend className="px-1 text-xs font-bold text-[#52645c]">Nguồn trong bài học</legend>
          <p className="mb-3 text-xs leading-5 text-[#64736c]">
            Chọn phần bạn đã dùng để viết câu hỏi. Nguồn sẽ xuất hiện khi duyệt và giúp AI bám sát nội dung.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {lesson?.sourceSections.map((section) => (
              <label key={section.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#173f35]/10 bg-white px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={sourceSectionIds.includes(section.id)}
                  onChange={() => toggleSource(section.id)}
                  className="mt-0.5 accent-[#356b58]"
                />
                <span><span className="font-mono text-[10px] text-[#64736c]">{section.id}</span><br />{section.heading}</span>
              </label>
            ))}
          </div>
          {!lesson?.sourceSections.length ? (
            <p className="text-sm text-[#8e3825]">Bài học này chưa có mục nguồn để trích dẫn.</p>
          ) : null}
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldSelect label="Loại câu" value={type} onChange={(value) => setType(value as typeof type)} options={[["recall", "Ghi nhớ"], ["code_reasoning", "Phân tích mã"], ["pitfall", "Bẫy thường gặp"], ["scenario", "Tình huống"]]} />
          <FieldSelect label="Cách trả lời" value={responseMode} onChange={(value) => setResponseMode(value as typeof responseMode)} options={[["text", "Văn bản"], ["code", "Mã"]]} />
          <FieldSelect label="Độ khó" value={difficulty} onChange={(value) => setDifficulty(value as typeof difficulty)} options={[["beginner", "Cơ bản"], ["intermediate", "Trung cấp"], ["advanced", "Nâng cao"]]} />
          <label className="text-xs font-bold text-[#52645c]">Thời gian (phút)<input type="number" min={1} max={15} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal" /></label>
        </div>

        <FieldTextarea label="Đề bài" value={prompt} onChange={setPrompt} rows={4} />
        <FieldTextarea label="Mã trong đề (để trống nếu không có)" value={code} onChange={setCode} rows={7} mono required={false} />
        <FieldTextarea label="Gợi ý" value={hint} onChange={setHint} rows={3} />
        <FieldTextarea label="Đáp án ngắn" value={shortAnswer} onChange={setShortAnswer} rows={3} />
        <FieldTextarea label="Giải thích chi tiết" value={detailedAnswer} onChange={setDetailedAnswer} rows={6} />
        <div className="grid gap-3 lg:grid-cols-3">
          <FieldTextarea label="Tiêu chí bắt buộc (mỗi dòng một ý)" value={required} onChange={setRequired} rows={6} />
          <FieldTextarea label="Điểm cộng (mỗi dòng một ý)" value={bonus} onChange={setBonus} rows={6} required={false} />
          <FieldTextarea label="Hiểu lầm thường gặp (mỗi dòng một ý)" value={misconceptions} onChange={setMisconceptions} rows={6} required={false} />
        </div>

        {error ? <p role="alert" className="mt-4 rounded-xl border border-[#ba4b2f]/25 bg-[#f8e8df] px-3 py-2 text-sm text-[#8e3825]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#356b58] disabled:opacity-50">Hủy</button>
          <button type="submit" disabled={saving || !lessonId || !sourceSectionIds.length || !required.trim()} className="rounded-xl bg-[#173f35] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang tạo…" : "Tạo bản nháp"}</button>
        </div>
      </form>
    </div>
  );
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function FieldTextarea({ label, value, onChange, rows, mono = false, required = true }: { label: string; value: string; onChange: (value: string) => void; rows: number; mono?: boolean; required?: boolean }) {
  return <label className="mt-3 block text-xs font-bold text-[#52645c]">{label}<textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`mt-1.5 w-full resize-y rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal leading-6 ${mono ? "font-mono" : ""}`} /></label>;
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="text-xs font-bold text-[#52645c]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
