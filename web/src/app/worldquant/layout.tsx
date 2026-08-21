import { redirect } from "next/navigation";

import { loadCloudAccount } from "@/lib/practice/cloud-server";

/**
 * The former company-specific preparation workspace is retained only for the
 * repository owner. It is not part of the public cppinterview product.
 */
export default async function LegacyCompanyWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cloud = await loadCloudAccount();
  if (!cloud.canManageQuestionBank) redirect("/practice");
  return children;
}
