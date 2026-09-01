import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/app/brand-mark";
import { LanguageSwitcher } from "@/app/language-switcher";
import { Link } from "@/i18n/navigation";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { parsePracticeDeck } from "@/lib/content/decks";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import type { PracticeDeckId } from "@/lib/content/schema";
import {
  buildKnowledgeCoverageAnalytics,
  selectCanonicalCoverageQuestions,
} from "@/lib/practice/coverage-analytics";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import { buildLearningStates } from "@/lib/practice/learning-state";

import { CoverageDashboard } from "./_components/coverage-dashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Stats" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates("/stats", locale),
  };
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ deck?: string | string[] }>;
}) {
  const [{ locale }, query, cloud] = await Promise.all([
    params,
    searchParams,
    loadCloudContext({
      includeAiUsage: false,
      includeDailyAiBudget: false,
      includeGeminiUsage: false,
      includeProviderSettings: false,
      includeMistakeQuestionIds: false,
    }),
  ]);
  const t = await getTranslations({ locale, namespace: "Stats" });
  const selectedDeck = parsePracticeDeck(single(query.deck));

  if (!cloud.enabled) {
    return <StatsGate mode="not-configured" deck={selectedDeck} locale={locale} />;
  }
  if (!cloud.account) {
    return <StatsGate mode="login" deck={selectedDeck} locale={locale} />;
  }
  if (cloud.error) {
    return <StatsGate mode="data-error" deck={selectedDeck} locale={locale} />;
  }

  const repoManifest = getRepoContentManifest();
  const canonicalQuestions = selectCanonicalCoverageQuestions({
    repoQuestions: repoManifest.questions,
    currentQuestions: cloud.manifest.questions,
    deck: selectedDeck,
  });
  const canonicalQuestionIds = new Set(
    canonicalQuestions.map((question) => question.id),
  );
  const reviews = cloud.progress.reviews.filter((review) =>
    canonicalQuestionIds.has(review.questionId),
  );
  const learningStates = buildLearningStates(
    canonicalQuestions.map((question) => ({
      id: question.id,
      version: question.version,
      sourceHash: question.sourceHash,
    })),
    reviews,
    cloud.questionStates.filter((state) =>
      canonicalQuestionIds.has(state.questionId),
    ),
  );
  const today = vietnamDateKey();
  const analytics = buildKnowledgeCoverageAnalytics({
    questions: canonicalQuestions,
    states: [...learningStates.values()],
    reviews,
    today,
  });

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="ui-page-width">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={t("homeAria")}
              title={t("homeAria")}
              className="shrink-0 rounded-2xl focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              <BrandMark />
            </Link>
            <div>
              <p className="text-lg font-bold">{t("headerTitle")}</p>
              <p className="text-xs text-[#526276]">{t("headerSubtitle")}</p>
            </div>
          </div>
          <nav
            aria-label={t("navLabel")}
            className="flex flex-wrap items-center gap-2"
          >
            <LanguageSwitcher compact />
            <Link
              className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
              href={`/practice?deck=${selectedDeck}`}
            >
              {t("navPractice")}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
              href="/mock-interview"
            >
              {t("navMock")}
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center rounded-full border border-[#0f3a69]/15 bg-white/65 px-4 py-2 text-xs font-semibold transition hover:border-[#285f86]/40 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              @{cloud.account.login ?? cloud.account.displayName}
            </Link>
          </nav>
        </header>

        <section className="py-9">
          <p className="ui-eyebrow text-[#a65c0e]">{t("eyebrow")}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#526276]">
                {t("description")}
              </p>
            </div>
            <p className="font-mono text-xs text-[#526276]">
              {t("updated", { date: formatDate(today, locale) })}
            </p>
          </div>
        </section>

        <CoverageDashboard
          analytics={analytics}
          deck={selectedDeck}
          locale={locale}
        />
      </div>
    </main>
  );
}

async function StatsGate({
  mode,
  deck,
  locale,
}: {
  mode: "login" | "not-configured" | "data-error";
  deck: PracticeDeckId;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Stats" });
  const description = {
    login: t("gate.loginDescription"),
    "not-configured": t("gate.notConfiguredDescription"),
    "data-error": t("gate.dataErrorDescription"),
  }[mode];

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/70 p-8 shadow-[0_24px_80px_rgb(15_58_105_/_10%)] sm:p-10">
        <Link
          href="/"
          aria-label={t("homeAria")}
          className="inline-flex rounded-2xl focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          <BrandMark size="lg" />
        </Link>
        <p className="mt-8 font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {t("gate.title")}
        </h1>
        <p className="mt-4 leading-7 text-[#526276]">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {mode === "login" ? (
            <Link
              href={`/auth?next=${encodeURIComponent(`/stats?deck=${deck}`)}`}
              className="inline-flex min-h-11 items-center rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              {t("gate.signIn")}
            </Link>
          ) : null}
          {mode === "data-error" ? (
            <Link
              href={`/stats?deck=${deck}`}
              className="inline-flex min-h-11 items-center rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
            >
              {t("gate.retry")}
            </Link>
          ) : null}
          <Link
            href={`/practice?deck=${deck}`}
            className="inline-flex min-h-11 items-center rounded-2xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-sm font-bold focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
          >
            {t("gate.backToPractice")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function vietnamDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
