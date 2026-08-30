"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
  lessonStandardFilters,
  type LessonStandardFilter,
} from "@/lib/learn/lesson-library";

type LearnViewNavProps =
  | {
      current: "list";
      selectedStandard: LessonStandardFilter;
    }
  | {
      current: "roadmap";
      selectedStandard: "cpp11" | "cpp14" | "cpp17" | "cpp20";
    };

const baseItemClassName =
  "inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none";
const inactiveItemClassName =
  "text-[#526276] hover:bg-white hover:text-[#0f3a69]";
const activeItemClassName =
  "bg-[#e6f8f5] text-[#0f3a69] shadow-[inset_0_-2px_0_#65e6d2]";

export function LearnViewNav({
  current,
  selectedStandard,
}: LearnViewNavProps) {
  const t = useTranslations("Learn.views");
  const selectedOption =
    selectedStandard === "all"
      ? null
      : lessonStandardFilters.find(
          (option) => option.value === selectedStandard,
        ) ?? null;
  const roadmapLabel = selectedOption
    ? t("roadmapFor", { standard: selectedOption.label })
    : t("roadmap");
  const roadmapHref = selectedOption?.roadmapHref ?? null;

  return (
    <nav
      aria-label={t("navAria")}
      className="relative inline-flex w-full max-w-full flex-wrap gap-1 rounded-2xl border border-[#0f3a69]/12 bg-white/70 p-1 shadow-[0_4px_14px_rgb(15_58_105_/_5%)] sm:w-auto"
    >
      <Link
        href="/learn"
        aria-current={current === "list" ? "page" : undefined}
        className={`${baseItemClassName} ${
          current === "list" ? activeItemClassName : inactiveItemClassName
        }`}
      >
        {t("list")}
      </Link>

      {roadmapHref ? (
        <Link
          href={roadmapHref}
          aria-current={current === "roadmap" ? "page" : undefined}
          className={`${baseItemClassName} ${
            current === "roadmap"
              ? activeItemClassName
              : inactiveItemClassName
          }`}
        >
          {roadmapLabel}
        </Link>
      ) : (
        <details className="group">
          <summary
            className={`${baseItemClassName} ${inactiveItemClassName} cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden`}
          >
            {roadmapLabel}
            <ChevronDownIcon />
          </summary>
          <div className="absolute top-full left-0 z-30 mt-2 w-full rounded-2xl border border-[#0f3a69]/12 bg-[#f8fafc] p-2 shadow-[0_18px_60px_rgb(15_58_105_/_16%)] sm:w-72">
            <p className="px-3 py-2 text-xs font-bold text-[#43546a]">
              {t("chooseRoadmap")}
            </p>
            <ul className="grid gap-1">
              {lessonStandardFilters.map((option) => (
                <li key={option.value}>
                  {option.roadmapHref ? (
                    <Link
                      href={option.roadmapHref}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#0f3a69] transition-colors hover:bg-[#e6f8f5] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                    >
                      <span>{option.label}</span>
                      <span className="text-xs text-[#16865a]">
                        {t("openRoadmap")}
                      </span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#526276]/55"
                    >
                      <span>{option.label}</span>
                      <span className="text-xs font-semibold">
                        {t("roadmapComingSoon")}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </nav>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="size-4 shrink-0 transition-transform group-open:rotate-180"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
