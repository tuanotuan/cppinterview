import { hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { routing, type Locale } from "@/i18n/routing";

import "../globals.css";
import { AdminMobileUsageTracker } from "../admin-mobile-usage-tracker";
import { RecallMobileNav } from "../recall-mobile-nav";
import { SiteFooter } from "../site-footer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Common.meta" });
  return {
    title: t("title"),
    description: t("description"),
    metadataBase: siteMetadataBase(),
  };
}

function siteMetadataBase() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);
  const vercelProductionUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return new URL(`https://${vercelProductionUrl}`);
  }
  return new URL("http://localhost:3000");
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("Common");

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="site-shell-body min-h-full pb-22 lg:pb-0">
        <NextIntlClientProvider messages={messages}>
          <a className="skip-link" href="#main-content">
            {t("skipToContent")}
          </a>
          <div
            id="main-content"
            tabIndex={-1}
            className="bg-[color:var(--background)]"
          >
            {children}
          </div>
          <SiteFooter />
          <AdminMobileUsageTracker />
          <RecallMobileNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
