"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useDialogAccessibility } from "./accessible-dialog";

import {
  categoryForInterviewFormat,
  interviewQuestionFormats,
} from "@/lib/content/interview-formats";
import {
  interviewQuestionCategories,
  resolveInterviewQuestionCategory,
} from "@/lib/content/interview-bank";
import type { EditableQuestionContent } from "@/lib/content/question-overrides";
import type {
  ContentQuestion,
  InterviewQuestionFormat,
} from "@/lib/content/schema";

export function QuestionEditorDialog({
  question,
  saving,
  error,
  onClose,
  onSave,
}: {
  question: ContentQuestion;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (content: EditableQuestionContent) => Promise<void>;
}) {
  const t = useTranslations("Practice.questionEditor");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [responseMode, setResponseMode] = useState(
    question.responseMode ?? "text",
  );
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [interviewCategory, setInterviewCategory] = useState(
    resolveInterviewQuestionCategory(question),
  );
  const [interviewFormat, setInterviewFormat] = useState<
    InterviewQuestionFormat | ""
  >(
    question.interviewFormat ?? question.taxonomy.interviewFormat ?? "",
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    question.estimatedMinutes,
  );
  const [prompt, setPrompt] = useState(question.prompt);
  const [code, setCode] = useState(question.code ?? "");
  const [hint, setHint] = useState(question.hint);
  const [shortAnswer, setShortAnswer] = useState(question.answer.short);
  const [detailedAnswer, setDetailedAnswer] = useState(
    question.answer.detailed,
  );
  const [required, setRequired] = useState(question.rubric.required.join("\n"));
  const [bonus, setBonus] = useState(question.rubric.bonus.join("\n"));
  const [misconceptions, setMisconceptions] = useState(
    question.rubric.misconceptions.join("\n"),
  );
  const dismiss = () => {
    if (!saving) onClose();
  };
  useDialogAccessibility({
    open: true,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onDismiss: dismiss,
  });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#092c51]/55 px-4 py-6 backdrop-blur-sm sm:px-7 sm:py-10"
    >
      <form
        className="mx-auto w-full max-w-4xl rounded-[1.25rem] border border-[#65e6d2]/35 bg-[#f8fafc] p-5 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({
            type: question.type,
            responseMode,
            difficulty,
            interviewCategory,
            ...(interviewFormat ? { interviewFormat } : {}),
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
            codeTestSuite:
              question.codeTestSuite ?? question.taxonomy.codeTestSuite,
          });
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
              {t("eyebrow")}
            </p>
            <h2 id="question-editor-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0f3a69]">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526276]">
              {t("description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#0f3a69]/15 bg-white px-3 py-1.5 font-mono text-xs text-[#526276]">
              v{question.version} → v{question.version + 1}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={dismiss}
              disabled={saving}
              className="grid size-11 place-items-center rounded-xl border border-[#0f3a69]/15 bg-white text-xl leading-none text-[#285f86] transition hover:bg-[#eaf2f8] disabled:opacity-50"
              aria-label={t("closeAria")}
              title={t("close")}
            >
              ×
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EditorSelect
            label={t("responseMode")}
            value={responseMode}
            onChange={(value) => setResponseMode(value as typeof responseMode)}
            options={[["text", "Text"], ["code", "Code"]]}
          />
          <EditorSelect
            label={t("difficulty")}
            value={difficulty}
            onChange={(value) => setDifficulty(value as typeof difficulty)}
            options={[
              ["beginner", t("difficulties.beginner")],
              ["intermediate", t("difficulties.intermediate")],
              ["advanced", t("difficulties.advanced")],
            ]}
          />
          <EditorSelect
            label={t("category")}
            value={interviewCategory}
            onChange={(value) => {
              const next = value as typeof interviewCategory;
              setInterviewCategory(next);
              if (next === "coding") setResponseMode("code");
            }}
            options={interviewQuestionCategories.map((category) => [
              category,
              t(`categories.${category}`),
            ])}
          />
          <EditorSelect
            label={t("format")}
            value={interviewFormat}
            onChange={(value) => {
              setInterviewFormat(value as InterviewQuestionFormat | "");
              if (!value) return;
              const format = value as InterviewQuestionFormat;
              setInterviewCategory(categoryForInterviewFormat(format));
              if (format === "code_review") setResponseMode("text");
            }}
            options={[
              ["", t("formats.unclassified")] as [string, string],
              ...interviewQuestionFormats.map((format): [string, string] => [
                format,
                t(`formats.${format}`),
              ]),
            ]}
          />
          <label className="text-xs font-bold text-[#43546a]">
            {t("minutes")}
            <input
              type="number"
              min={1}
              max={15}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm font-normal"
            />
          </label>
        </div>

        <EditorTextarea label={t("prompt")} value={prompt} onChange={setPrompt} rows={4} />
        <EditorTextarea label={t("sampleCode")} value={code} onChange={setCode} rows={7} mono required={false} />
        <EditorTextarea label={t("hint")} value={hint} onChange={setHint} rows={3} />
        <EditorTextarea label={t("shortAnswer")} value={shortAnswer} onChange={setShortAnswer} rows={3} />
        <EditorTextarea label={t("detailedAnswer")} value={detailedAnswer} onChange={setDetailedAnswer} rows={6} />
        <div className="grid gap-3 lg:grid-cols-3">
          <EditorTextarea label={t("requiredPoints")} value={required} onChange={setRequired} rows={6} />
          <EditorTextarea label={t("bonusPoints")} value={bonus} onChange={setBonus} rows={6} required={false} />
          <EditorTextarea label={t("misconceptions")} value={misconceptions} onChange={setMisconceptions} rows={6} required={false} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-[#a65c0e]/25 bg-[#fff1f1] px-3 py-2 text-sm text-[#c43d3d]">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={saving}
            className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#285f86] disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !required.trim()}
            className="rounded-xl bg-[#0f3a69] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function EditorTextarea({
  label,
  value,
  onChange,
  rows,
  mono = false,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <label className="mt-3 block text-xs font-bold text-[#43546a]">
      {label}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={`mt-1.5 w-full resize-y rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm font-normal leading-6 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function EditorSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-xs font-bold text-[#43546a]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm font-normal"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
