"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type LearnView = "list" | "roadmap";

const viewHrefs: Record<LearnView, "/learn" | "/learn/roadmap/cpp11"> = {
  list: "/learn",
  roadmap: "/learn/roadmap/cpp11",
};

export function LearnViewNav({ current }: { current: LearnView }) {
  const t = useTranslations("Learn.views");

  return (
    <nav
      aria-label={t("navAria")}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-[#0f3a69]/12 bg-white/70 p-1 shadow-[0_4px_14px_rgb(15_58_105_/_5%)]"
    >
      {(Object.keys(viewHrefs) as LearnView[]).map((view) => {
        const active = view === current;
        return (
          <Link
            key={view}
            href={viewHrefs[view]}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none ${
              active
                ? "bg-[#e6f8f5] text-[#0f3a69] shadow-[inset_0_-2px_0_#65e6d2]"
                : "text-[#526276] hover:bg-white hover:text-[#0f3a69]"
            }`}
          >
            {t(view)}
          </Link>
        );
      })}
    </nav>
  );
}
