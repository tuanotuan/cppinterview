import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Cpp11RoadmapApp } from "@/app/learn/cpp11-roadmap-app";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { localizeContentManifest } from "@/lib/content/translations";
import { loadCpp11Roadmap } from "@/lib/learn/cpp11-roadmap";

const roadmapPath = "/learn/roadmap/cpp11";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cpp11Roadmap" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates(roadmapPath, locale),
  };
}

export default async function Cpp11RoadmapPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  const roadmap = await loadCpp11Roadmap(locale, manifest.lessons);

  return <Cpp11RoadmapApp roadmap={roadmap} />;
}
