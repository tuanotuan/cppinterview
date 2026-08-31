import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Cpp23RoadmapApp } from "@/app/learn/cpp23-roadmap-app";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { localizeContentManifest } from "@/lib/content/translations";
import { loadCpp23Roadmap } from "@/lib/learn/cpp23-roadmap";

const roadmapPath = "/learn/roadmap/cpp23";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cpp23Roadmap" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates(roadmapPath, locale),
  };
}

export default async function Cpp23RoadmapPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  const roadmap = await loadCpp23Roadmap(locale, manifest.lessons);

  return <Cpp23RoadmapApp roadmap={roadmap} />;
}
