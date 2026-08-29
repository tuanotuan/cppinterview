import { Link } from "@/i18n/navigation";

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

const coverageNodeStyles: Record<RoadmapCoverage, string> = {
  ready:
    "border-[#16865a] bg-[#e2f5ec] text-[#0f3a69] hover:bg-[#d5f0e4]",
  partial:
    "border-[#c17922] bg-[#fff1dc] text-[#0f3a69] hover:bg-[#ffe8c5]",
  planned: "border-[#9cabb9] bg-white text-[#526276]",
};

const nodeClassName =
  "group relative flex min-h-[4.75rem] w-full flex-col items-start justify-center rounded-lg border-2 px-3.5 py-2.5 text-left shadow-[3px_3px_0_rgb(15_58_105_/_16%)] transition-[background-color,border-color,box-shadow]";

export function CppRoadmapMap({
  roadmap,
  copy,
}: {
  roadmap: CppRoadmap;
  copy: CppRoadmapMapCopy;
}) {
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
  );
}

function RoadmapNode({
  entry,
  copy,
  gridColumn,
  direction,
  connectsAfter,
}: {
  entry: CppRoadmapDay;
  copy: DayCopy;
  gridColumn: number;
  direction: "forward" | "reverse";
  connectsAfter: boolean;
}) {
  const primaryLesson = entry.lessons[0] ?? null;
  const content = (
    <RoadmapNodeContent
      entry={entry}
      copy={copy}
      linked={Boolean(primaryLesson)}
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
      {primaryLesson ? (
        <Link
          href={`/learn/${primaryLesson.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.openAria}
          className={`${nodeClassName} cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:ring-offset-2 ${coverageNodeStyles[entry.coverage]}`}
        >
          {content}
        </Link>
      ) : (
        <span
          role="link"
          aria-disabled="true"
          aria-label={copy.unavailableAria}
          title={copy.unavailableAria}
          className={`${nodeClassName} cursor-not-allowed opacity-[0.82] ${coverageNodeStyles[entry.coverage]}`}
        >
          {content}
        </span>
      )}
    </div>
  );
}

function RoadmapNodeContent({
  entry,
  copy,
  linked,
}: {
  entry: CppRoadmapDay;
  copy: DayCopy;
  linked: boolean;
}) {
  return (
    <>
      <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase">
        {copy.dayLabel}
      </span>
      <span className="mt-1.5 line-clamp-2 text-sm font-bold leading-[1.25rem]">
        {entry.title}
      </span>
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

function chunkDays(days: CppRoadmapDay[]) {
  const rows: CppRoadmapDay[][] = [];
  for (let index = 0; index < days.length; index += 3) {
    rows.push(days.slice(index, index + 3));
  }
  return rows;
}
