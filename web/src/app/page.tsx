import { redirect } from "next/navigation";

import { loadCloudAccount } from "@/lib/practice/cloud-server";

import { RecallLandingPage } from "./recall-landing-page";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string | string[] }>;
}) {
  const cloud = await loadCloudAccount();
  const params = await searchParams;
  const authCode = Array.isArray(params.auth) ? params.auth[0] : params.auth;

  // The public landing page is for visitors. Sending an authenticated learner
  // back to Practice keeps the shared header brand from looking like a logout.
  if (cloud.account && !authCode) {
    redirect("/practice");
  }

  return (
    <RecallLandingPage
      authNotice={authNotice(authCode)}
      cloudEnabled={cloud.enabled}
    />
  );
}

function authNotice(code?: string): string | null {
  if (code === "not-configured") return "Supabase chưa được cấu hình.";
  if (code === "login-error" || code === "callback-error") {
    return "Đăng nhập chưa thành công. Hãy kiểm tra cấu hình rồi thử lại.";
  }
  return null;
}
