import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SetPasswordForm } from "./set-password-form";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return <PasswordShell><p>Đặt mật khẩu chưa sẵn sàng.</p></PasswordShell>;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth?next=%2Fauth%2Fset-password");

  return (
    <PasswordShell>
      <SetPasswordForm />
    </PasswordShell>
  );
}

function PasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-7 text-[#172033] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          aria-label="Về trang chủ cppinterview"
          className="inline-flex items-center gap-3"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
            CI
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">cppinterview</span>
            <span className="block text-xs text-[#526276]">Học và chuẩn bị phỏng vấn</span>
          </span>
        </Link>
        <section className="mt-9 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/80 p-5 shadow-[0_20px_60px_rgb(15_58_105_/_10%)] sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}
