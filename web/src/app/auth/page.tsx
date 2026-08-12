import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";

import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    auth?: string | string[];
    mode?: string | string[];
    next?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const mode = single(params.mode) === "signup" ? "sign-up" : "sign-in";
  const next = safeAuthNext(single(params.next) ?? null);

  if (!isSupabaseConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6ed] px-4 text-center">
        <div className="max-w-md rounded-[2rem] border border-[#ba4b2f]/20 bg-[#fff1e8] p-7 text-[#8e3825]">
          <h1 className="text-xl font-bold">Đăng nhập chưa sẵn sàng</h1>
          <p className="mt-3 leading-7">Supabase chưa được cấu hình cho trang này.</p>
        </div>
      </main>
    );
  }

  return <AuthForm initialMode={mode} initialNotice={authNotice(single(params.auth))} next={next} />;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function authNotice(code?: string) {
  if (code === "confirm-error") {
    return "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy tạo tài khoản lại để nhận email mới.";
  }
  if (code === "not-configured") return "Supabase chưa được cấu hình cho trang này.";
  return null;
}
