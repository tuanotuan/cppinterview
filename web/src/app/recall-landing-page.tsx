import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { LanguageSwitcher } from "./language-switcher";

type LandingPageProps = {
  authNotice: string | null;
  cloudEnabled: boolean;
};

export async function RecallLandingPage({
  authNotice,
  cloudEnabled,
}: LandingPageProps) {
  const t = await getTranslations("Landing");
  const common = await getTranslations("Common");
  const capabilities = (
    t.raw("capabilities") as Array<{ title: string; description: string }>
  ).map((item, index) => ({ ...item, number: String(index + 1).padStart(2, "0") }));
  const workflow = (
    t.raw("workflow") as Array<{ title: string; description: string }>
  ).map((item, index) => ({ ...item, number: String(index + 1).padStart(2, "0") }));

  return (
    <main data-recall-landing className="ui-landing-background min-h-screen overflow-x-hidden">
      <div className="ui-page-width px-4 py-5 sm:px-7 lg:px-10">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
          <Link
            href="/"
            aria-label={common("homeAria")}
            title={common("homeAria")}
            className="flex items-center gap-3"
          >
            <Image
              src="/icon.svg"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              unoptimized
              className="size-10 rounded-xl"
            />
            <span>
              <span className="block text-base font-bold tracking-[-0.025em] sm:text-lg">cppinterview</span>
              <span className="block text-xs text-[color:var(--ink-muted)]">
                {common("tagline")}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Link
              href="/learn"
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[color:var(--ink-subtle)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--pine)] sm:inline-flex"
            >
              {t("library")}
            </Link>
            <AuthLink
              cloudEnabled={cloudEnabled}
              label={t("signIn")}
              disabledTitle={t("disabledAuth")}
              href="/auth?next=%2Fpractice"
              tone="quiet"
            />
            <AuthLink
              cloudEnabled={cloudEnabled}
              label={t("signUp")}
              disabledTitle={t("disabledAuth")}
              href="/auth?mode=signup&next=%2Fpractice"
              tone="primary"
            />
          </div>
        </header>

        {authNotice ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-5 py-4 text-sm font-semibold text-[#c43d3d]"
          >
            {authNotice}
          </p>
        ) : null}

        <section className="grid gap-10 pb-16 pt-16 lg:grid-cols-[minmax(0,1.04fr)_minmax(25rem,.96fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-24">
          <div>
            <p className="ui-panel-label flex items-center gap-2 text-[color:var(--success)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#138f8c]" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.055em] text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
              {t("headline")}
              <span className="block text-[color:var(--success)]">{t("headlineAccent")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[color:var(--ink-subtle)]">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AuthLink
                cloudEnabled={cloudEnabled}
                label={t("freeSignUp")}
                disabledTitle={t("disabledAuth")}
                href="/auth?mode=signup&next=%2Fpractice"
                tone="hero"
              />
              <Link
                href="/practice?guest=1"
                className="ui-action-secondary focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
              >
                {t("guest")}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-[color:var(--border-subtle)] pt-5 text-sm text-[color:var(--ink-subtle)]">
              <span><strong className="text-[color:var(--foreground)]">{t("answerFirst")}</strong> {t("answerFirstSuffix")}</span>
              <span><strong className="text-[color:var(--foreground)]">{t("private")}</strong> {t("privateSuffix")}</span>
            </div>
          </div>

          <div className="relative isolate">
            <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[1.25rem] bg-[color:var(--accent)]/24 blur-3xl" />
            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[color:var(--pine)] text-white shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
                <span className="ui-panel-label text-[color:var(--accent)]">{t("today")}</span>
                <span className="font-mono text-xs text-white/60">01 / 07</span>
              </div>
              <div className="p-5 sm:p-7">
                <p className="ui-panel-label text-white/55">{t("focusQuestion")}</p>
                <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
                  {t("sampleQuestion")}
                </h2>
                <div className="mt-7 rounded-xl border border-white/10 bg-black/12 p-4 font-mono text-sm leading-7 text-[#e6f8f5]">
                  <p className="text-white/45">{t("yourAnswer")}</p>
                  <p className="mt-3">{t("sampleAnswer")}</p>
                  <span className="mt-3 block h-px w-4/5 bg-white/15" />
                  <span className="mt-3 block h-px w-3/5 bg-white/15" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  <MiniMetric value={t("metricSchedule")} label={t("metricScheduleLabel")} />
                  <MiniMetric value={t("metricCoach")} label={t("metricCoachLabel")} />
                  <MiniMetric value={t("metricMock")} label={t("metricMockLabel")} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-[color:var(--border-subtle)] py-12 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="ui-eyebrow text-[#a65c0e]">
                {t("cycleEyebrow")}
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("cycleTitle")}
              </h2>
            </div>
            <Link
              href="/mock-interview"
              className="rounded-xl px-4 py-2 text-sm font-bold text-[color:var(--pine)] transition hover:bg-[color:var(--surface-muted)]"
            >
              {t("viewMock")}
            </Link>
          </div>
          <div className="mt-10 grid gap-0 border-t border-[color:var(--border-subtle)] pt-8 md:grid-cols-3 md:gap-8">
            {capabilities.map((item) => (
              <article
                key={item.number}
                className="group border-t border-[color:var(--border-subtle)] py-6 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:px-0 md:py-0 md:pl-5 md:first:border-l-0 md:first:pl-0"
              >
                <span className="ui-panel-label text-[#a65c0e]">
                  {item.number}
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] group-hover:text-[color:var(--pine)]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-[color:var(--ink-muted)]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] pb-0 lg:grid-cols-[.82fr_1.18fr] lg:pb-0">
          <div className="bg-[color:var(--pine)] p-7 text-white sm:p-9">
            <p className="ui-panel-label text-[color:var(--accent)]">
              {t("managedEyebrow")}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em]">
              {t("managedTitle")}
            </h2>
            <p className="text-on-dark-muted mt-4 leading-7">
              {t("managedDescription")}
            </p>
            <Link
              href="/learn"
              className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-bold text-[color:var(--pine-strong)] transition hover:bg-[#8eebdc] focus-visible:ring-4 focus-visible:ring-white/30 focus-visible:outline-none"
            >
              {t("exploreLibrary")}
            </Link>
          </div>

          <ol className="grid gap-px bg-[color:var(--border-subtle)] sm:grid-cols-2">
            {workflow.map(({ number, title, description }) => (
              <li
                key={number}
                className="flex gap-4 bg-[color:var(--surface-raised)] p-6 sm:p-7"
              >
                <span className="ui-panel-label text-[#a65c0e]">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-muted)]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </div>
    </main>
  );
}

function AuthLink({
  cloudEnabled,
  label,
  disabledTitle,
  href,
  tone,
}: {
  cloudEnabled: boolean;
  label: string;
  disabledTitle: string;
  href: string;
  tone: "quiet" | "primary" | "hero";
}) {
  const className =
    tone === "quiet"
      ? "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-[color:var(--pine)] transition hover:bg-[color:var(--surface-muted)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none sm:px-4"
      : tone === "hero"
        ? "ui-action-primary min-h-12 px-5 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
        : "ui-action-primary min-h-11 px-3 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none sm:px-4";

  if (!cloudEnabled) {
    return (
      <span
        aria-disabled="true"
        className={className + " cursor-not-allowed opacity-45"}
        title={disabledTitle}
      >
        {label}
      </span>
    );
  }

  return <Link href={href} className={className}>{label}</Link>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/12 p-3 sm:p-4">
      <p className="text-xs font-bold text-[color:var(--accent)]">{value}</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-white/65 uppercase">
        {label}
      </p>
    </div>
  );
}
