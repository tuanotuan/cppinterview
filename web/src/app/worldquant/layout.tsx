import { redirect } from "next/navigation";

import { loadCloudAccount } from "@/lib/practice/cloud-server";

import "../globals.css";

/**
 * The former company-specific preparation workspace is retained only for the
 * repository owner. It is not part of the public cppinterview product.
 */
export default async function LegacyCompanyWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cloud = await loadCloudAccount();
  if (!cloud.canManageQuestionBank) redirect("/vi/practice");
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">
        <a className="skip-link" href="#main-content">
          Đi đến nội dung chính
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
