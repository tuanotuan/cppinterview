import type { Metadata } from "next";

import { loadCloudContext } from "@/lib/practice/cloud-server";

import { TickReplayLab } from "./tick-replay-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tick Replay Lab — Recall",
  description:
    "Luyện xử lý sequence, bản trùng, khoảng thiếu, snapshot và bất biến sổ lệnh bằng mô phỏng xác định.",
};

export default async function TickReplayLabPage() {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });

  return <TickReplayLab accountId={cloud.account?.id ?? null} />;
}
