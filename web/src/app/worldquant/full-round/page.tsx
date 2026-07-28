import type { Metadata } from "next";

import { loadCloudContext } from "@/lib/practice/cloud-server";
import { parseWorldQuantRoleProfile } from "@/lib/worldquant/readiness";

import { WorldQuantFullRoundApp } from "./worldquant-full-round-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WorldQuant Full Round — Recall",
  description:
    "Vòng phỏng vấn C++ WorldQuant gồm 5 chặng, timer, rubric và English voice practice.",
};

export default async function WorldQuantFullRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const params = await searchParams;
  const roleParam = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });

  return (
    <WorldQuantFullRoundApp
      accountId={cloud.account?.id ?? null}
      initialRoleId={parseWorldQuantRoleProfile(roleParam)}
    />
  );
}
