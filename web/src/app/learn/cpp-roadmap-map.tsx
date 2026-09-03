"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { useDialogAccessibility } from "@/app/accessible-dialog";
import { Link } from "@/i18n/navigation";
import {
  ROADMAP_PROGRESS_STATUSES,
  parseRoadmapProgressStates,
  summarizeRoadmapProgress,
  toggledRoadmapProgressStatus,
  type RoadmapProgressStates,
  type RoadmapProgressStatus,
  type RoadmapTrack,
} from "@/lib/learn/roadmap-progress";

type RoadmapCoverage = "ready" | "partial" | "planned";

type CppRoadmapDay = {
  day: number;
  phaseId: string;
  title: string;
  objective: string;
  dependsOn: number[];
  lessons: Array<{ id: string; title: string }>;
  coverage: RoadmapCoverage;
};

type CppRoadmap = {
  track: RoadmapTrack;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    summary: string;
    days: CppRoadmapDay[];
  }>;
};

type DayCopy = {
  dayLabel: string;
  openAria: string;
  unavailableAria: string;
};

export type CppRoadmapMapCopy = {
  mapAria: string;
  start: string;
  finish: string;
  phaseLabels: Record<string, string>;
  days: Record<number, DayCopy>;
};

export type CppRoadmapProgressCopy = {
  personalProgress: string;
  completed: string;
  learning: string;
  done: string;
  skipped: string;
  actionsAria: string;
  toggleAria: string;
  resetHint: string;
  loading: string;
  loadError: string;
  saveError: string;
  saved: string;
  loginTitle: string;
  loginDescription: string;
  closeDialog: string;
  useEmail: string;
  or: string;
  github: string;
  google: string;
};

type AccessState = "loading" | "authenticated" | "guest" | "unavailable";

const coverageNodeStyles: Record<RoadmapCoverage, string> = {
  ready:
    "border-[#16865a] bg-[#e2f5ec] text-[#0f3a69] hover:bg-[#d5f0e4]",
  partial:
    "border-[#c17922] bg-[#fff1dc] text-[#0f3a69] hover:bg-[#ffe8c5]",
  planned: "border-[#9cabb9] bg-white text-[#526276]",
};

const nodeClassName =
  "group relative flex min-h-[5.25rem] w-full flex-col items-start justify-center rounded-lg border-2 px-3.5 py-2.5 text-left shadow-[3px_3px_0_rgb(15_58_105_/_16%)] transition-[background-color,border-color,box-shadow]";

export function CppRoadmapMap({
  roadmap,
  copy,
  progressCopy,
}: {
  roadmap: CppRoadmap;
  copy: CppRoadmapMapCopy;
  progressCopy: CppRoadmapProgressCopy;
}) {
  const lessonIds = useMemo(
    () =>
      roadmap.phases.flatMap((phase) =>
        phase.days.flatMap((entry) =>
          entry.lessons.slice(0, 1).map((lesson) => lesson.id),
        ),
      ),
    [roadmap.phases],
  );
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [states, setStates] = useState<RoadmapProgressStates>({});
  const [savingLessonIds, setSavingLessonIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authReturnPath, setAuthReturnPath] = useState(
    `/learn/roadmap/${roadmap.track}`,
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgress() {
      try {
        const response = await fetch(
          `/api/roadmap/progress?track=${encodeURIComponent(roadmap.track)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        if (response.status === 401) {
          setAccessState("guest");
          return;
        }
        if (!response.ok) throw new Error("roadmap progress unavailable");
        const parsed = parseRoadmapProgressStates(await response.json());
        if (!parsed) throw new Error("invalid roadmap progress response");
        setStates(parsed);
        setAccessState("authenticated");
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        setAccessState("unavailable");
        setStatusMessage(progressCopy.loadError);
      }
    }

    void loadProgress();
    return () => controller.abort();
  }, [progressCopy.loadError, roadmap.track]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[data-roadmap-progress-menu="${openMenuId}"]`)) return;
      setOpenMenuId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenuId]);

  const summary = summarizeRoadmapProgress(lessonIds, states);

  function requestAuthentication() {
    if (typeof window !== "undefined") {
      setAuthReturnPath(`${window.location.pathname}${window.location.search}`);
    }
    setOpenMenuId(null);
    setAuthDialogOpen(true);
  }

  async function selectStatus(
    lessonId: string,
    selected: RoadmapProgressStatus,
  ) {
    if (accessState === "guest") {
      requestAuthentication();
      return;
    }
    if (accessState !== "authenticated" || savingLessonIds.has(lessonId)) {
      return;
    }

    const previous = states[lessonId];
    const next = toggledRoadmapProgressStatus(previous, selected);
    setStatusMessage("");
    setStates((current) => withRoadmapStatus(current, lessonId, next));
    setSavingLessonIds((current) => new Set(current).add(lessonId));

    try {
      const response = await fetch("/api/roadmap/progress", {
        method: next ? "PUT" : "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          track: roadmap.track,
          lessonId,
          ...(next ? { status: next } : {}),
        }),
      });
      if (response.status === 401) {
        setStates((current) =>
          withRoadmapStatus(current, lessonId, previous ?? null),
        );
        setAccessState("guest");
        requestAuthentication();
        return;
      }
      if (!response.ok) throw new Error("roadmap progress save failed");
      setStatusMessage(progressCopy.saved);
      setOpenMenuId(null);
    } catch {
      setStates((current) =>
        withRoadmapStatus(current, lessonId, previous ?? null),
      );
      setStatusMessage(progressCopy.saveError);
    } finally {
      setSavingLessonIds((current) => {
        const nextSaving = new Set(current);
        nextSaving.delete(lessonId);
        return nextSaving;
      });
    }
  }

  return (
    <div
      role="region"
      aria-label={copy.mapAria}
      className="overflow-hidden rounded-[1.25rem] border border-[#0f3a69]/14 bg-white shadow-[0_18px_55px_rgb(15_58_105_/_8%)]"
    >
      <div className="border-b border-[#0f3a69]/10 bg-[#f8fafc] px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
          <span className="h-px flex-1 bg-[#0f3a69]/15" aria-hidden="true" />
          <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-[#0f3a69] bg-[#65e6d2] px-5 py-2 font-mono text-xs font-bold tracking-[0.08em] text-[#092c51] uppercase shadow-[4px_4px_0_#0f3a69]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
              <path
                d="M6 4.5h9.5L19 8v11.5H6zM15 4.5V8h4M9 12h7M9 15.5h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {copy.start}
          </span>
          <span className="h-px flex-1 bg-[#0f3a69]/15" aria-hidden="true" />
        </div>

        {accessState === "authenticated" ? (
          <RoadmapProgressSummary copy={progressCopy} summary={summary} />
        ) : accessState === "unavailable" ? (
          <p className="mx-auto mt-4 max-w-xl rounded-xl border border-[#c17922]/25 bg-[#fff8ec] px-3 py-2 text-center text-xs font-medium text-[#8a4a08]">
            {progressCopy.loadError}
          </p>
        ) : null}
        {accessState === "loading" ? (
          <span role="status" className="sr-only">
            {progressCopy.loading}
          </span>
        ) : null}
        <p aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-[50rem]">
          {roadmap.phases.map((phase, phaseIndex) => (
            <section
              key={phase.id}
              aria-labelledby={`phase-${phase.id}`}
              className={phaseIndex ? "mt-12 md:mt-16" : undefined}
            >
              <div className="cpp-roadmap-phase-heading">
                <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#65e6d2] uppercase">
                  {copy.phaseLabels[phase.id]}
                </p>
                <h3
                  id={`phase-${phase.id}`}
                  className="mt-1 text-base font-bold leading-5 text-white"
                >
                  {phase.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-white/68">
                  {phase.summary}
                </p>
              </div>
              <div className="cpp-roadmap-phase-entry" aria-hidden="true" />

              <div role="list" className="cpp-roadmap-phase-days">
                {chunkDays(phase.days).map((row, rowIndex, rows) => {
                  const direction = rowIndex % 2 === 0 ? "forward" : "reverse";
                  return (
                    <div key={row[0]?.day}>
                      <div
                        role="presentation"
                        className="cpp-roadmap-map-row"
                        data-direction={direction}
                      >
                        {row.map((entry, entryIndex) => {
                          const gridColumn = direction === "forward"
                            ? entryIndex + 1
                            : 3 - entryIndex;
                          const primaryLesson = entry.lessons[0] ?? null;
                          return (
                            <RoadmapNode
                              key={entry.day}
                              entry={entry}
                              copy={copy.days[entry.day]}
                              progressCopy={progressCopy}
                              progressStatus={primaryLesson
                                ? states[primaryLesson.id]
                                : undefined}
                              accessState={accessState}
                              saving={primaryLesson
                                ? savingLessonIds.has(primaryLesson.id)
                                : false}
                              menuOpen={primaryLesson
                                ? openMenuId === primaryLesson.id
                                : false}
                              onToggleMenu={() => {
                                if (!primaryLesson) return;
                                setOpenMenuId((current) =>
                                  current === primaryLesson.id
                                    ? null
                                    : primaryLesson.id,
                                );
                              }}
                              onSelectStatus={(status) => {
                                if (primaryLesson) {
                                  void selectStatus(primaryLesson.id, status);
                                }
                              }}
                              gridColumn={gridColumn}
                              direction={direction}
                              connectsAfter={entryIndex < row.length - 1}
                            />
                          );
                        })}
                      </div>
                      {rowIndex < rows.length - 1 ? (
                        <div
                          className="cpp-roadmap-map-turn"
                          data-side={direction === "forward" ? "right" : "left"}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {phaseIndex < roadmap.phases.length - 1 ? (
                <div className="cpp-roadmap-phase-divider" aria-hidden="true">
                  <span />
                </div>
              ) : null}
            </section>
          ))}

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="h-px flex-1 bg-[#0f3a69]/15" aria-hidden="true" />
            <span className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#0f3a69] bg-[#0f3a69] px-5 py-2 font-mono text-xs font-bold tracking-[0.08em] text-white uppercase shadow-[4px_4px_0_#65e6d2]">
              {copy.finish}
            </span>
            <span className="h-px flex-1 bg-[#0f3a69]/15" aria-hidden="true" />
          </div>
        </div>
      </div>

      {authDialogOpen ? (
        <RoadmapAuthenticationDialog
          copy={progressCopy}
          next={authReturnPath}
          onDismiss={() => setAuthDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

function RoadmapNode({
  entry,
  copy,
  progressCopy,
  progressStatus,
  accessState,
  saving,
  menuOpen,
  onToggleMenu,
  onSelectStatus,
  gridColumn,
  direction,
  connectsAfter,
}: {
  entry: CppRoadmapDay;
  copy: DayCopy;
  progressCopy: CppRoadmapProgressCopy;
  progressStatus: RoadmapProgressStatus | undefined;
  accessState: AccessState;
  saving: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSelectStatus: (status: RoadmapProgressStatus) => void;
  gridColumn: number;
  direction: "forward" | "reverse";
  connectsAfter: boolean;
}) {
  const primaryLesson = entry.lessons[0] ?? null;
  const menuId = `roadmap-progress-actions-${primaryLesson?.id ?? entry.day}`;
  const content = (
    <RoadmapNodeContent
      entry={entry}
      copy={copy}
      linked={Boolean(primaryLesson)}
      progressStatus={progressStatus}
      progressCopy={progressCopy}
    />
  );

  return (
    <div
      id={`day-${entry.day}`}
      role="listitem"
      className="cpp-roadmap-map-node scroll-mt-5"
      data-direction={direction}
      data-connect-after={connectsAfter ? "true" : "false"}
      style={{ gridColumn }}
    >
      <div
        className="cpp-roadmap-node-shell"
        data-roadmap-progress-menu={primaryLesson?.id}
        data-menu-open={menuOpen ? "true" : "false"}
      >
        {primaryLesson ? (
          <>
            <Link
              href={`/learn/${primaryLesson.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.openAria}
              data-progress={progressStatus ?? "pending"}
              className={`${nodeClassName} h-full cursor-pointer focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:ring-offset-2 focus-visible:outline-none ${coverageNodeStyles[entry.coverage]}`}
            >
              {content}
            </Link>
            <button
              type="button"
              aria-label={progressCopy.toggleAria}
              aria-controls={menuId}
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu();
              }}
              className="cpp-roadmap-progress-trigger"
              data-status={progressStatus ?? "pending"}
            >
              {progressStatus ? (
                <RoadmapStatusIcon status={progressStatus} />
              ) : (
                <PlusIcon />
              )}
            </button>
            <RoadmapProgressActions
              id={menuId}
              copy={progressCopy}
              current={progressStatus}
              disabled={
                saving ||
                accessState === "loading" ||
                accessState === "unavailable"
              }
              onSelect={onSelectStatus}
            />
          </>
        ) : (
          <span
            role="link"
            aria-disabled="true"
            aria-label={copy.unavailableAria}
            title={copy.unavailableAria}
            className={`${nodeClassName} h-full cursor-not-allowed opacity-[0.82] ${coverageNodeStyles[entry.coverage]}`}
          >
            {content}
          </span>
        )}
      </div>
    </div>
  );
}

function RoadmapProgressActions({
  id,
  copy,
  current,
  disabled,
  onSelect,
}: {
  id: string;
  copy: CppRoadmapProgressCopy;
  current: RoadmapProgressStatus | undefined;
  disabled: boolean;
  onSelect: (status: RoadmapProgressStatus) => void;
}) {
  return (
    <div
      id={id}
      role="group"
      aria-label={copy.actionsAria}
      className="cpp-roadmap-progress-actions"
    >
      {ROADMAP_PROGRESS_STATUSES.map((status) => {
        const active = current === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            title={active ? copy.resetHint : statusLabel(copy, status)}
            data-status={status}
            data-active={active ? "true" : "false"}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(status);
            }}
            className="cpp-roadmap-progress-action"
          >
            <RoadmapStatusIcon status={status} />
            <span>{statusLabel(copy, status)}</span>
          </button>
        );
      })}
    </div>
  );
}

function RoadmapNodeContent({
  entry,
  copy,
  linked,
  progressStatus,
  progressCopy,
}: {
  entry: CppRoadmapDay;
  copy: DayCopy;
  linked: boolean;
  progressStatus: RoadmapProgressStatus | undefined;
  progressCopy: CppRoadmapProgressCopy;
}) {
  return (
    <>
      <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase">
        {copy.dayLabel}
      </span>
      <span className="mt-1.5 line-clamp-2 text-sm font-bold leading-[1.25rem]">
        {entry.title}
      </span>
      {progressStatus ? (
        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/72 px-2 py-1 font-mono text-[9px] font-bold tracking-[0.04em] uppercase"
          data-status={progressStatus}
        >
          <RoadmapStatusIcon status={progressStatus} />
          {statusLabel(progressCopy, progressStatus)}
        </span>
      ) : null}
      {linked ? (
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-1.5 text-[#0f3a69]/35 transition-transform group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none">
            <path
              d="M11 4h5v5m0-5-7 7M8 6H5.5A1.5 1.5 0 0 0 4 7.5v7A1.5 1.5 0 0 0 5.5 16h7a1.5 1.5 0 0 0 1.5-1.5V12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
    </>
  );
}

function RoadmapProgressSummary({
  copy,
  summary,
}: {
  copy: CppRoadmapProgressCopy;
  summary: ReturnType<typeof summarizeRoadmapProgress>;
}) {
  return (
    <div
      aria-label={copy.personalProgress}
      className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-[#43546a]"
    >
      <span className="font-mono font-bold tracking-[0.08em] text-[#0f3a69] uppercase">
        {copy.personalProgress}
      </span>
      <span className="rounded-full border border-[#0f3a69]/12 bg-white px-3 py-1.5">
        <strong className="text-[#0f3a69]">
          {summary.completed}/{summary.total}
        </strong>{" "}
        {copy.completed}
      </span>
      <SummaryChip status="learning" value={summary.learning}>
        {copy.learning}
      </SummaryChip>
      <SummaryChip status="done" value={summary.done}>
        {copy.done}
      </SummaryChip>
      <SummaryChip status="skipped" value={summary.skipped}>
        {copy.skipped}
      </SummaryChip>
    </div>
  );
}

function SummaryChip({
  status,
  value,
  children,
}: {
  status: RoadmapProgressStatus;
  value: number;
  children: ReactNode;
}) {
  return (
    <span
      className="rounded-full border bg-white px-3 py-1.5"
      data-roadmap-summary-status={status}
    >
      <strong>{value}</strong> {children}
    </span>
  );
}

function RoadmapAuthenticationDialog({
  copy,
  next,
  onDismiss,
}: {
  copy: CppRoadmapProgressCopy;
  next: string;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const githubButtonRef = useRef<HTMLButtonElement>(null);
  useDialogAccessibility({
    open: true,
    dialogRef,
    initialFocusRef: githubButtonRef,
    onDismiss,
  });

  return (
    <div
      role="presentation"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      className="fixed inset-0 z-[70] grid place-items-center bg-[#092c51]/60 p-4 backdrop-blur-sm"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-auth-dialog-title"
        aria-describedby="roadmap-auth-dialog-description"
        className="relative w-full max-w-md rounded-[1.25rem] border border-white/35 bg-white p-5 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
      >
        <button
          type="button"
          aria-label={copy.closeDialog}
          onClick={onDismiss}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-xl text-[#526276] transition hover:bg-[#eaf2f8] hover:text-[#0f3a69] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
            <path
              d="m5 5 10 10M15 5 5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2
          id="roadmap-auth-dialog-title"
          className="pr-10 text-2xl font-semibold tracking-[-0.03em] text-[#0f3a69]"
        >
          {copy.loginTitle}
        </h2>
        <p
          id="roadmap-auth-dialog-description"
          className="mt-3 text-sm leading-6 text-[#526276]"
        >
          {copy.loginDescription}
        </p>

        <div className="mt-6 grid gap-3">
          <OAuthButton
            provider="github"
            next={next}
            buttonRef={githubButtonRef}
          >
            <GitHubMark />
            {copy.github}
          </OAuthButton>
          <OAuthButton provider="google" next={next}>
            <GoogleMark />
            {copy.google}
          </OAuthButton>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs font-medium text-[#718096]">
          <span className="h-px flex-1 bg-[#0f3a69]/12" aria-hidden="true" />
          {copy.or}
          <span className="h-px flex-1 bg-[#0f3a69]/12" aria-hidden="true" />
        </div>
        <Link
          href={`/auth?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0f3a69]/18 bg-white px-4 py-3 text-sm font-bold text-[#0f3a69] transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          <EmailIcon />
          {copy.useEmail}
        </Link>
      </section>
    </div>
  );
}

function OAuthButton({
  provider,
  next,
  buttonRef,
  children,
}: {
  provider: "github" | "google";
  next: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  return (
    <form
      action={`/auth/login?provider=${provider}&next=${encodeURIComponent(next)}`}
      method="post"
    >
      <button
        ref={buttonRef}
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0f3a69]/18 bg-white px-4 py-3 text-sm font-bold text-[#0f3a69] transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
      >
        {children}
      </button>
    </form>
  );
}

function statusLabel(
  copy: Pick<CppRoadmapProgressCopy, "learning" | "done" | "skipped">,
  status: RoadmapProgressStatus,
) {
  return copy[status];
}

function withRoadmapStatus(
  states: RoadmapProgressStates,
  lessonId: string,
  status: RoadmapProgressStatus | null,
): RoadmapProgressStates {
  const next = { ...states };
  if (status) next[lessonId] = status;
  else delete next[lessonId];
  return next;
}

function RoadmapStatusIcon({ status }: { status: RoadmapProgressStatus }) {
  if (status === "learning") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-3.5 shrink-0"
        fill="none"
      >
        <path
          d="M3.5 4.5h5A1.5 1.5 0 0 1 10 6v9a1.5 1.5 0 0 0-1.5-1.5h-5zm13 0h-5A1.5 1.5 0 0 0 10 6v9a1.5 1.5 0 0 1 1.5-1.5h5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "done") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-3.5 shrink-0"
        fill="none"
      >
        <path
          d="m4 10 3.5 3.5L16 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-3.5 shrink-0"
      fill="none"
    >
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
      <rect
        x="2.5"
        y="4"
        width="15"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m3.5 5.5 6.5 5 6.5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.54 1.04 1.54 1.04.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.64-1.35-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-2 1.04-2.71-.1-.25-.45-1.28.1-2.67 0 0 .85-.27 2.75 1.04a9.58 9.58 0 0 1 5 0c1.9-1.31 2.75-1.04 2.75-1.04.55 1.39.2 2.42.1 2.67.65.71 1.04 1.61 1.04 2.71 0 3.85-2.35 4.7-4.58 4.95.36.31.68.9.68 1.82v2.7c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 12.2c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
      <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.22l-3.14-2.51c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.59A9.74 9.74 0 0 0 12 21.7Z" />
      <path fill="#FBBC05" d="M6.54 13.86A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.86V7.55H3.3A9.68 9.68 0 0 0 2.3 12c0 1.61.39 3.14 1 4.45l3.24-2.59Z" />
      <path fill="#EA4335" d="M12 6.11c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.17 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.25l3.24 2.59C7.31 7.83 9.46 6.11 12 6.11Z" />
    </svg>
  );
}

function chunkDays(days: CppRoadmapDay[]) {
  const rows: CppRoadmapDay[][] = [];
  for (let index = 0; index < days.length; index += 3) {
    rows.push(days.slice(index, index + 3));
  }
  return rows;
}
