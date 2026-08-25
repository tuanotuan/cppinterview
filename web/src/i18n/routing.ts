import { defineRouting } from "next-intl/routing";

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";
export const localeCookieName = "CPPINTERVIEW_LOCALE";

const localeCookie = {
  name: localeCookieName,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
  localeCookie,
  alternateLinks: true,
});

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

export function stripLocalePrefix(pathname: string) {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizeHref(href: string, locale: Locale) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const suffixIndex = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const pathname = suffixIndex === undefined ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === undefined ? "" : href.slice(suffixIndex);
  const normalizedPathname = stripLocalePrefix(pathname);
  return `/${locale}${normalizedPathname === "/" ? "" : normalizedPathname}${suffix}`;
}
