import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { taxonomyTopicLabel } from "@/lib/content/user-facing-labels";
import type { PracticeDeckId } from "@/lib/content/schema";
import {
  COVERAGE_DIFFICULTIES,
  type CoverageBucket,
  type CoverageDifficulty,
  type CoverageStandard,
  type KnowledgeCoverageAnalytics,
} from "@/lib/practice/coverage-analytics";
import { buildCustomStudyLaunchHref } from "@/lib/practice/custom-study";

export async function CoverageDashboard({
  analytics,
  deck,
  locale,
}: {
  analytics: KnowledgeCoverageAnalytics;
  deck: PracticeDeckId;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Stats" });
  const difficultyLabels: Record<CoverageDifficulty, string> = {
    beginner: t("difficulty.beginner"),
    intermediate: t("difficulty.intermediate"),
    advanced: t("difficulty.advanced"),
  };
  const statusLabels = {
    unseen: t("status.unseen"),
    learning: t("status.learning"),
    retained: t("status.retained"),
  };
  const priorityTopics = analytics.topics.slice(0, 8);

  return (
    <>
      <section
        aria-labelledby="coverage-summary-title"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="coverage-summary-title" className="sr-only">
          {t("summary.title")}
        </h2>
        <MetricCard
          label={t("summary.coverage")}
          value={`${analytics.summary.covered}/${analytics.summary.total}`}
          note={t("summary.coverageNote", {
            percent: analytics.summary.coveragePercent,
          })}
          accent="primary"
        />
        <MetricCard
          label={t("summary.lessons")}
          value={`${analytics.summary.coveredLessons}/${analytics.summary.totalLessons}`}
          note={t("summary.lessonsNote")}
        />
        <MetricCard
          label={t("summary.retained")}
          value={`${analytics.summary.retained}/${analytics.summary.total}`}
          note={t("summary.retainedNote", {
            percent: analytics.summary.retainedPercent,
          })}
          accent="success"
        />
        <MetricCard
          label={t("summary.due")}
          value={`${analytics.summary.due}`}
          note={
            analytics.summary.due
              ? t("summary.dueNote")
              : t("summary.dueEmpty")
          }
          href={
            analytics.summary.due
              ? buildCustomStudyLaunchHref(deck, {
                  kind: "coverage",
                  learningState: "due",
                  limit: 20,
                })
              : undefined
          }
          actionLabel={t("actions.reviewDue")}
          accent={analytics.summary.due ? "warning" : "default"}
        />
      </section>

      <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-5 shadow-[0_18px_70px_rgb(15_58_105_/_7%)] sm:p-7">
        <SectionHeading
          eyebrow={t("standards.eyebrow")}
          title={t("standards.title")}
          description={t("standards.description")}
        />
        <StatusLegend label={t("status.legend")} labels={statusLabels} />
        <div className="mt-7 space-y-4">
          {analytics.standards.map((standard) => (
            <StandardCoverageRow
              key={standard.standard}
              bucket={standard}
              deck={deck}
              label={standardLabel(standard.standard)}
              labels={{
                ...statusLabels,
                percent: t("standards.coveredPercent", {
                  percent: standard.coveragePercent,
                }),
                counts: t("standards.counts", {
                  covered: standard.covered,
                  total: standard.total,
                  retained: standard.retained,
                }),
                practice: t("actions.practiceUnseen"),
                review: t("actions.reviewDue"),
                complete: t("actions.covered"),
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-5 shadow-[0_18px_70px_rgb(15_58_105_/_7%)] sm:p-7">
        <SectionHeading
          eyebrow={t("difficulty.eyebrow")}
          title={t("difficulty.title")}
          description={t("difficulty.description")}
        />

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {analytics.difficulties.map((difficulty) => (
            <article
              key={difficulty.difficulty}
              className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {difficultyLabels[difficulty.difficulty]}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#526276]">
                    {t("difficulty.counts", {
                      covered: difficulty.covered,
                      total: difficulty.total,
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-[#e6f8f5] px-2.5 py-1 font-mono text-xs font-bold text-[#0f6f52]">
                  {difficulty.coveragePercent}%
                </span>
              </div>
              <CoverageBar
                bucket={difficulty}
                label={t("difficulty.barLabel", {
                  difficulty: difficultyLabels[difficulty.difficulty],
                  covered: difficulty.covered,
                  total: difficulty.total,
                  retained: difficulty.retained,
                })}
              />
            </article>
          ))}
        </div>

        <div className="mt-6 hidden md:block">
          <table className="w-full table-fixed border-separate border-spacing-2">
            <caption className="sr-only">{t("matrix.caption")}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-28 px-2 py-2 text-left text-xs text-[#526276]">
                  {t("matrix.standard")}
                </th>
                {COVERAGE_DIFFICULTIES.map((difficulty) => (
                  <th
                    key={difficulty}
                    scope="col"
                    className="px-2 py-2 text-left text-xs text-[#526276]"
                  >
                    {difficultyLabels[difficulty]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.standards.map((standard) => (
                <tr key={standard.standard}>
                  <th
                    scope="row"
                    className="rounded-xl bg-[#0f3a69] px-3 py-4 text-left text-sm font-bold text-white"
                  >
                    {standardLabel(standard.standard)}
                  </th>
                  {COVERAGE_DIFFICULTIES.map((difficulty) => (
                    <td key={difficulty} className="rounded-xl bg-[#f8fafc] p-3 align-top">
                      <CoverageMatrixCell
                        bucket={standard.difficulties[difficulty]}
                        deck={deck}
                        standard={standard.standard}
                        difficulty={difficulty}
                        counts={t("matrix.cellCounts", {
                          covered: standard.difficulties[difficulty].covered,
                          total: standard.difficulties[difficulty].total,
                        })}
                        retained={t("matrix.cellRetained", {
                          count: standard.difficulties[difficulty].retained,
                        })}
                        practiceLabel={t("actions.practice")}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-4 md:hidden">
          {analytics.standards.map((standard) => (
            <article
              key={standard.standard}
              className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
            >
              <h3 className="font-semibold">{standardLabel(standard.standard)}</h3>
              <div className="mt-3 divide-y divide-[#0f3a69]/10">
                {COVERAGE_DIFFICULTIES.map((difficulty) => (
                  <div key={difficulty} className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold">
                        {difficultyLabels[difficulty]}
                      </p>
                      <p className="mt-1 text-xs text-[#526276]">
                        {t("matrix.mobileCounts", {
                          covered: standard.difficulties[difficulty].covered,
                          total: standard.difficulties[difficulty].total,
                          retained: standard.difficulties[difficulty].retained,
                        })}
                      </p>
                    </div>
                    <CoveragePracticeLink
                      bucket={standard.difficulties[difficulty]}
                      deck={deck}
                      standard={standard.standard}
                      difficulty={difficulty}
                      label={t("actions.practice")}
                    />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/62 p-5 shadow-[0_18px_70px_rgb(15_58_105_/_7%)] sm:p-7">
        <SectionHeading
          eyebrow={t("topics.eyebrow")}
          title={t("topics.title")}
          description={t("topics.description")}
        />
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {priorityTopics.map((topic) => {
            const label = topicLabel(topic.topic, locale);
            return (
              <article
                key={topic.topic}
                className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{label}</h3>
                    <p className="mt-1 text-xs text-[#526276]">
                      {t("topics.counts", {
                        covered: topic.covered,
                        total: topic.total,
                        retained: topic.retained,
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff2d8] px-2.5 py-1 font-mono text-xs font-bold text-[#8a4a08]">
                    {t("topics.unseen", { count: topic.unseen })}
                  </span>
                </div>
                <CoverageBar
                  bucket={topic}
                  label={t("topics.barLabel", {
                    topic: label,
                    covered: topic.covered,
                    total: topic.total,
                    retained: topic.retained,
                  })}
                />
                {topic.unseen ? (
                  <Link
                    href={buildCustomStudyLaunchHref(deck, {
                      kind: "coverage",
                      learningState: "new",
                      topic: topic.topic,
                      limit: 10,
                    })}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-xs font-bold text-[#0f6f52] transition hover:border-[#0f6f52]/45 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                  >
                    {t("actions.practiceTopic")}
                  </Link>
                ) : topic.due ? (
                  <Link
                    href={buildCustomStudyLaunchHref(deck, {
                      kind: "coverage",
                      learningState: "due",
                      topic: topic.topic,
                      limit: 10,
                    })}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-xs font-bold text-[#0f6f52] transition hover:border-[#0f6f52]/45 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
                  >
                    {t("actions.reviewTopic")}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
        <details className="mt-5 rounded-2xl border border-[#0f3a69]/10 bg-white/55 px-4 py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold text-[#285f86]">
            {t("method.title")}
          </summary>
          <p className="pb-2 text-sm leading-6 text-[#526276]">
            {t("method.description")}
          </p>
        </details>
      </section>

      <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/50 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              {t("activity.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {t("activity.title")}
            </h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            <SmallMetric label={t("activity.today")} value={analytics.summary.reviewedToday} />
            <SmallMetric label={t("activity.reviews")} value={analytics.summary.totalReviews} />
            <SmallMetric label={t("activity.days")} value={analytics.summary.studiedDays} />
            <SmallMetric label={t("activity.streak")} value={analytics.summary.streak} />
          </div>
        </div>
      </section>
    </>
  );
}

function StandardCoverageRow({
  bucket,
  deck,
  label,
  labels,
}: {
  bucket: KnowledgeCoverageAnalytics["standards"][number];
  deck: PracticeDeckId;
  label: string;
  labels: {
    unseen: string;
    learning: string;
    retained: string;
    percent: string;
    counts: string;
    practice: string;
    review: string;
    complete: string;
  };
}) {
  const href = bucket.unseen
    ? buildCustomStudyLaunchHref(deck, {
        kind: "coverage",
        learningState: "new",
        standard: bucket.standard,
        limit: 20,
      })
    : bucket.due
      ? buildCustomStudyLaunchHref(deck, {
          kind: "coverage",
          learningState: "due",
          standard: bucket.standard,
          limit: 20,
        })
      : null;

  return (
    <article className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{label}</h3>
            <span className="rounded-full bg-[#e6f8f5] px-2.5 py-1 font-mono text-[11px] font-bold text-[#0f6f52]">
              {labels.percent}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#526276]">{labels.counts}</p>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex min-h-11 items-center rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-xs font-bold text-[#0f6f52] transition hover:border-[#0f6f52]/45 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
          >
            {bucket.unseen ? labels.practice : labels.review}
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center text-xs font-bold text-[#0f6f52]">
            {labels.complete}
          </span>
        )}
      </div>
      <CoverageBar
        bucket={bucket}
        label={`${label}: ${bucket.retained} ${labels.retained}, ${bucket.learning} ${labels.learning}, ${bucket.unseen} ${labels.unseen}`}
      />
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[#526276]">
        <span>{labels.retained}: {bucket.retained}</span>
        <span>{labels.learning}: {bucket.learning}</span>
        <span className="text-right">{labels.unseen}: {bucket.unseen}</span>
      </div>
    </article>
  );
}

function CoverageMatrixCell({
  bucket,
  deck,
  standard,
  difficulty,
  counts,
  retained,
  practiceLabel,
}: {
  bucket: CoverageBucket;
  deck: PracticeDeckId;
  standard: CoverageStandard;
  difficulty: CoverageDifficulty;
  counts: string;
  retained: string;
  practiceLabel: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs font-bold text-[#0f3a69]">{counts}</p>
      <p className="mt-1 text-[11px] text-[#526276]">{retained}</p>
      <CoverageBar bucket={bucket} label={`${counts}. ${retained}`} compact />
      <CoveragePracticeLink
        bucket={bucket}
        deck={deck}
        standard={standard}
        difficulty={difficulty}
        label={practiceLabel}
      />
    </div>
  );
}

function CoveragePracticeLink({
  bucket,
  deck,
  standard,
  difficulty,
  label,
}: {
  bucket: CoverageBucket;
  deck: PracticeDeckId;
  standard: CoverageStandard;
  difficulty: CoverageDifficulty;
  label: string;
}) {
  if (!bucket.unseen && !bucket.due) return null;
  return (
    <Link
      href={buildCustomStudyLaunchHref(deck, {
        kind: "coverage",
        learningState: bucket.unseen ? "new" : "due",
        standard,
        difficulty,
        limit: 10,
      })}
      className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-[#0f6f52] underline decoration-[#0f6f52]/30 underline-offset-4 focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
    >
      {label} →
    </Link>
  );
}

function CoverageBar({
  bucket,
  label,
  compact = false,
}: {
  bucket: CoverageBucket;
  label: string;
  compact?: boolean;
}) {
  const retainedWidth = portion(bucket.retained, bucket.total);
  const learningWidth = portion(bucket.learning, bucket.total);
  const unseenWidth = Math.max(0, 100 - retainedWidth - learningWidth);
  return (
    <div
      role="img"
      aria-label={label}
      className={`${compact ? "mt-2 h-1.5" : "mt-4 h-2.5"} flex overflow-hidden rounded-full bg-[#dfe7ee]`}
    >
      <span className="h-full bg-[#16865a]" style={{ width: `${retainedWidth}%` }} />
      <span className="h-full bg-[#d08a36]" style={{ width: `${learningWidth}%` }} />
      <span className="h-full bg-[#dfe7ee]" style={{ width: `${unseenWidth}%` }} />
    </div>
  );
}

function StatusLegend({
  label,
  labels,
}: {
  label: string;
  labels: { unseen: string; learning: string; retained: string };
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#526276]" aria-label={label}>
      <LegendItem color="bg-[#16865a]" label={labels.retained} />
      <LegendItem color="bg-[#d08a36]" label={labels.learning} />
      <LegendItem color="bg-[#dfe7ee]" label={labels.unseen} />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526276]">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  href,
  actionLabel,
  accent = "default",
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  actionLabel?: string;
  accent?: "default" | "primary" | "success" | "warning";
}) {
  const accentClass = {
    default: "border-[#0f3a69]/12 bg-white/62",
    primary: "border-[#285f86]/25 bg-[#eef6fb]",
    success: "border-[#16865a]/25 bg-[#e9f8f3]",
    warning: "border-[#d08a36]/35 bg-[#fff6e5]",
  }[accent];
  return (
    <article className={`rounded-2xl border p-5 ${accentClass}`}>
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#526276] uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#526276]">{note}</p>
      {href && actionLabel ? (
        <Link
          href={href}
          className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-[#0f6f52] underline decoration-[#0f6f52]/30 underline-offset-4 focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          {actionLabel} →
        </Link>
      ) : null}
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#f8fafc] px-3 py-2 text-center">
      <p className="font-mono text-[9px] font-bold tracking-[0.08em] text-[#526276] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function standardLabel(standard: CoverageStandard) {
  return standard.replace("cpp", "C++");
}

function topicLabel(topic: string, locale: Locale) {
  if (locale === "vi") return taxonomyTopicLabel(topic);
  return topic
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function portion(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}
