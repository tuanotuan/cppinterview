import { z } from "zod";

import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  candidateId: z.string().uuid(),
  lessonId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sourceSectionIds: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .min(1)
    .max(8),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isAllowedPracticeUser(data.user)) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await supabase.rpc("ground_mistake_flashcard_candidate", {
    p_candidate_id: parsed.data.candidateId,
    p_lesson_id: parsed.data.lessonId,
    p_source_section_ids: parsed.data.sourceSectionIds,
  });
  if (result.error) {
    return Response.json({ error: "grounding_failed" }, { status: 502 });
  }
  return Response.json(result.data);
}
