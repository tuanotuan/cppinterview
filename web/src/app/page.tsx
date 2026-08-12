import { loadCloudContext } from "@/lib/practice/cloud-server";

import { RecallLandingPage } from "./recall-landing-page";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string | string[] }>;
}) {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const params = await searchParams;
  const authCode = Array.isArray(params.auth) ? params.auth[0] : params.auth;

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
