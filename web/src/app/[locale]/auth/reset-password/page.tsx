import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { localizeHref, type Locale } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PasswordRecoveryForm } from "../../../auth/reset-password/password-recovery-form";
import { LanguageSwitcher } from "../../../language-switcher";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ stage?: string | string[]; auth?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Auth" });
  const requestedStage = single(query.stage);
  const stage = requestedStage === "update" || requestedStage === "verify" ? requestedStage : "request";

  if (!isSupabaseConfigured()) {
    return <RecoveryShell><p>{t("recoveryNotReady")}</p></RecoveryShell>;
  }

  if (stage === "update") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      redirect(localizeHref("/auth/reset-password?auth=recovery-error", locale));
    }
  }

  return (
    <RecoveryShell>
      <PasswordRecoveryForm
        stage={stage}
        initialNotice={single(query.auth) === "recovery-error" ? t("recoveryError") : null}
      />
    </RecoveryShell>
  );
}

async function RecoveryShell({ children }: { children: React.ReactNode }) {
  const common = await getTranslations("Common");
  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-7 text-[#172033] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={common("homeAria")}>
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">CI</span>
            <span><span className="block text-lg font-bold tracking-tight">cppinterview</span><span className="block text-xs text-[#526276]">{common("tagline")}</span></span>
          </Link>
          <LanguageSwitcher compact />
        </div>
        <section className="mt-9 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/80 p-5 shadow-[0_20px_60px_rgb(15_58_105_/_10%)] sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
