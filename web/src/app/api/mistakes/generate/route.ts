import { z } from "zod";

import {
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
} from "@/lib/ai/budget";
import { AllAiQuotasExceededError } from "@/lib/ai/fallback";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import {
  generateMistakeCandidate,
  MistakeCandidateCompletionUnconfirmedError,
  MistakeQueueConfigurationError,
} from "@/lib/practice/mistake-cards.server";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({ candidateId: z.string().uuid() });

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
  const overrides = await loadQuestionOverrides(supabase);
  if (overrides.error) {
    return Response.json({ error: "question_store_unavailable" }, { status: 502 });
  }
  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: overrides.overrides,
  });
  try {
    return Response.json(
      await generateMistakeCandidate({
        supabase,
        userId: data.user.id,
        candidateId: parsed.data.candidateId,
        manifest,
      }),
    );
  } catch (cause) {
    if (cause instanceof MistakeCandidateCompletionUnconfirmedError) {
      return Response.json(
        { error: "generation_outcome_unconfirmed" },
        cause.terminalized
          ? { status: 409 }
          : {
              status: 503,
              headers: { "Retry-After": "10" },
            },
      );
    }
    if (cause instanceof MistakeQueueConfigurationError) {
      return Response.json({ error: "migration_required" }, { status: 503 });
    }
    if (
      cause instanceof AiDailyBudgetExceededError ||
      cause instanceof AiMonthlyBudgetExceededError ||
      cause instanceof AllAiQuotasExceededError
    ) {
      return Response.json({ error: "ai_quota_exceeded" }, { status: 429 });
    }
    console.error("Mistake card generation failed", {
      name: cause instanceof Error ? cause.name : "UnknownError",
    });
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
