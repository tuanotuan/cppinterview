import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { LanguageSwitcher } from "./language-switcher";

export async function SiteFooter() {
  const t = await getTranslations("Common");

  return (
    <footer className="ui-page-width px-4 py-10 sm:px-7 sm:py-12 lg:px-10">
      <div className="border-t border-[color:var(--border-subtle)] pt-10 sm:pt-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr_.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label={t("homeAria")}>
              <Image
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-xl"
              />
              <span className="text-lg font-bold tracking-tight">cppinterview</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--ink-muted)]">
              {t("footer.description")}
            </p>
          </div>
          <FooterColumn title={t("footer.explore")}>
            <FooterLink href="/practice?guest=1">{t("footer.try")}</FooterLink>
            <FooterLink href="/learn">{t("nav.library")}</FooterLink>
            <FooterLink href="/mock-interview">{t("footer.mock")}</FooterLink>
          </FooterColumn>
          <FooterColumn title={t("footer.account")}>
            <FooterLink href="/auth">{t("footer.signIn")}</FooterLink>
            <FooterLink href="/auth?mode=signup">{t("footer.signUp")}</FooterLink>
            <FooterLink href="/auth/reset-password">{t("footer.forgotPassword")}</FooterLink>
          </FooterColumn>
          <FooterColumn title={t("footer.operation")}>
            <p>{t("footer.approved")}</p>
            <p>{t("footer.privateProgress")}</p>
            <p>{t("footer.privateAdmin")}</p>
          </FooterColumn>
          <FooterColumn title={t("footer.connect")}>
            <FooterExternalLink href="https://github.com/tuanotuan/cppinterview">GitHub repository ↗</FooterExternalLink>
            <FooterExternalLink href="https://www.facebook.com/CNTT.HCMUS.K23">Facebook ↗</FooterExternalLink>
            <LanguageSwitcher />
          </FooterColumn>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-5 font-mono text-[11px] font-bold tracking-[0.08em] text-[color:var(--ink-muted)] uppercase">
          <span>© {new Date().getFullYear()} cppinterview</span>
          <span>{t("footer.slogan")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="ui-eyebrow text-[color:var(--pine)]">{title}</h2>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-[color:var(--ink-muted)]">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="w-fit font-semibold text-[color:var(--pine)] transition hover:text-[color:var(--focus-ring)] hover:underline hover:underline-offset-4">{children}</Link>;
}

function FooterExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-fit font-semibold text-[color:var(--pine)] transition hover:text-[color:var(--focus-ring)] hover:underline hover:underline-offset-4"
    >
      {children}
    </a>
  );
}
