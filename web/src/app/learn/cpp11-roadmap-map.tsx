"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDialogAccessibility } from "@/app/accessible-dialog";
import { Link } from "@/i18n/navigation";
import type {
  Cpp11Roadmap,
  Cpp11RoadmapDay,
  RoadmapCoverage,
} from "@/lib/learn/cpp11-roadmap";

type DayCopy = {
  dayLabel: string;
  coverageLabel: string;
  dependsOn: string | null;
  note: string;
  openAria: string;
};

export type Cpp11RoadmapMapCopy = {
  mapAria: string;
  start: string;
  finish: string;
  phaseLabels: Record<string, string>;
  days: Record<number, DayCopy>;
  relatedLessons: string;
  closeDetails: string;
};

const coverageNodeStyles: Record<RoadmapCoverage, string> = {
  ready:
    "border-[#16865a] bg-[#e2f5ec] text-[#0f3a69] hover:bg-[#d5f0e4]",
  partial:
    "border-[#c17922] bg-[#fff1dc] text-[#0f3a69] hover:bg-[#ffe8c5]",
  planned:
    "border-[#9cabb9] bg-white text-[#24364a] hover:border-[#526276] hover:bg-[#f8fafc]",
};

const coverageDotStyles: Record<RoadmapCoverage, string> = {
  ready: "bg-[#16865a]",
  partial: "bg-[#c17922]",
  planned: "border border-[#7c8c9d] bg-white",
};

export function Cpp11RoadmapMap({
  roadmap,
  copy,
}: {
  roadmap: Cpp11Roadmap;
  copy: Cpp11RoadmapMapCopy;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedEntry = selectedDay === null
    ? null
    : roadmap.days.find((entry) => entry.day === selectedDay) ?? null;

  useEffect(() => {
    const selectFromHash = () => {
      const match = window.location.hash.match(/^#day-(\d+)$/);
      if (!match) return;
      const day = Number(match[1]);
      if (roadmap.days.some((entry) => entry.day === day)) {
        setSelectedDay(day);
      }
    };

    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [roadmap.days]);

  const openDay = useCallback((day: number) => {
    setSelectedDay(day);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}#day-${day}`,
    );
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedDay(null);
    if (/^#day-\d+$/.test(window.location.hash)) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  return (
    <>
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
                            return (
                              <RoadmapNode
                                key={entry.day}
                                entry={entry}
                                copy={copy.days[entry.day]}
                                gridColumn={gridColumn}
                                direction={direction}
                                connectsAfter={entryIndex < row.length - 1}
                                selected={selectedDay === entry.day}
                                onOpen={() => openDay(entry.day)}
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
      </div>

      {selectedEntry ? (
        <RoadmapDayDialog
          entry={selectedEntry}
          copy={copy}
          onClose={closeDetails}
        />
      ) : null}
    </>
  );
}

function RoadmapNode({
  entry,
  copy,
  gridColumn,
  direction,
  connectsAfter,
  selected,
  onOpen,
}: {
  entry: Cpp11RoadmapDay;
  copy: DayCopy;
  gridColumn: number;
  direction: "forward" | "reverse";
  connectsAfter: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      id={`day-${entry.day}`}
      role="listitem"
      className="cpp-roadmap-map-node scroll-mt-5"
      data-direction={direction}
      data-connect-after={connectsAfter ? "true" : "false"}
      style={{ gridColumn }}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={copy.openAria}
        onClick={onOpen}
        className={`group relative flex min-h-[4.75rem] w-full flex-col items-start justify-center rounded-lg border-2 px-3.5 py-2.5 text-left shadow-[3px_3px_0_rgb(15_58_105_/_16%)] transition-[background-color,border-color,box-shadow] focus-visible:outline-none ${coverageNodeStyles[entry.coverage]} ${
          selected ? "ring-4 ring-[#65e6d2] ring-offset-2" : ""
        }`}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase">
            {copy.dayLabel}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-bold text-[#43546a]">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${coverageDotStyles[entry.coverage]}`}
            />
            <span className="truncate">{copy.coverageLabel}</span>
          </span>
        </span>
        <span className="mt-1.5 line-clamp-2 text-sm font-bold leading-[1.25rem]">
          {entry.title}
        </span>
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-1.5 text-[#0f3a69]/35 transition-transform group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none">
            <path
              d="M4 10h11m-4-4 4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}

function RoadmapDayDialog({
  entry,
  copy,
  onClose,
}: {
  entry: Cpp11RoadmapDay;
  copy: Cpp11RoadmapMapCopy;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dayCopy = copy.days[entry.day];
  useDialogAccessibility({
    open: true,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onDismiss: onClose,
  });

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#092c51]/72 p-3 sm:items-center sm:p-5"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`roadmap-dialog-title-${entry.day}`}
        aria-describedby={`roadmap-dialog-description-${entry.day}`}
        className="max-h-[min(44rem,calc(100dvh-1.5rem))] w-full max-w-2xl overflow-y-auto rounded-t-[1.25rem] border border-white/35 bg-[#f8fafc] p-5 shadow-[0_28px_90px_rgb(7_17_31_/_38%)] sm:rounded-[1.25rem] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#0f3a69] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-[#65e6d2] uppercase">
                {dayCopy.dayLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f3a69]/12 bg-white px-2.5 py-1 text-[10px] font-bold text-[#43546a]">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${coverageDotStyles[entry.coverage]}`}
                />
                {dayCopy.coverageLabel}
              </span>
            </div>
            <h2
              id={`roadmap-dialog-title-${entry.day}`}
              className="mt-3 text-2xl font-semibold leading-8 tracking-tight text-[#0f3a69] sm:text-3xl"
            >
              {entry.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={copy.closeDetails}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#0f3a69]/14 bg-white text-[#0f3a69] hover:bg-[#e6f8f5]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
              <path
                d="m6.5 6.5 11 11m0-11-11 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p
          id={`roadmap-dialog-description-${entry.day}`}
          className="mt-5 text-base leading-7 text-[#43546a]"
        >
          {entry.objective}
        </p>
        {dayCopy.dependsOn ? (
          <p className="mt-3 font-mono text-[11px] leading-5 text-[#526276]">
            {dayCopy.dependsOn}
          </p>
        ) : null}

        <div className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
          entry.coverage === "ready"
            ? "border-[#16865a]/20 bg-[#e2f5ec] text-[#245441]"
            : entry.coverage === "partial"
              ? "border-[#c17922]/20 bg-[#fff1dc] text-[#6f4618]"
              : "border-[#526276]/14 bg-white text-[#526276]"
        }`}>
          {dayCopy.note}
        </div>

        {entry.lessons.length ? (
          <div className="mt-6 border-t border-[#0f3a69]/10 pt-5">
            <p className="ui-panel-label text-[#43546a]">{copy.relatedLessons}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {entry.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${lesson.id}`}
                  className="inline-flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-xl border border-[#138f8c]/25 bg-[#e6f8f5] px-4 py-3 text-sm font-bold text-[#0f3a69] hover:border-[#138f8c]/55 hover:bg-white"
                >
                  <span className="min-w-0 break-words">{lesson.title}</span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0" fill="none">
                    <path
                      d="M4 10h11m-4-4 4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function chunkDays(days: Cpp11RoadmapDay[]) {
  const rows: Cpp11RoadmapDay[][] = [];
  for (let index = 0; index < days.length; index += 3) {
    rows.push(days.slice(index, index + 3));
  }
  return rows;
}
