import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { buildLessonLibrary } from "@/lib/learn/lesson-library";
import { localizeContentManifest } from "@/lib/content/translations";

import { LessonLibraryApp } from "../../learn/lesson-library-app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Learn" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates("/learn", locale),
  };
}

export default async function LessonLibraryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  return <LessonLibraryApp lessons={buildLessonLibrary(manifest)} />;
}
