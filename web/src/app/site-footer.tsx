import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";
import {
  footerContactLinks,
  footerCreatorHandle,
  type FooterContactKind,
} from "./site-footer-links";

export async function SiteFooter() {
  const t = await getTranslations("Common");

  return (
    <footer
      id="site-footer"
      className="bg-[color:var(--footer-background)] text-[color:var(--footer-text)]"
    >
      <div className="ui-page-width px-4 py-12 sm:px-7 sm:py-14 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            <Link
              href="/"
              aria-label={t("homeAria")}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-xl pr-1 font-bold tracking-[-0.025em] focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none"
            >
              <BrandMark
                size="sm"
                className="ring-1 ring-white/15 shadow-[0_10px_30px_rgb(0_0_0_/_24%)]"
              />
              <span className="text-lg">cppinterview</span>
            </Link>
            <span className="text-sm text-[color:var(--footer-muted)]">
              {t("footer.by")}
            </span>
            <span className="rounded-lg bg-[color:var(--footer-accent)] px-2.5 py-1.5 text-sm font-bold text-[color:var(--footer-action-ink)]">
              @{footerCreatorHandle}
            </span>
          </div>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--footer-muted)]">
            {t("footer.description")}
          </p>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-1 text-sm text-[color:var(--footer-muted)]">
              <span className="mr-2">© {new Date().getFullYear()} cppinterview</span>
              <nav aria-label={t("footer.contactAria")}>
                <ul className="flex items-center gap-1">
                  {footerContactLinks.map((item) => (
                    <li key={item.href}>
                      <FooterContactLink
                        href={item.href}
                        kind={item.kind}
                        label={t(item.labelKey)}
                        external={item.external}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <LanguageSwitcher tone="dark" compact />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterContactLink({
  href,
  kind,
  label,
  external,
}: {
  href: string;
  kind: FooterContactKind;
  label: string;
  external: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex size-11 items-center justify-center rounded-lg text-[color:var(--footer-muted)] transition hover:bg-[color:var(--footer-accent-soft)] hover:text-[color:var(--footer-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--footer-accent)] focus-visible:outline-none"
    >
      <FooterContactIcon kind={kind} />
    </a>
  );
}

function FooterContactIcon({ kind }: { kind: FooterContactKind }) {
  if (kind === "github") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
      >
        <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.93a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
      </svg>
    );
  }

  if (kind === "facebook") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
      >
        <path d="M13.5 22v-9h3l.45-3.5H13.5V7.27c0-1.01.28-1.7 1.73-1.7H17V2.44A23.8 23.8 0 0 0 14.4 2C11.83 2 10 3.57 10 6.45V9.5H7V13h3v9h3.5Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
