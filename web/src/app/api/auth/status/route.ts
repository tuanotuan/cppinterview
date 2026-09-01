import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

export async function GET() {
  if (!isSupabaseConfigured()) return authStatusResponse(false);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    return authStatusResponse(
      !error && isAuthenticatedAccount(data?.claims),
    );
  } catch {
    return authStatusResponse(false);
  }
}

function authStatusResponse(authenticated: boolean) {
  return Response.json({ authenticated }, { headers: responseHeaders });
}

function isAuthenticatedAccount(value: unknown) {
  if (typeof value !== "object" || value === null) return false;
  const claims = value as {
    aud?: unknown;
    sub?: unknown;
    is_anonymous?: unknown;
  };
  const hasAuthenticatedAudience =
    claims.aud === "authenticated" ||
    (Array.isArray(claims.aud) && claims.aud.includes("authenticated"));

  return (
    hasAuthenticatedAudience &&
    typeof claims.sub === "string" &&
    Boolean(claims.sub.trim()) &&
    claims.is_anonymous !== true
  );
}
