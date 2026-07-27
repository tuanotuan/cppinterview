import { mockInterviewCompletedArtifactV4Schema } from "@/lib/mock-interview/contracts-v4";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import {
  captureMockMistakes,
  MistakeQueueConfigurationError,
} from "@/lib/practice/mistake-cards.server";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isAllowedPracticeUser(data.user)) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  const [attempts, overrides] = await Promise.all([
    supabase
      .from("mock_interview_attempts")
      .select("id, report")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
    loadQuestionOverrides(supabase),
  ]);
  if (attempts.error || overrides.error) {
    return Response.json({ error: "history_unavailable" }, { status: 502 });
  }
  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: overrides.overrides,
  });
  let attemptsScanned = 0;
  let observations = 0;
  try {
    for (const row of attempts.data ?? []) {
      const artifact = mockInterviewCompletedArtifactV4Schema.safeParse(
        row.report,
      );
      if (!artifact.success) continue;
      attemptsScanned += 1;
      const result = await captureMockMistakes({
        supabase,
        userId: data.user.id,
        attemptId: row.id,
        artifact: artifact.data,
        manifest,
      });
      observations += result.candidates.filter(
        (candidate) => candidate.isNewObservation,
      ).length;
    }
  } catch (cause) {
    if (cause instanceof MistakeQueueConfigurationError) {
      return Response.json({ error: "migration_required" }, { status: 503 });
    }
    throw cause;
  }
  return Response.json({ ok: true, attemptsScanned, observations });
}
