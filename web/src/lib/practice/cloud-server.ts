import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import {
  aiDailyBudgetSnapshotFromUsageRead,
  type AiDailyBudgetSnapshot,
} from "@/lib/ai/budget";
import { readAiUsageRow } from "@/lib/ai/usage-store";
import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
} from "@/lib/content/question-store-server";
import type { ContentManifest } from "@/lib/content/schema";
import {
  applyQuestionOverrides,
  questionOverrideSelect,
  rowsToQuestionOverrides,
  type QuestionOverride,
  type QuestionOverrideRow,
} from "@/lib/content/question-overrides";
import {
  reconciledUsageUsdMicros,
  vietnamUsageDate,
} from "@/lib/ai/usage";
import {
  isAllowedPracticeUser,
  isTuanotuanQuestionAdmin,
} from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { EMPTY_PROGRESS, type PracticeProgress } from "./scheduler";
import {
  rowsToLearningStates,
  rowsToProgress,
} from "./cloud";
import {
  filterReviewsForLearningHistory,
  type QuestionLearningState,
} from "./learning-state";
import {
  rowsToApprovals,
  type QuestionApproval,
  type QuestionApprovalRow,
} from "./approvals";
import { readAllPracticeReviewRows } from "./practice-review-reader.server";
import { readQuestionLearningStateRows } from "./question-learning-state-reader.server";

export type PracticeAccount = {
  id: string;
  displayName: string;
  login: string | null;
};

export type CloudAccountContext = {
  enabled: boolean;
  account: PracticeAccount | null;
  canManageQuestionBank: boolean;
};

export type CloudContext = {
  enabled: boolean;
  account: PracticeAccount | null;
  canManageQuestionBank: boolean;
  progress: PracticeProgress;
  questionStates: QuestionLearningState[];
  approvals: QuestionApproval[];
  questionOverrides: QuestionOverride[];
  manifest: ContentManifest;
  aiUsage: AiUsageSummary | null;
  geminiUsage: GeminiUsageSummary | null;
  geminiFallbackEnabled: boolean;
  aiDailyBudget: AiDailyBudgetSnapshot | null;
  generationJobs: ContentGenerationJobSummary[];
  mistakeQuestionIds: string[];
  error: boolean;
};

export type ContentGenerationJobSummary = {
  id: number;
  lessonId: string;
  sourceHash: string;
  generatorVersion: string;
  status: "pending" | "running" | "deferred" | "completed" | "failed" | "dead_letter";
  attemptCount: number;
  requestedCount: number;
  provider: string;
  model: string;
  nextAttemptAt: string;
  lastError: Record<string, unknown> | null;
  updatedAt: string;
};

export type AiUsageSummary = {
  actualUsdMicros: number;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  lastModel: string | null;
};

export type GeminiUsageSummary = {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  totalTokens: number;
  lastModel: string | null;
};

const loadCloudIdentity = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user =
    error || !data.user || !isAllowedPracticeUser(data.user)
      ? null
      : data.user;
  return { supabase, user };
});

/**
 * Resolves only the session-derived account details needed by route guards.
 * React request memoization means a page that also calls loadCloudContext()
 * reuses the verified user and Supabase client instead of repeating auth I/O.
 */
export async function loadCloudAccount(): Promise<CloudAccountContext> {
  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      account: null,
      canManageQuestionBank: false,
    };
  }

  const { user } = await loadCloudIdentity();
  if (!user) {
    return {
      enabled: true,
      account: null,
      canManageQuestionBank: false,
    };
  }

  return {
    enabled: true,
    account: toPracticeAccount(user),
    canManageQuestionBank: isTuanotuanQuestionAdmin(user),
  };
}

export async function loadCloudContext(
  {
    includeGenerationJobs = false,
    includeAiUsage = true,
    includeDailyAiBudget = true,
    includeGeminiUsage = true,
    includeProviderSettings = true,
  }: {
    includeGenerationJobs?: boolean;
    includeAiUsage?: boolean;
    includeDailyAiBudget?: boolean;
    includeGeminiUsage?: boolean;
    includeProviderSettings?: boolean;
  } = {},
): Promise<CloudContext> {
  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      account: null,
      canManageQuestionBank: false,
      progress: EMPTY_PROGRESS,
      questionStates: [],
      approvals: [],
      questionOverrides: [],
      manifest: getRepoContentManifest(),
      aiUsage: null,
      geminiUsage: null,
      geminiFallbackEnabled: false,
      aiDailyBudget: null,
      generationJobs: [],
      mistakeQuestionIds: [],
      error: false,
    };
  }

  const { supabase, user } = await loadCloudIdentity();
  if (!user) {
    return {
      enabled: true,
      account: null,
      canManageQuestionBank: false,
      progress: EMPTY_PROGRESS,
      questionStates: [],
      approvals: [],
      questionOverrides: [],
      manifest: getRepoContentManifest(),
      aiUsage: null,
      geminiUsage: null,
      geminiFallbackEnabled: false,
      aiDailyBudget: null,
      generationJobs: [],
      mistakeQuestionIds: [],
      error: false,
    };
  }

  const usageDate = vietnamUsageDate();
  const skippedSingleResult = () =>
    Promise.resolve({ data: null, error: null });
  const monthlyUsagePromise = includeAiUsage
    ? readAiUsageRow(
        supabase,
        "ai_usage_monthly",
        "month_start",
        `${usageDate.slice(0, 7)}-01`,
      )
    : skippedSingleResult();
  const dailyUsagePromise = includeDailyAiBudget
    ? readAiUsageRow(
        supabase,
        "ai_usage_daily",
        "usage_date",
        usageDate,
      )
    : skippedSingleResult();
  const geminiUsagePromise = includeGeminiUsage
    ? supabase
        .from("gemini_usage_daily")
        .select("request_count, input_tokens, output_tokens, thought_tokens, total_tokens, last_model")
        .eq("usage_date", usageDate)
        .maybeSingle()
    : skippedSingleResult();
  const providerSettingsPromise = includeProviderSettings
    ? supabase
        .from("ai_provider_settings")
        .select("gemini_fallback_enabled")
        .maybeSingle()
    : skippedSingleResult();
  const generationJobsPromise = includeGenerationJobs
    ? supabase
        .from("content_generation_jobs")
        .select(
          "id, lesson_id, source_hash, generator_version, status, attempt_count, requested_count, provider, model, next_attempt_at, last_error, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(50)
    : Promise.resolve({ data: [], error: null });
  const mistakeQuestionsPromise = supabase
    .from("mistake_flashcard_candidates")
    .select("materialized_question_id")
    .not("materialized_question_id", "is", null);
  // Keep the generation-bearing state read after the review pages so a reset
  // between the two snapshots can only remove older-generation rows.
  const reviewsResult = await readAllPracticeReviewRows(supabase);
  const statesResult = await readQuestionLearningStateRows(supabase);
  const [
    approvalsResult,
    overridesResult,
    monthlyUsageResult,
    dailyUsageResult,
    geminiUsageResult,
    providerSettingsResult,
    generationJobsResult,
    mistakeQuestionsResult,
    baseManifest,
  ] =
    await Promise.all([
      supabase
        .from("question_approvals")
        .select("question_id, question_version, source_hash"),
      supabase
        .from("question_overrides")
        .select(questionOverrideSelect),
      monthlyUsagePromise,
      dailyUsagePromise,
      geminiUsagePromise,
      providerSettingsPromise,
      generationJobsPromise,
      mistakeQuestionsPromise,
      loadQuestionStoreManifest({ supabase }),
    ]);
  const { rows, error } = reviewsResult;
  const { rows: stateRows, error: statesError } = statesResult;
  const { data: approvalRows, error: approvalError } = approvalsResult;
  const { data: overrideRows, error: overridesError } = overridesResult;
  const { data: usageRow, error: usageError } = monthlyUsageResult;
  const { data: dailyUsageRow, error: dailyUsageError } = dailyUsageResult;
  const { data: geminiUsageRow, error: geminiUsageError } = geminiUsageResult;
  const { data: providerSettingsRow, error: providerSettingsError } =
    providerSettingsResult;
  const { data: generationJobRows, error: generationJobsError } =
    generationJobsResult;
  const { data: mistakeQuestionRows } = mistakeQuestionsResult;
  const aiDailyBudget = includeDailyAiBudget
    ? aiDailyBudgetSnapshotFromUsageRead({
        row: dailyUsageRow,
        readError: dailyUsageError,
        usageDate,
      })
    : null;
  if (dailyUsageError) {
    console.error("Daily AI usage read failed", {
      code: dailyUsageError.code ?? "unknown",
    });
  }
  const questionOverrides = overridesError
    ? []
    : rowsToQuestionOverrides((overrideRows ?? []) as QuestionOverrideRow[]);
  const manifest = applyQuestionOverrides(baseManifest, questionOverrides);
  const questionStates = statesError
    ? []
    : rowsToLearningStates(stateRows);
  const rawProgress = error ? EMPTY_PROGRESS : rowsToProgress(rows);
  const progress =
    error || statesError
      ? EMPTY_PROGRESS
      : {
          ...rawProgress,
          reviews: filterReviewsForLearningHistory(
            rawProgress.reviews,
            questionStates,
          ),
        };

  return {
    enabled: true,
    account: toPracticeAccount(user),
    canManageQuestionBank: isTuanotuanQuestionAdmin(user),
    progress,
    questionStates,
    approvals: approvalError
      ? []
      : rowsToApprovals((approvalRows ?? []) as QuestionApprovalRow[]),
    questionOverrides,
    manifest,
    aiUsage: usageRow
      ? {
          actualUsdMicros: reconciledUsageUsdMicros({
            realtimeUsdMicros: Number(usageRow.actual_usd_micros),
            providerUsdMicros: Number(usageRow.provider_usd_micros ?? 0),
            realtimeBaselineUsdMicros: Number(
              usageRow.provider_actual_baseline_usd_micros ?? 0,
            ),
            usageFloorUsdMicros: Number(
              usageRow.usage_floor_usd_micros ?? 0,
            ),
            providerSynced:
              typeof usageRow.provider_synced_at === "string",
          }),
          requestCount: Number(usageRow.request_count),
          inputTokens: Number(usageRow.input_tokens),
          outputTokens: Number(usageRow.output_tokens),
          lastModel:
            typeof usageRow.last_model === "string" ? usageRow.last_model : null,
        }
      : null,
    geminiUsage: geminiUsageRow
      ? {
          requestCount: Number(geminiUsageRow.request_count),
          inputTokens: Number(geminiUsageRow.input_tokens),
          outputTokens: Number(geminiUsageRow.output_tokens),
          thoughtTokens: Number(geminiUsageRow.thought_tokens),
          totalTokens: Number(geminiUsageRow.total_tokens),
          lastModel:
            typeof geminiUsageRow.last_model === "string"
              ? geminiUsageRow.last_model
              : null,
        }
      : null,
    geminiFallbackEnabled:
      includeProviderSettings &&
      Boolean(process.env.GEMINI_API_KEY) &&
      process.env.GEMINI_FALLBACK_ENABLED?.toLowerCase() !== "false" &&
      providerSettingsRow?.gemini_fallback_enabled !== false,
    aiDailyBudget,
    generationJobs: generationJobsError
      ? []
      : (generationJobRows ?? []).flatMap((row) => {
          const status = generationJobStatus(row.status);
          if (!status) return [];
          return [{
            id: Number(row.id),
            lessonId: String(row.lesson_id),
            sourceHash: String(row.source_hash),
            generatorVersion: String(row.generator_version),
            status,
            attemptCount: Number(row.attempt_count),
            requestedCount: Number(row.requested_count),
            provider: String(row.provider),
            model: String(row.model),
            nextAttemptAt: String(row.next_attempt_at),
            lastError:
              typeof row.last_error === "object" && row.last_error !== null
                ? row.last_error as Record<string, unknown>
                : null,
            updatedAt: String(row.updated_at),
          }];
        }),
    mistakeQuestionIds: (mistakeQuestionRows ?? []).flatMap((row) =>
      typeof row.materialized_question_id === "string"
        ? [row.materialized_question_id]
        : [],
    ),
    error: Boolean(
      error ||
        statesError ||
        approvalError ||
        overridesError ||
        usageError ||
        dailyUsageError ||
        geminiUsageError ||
        providerSettingsError ||
        generationJobsError,
    ),
  };
}

function generationJobStatus(value: unknown): ContentGenerationJobSummary["status"] | null {
  return ["pending", "running", "deferred", "completed", "failed", "dead_letter"].includes(
    String(value),
  )
    ? String(value) as ContentGenerationJobSummary["status"]
    : null;
}

function toPracticeAccount(user: User): PracticeAccount {
  const login = stringMetadata(user.user_metadata.user_name);
  const displayName =
    stringMetadata(user.user_metadata.full_name) || login || user.email || "Người dùng cppinterview";
  return { id: user.id, displayName, login };
}

function stringMetadata(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
