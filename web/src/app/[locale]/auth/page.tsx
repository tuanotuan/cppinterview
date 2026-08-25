import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";

import { AuthForm } from "../../auth/auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    auth?: string | string[];
    mode?: string | string[];
    next?: string | string[];
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Auth" });
  const mode = single(query.mode) === "signup" ? "sign-up" : "sign-in";
  const next = safeAuthNext(single(query.next) ?? null, locale);

  if (!isSupabaseConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-4 text-center">
        <div className="max-w-md rounded-[1.25rem] border border-[#a65c0e]/20 bg-[#fff1f1] p-7 text-[#c43d3d]">
          <h1 className="text-xl font-bold">{t("notReady")}</h1>
          <p className="mt-3 leading-7">{t("notConfigured")}</p>
        </div>
      </main>
    );
  }

  return (
    <AuthForm
      initialMode={mode}
      initialNotice={authNotice(single(query.auth), t)}
      next={next}
    />
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function authNotice(
  code: string | undefined,
  t: (key: "confirmError" | "notConfigured" | "passwordUpdated") => string,
) {
  if (code === "confirm-error") {
    return t("confirmError");
  }
  if (code === "not-configured") return t("notConfigured");
  if (code === "password-updated") {
    return t("passwordUpdated");
  }
  return null;
}
