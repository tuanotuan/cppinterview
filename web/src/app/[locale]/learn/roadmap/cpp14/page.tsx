import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Cpp14RoadmapApp } from "@/app/learn/cpp14-roadmap-app";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { localizeContentManifest } from "@/lib/content/translations";
import { loadCpp14Roadmap } from "@/lib/learn/cpp14-roadmap";

const roadmapPath = "/learn/roadmap/cpp14";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cpp14Roadmap" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates(roadmapPath, locale),
  };
}

export default async function Cpp14RoadmapPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  const roadmap = await loadCpp14Roadmap(locale, manifest.lessons);

  return <Cpp14RoadmapApp roadmap={roadmap} />;
}
