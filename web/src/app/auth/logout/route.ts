import { NextResponse } from "next/server";

import { defaultLocale, localeFromPathname, localizeHref } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const referer = request.headers.get("referer");
  let locale = defaultLocale;
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === origin) {
        locale = localeFromPathname(refererUrl.pathname) ?? defaultLocale;
      }
    } catch {
      // Ignore malformed or cross-origin referrers and use the safe default.
    }
  }
  return NextResponse.redirect(`${origin}${localizeHref("/", locale)}`, 303);
}
