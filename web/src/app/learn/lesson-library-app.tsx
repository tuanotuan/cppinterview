"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { BrandMark } from "@/app/brand-mark";
import { LanguageSwitcher } from "@/app/language-switcher";
import { LearnViewNav } from "@/app/learn/learn-view-nav";

import {
  lessonMatchesStandard,
  lessonStandardFilters,
  lessonStandardIsAvailable,
  lessonTrackLabel,
  type LessonStandardFilter,
  type LessonLibraryItem,
} from "@/lib/learn/lesson-library";

export function LessonLibraryApp({
  lessons,
}: {
  lessons: LessonLibraryItem[];
}) {
  const t = useTranslations("Learn");
  const common = useTranslations("Common");
  const locale = useLocale();
  const standardFilters: Array<{ value: LessonStandardFilter; label: string }> = [
    { value: "all", label: t("all") },
    ...lessonStandardFilters,
  ];
  const [query, setQuery] = useState("");
  const [standard, setStandard] = useState<LessonStandardFilter>("all");
  const verifiedQuestionCount = lessons.reduce(
    (total, lesson) => total + lesson.verifiedQuestionCount,
    0,
  );
  const codeLessonCount = lessons.filter((lesson) => lesson.hasCode).length;
  const visibleLessons = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return lessons.filter(
      (lesson) =>
        lessonMatchesStandard(lesson.track, standard) &&
        (!normalized ||
          [
            lesson.title,
            lesson.id,
            lessonTrackLabel(lesson.track),
            ...lesson.tags,
          ]
            .join(" ")
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [lessons, locale, query, standard]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
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
              <span className="block font-bold">{t("brand")}</span>
              <span className="block text-xs text-[#526276]">
                {t("brandTagline")}
              </span>
            </span>
          </Link>
          <nav aria-label={t("navAria")} className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <LanguageSwitcher compact />
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/mock-interview">
              {t("mock")}
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/">
              {t("practiceCards")}
            </Link>
          </nav>
        </header>

        <section className="mt-7 rounded-[1.25rem] bg-[#0f3a69] p-6 text-white shadow-[0_24px_90px_rgb(15_58_105_/_16%)] sm:p-10">
          <p className="ui-eyebrow text-[#65e6d2]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-3xl leading-7 text-on-dark-muted">
            {t("description")}
          </p>
          <div className="mt-7 grid max-w-2xl grid-cols-3 gap-2">
            <LibraryMetric label={t("metrics.lessons")} value={lessons.length} />
            <LibraryMetric label={t("metrics.approvedCards")} value={verifiedQuestionCount} />
            <LibraryMetric label={t("metrics.withCode")} value={codeLessonCount} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#0f3a69]/12 bg-white/65 p-4 sm:p-5">
          <label className="text-xs font-bold text-[#43546a]">
            {t("searchLabel")}
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="mt-2 min-h-12 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-3 text-sm font-normal focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            />
          </label>
          <div className="mt-4 border-t border-[#0f3a69]/10 pt-4">
            <p className="text-xs font-bold text-[#43546a]">{t("filterLabel")}</p>
            <div
              role="group"
              aria-label={t("filterLabel")}
              className="mt-2 flex flex-wrap gap-2"
            >
              {standardFilters.map(({ value, label }) => {
                const active = standard === value;
                const available = lessonStandardIsAvailable(lessons, value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    disabled={!available}
                    onClick={() => setStandard(value)}
                    className={`min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none ${
                      active
                        ? "border border-[#65e6d2] bg-[#e6f8f5] text-[#0f3a69] shadow-[inset_0_-2px_0_#65e6d2]"
                        : available
                          ? "border border-[#0f3a69]/15 bg-white text-[#43546a] hover:border-[#285f86]/35 hover:text-[#0f3a69]"
                          : "cursor-not-allowed border border-[#0f3a69]/10 bg-[#f6f8fa] text-[#526276]/45"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-live="polite" aria-labelledby="lesson-list-title" className="py-7">
          <h2 id="lesson-list-title" className="sr-only">
            {t("listTitle")}
          </h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <LearnViewNav current="list" selectedStandard={standard} />
            <span className="font-mono text-xs text-[#526276]">
              {t("results", { count: visibleLessons.length })}
            </span>
          </div>
          {visibleLessons.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${lesson.id}`}
                  className="group rounded-2xl border border-[#0f3a69]/12 bg-white/65 p-5 transition hover:-translate-y-0.5 hover:border-[#285f86]/35 hover:bg-white focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#e6f8f5] px-3 py-1 font-mono text-[10px] font-bold text-[#16865a]">
                      {lessonTrackLabel(lesson.track)}
                    </span>
                    <span className="font-mono text-[10px] text-[#526276]">
                      {t("lessonNumber", { number: lesson.order })}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight group-hover:text-[#16865a]">
                    {lesson.title}
                  </h3>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#0f3a69]/20 p-8 text-center text-sm text-[#526276]">
              {t("empty")}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function LibraryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
      <p className="text-2xl font-semibold text-[#65e6d2]">{value}</p>
      <p className="mt-1 text-[11px] font-bold tracking-[0.08em] text-white/70 uppercase">
        {label}
      </p>
    </div>
  );
}
