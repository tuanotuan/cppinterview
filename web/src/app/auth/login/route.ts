import { NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAuthNext } from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeAuthNext(searchParams.get("next"));
  const provider = oauthProvider(searchParams.get("provider"));
  if (!provider) {
    return NextResponse.redirect(`${origin}/auth?auth=login-error`, 303);
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/?auth=not-configured`, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?auth=login-error`, 303);
  }

  return NextResponse.redirect(data.url, 303);
}

function oauthProvider(value: string | null): Provider | null {
  // GitHub stays the default for the existing admin-only login form.
  if (!value || value === "github") return "github";
  return value === "google" ? "google" : null;
}
