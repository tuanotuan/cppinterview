import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { localizeHref, type Locale } from "@/i18n/routing";
import { loadCloudAccount } from "@/lib/practice/cloud-server";

import { RecallLandingPage } from "../recall-landing-page";

export const dynamic = "force-dynamic";

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ auth?: string | string[] }>;
}) {
  const cloud = await loadCloudAccount();
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const authCode = Array.isArray(query.auth) ? query.auth[0] : query.auth;
  const t = await getTranslations({ locale, namespace: "Landing" });

  // The public landing page is for visitors. Sending an authenticated learner
  // back to Practice keeps the shared header brand from looking like a logout.
  if (cloud.account && !authCode) {
    redirect(localizeHref("/practice", locale));
  }

  return (
    <RecallLandingPage
      authNotice={authNotice(authCode, t)}
      cloudEnabled={cloud.enabled}
    />
  );
}

function authNotice(
  code: string | undefined,
  t: (key: "notices.notConfigured" | "notices.loginError") => string,
): string | null {
  if (code === "not-configured") return t("notices.notConfigured");
  if (code === "login-error" || code === "callback-error") {
    return t("notices.loginError");
  }
  return null;
}
