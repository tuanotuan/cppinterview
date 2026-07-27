import { z } from "zod";

import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  candidateId: z.string().uuid(),
  action: z.enum(["dismiss", "reinforce_existing"]),
  matchedQuestionId: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
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
  const result = await supabase.rpc("resolve_mistake_flashcard_candidate", {
    p_candidate_id: parsed.data.candidateId,
    p_action: parsed.data.action,
    p_matched_question_id: parsed.data.matchedQuestionId ?? null,
  });
  if (result.error) {
    return Response.json({ error: "resolve_failed" }, { status: 502 });
  }
  return Response.json(result.data);
}
