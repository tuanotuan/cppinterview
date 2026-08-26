import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { LanguageSwitcher } from "./language-switcher";
import {
  footerAccountLinks,
  footerExternalLinks,
  footerPrimaryLinks,
} from "./site-footer-links";

export async function SiteFooter() {
  const t = await getTranslations("Common");

  return (
    <footer
      id="site-footer"
      className="relative bg-[color:var(--footer-background)] text-[color:var(--footer-text)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[color:var(--footer-accent)]/45"
      />
      <div className="ui-page-width px-4 sm:px-7 lg:px-10">
        <nav aria-label={t("footer.navigationAria")}>
          <ul className="grid grid-cols-2 gap-2 border-b border-[color:var(--footer-border)] py-5 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-7 sm:py-6">
            {footerPrimaryLinks.map((item) => (
              <li
                key={item.href}
                className="flex last:col-span-2 sm:last:col-span-1"
              >
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-[color:var(--footer-link)] transition hover:bg-[color:var(--footer-accent-soft)] hover:text-[color:var(--footer-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none sm:w-auto"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-10 py-10 sm:grid-cols-2 sm:py-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(11rem,.55fr)_minmax(11rem,.55fr)] lg:gap-14 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center gap-3 rounded-2xl pr-3 focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none"
              aria-label={t("homeAria")}
            >
              <Image
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                unoptimized
                className="size-12 rounded-2xl ring-1 ring-white/20 shadow-[0_10px_30px_rgb(0_0_0_/_24%)]"
              />
              <span>
                <span className="block text-lg font-bold tracking-tight">
                  cppinterview
                </span>
                <span className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.09em] text-[color:var(--footer-accent)] uppercase">
                  {t("tagline")}
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--footer-muted)] sm:text-base">
              {t("footer.description")}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              <TrustPoint>{t("footer.reviewed")}</TrustPoint>
              <TrustPoint>{t("footer.privateProgress")}</TrustPoint>
              <TrustPoint>{t("footer.deliberate")}</TrustPoint>
            </ul>
          </div>

          <FooterColumn title={t("footer.start")}>
            <FooterPrimaryLink href="/practice?guest=1">
              {t("footer.try")}
            </FooterPrimaryLink>
            {footerAccountLinks.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {t(item.labelKey)}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.connect")}>
            {footerExternalLinks.map((item) => (
              <FooterExternalLink key={item.href} href={item.href}>
                {t(item.labelKey)}
              </FooterExternalLink>
            ))}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-5 border-t border-[color:var(--footer-border)] py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8 lg:py-7">
          <div className="flex flex-col gap-1 font-mono text-xs font-bold tracking-[0.06em] text-[color:var(--footer-muted)] uppercase sm:flex-row sm:flex-wrap sm:gap-x-3">
            <span>© {new Date().getFullYear()} cppinterview</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span>{t("footer.slogan")}</span>
          </div>
          <LanguageSwitcher tone="dark" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="ui-eyebrow text-[color:var(--footer-accent)]">{title}</h2>
      <div className="mt-4 grid gap-1 text-sm leading-6">{children}</div>
    </nav>
  );
}

function FooterPrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex min-h-11 w-fit items-center rounded-xl bg-[color:var(--footer-accent)] px-4 py-2 font-bold text-[color:var(--footer-action-ink)] transition hover:bg-[color:var(--footer-accent-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--footer-text)] focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-11 w-fit items-center rounded-lg px-1 font-semibold text-[color:var(--footer-link)] transition hover:text-[color:var(--footer-text)] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function FooterExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-1 font-semibold text-[color:var(--footer-link)] transition hover:text-[color:var(--footer-text)] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none"
    >
      {children}
      <ExternalLinkIcon />
    </a>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-[color:var(--footer-border)] bg-[color:var(--footer-surface)] px-3 py-2 text-xs font-bold text-[color:var(--footer-link)]">
      <CheckIcon />
      {children}
    </li>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-[color:var(--footer-accent)]"
    >
      <path d="m3 8.5 3 3 7-7" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      <path d="M6 3h7v7" />
      <path d="m13 3-8 8" />
      <path d="M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" />
    </svg>
  );
}
