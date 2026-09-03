import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/app/brand-mark";
import { LanguageSwitcher } from "@/app/language-switcher";
import {
  CppRoadmapMap,
  type CppRoadmapMapCopy,
} from "@/app/learn/cpp-roadmap-map";
import { getCppRoadmapProgressCopy } from "@/app/learn/cpp-roadmap-progress-copy.server";
import { LearnViewNav } from "@/app/learn/learn-view-nav";
import { Link } from "@/i18n/navigation";
import type { Cpp14Roadmap, RoadmapCoverage } from "@/lib/learn/cpp14-roadmap";

const coverageStyles: Record<Exclude<RoadmapCoverage, "ready">, string> = {
  partial: "border-[#c17922]/24 bg-[#fff1dc] text-[#8a4a08]",
  planned: "border-[#526276]/16 bg-white text-[#43546a]",
};

export async function Cpp14RoadmapApp({ roadmap }: { roadmap: Cpp14Roadmap }) {
  const t = await getTranslations("Cpp14Roadmap");
  const learn = await getTranslations("Learn");
  const common = await getTranslations("Common");
  const progressCopy = await getCppRoadmapProgressCopy();
  const availableDays = roadmap.coverageCounts.ready + roadmap.coverageCounts.partial;
  const exceptionalCoverages = (["partial", "planned"] as const).filter(
    (coverage) => roadmap.coverageCounts[coverage] > 0,
  );
  const mapCopy: CppRoadmapMapCopy = {
    mapAria: t("mapAria"),
    start: t("start"),
    finish: t("finish"),
    phaseLabels: Object.fromEntries(
      roadmap.phases.map((phase) => [
        phase.id,
        t("phaseLabel", { number: phase.order }),
      ]),
    ),
    days: Object.fromEntries(
      roadmap.days.map((entry) => [
        entry.day,
        {
          dayLabel: t("dayLabel", { day: entry.day }),
          openAria: t("openLesson", {
            day: entry.day,
            title: entry.lessons[0]?.title ?? entry.title,
          }),
          unavailableAria: t("lessonUnavailable", {
            day: entry.day,
            title: entry.title,
          }),
        },
      ]),
    ),
  };

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
            <BrandMark />
            <span>
              <span className="block font-bold">{learn("brand")}</span>
              <span className="block text-xs text-[#526276]">
                {t("brandTagline")}
              </span>
            </span>
          </Link>
          <nav
            aria-label={learn("navAria")}
            className="flex w-full min-w-0 flex-wrap items-center justify-between gap-1 text-sm font-bold sm:w-auto sm:justify-start sm:gap-2"
          >
            <LanguageSwitcher compact />
            <Link className="rounded-xl px-3 py-2 hover:bg-white/60 sm:px-4" href="/mock-interview">
              {learn("mock")}
            </Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-white/60 sm:px-4" href="/practice">
              {learn("practiceCards")}
            </Link>
          </nav>
        </header>

        <section className="mt-7 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white px-5 py-8 text-center shadow-[0_12px_38px_rgb(15_58_105_/_7%)] sm:px-8 sm:py-11">
          <span className="inline-flex rounded-lg border-2 border-[#0f3a69] bg-[#65e6d2] px-3 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#092c51] uppercase shadow-[3px_3px_0_#0f3a69]">
            {t("eyebrow")}
          </span>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.045em] text-[#0f3a69] sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl leading-7 text-[#526276]">
            {t("description")}
          </p>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            <RoadmapMetric label={t("metrics.days")} value={roadmap.days.length} />
            <RoadmapMetric label={t("metrics.phases")} value={roadmap.phases.length} />
            <RoadmapMetric label={t("metrics.available")} value={availableDays} />
          </div>
        </section>

        <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0f3a69]/12 bg-white/75 p-4 sm:p-5">
          <LearnViewNav current="roadmap" selectedStandard="cpp14" />
          <p className="max-w-2xl text-sm leading-6 text-[#526276]">
            {t("contentNote")}
          </p>
        </section>

        <section aria-labelledby="roadmap-overview-title" className="py-8 sm:py-10">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2
                id="roadmap-overview-title"
                className="text-3xl font-semibold tracking-[-0.03em] text-[#172033] sm:text-4xl"
              >
                {t("overviewTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#526276]">
                {t("overviewDescription")}
              </p>
            </div>
            {exceptionalCoverages.length ? (
              <div
                role="list"
                aria-label={t("legendAria")}
                className="flex flex-wrap gap-2"
              >
                {exceptionalCoverages.map((coverage) => (
                  <span
                    key={coverage}
                    role="listitem"
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${coverageStyles[coverage]}`}
                  >
                    {t(`coverage.${coverage}`)} · {roadmap.coverageCounts[coverage]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-7 sm:mt-8">
            <CppRoadmapMap
              roadmap={roadmap}
              copy={mapCopy}
              progressCopy={progressCopy}
            />
          </div>

          <div className="mt-10 text-center">
            <a href="#roadmap-top" className="ui-action-secondary min-w-44">
              {t("backToTop")}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function RoadmapMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0f3a69]/12 bg-[#f5f7fa] px-4 py-2">
      <strong className="font-mono text-base text-[#16865a]">{value}</strong>
      <span className="text-xs font-bold text-[#526276]">{label}</span>
    </div>
  );
}
