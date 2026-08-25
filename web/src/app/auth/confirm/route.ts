import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { defaultLocale, localeFromPathname, localizeHref } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeAuthNext(searchParams.get("next"));
  const locale = localeFromPathname(next) ?? defaultLocale;
  const authNotConfigured = localizeHref("/auth?auth=not-configured", locale);
  const confirmError = localizeHref("/auth?auth=confirm-error", locale);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}${authNotConfigured}`, 303);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(
      `${origin}${error ? confirmError : next}`,
      303,
    );
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!tokenHash || (type !== "email" && type !== "signup" && type !== "recovery")) {
    return NextResponse.redirect(`${origin}${confirmError}`, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as Extract<EmailOtpType, "email" | "signup" | "recovery">,
  });
  if (error) {
    return NextResponse.redirect(`${origin}${confirmError}`, 303);
  }

  return NextResponse.redirect(`${origin}${next}`, 303);
}
