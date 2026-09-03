import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/app/brand-mark";
import { localizeHref, type Locale } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readPasswordCapability } from "@/lib/supabase/password-capability.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SetPasswordForm } from "../../../auth/set-password/set-password-form";
import { LanguageSwitcher } from "../../../language-switcher";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  if (!isSupabaseConfigured()) {
    return <PasswordShell><p>{t("setPasswordNotReady")}</p></PasswordShell>;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.is_anonymous) {
    redirect(
      localizeHref(
        `/auth?next=${encodeURIComponent(localizeHref("/auth/set-password", locale))}`,
        locale,
      ),
    );
  }

  const passwordCapability = await readPasswordCapability(supabase, data.user);

  return (
    <PasswordShell>
      <SetPasswordForm initialHasPassword={passwordCapability.hasPassword} />
    </PasswordShell>
  );
}

async function PasswordShell({ children }: { children: React.ReactNode }) {
  const common = await getTranslations("Common");
  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-7 text-[#172033] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label={common("homeAria")}
            className="inline-flex items-center gap-3"
          >
            <BrandMark />
            <span>
              <span className="block text-lg font-bold tracking-tight">cppinterview</span>
              <span className="block text-xs text-[#526276]">{common("tagline")}</span>
            </span>
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
