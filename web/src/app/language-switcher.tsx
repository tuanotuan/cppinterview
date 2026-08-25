"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/i18n/routing";

const focusStorageKey = "cppinterview:focus-language-switcher";

export function LanguageSwitcher({
  compact = false,
  hideOnMock = true,
}: {
  compact?: boolean;
  hideOnMock?: boolean;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Common.language");
  const selectRef = useRef<HTMLSelectElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (sessionStorage.getItem(focusStorageKey) !== "1") return;
    sessionStorage.removeItem(focusStorageKey);
    selectRef.current?.focus();
  }, [locale]);

  if (!pathname || (hideOnMock && pathname.startsWith("/mock-interview"))) {
    return null;
  }

  function changeLocale(value: string) {
    if (!isLocale(value) || value === locale) return;
    const query = window.location.search.slice(1);
    const hash = window.location.hash;
    const href = `${pathname}${query ? `?${query}` : ""}${hash}`;
    sessionStorage.setItem(focusStorageKey, "1");
    startTransition(() => {
      router.replace(href, { locale: value as Locale, scroll: false });
    });
  }

  return (
    <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-2 shadow-sm">
      <label
        htmlFor={compact ? "language-switcher-compact" : "language-switcher"}
        className={compact ? "sr-only" : "text-xs font-bold text-[color:var(--ink-muted)]"}
      >
        {t("label")}
      </label>
      <select
        ref={selectRef}
        id={compact ? "language-switcher-compact" : "language-switcher"}
        aria-label={t("label")}
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value)}
        className="min-h-9 cursor-pointer rounded-lg bg-transparent px-2 text-sm font-bold text-[color:var(--pine)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
      >
        <option value="vi">{compact ? "VI" : t("vi")}</option>
        <option value="en">{compact ? "EN" : t("en")}</option>
      </select>
      <span className="sr-only" aria-live="polite">
        {t("changed")}
      </span>
    </div>
  );
}
