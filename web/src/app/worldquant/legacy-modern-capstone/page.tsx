import { loadCloudContext } from "@/lib/practice/cloud-server";
import { LegacyModernCapstoneApp } from "./legacy-modern-capstone-app";

export default async function LegacyModernCapstonePage() {
  const context = await loadCloudContext();
  return <LegacyModernCapstoneApp accountId={context.account?.id ?? null} />;
}
