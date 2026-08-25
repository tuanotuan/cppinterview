import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { shouldBypassI18n } from "@/i18n/proxy-routing";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSupabaseSession(request);
  if (shouldBypassI18n(request.nextUrl.pathname)) return sessionResponse;

  const localeResponse = handleI18nRouting(request);
  for (const cookie of sessionResponse.cookies.getAll()) {
    localeResponse.cookies.set(cookie);
  }
  return localeResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
