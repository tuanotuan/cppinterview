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
  if (code === "unauthorized") {
    return "Tài khoản GitHub này không được phép dùng ứng dụng riêng tư.";
  }
  if (code === "not-configured") return "Supabase chưa được cấu hình.";
  if (code === "login-error" || code === "callback-error") {
    return "Đăng nhập GitHub chưa thành công. Hãy kiểm tra cấu hình đăng nhập rồi thử lại.";
  }
  return null;
}
