import type { Metadata } from "next";

import { loadCloudContext } from "@/lib/practice/cloud-server";

import { ToolchainDojoApp } from "./toolchain-dojo-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C++ & CMake Toolchain Dojo — Recall",
  description:
    "Luyện CMake target-based, CTest, sanitizer và CI matrix bằng các quyết định có thể kiểm tra.",
};

export default async function ToolchainDojoPage() {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  return <ToolchainDojoApp accountId={cloud.account?.id ?? null} />;
}
