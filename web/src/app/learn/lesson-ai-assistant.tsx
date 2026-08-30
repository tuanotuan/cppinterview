"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { useDialogAccessibility } from "@/app/accessible-dialog";
import type {
  LessonAssistantMessage,
  LessonAssistantResponse,
} from "@/lib/ai/lesson-assistant";
import {
  LESSON_ASSISTANT_MAX_TURNS,
  lessonAssistantIdempotencyKey,
} from "@/lib/ai/lesson-assistant-idempotency-client";
import type { AiResponseLocale } from "@/lib/ai/contracts";

type LessonSectionLink = {
  id: string;
  label: string;
};

type AssistantTranscriptMessage = LessonAssistantMessage & {
  grounding?: LessonAssistantResponse["grounding"];
  model?: string;
  sourceSectionIds?: string[];
};

type LessonAssistantApiPayload = {
  reply?: unknown;
  model?: unknown;
  error?: unknown;
  publicAiQuota?: unknown;
};

type PublicQuotaSnapshot = {
  limit: number;
  remaining: number;
  resetsAt: string | null;
};

export function LessonAiAssistant({
  contextHash,
  lessonId,
  locale,
  sections,
}: {
  contextHash: string;
  lessonId: string;
  locale: AiResponseLocale;
  sections: LessonSectionLink[];
}) {
  const t = useTranslations("Learn.reader.ai");
  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AssistantTranscriptMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<PublicQuotaSnapshot | null>(null);
  const [expanded, setExpanded] = useState(false);

  useDialogAccessibility({
    open: expanded,
    dialogRef: panelRef,
    initialFocusRef: expandButtonRef,
    onDismiss: () => setExpanded(false),
  });

  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );
  const userTurns = messages.filter((message) => message.role === "user").length;
  const failedTurn = status === "error" && messages.at(-1)?.role === "user";
  const turnLimitReached =
    userTurns >= LESSON_ASSISTANT_MAX_TURNS && !failedTurn;
  const canSubmit =
    status !== "loading" && !turnLimitReached && draft.trim().length > 0;

  async function requestAnswer(requestMessages: AssistantTranscriptMessage[]) {
    setStatus("loading");
    setError(null);

    const canonicalMessages = requestMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const idempotencyKey = await lessonAssistantIdempotencyKey({
        lessonId,
        contextHash,
        messages: canonicalMessages,
        responseLocale: locale,
      });
      const response = await fetch("/api/coach/lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Response-Locale": locale,
        },
        body: JSON.stringify({
          lessonId,
          messages: canonicalMessages,
          responseLocale: locale,
          idempotencyKey,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | LessonAssistantApiPayload
        | null;
      if (!response.ok) {
        throw new LessonAssistantApiError(
          typeof payload?.error === "string"
            ? payload.error
            : t("errors.generic"),
        );
      }

      const reply = parseReply(payload?.reply, t("errors.generic"));
      if (
        reply.sourceSectionIds.some(
          (sectionId) => !sectionById.has(sectionId),
        )
      ) {
        throw new LessonAssistantApiError(t("errors.generic"));
      }
      const model =
        typeof payload?.model === "string" && payload.model.trim()
          ? payload.model
          : "gpt-5.6-luna";
      setMessages([
        ...requestMessages,
        {
          role: "assistant",
          content: reply.answer,
          grounding: reply.grounding,
          model,
          sourceSectionIds: reply.sourceSectionIds,
        },
      ]);
      setQuota(parseQuota(payload?.publicAiQuota));
      setStatus("idle");
    } catch (requestError) {
      setError(
        requestError instanceof LessonAssistantApiError
          ? requestError.message
          : t("errors.network"),
      );
      setStatus("error");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const question = draft.trim();
    const requestMessages: AssistantTranscriptMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setDraft("");
    setMessages(requestMessages);
    void requestAnswer(requestMessages);
  }

  function retryFailedTurn() {
    if (!failedTurn) return;
    void requestAnswer(messages);
  }

  function editFailedTurn() {
    if (!failedTurn) return;
    const failedMessage = messages.at(-1);
    if (!failedMessage) return;
    setMessages(messages.slice(0, -1));
    setDraft(failedMessage.content);
    setError(null);
    setStatus("idle");
  }

  function clearConversation() {
    if (status === "loading") return;
    setMessages([]);
    setDraft("");
    setError(null);
    setQuota(null);
    setStatus("idle");
  }

  return (
    <>
      {expanded ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[60] bg-[#092c51]/45 backdrop-blur-[2px]"
          onMouseDown={() => setExpanded(false)}
        />
      ) : null}
      <aside
        id="lesson-ai-panel"
        ref={panelRef}
        tabIndex={expanded ? -1 : undefined}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded ? "true" : undefined}
        aria-labelledby="lesson-ai-title"
        aria-describedby="lesson-ai-description"
        className={`min-w-0 overflow-hidden rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/95 shadow-[0_16px_60px_rgb(15_58_105_/_7%)] ${
          expanded
            ? "fixed inset-2 z-[70] flex flex-col shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[min(40rem,calc(100vw-2rem))]"
            : "order-1 xl:sticky xl:top-5 xl:col-start-3 xl:row-start-1 xl:flex xl:h-[calc(100dvh-2.5rem)] xl:flex-col"
        }`}
      >
      <div className="border-b border-[#0f3a69]/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#16865a] uppercase">
              {t("eyebrow")}
            </p>
            <h2
              id="lesson-ai-title"
              className="mt-1 text-xl font-semibold tracking-tight text-[#092c51]"
            >
              {t("title")}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-[#65e6d2]/25 px-2.5 py-1 font-mono text-[10px] font-bold text-[#0f3a69]">
              Luna
            </span>
            <button
              ref={expandButtonRef}
              type="button"
              aria-controls="lesson-ai-panel"
              aria-expanded={expanded}
              title={expanded ? t("collapse") : t("expand")}
              onClick={() => setExpanded((current) => !current)}
              className={`${expanded ? "inline-flex" : "hidden xl:inline-flex"} min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-[11px] font-bold text-[#0f3a69] transition hover:border-[#138f8c]/50 hover:bg-[#eef7f6] focus-visible:ring-4 focus-visible:ring-[#65e6d2]/45 focus-visible:outline-none`}
            >
              {expanded ? t("collapse") : t("expand")}
            </button>
          </div>
        </div>
        <p
          id="lesson-ai-description"
          className="mt-2 text-sm leading-6 text-[#526276]"
        >
          {t("description")}
        </p>
      </div>

      <div
        role="log"
        aria-live="off"
        aria-label={t("transcriptAria")}
        aria-busy={status === "loading"}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5"
      >
        {messages.length === 0 ? (
          <div className="rounded-2xl bg-[#eef7f6] p-4 text-sm leading-6 text-[#43546a]">
            <p className="font-semibold text-[#0f3a69]">{t("emptyTitle")}</p>
            <p className="mt-1">{t("emptyBody")}</p>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const isAssistant = message.role === "assistant";
          return (
            <article
              key={`${message.role}-${index}`}
              role={isAssistant ? "status" : undefined}
              aria-live={isAssistant ? "polite" : undefined}
              aria-atomic={isAssistant ? "true" : undefined}
              aria-label={isAssistant ? t("assistantLabel") : t("userLabel")}
              className={
                isAssistant
                  ? "rounded-2xl border border-[#0f3a69]/10 bg-[#eef7f6] p-4"
                  : "ml-6 rounded-2xl bg-[#0f3a69] p-4 text-white"
              }
            >
              <p
                className={
                  isAssistant
                    ? "font-mono text-[10px] font-bold tracking-[0.12em] text-[#16865a] uppercase"
                    : "font-mono text-[10px] font-bold tracking-[0.12em] text-[#65e6d2] uppercase"
                }
              >
                {isAssistant ? t("assistantLabel") : t("userLabel")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>

              {isAssistant ? (
                <div>
                  {message.sourceSectionIds?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#0f3a69]/10 pt-3">
                      {message.sourceSectionIds.map((sectionId) => {
                        const section = sectionById.get(sectionId);
                        if (!section) return null;
                        return (
                          <a
                            key={sectionId}
                            href={`#${sectionId}`}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0f3a69] underline decoration-[#138f8c] underline-offset-2 hover:text-[#16865a] focus-visible:ring-2 focus-visible:ring-[#138f8c] focus-visible:outline-none"
                          >
                            {section.label}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#526276]">
                    <span>{groundingLabel(message.grounding, t)}</span>
                    {message.model ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{message.model}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {status === "loading" ? (
          <div className="rounded-2xl border border-[#0f3a69]/10 bg-[#eef7f6] p-4 text-sm text-[#43546a]">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-[#138f8c] motion-reduce:animate-none"
              />
              {t("loading")}
            </span>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-[#d9483b]/25 bg-[#fff2ef] p-4 text-sm text-[#a93127]"
          >
            <p>{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retryFailedTurn}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white hover:bg-[#164b81] focus-visible:ring-4 focus-visible:ring-[#65e6d2]/55 focus-visible:outline-none"
              >
                {t("retry")}
              </button>
              <button
                type="button"
                onClick={editFailedTurn}
                className="inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/20 bg-white px-4 py-2 text-xs font-bold text-[#0f3a69] hover:bg-[#eef7f6] focus-visible:ring-4 focus-visible:ring-[#65e6d2]/55 focus-visible:outline-none"
              >
                {t("editQuestion")}
              </button>
            </div>
          </div>
        ) : null}

        {turnLimitReached ? (
          <p className="rounded-2xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#7a4a10]">
            {t("turnLimit", { count: LESSON_ASSISTANT_MAX_TURNS })}
          </p>
        ) : null}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border-t border-[#0f3a69]/10 p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="lesson-ai-question"
            className="text-xs font-bold text-[#0f3a69]"
          >
            {t("questionLabel")}
          </label>
          {messages.length > 0 ? (
            <button
              type="button"
              disabled={status === "loading"}
              onClick={clearConversation}
              className="min-h-11 rounded-lg px-2 text-xs font-semibold text-[#526276] underline decoration-[#138f8c] underline-offset-4 hover:text-[#0f3a69] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-[#138f8c] focus-visible:outline-none"
            >
              {t("clear")}
            </button>
          ) : null}
        </div>
        <textarea
          id="lesson-ai-question"
          value={draft}
          maxLength={1_500}
          rows={3}
          disabled={status === "loading" || turnLimitReached}
          aria-describedby="lesson-ai-question-help"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          placeholder={t("placeholder")}
          className="mt-2 w-full resize-y rounded-xl border border-[#0f3a69]/20 bg-white px-3 py-3 text-sm leading-6 text-[#092c51] outline-none placeholder:text-[#526276]/70 focus:border-[#138f8c] focus:ring-4 focus:ring-[#65e6d2]/25 disabled:cursor-not-allowed disabled:bg-[#f1f4f6]"
        />
        <p id="lesson-ai-question-help" className="mt-1 text-[10px] text-[#526276]">
          {t("keyboardHint")}
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#65e6d2] px-5 py-3 text-sm font-bold text-[#0f3a69] transition hover:-translate-y-0.5 hover:bg-[#7cebd9] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#d5e0e4] disabled:text-[#718091] focus-visible:ring-4 focus-visible:ring-[#65e6d2]/55 focus-visible:outline-none"
        >
          {status === "loading" ? t("sending") : t("send")}
        </button>
        {quota ? (
          <p className="mt-2 text-center text-[10px] text-[#526276]">
            {t("quotaRemaining", {
              remaining: quota.remaining,
              limit: quota.limit,
            })}
          </p>
        ) : null}
      </form>
      </aside>
    </>
  );
}

function parseReply(
  value: unknown,
  invalidMessage: string,
): LessonAssistantResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new LessonAssistantApiError(invalidMessage);
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.answer !== "string" ||
    !candidate.answer.trim() ||
    candidate.answer.length > 3_000 ||
    !Array.isArray(candidate.sourceSectionIds) ||
    candidate.sourceSectionIds.length > 4 ||
    candidate.sourceSectionIds.some(
      (sectionId) =>
        typeof sectionId !== "string" ||
        !sectionId.trim() ||
        sectionId.length > 120,
    ) ||
    new Set(candidate.sourceSectionIds).size !==
      candidate.sourceSectionIds.length ||
    (candidate.grounding !== "lesson" &&
      candidate.grounding !== "lesson_plus_general" &&
      candidate.grounding !== "outside_scope") ||
    (candidate.grounding === "outside_scope" &&
      candidate.sourceSectionIds.length > 0)
  ) {
    throw new LessonAssistantApiError(invalidMessage);
  }
  return {
    answer: candidate.answer.trim(),
    sourceSectionIds: candidate.sourceSectionIds as string[],
    grounding: candidate.grounding,
  };
}

function parseQuota(value: unknown): PublicQuotaSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.limit !== "number" ||
    !Number.isInteger(candidate.limit) ||
    candidate.limit < 1 ||
    typeof candidate.remaining !== "number" ||
    !Number.isInteger(candidate.remaining) ||
    candidate.remaining < 0
  ) {
    return null;
  }
  return {
    limit: candidate.limit,
    remaining: candidate.remaining,
    resetsAt:
      typeof candidate.resetsAt === "string" ? candidate.resetsAt : null,
  };
}

function groundingLabel(
  grounding: LessonAssistantResponse["grounding"] | undefined,
  t: ReturnType<typeof useTranslations<"Learn.reader.ai">>,
) {
  if (grounding === "lesson_plus_general") {
    return t("grounding.lessonPlusGeneral");
  }
  if (grounding === "outside_scope") return t("grounding.outsideScope");
  return t("grounding.lesson");
}

class LessonAssistantApiError extends Error {}
