import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/app/language-switcher";
import { LearnViewNav } from "@/app/learn/learn-view-nav";
import { Link } from "@/i18n/navigation";
import type {
  Cpp11Roadmap,
  Cpp11RoadmapDay,
  RoadmapCoverage,
} from "@/lib/learn/cpp11-roadmap";

const coverageStyles: Record<RoadmapCoverage, string> = {
  ready: "border-[#16865a]/20 bg-[#e2f5ec] text-[#116b49]",
  partial: "border-[#a65c0e]/20 bg-[#fff1dc] text-[#8a4a08]",
  planned: "border-[#526276]/15 bg-[#eef2f6] text-[#43546a]",
};

const markerStyles: Record<RoadmapCoverage, string> = {
  ready: "border-[#16865a] bg-[#e2f5ec] text-[#116b49]",
  partial: "border-[#a65c0e] bg-[#fff1dc] text-[#8a4a08]",
  planned: "border-[#8b98a7] bg-[#f5f7fa] text-[#526276]",
};

export async function Cpp11RoadmapApp({ roadmap }: { roadmap: Cpp11Roadmap }) {
  const t = await getTranslations("Cpp11Roadmap");
  const learn = await getTranslations("Learn");
  const common = await getTranslations("Common");
  const availableDays = roadmap.coverageCounts.ready + roadmap.coverageCounts.partial;

  return (
    <main id="roadmap-top" className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="ui-page-width">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <Link
            href="/"
            aria-label={common("homeAria")}
            title={common("homeAria")}
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
              L
            </span>
            <span>
              <span className="block font-bold">{learn("brand")}</span>
              <span className="block text-xs text-[#526276]">
                {t("brandTagline")}
              </span>
            </span>
          </Link>
          <nav
            aria-label={learn("navAria")}
            className="flex flex-wrap items-center gap-2 text-sm font-bold"
          >
            <LanguageSwitcher compact />
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/mock-interview">
              {learn("mock")}
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/practice">
              {learn("practiceCards")}
            </Link>
          </nav>
        </header>

        <section className="mt-7 overflow-hidden rounded-[1.25rem] bg-[#0f3a69] p-6 text-white shadow-[0_24px_90px_rgb(15_58_105_/_16%)] sm:p-10">
          <div className="max-w-4xl">
            <p className="ui-eyebrow text-[#65e6d2]">{t("eyebrow")}</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-3xl leading-7 text-on-dark-muted">
              {t("description")}
            </p>
          </div>
          <div className="mt-7 grid max-w-2xl grid-cols-3 gap-2">
            <RoadmapMetric label={t("metrics.days")} value={roadmap.days.length} />
            <RoadmapMetric label={t("metrics.phases")} value={roadmap.phases.length} />
            <RoadmapMetric label={t("metrics.available")} value={availableDays} />
          </div>
        </section>

        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0f3a69]/12 bg-white/65 p-4 sm:p-5">
          <LearnViewNav current="roadmap" />
          <p className="max-w-2xl text-sm leading-6 text-[#526276]">
            {t("contentNote")}
          </p>
        </section>

        <section aria-labelledby="roadmap-overview-title" className="py-8 sm:py-10">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2
                id="roadmap-overview-title"
                className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
              >
                {t("overviewTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#526276]">
                {t("overviewDescription")}
              </p>
            </div>
            <div
              role="list"
              aria-label={t("legendAria")}
              className="flex flex-wrap gap-2"
            >
              {(["ready", "partial", "planned"] as const).map((coverage) => (
                <span
                  key={coverage}
                  role="listitem"
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${coverageStyles[coverage]}`}
                >
                  {t(`coverage.${coverage}`)} · {roadmap.coverageCounts[coverage]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-12 sm:mt-10 sm:space-y-16">
            {roadmap.phases.map((phase) => (
              <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
                <header className="mx-auto max-w-3xl text-center">
                  <p className="ui-eyebrow text-[#16865a]">
                    {t("phaseLabel", { number: phase.order })}
                  </p>
                  <h3
                    id={`phase-${phase.id}`}
                    className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                  >
                    {phase.title}
                  </h3>
                  <p className="mt-3 leading-7 text-[#526276]">{phase.summary}</p>
                </header>

                <ol className="relative mt-7 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[1.35rem] before:w-px before:bg-[#0f3a69]/18 md:mt-9 md:space-y-5 md:before:left-1/2">
                  {phase.days.map((entry) => (
                    <RoadmapDayCard
                      key={entry.day}
                      entry={entry}
                      copy={{
                        dayLabel: t("dayLabel", { day: entry.day }),
                        coverageLabel: t(`coverage.${entry.coverage}`),
                        detailsSummary: t("detailsSummary"),
                        dependsOn: entry.dependsOn.length
                          ? t("dependsOn", {
                              days: entry.dependsOn
                                .map((day) => t("dayLabel", { day }))
                                .join(", "),
                            })
                          : null,
                        note: t(`${entry.coverage}Note`),
                        relatedLessons: t("relatedLessons"),
                        shareDay: t("shareDay", { day: entry.day }),
                      }}
                    />
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="#roadmap-top"
              className="ui-action-secondary min-w-44"
            >
              {t("backToTop")}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

type RoadmapDayCopy = {
  dayLabel: string;
  coverageLabel: string;
  detailsSummary: string;
  dependsOn: string | null;
  note: string;
  relatedLessons: string;
  shareDay: string;
};

function RoadmapDayCard({
  entry,
  copy,
}: {
  entry: Cpp11RoadmapDay;
  copy: RoadmapDayCopy;
}) {
  const cardOnLeft = entry.day % 2 === 1;

  return (
    <li className="relative grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-start md:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]">
      <span
        aria-hidden="true"
        className={`relative z-10 col-start-1 row-start-1 mt-4 grid size-11 place-items-center rounded-full border-2 font-mono text-xs font-bold shadow-[0_0_0_5px_#f5f7fa] md:col-start-2 md:justify-self-center ${markerStyles[entry.coverage]}`}
      >
        {entry.day}
      </span>

      <details
        id={`day-${entry.day}`}
        className={`group col-start-2 row-start-1 min-w-0 scroll-mt-5 overflow-hidden rounded-2xl border border-[#0f3a69]/12 bg-white/75 shadow-[0_8px_26px_rgb(15_58_105_/_7%)] transition-colors target:border-[#138f8c] target:ring-4 target:ring-[#65e6d2]/45 hover:border-[#285f86]/30 open:bg-white md:row-start-1 ${
          cardOnLeft
            ? "md:col-start-1 md:mr-2"
            : "md:col-start-3 md:ml-2"
        }`}
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-start justify-between gap-4 p-4 focus-visible:outline-none sm:p-5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-[#285f86] uppercase">
                {copy.dayLabel}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${coverageStyles[entry.coverage]}`}
              >
                {copy.coverageLabel}
              </span>
            </span>
            <h4 className="mt-2 text-lg font-semibold leading-6 tracking-tight text-[#172033] sm:text-xl">
              {entry.title}
            </h4>
          </span>
          <span
            aria-hidden="true"
            className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-[#e6f8f5] text-[#0f3a69] transition-transform group-open:rotate-180"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none">
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sr-only">{copy.detailsSummary}</span>
        </summary>

        <div className="border-t border-[#0f3a69]/10 px-4 pt-4 pb-5 sm:px-5">
          <p className="leading-7 text-[#43546a]">{entry.objective}</p>
          {copy.dependsOn ? (
            <p className="mt-3 font-mono text-[11px] leading-5 text-[#526276]">
              {copy.dependsOn}
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-[#526276]">{copy.note}</p>

          {entry.lessons.length ? (
            <div className="mt-4 border-t border-[#0f3a69]/10 pt-4">
              <p className="ui-panel-label text-[#43546a]">{copy.relatedLessons}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/learn/${lesson.id}`}
                    className="inline-flex min-h-11 min-w-0 items-center rounded-xl border border-[#138f8c]/25 bg-[#e6f8f5] px-3 py-2 text-sm font-bold text-[#0f3a69] hover:border-[#138f8c]/50 hover:bg-white"
                  >
                    <span className="min-w-0 break-words">
                      {lesson.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <a
            href={`#day-${entry.day}`}
            aria-label={copy.shareDay}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl px-3 py-2 font-mono text-xs font-bold text-[#16865a] underline decoration-[#138f8c] underline-offset-4 hover:bg-[#e6f8f5]"
          >
            #day-{entry.day}
          </a>
        </div>
      </details>
    </li>
  );
}

function RoadmapMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
      <p className="text-2xl font-semibold text-[#65e6d2]">{value}</p>
      <p className="mt-1 text-[10px] leading-4 font-bold tracking-[0.07em] text-white/70 uppercase sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}
