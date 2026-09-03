import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authenticatedAccountIdFromClaims } from "@/lib/supabase/authenticated-account";
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
      !error && Boolean(authenticatedAccountIdFromClaims(data?.claims)),
    );
  } catch {
    return authStatusResponse(false);
  }
}

function authStatusResponse(authenticated: boolean) {
  return Response.json({ authenticated }, { headers: responseHeaders });
}
