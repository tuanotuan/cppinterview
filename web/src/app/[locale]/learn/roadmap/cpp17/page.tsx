import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Cpp17RoadmapApp } from "@/app/learn/cpp17-roadmap-app";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { localizeContentManifest } from "@/lib/content/translations";
import { loadCpp17Roadmap } from "@/lib/learn/cpp17-roadmap";

const roadmapPath = "/learn/roadmap/cpp17";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cpp17Roadmap" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates(roadmapPath, locale),
  };
}

export default async function Cpp17RoadmapPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  const roadmap = await loadCpp17Roadmap(locale, manifest.lessons);

  return <Cpp17RoadmapApp roadmap={roadmap} />;
}
