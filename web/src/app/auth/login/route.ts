import { NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";

import { defaultLocale, localeFromPathname, localizeHref } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeAuthNext(searchParams.get("next"));
  const locale = localeFromPathname(next) ?? defaultLocale;
  const loginError = localizeHref("/auth?auth=login-error", locale);
  const notConfigured = localizeHref("/?auth=not-configured", locale);
  const provider = oauthProvider(searchParams.get("provider"));
  if (!provider) {
    return NextResponse.redirect(`${origin}${loginError}`, 303);
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}${notConfigured}`, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}${loginError}`, 303);
  }

  return NextResponse.redirect(data.url, 303);
}

function oauthProvider(value: string | null): Provider | null {
  // GitHub stays the default for the existing admin-only login form.
  if (!value || value === "github") return "github";
  return value === "google" ? "google" : null;
}
