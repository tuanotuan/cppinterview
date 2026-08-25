import { NextResponse } from "next/server";

import { defaultLocale, localeFromPathname, localizeHref } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNext(searchParams.get("next"));
  const locale = localeFromPathname(next) ?? defaultLocale;
  const callbackError = localizeHref("/?auth=callback-error", locale);

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}${callbackError}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}${callbackError}`);

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (
    process.env.NODE_ENV !== "development" &&
    forwardedHost &&
    /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost)
  ) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
