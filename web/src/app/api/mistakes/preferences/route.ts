import { mistakeGenerationModeSchema } from "@/lib/practice/mistake-cards";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isAllowedPracticeUser(data.user)) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const mode = mistakeGenerationModeSchema.safeParse(body?.mode);
  if (!mode.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await supabase.from("mistake_flashcard_preferences").upsert({
    user_id: data.user.id,
    generation_mode: mode.data,
  });
  if (result.error) {
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
  return Response.json({ ok: true, mode: mode.data });
}
