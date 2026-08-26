"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/i18n/routing";

import {
  languageMenuTargetIndex,
  localeSwitchHref,
} from "./language-switcher-logic";

const focusStorageKey = "cppinterview:focus-language-switcher";
const scrollStorageKey = "cppinterview:language-switcher-scroll-y";
const localeOptions = [
  { locale: "vi", shortLabel: "VI" },
  { locale: "en", shortLabel: "EN" },
] as const satisfies ReadonlyArray<{ locale: Locale; shortLabel: string }>;

export function LanguageSwitcher({
  compact = false,
  hideOnMock = true,
}: {
  compact?: boolean;
  hideOnMock?: boolean;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Common.language");
  const instanceId = useId();
  const menuId = `${instanceId}-menu`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusOptionIndex = useRef(0);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentIndex = localeOptions.findIndex((option) => option.locale === locale);
  const currentOption = localeOptions[currentIndex] ?? localeOptions[0];
  const currentLabel = t(currentOption.locale);
  const focusTarget = compact ? "compact" : "full";

  useEffect(() => {
    if (isPending) return;
    if (sessionStorage.getItem(focusStorageKey) !== focusTarget) return;
    const restoreTimer = window.setTimeout(() => {
      if (sessionStorage.getItem(focusStorageKey) !== focusTarget) return;
      const storedScrollY = Number(sessionStorage.getItem(scrollStorageKey));
      sessionStorage.removeItem(focusStorageKey);
      sessionStorage.removeItem(scrollStorageKey);
      if (Number.isFinite(storedScrollY)) window.scrollTo(0, storedScrollY);
      triggerRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(restoreTimer);
  }, [focusTarget, isPending, locale]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[focusOptionIndex.current]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  if (!pathname || (hideOnMock && pathname.startsWith("/mock-interview"))) {
    return null;
  }

  function openMenu(optionIndex = currentIndex) {
    focusOptionIndex.current = Math.max(optionIndex, 0);
    setOpen(true);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function changeLocale(value: string) {
    if (!isLocale(value)) return;
    closeMenu();
    if (value === locale) {
      triggerRef.current?.focus();
      return;
    }

    const href = localeSwitchHref(
      pathname,
      window.location.search,
      window.location.hash,
    );
    sessionStorage.setItem(focusStorageKey, focusTarget);
    sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
    startTransition(() => {
      router.replace(href, { locale: value, scroll: false });
    });
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(currentIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(localeOptions.length - 1);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    optionIndex: number,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key === "Tab") {
      closeMenu();
      return;
    }

    const targetIndex = languageMenuTargetIndex(
      event.key,
      optionIndex,
      localeOptions.length,
    );
    if (targetIndex === null) return;
    event.preventDefault();
    optionRefs.current[targetIndex]?.focus();
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${compact ? "" : "gap-2"}`}
    >
      {!compact ? (
        <span className="text-xs font-bold text-[color:var(--ink-muted)]">
          {t("label")}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("current", { language: currentLabel })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-busy={isPending}
        disabled={isPending}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-3 text-sm font-bold whitespace-nowrap text-[color:var(--pine)] shadow-sm transition hover:border-[#285f86]/35 hover:bg-white focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
      >
        <LocaleFlag locale={currentOption.locale} />
        {compact ? (
          <>
            <span className="sm:hidden">{currentOption.shortLabel}</span>
            <span className="hidden sm:inline">{currentLabel}</span>
          </>
        ) : (
          <span>{currentLabel}</span>
        )}
        {isPending ? <LoadingIndicator /> : <ChevronIcon open={open} />}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("menu")}
          className={`absolute z-50 grid min-w-48 gap-1 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] p-1.5 shadow-[var(--shadow-lift)] ${
            compact
              ? "top-full left-0 mt-2 sm:right-0 sm:left-auto"
              : "bottom-full left-0 mb-2"
          }`}
        >
          {localeOptions.map((option, optionIndex) => {
            const selected = option.locale === locale;
            return (
              <button
                key={option.locale}
                ref={(node) => {
                  optionRefs.current[optionIndex] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                disabled={isPending}
                onClick={() => changeLocale(option.locale)}
                onKeyDown={(event) => handleOptionKeyDown(event, optionIndex)}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${
                  selected
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--pine)]"
                    : "text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--pine)]"
                }`}
              >
                <LocaleFlag locale={option.locale} />
                <span className="flex-1">{t(option.locale)}</span>
                <CheckIcon visible={selected} />
              </button>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {t("changed")}
      </span>
    </div>
  );
}

function LocaleFlag({ locale }: { locale: Locale }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-black/10 shadow-[0_1px_2px_rgb(15_58_105_/_12%)]"
    >
      {locale === "vi" ? <VietnamFlag /> : <UnitedKingdomFlag />}
    </span>
  );
}

function VietnamFlag() {
  return (
    <svg viewBox="0 0 30 20" className="size-full" focusable="false">
      <rect width="30" height="20" fill="#DA251D" />
      <path
        d="m15 4.2 1.35 4.16h4.38l-3.54 2.57 1.35 4.17L15 12.52l-3.54 2.58 1.35-4.17-3.54-2.57h4.38L15 4.2Z"
        fill="#FFCD00"
      />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 60 30" className="size-full" focusable="false">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#FFF" strokeWidth="6" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30 0v30M0 15h60" stroke="#FFF" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 text-[color:var(--success)] ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <path d="m3 8.5 3 3 7-7" />
    </svg>
  );
}

function LoadingIndicator() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}
