import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationNotStartedError,
  AiOperationOutcomeUnknownError,
  withAiBudget,
} from "@/lib/ai/budget";
import {
  AllAiQuotasExceededError,
  runGeminiBudgetFallback,
} from "@/lib/ai/fallback";
import { generateMistakeCardWithGemini } from "@/lib/ai/gemini";
import {
  generateMistakeCardWithOpenAI,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
import { questionRevisionChecksum } from "@/lib/content/backfill";
import type {
  ContentManifest,
  ContentQuestion,
  GeneratedLesson,
  QuestionTaxonomy,
} from "@/lib/content/schema";
import type { CoachFeedback } from "@/lib/ai/contracts";
import type { MockInterviewCompletedArtifactV4 } from "@/lib/mock-interview/contracts-v4";

import {
  mistakeGenerationModeSchema,
  normalizeMistakeConcept,
  rowsToMistakeCandidates,
  type MistakeCandidateRow,
  type MistakeFlashcardCandidate,
  type MistakeFlashcardDraft,
  type MistakeGenerationMode,
} from "./mistake-cards";
import type { Rating } from "./scheduler";

export const MISTAKE_CARD_PROMPT_VERSION = "mistake-card-v1";
const CANDIDATE_SELECT = [
  "id",
  "source_kind",
  "source_attempt_id",
  "source_question_id",
  "source_question_version",
  "source_content_revision",
  "lesson_id",
  "lesson_revision_id",
  "source_hash",
  "source_section_ids",
  "criterion_key",
  "criterion_text",
  "concept_fingerprint",
  "safe_evidence",
  "competency",
  "status",
  "occurrence_count",
  "attempt_count",
  "materialized_question_id",
  "matched_question_id",
  "generator_provider",
  "generator_model",
  "last_error",
  "first_seen_at",
  "last_seen_at",
  "created_at",
  "updated_at",
].join(", ");

type InternalCandidateRow = MistakeCandidateRow & {
  lesson_revision_id: number | null;
  concept_fingerprint: string;
  safe_evidence: Record<string, unknown>;
};

type RecordedCandidate = {
  id: string;
  status: string;
  occurrenceCount: number;
  isNewObservation: boolean;
  materializedQuestionId: string | null;
  matchedQuestionId: string | null;
};

export type MistakeCaptureResult = {
  candidates: RecordedCandidate[];
  generationMode: MistakeGenerationMode;
};

export async function loadMistakeCandidates(
  supabase: SupabaseClient,
): Promise<{
  candidates: MistakeFlashcardCandidate[];
  generationMode: MistakeGenerationMode;
  available: boolean;
}> {
  const [candidateResult, preferenceResult] = await Promise.all([
    supabase
      .from("mistake_flashcard_candidates")
      .select(CANDIDATE_SELECT)
      .order("last_seen_at", { ascending: false })
      .limit(300),
    supabase
      .from("mistake_flashcard_preferences")
      .select("generation_mode")
      .maybeSingle(),
  ]);
  if (candidateResult.error) {
    if (isMissingMistakeSchema(candidateResult.error)) {
      return { candidates: [], generationMode: "ask", available: false };
    }
    throw new Error(
      `Mistake candidate read failed: ${candidateResult.error.code}`,
    );
  }
  const mode = preferenceResult.error
    ? "ask"
    : mistakeGenerationModeSchema.catch("ask").parse(
        preferenceResult.data?.generation_mode,
      );
  return {
    candidates: rowsToMistakeCandidates(
      (candidateResult.data ?? []) as unknown as MistakeCandidateRow[],
    ),
    generationMode: mode,
    available: true,
  };
}

export async function captureCoachMistakes({
  supabase,
  userId,
  attemptId,
  question,
  lesson,
  feedback,
  rating,
}: {
  supabase: SupabaseClient;
  userId: string;
  attemptId: number;
  question: ContentQuestion;
  lesson: GeneratedLesson;
  feedback: CoachFeedback;
  rating: Rating;
}): Promise<MistakeCaptureResult> {
  const generationMode = await readGenerationMode(supabase);
  if (generationMode === "off") {
    return { candidates: [], generationMode };
  }
  if (!["again", "hard"].includes(rating)) {
    return { candidates: [], generationMode };
  }
  const requiredByNormalized = new Map(
    question.rubric.required.map((criterion, index) => [
      normalizeMistakeConcept(criterion),
      { criterion, index },
    ]),
  );
  const allowedSectionIds = new Set(
    question.sources.map((source) => source.sectionId),
  );
  const sourceSectionIds = feedback.sourceSectionIds.filter((id) =>
    allowedSectionIds.has(id),
  );
  const groundedSections = sourceSectionIds.length
    ? sourceSectionIds
    : [...allowedSectionIds];
  const eligible = feedback.coverage
    .flatMap((coverage) => {
      if (!["missed", "partial"].includes(coverage.status)) return [];
      const canonical = requiredByNormalized.get(
        normalizeMistakeConcept(coverage.criterion),
      );
      if (!canonical) return [];
      return [{ coverage, canonical }];
    })
    .slice(0, 2);
  const candidates: RecordedCandidate[] = [];
  for (const { coverage, canonical } of eligible) {
    const criterionKey = `required-${canonical.index + 1}`;
    const conceptFingerprint = sha256([
      userId,
      lesson.id,
      lesson.sourceHash,
      [...groundedSections].sort().join(","),
      normalizeMistakeConcept(canonical.criterion),
    ].join("|"));
    const evidenceFingerprint = sha256([
      "coach",
      attemptId,
      question.id,
      question.version,
      criterionKey,
    ].join("|"));
    const recorded = await recordCandidate(supabase, {
      sourceKind: "coach",
      sourceAttemptId: String(attemptId),
      question,
      sourceContentRevision: question.sourceHash,
      criterionKey,
      criterionText: canonical.criterion,
      conceptFingerprint,
      evidenceFingerprint,
      signal: coverage.status === "missed" ? "missed" : "partial",
      rating,
      score: feedback.score,
      safeEvidence: {
        score: feedback.score,
        verdict: feedback.verdict,
        status: coverage.status,
        feedback: coverage.feedback,
        correction: feedback.corrections.at(0) ?? null,
      },
      competency: null,
      lesson,
      sourceSectionIds: groundedSections,
    });
    candidates.push(recorded);
  }
  return {
    candidates,
    generationMode,
  };
}

export async function captureMockMistakes({
  supabase,
  userId,
  attemptId,
  artifact,
  manifest,
}: {
  supabase: SupabaseClient;
  userId: string;
  attemptId: string;
  artifact: MockInterviewCompletedArtifactV4;
  manifest: ContentManifest;
}): Promise<MistakeCaptureResult> {
  const generationMode = await readGenerationMode(supabase);
  if (generationMode === "off") {
    return { candidates: [], generationMode };
  }
  const plannedById = new Map(
    artifact.plan.questions.map((candidate) => [
      candidate.question.id,
      candidate,
    ]),
  );
  const ranked = artifact.report.questionAssessments
    .filter(
      (assessment) =>
        assessment.score < 65 &&
        ["needs_work", "partial"].includes(assessment.verdict) &&
        assessment.missedCriteria.length > 0,
    )
    .sort((left, right) => left.score - right.score)
    .flatMap((assessment) =>
      assessment.missedCriteria.map((criterion, index) => ({
        assessment,
        criterion,
        index,
      })),
    )
    .slice(0, 3);
  const candidates: RecordedCandidate[] = [];
  for (const item of ranked) {
    const planned = plannedById.get(item.assessment.questionId);
    if (!planned) continue;
    const sourceQuestion =
      planned.question.origin === "question_bank"
        ? manifest.questions.find(
            (question) =>
              question.id === planned.question.id &&
              question.version === planned.question.version &&
              question.sourceHash === planned.question.contentRevision,
          )
        : null;
    const lesson = sourceQuestion
      ? manifest.lessons.find((entry) => entry.id === sourceQuestion.lessonId)
      : null;
    const sourceSectionIds =
      sourceQuestion?.sources.map((source) => source.sectionId) ?? [];
    const criterionKey = `missed-${sha256(
      normalizeMistakeConcept(item.criterion),
    ).slice(0, 16)}`;
    const conceptFingerprint = sha256([
      userId,
      lesson?.id ?? `role-profile:${artifact.profileId}`,
      lesson?.sourceHash ?? planned.question.contentRevision,
      [...sourceSectionIds].sort().join(","),
      normalizeMistakeConcept(item.criterion),
    ].join("|"));
    const evidenceFingerprint = sha256([
      "mock_v4",
      attemptId,
      planned.question.id,
      planned.question.version,
      criterionKey,
    ].join("|"));
    const recorded = await recordCandidate(supabase, {
      sourceKind: "mock_v4",
      sourceAttemptId: attemptId,
      question: sourceQuestion ?? {
        id: planned.question.id,
        lessonId: "",
        type: "scenario",
        responseMode: planned.question.responseMode,
        difficulty: "advanced",
        estimatedMinutes: planned.question.estimatedMinutes,
        prompt: "Câu hỏi phỏng vấn thử theo hồ sơ vị trí",
        hint: "Xem lại tiêu chí được đánh giá.",
        answer: {
          short: "Cần nguồn bài học đáng tin cậy.",
          detailed: "Cần nguồn bài học đáng tin cậy.",
        },
        rubric: { required: [item.criterion], bonus: [], misconceptions: [] },
        sources: [],
        sourceHash: sha256(planned.question.contentRevision),
        status: "draft",
        version: planned.question.version,
        taxonomy: {
          deckId: "cpp-interview",
          language: planned.question.language,
          track: planned.question.track,
          standard: planned.question.track,
          topics: ["worldquant"],
          skill: "scenario",
          difficulty: "advanced",
          responseMode: planned.question.responseMode,
          sourceLessonId: "worldquant-role-profile",
          tags: [
            "deck::cpp-interview",
            `language::${planned.question.language}`,
            `track::${planned.question.track}`,
            `standard::${planned.question.track}`,
            "topic::worldquant",
            "skill::scenario",
            "difficulty::advanced",
            `response::${planned.question.responseMode}`,
            "source::ai",
          ],
        },
      },
      sourceContentRevision: planned.question.contentRevision,
      criterionKey,
      criterionText: item.criterion,
      conceptFingerprint,
      evidenceFingerprint,
      signal:
        item.assessment.verdict === "needs_work" ? "missed" : "partial",
      rating: null,
      score: item.assessment.score,
      safeEvidence: {
        score: item.assessment.score,
        verdict: item.assessment.verdict,
        summary: item.assessment.summary,
        missedCriterion: item.criterion,
      },
      competency: planned.readinessCompetency,
      lesson: lesson ?? null,
      sourceSectionIds,
    });
    candidates.push(recorded);
  }
  return {
    candidates,
    generationMode,
  };
}

export async function generateMistakeCandidate({
  supabase,
  userId,
  candidateId,
  manifest,
}: {
  supabase: SupabaseClient;
  userId: string;
  candidateId: string;
  manifest: ContentManifest;
}) {
  const { data: protocolVersion, error: protocolError } = await supabase.rpc(
    "mistake_generation_retry_protocol_version",
  );
  if (protocolError || protocolVersion !== 3) {
    throw new MistakeQueueConfigurationError();
  }

  const { data: claimData, error: claimError } = await supabase.rpc(
    "claim_mistake_flashcard_candidate",
    { p_candidate_id: candidateId, p_lease_seconds: 300 },
  );
  if (claimError) {
    if (isMissingMistakeSchema(claimError)) {
      throw new MistakeQueueConfigurationError();
    }
    throw new Error(`Mistake claim failed: ${claimError.code}`);
  }
  const claim = claimData as {
    status?: string;
    leaseToken?: string;
    materializedQuestionId?: string | null;
  };
  if (claim.status !== "claimed" || !claim.leaseToken) {
    return {
      status: claim.status ?? "unavailable",
      questionId: claim.materializedQuestionId ?? null,
      aiDailyBudget: null,
    };
  }

  const { data: candidateData, error: candidateError } = await supabase
    .from("mistake_flashcard_candidates")
    .select(CANDIDATE_SELECT)
    .eq("id", candidateId)
    .single();
  if (candidateError) {
    await failCandidate(supabase, candidateId, claim.leaseToken, "candidate_read_failed");
    throw new Error(`Mistake candidate read failed: ${candidateError.code}`);
  }
  const candidate = candidateData as unknown as InternalCandidateRow;
  const lesson = manifest.lessons.find(
    (entry) =>
      entry.id === candidate.lesson_id &&
      entry.sourceHash === candidate.source_hash,
  );
  const sourceQuestion = manifest.questions.find(
    (question) =>
      question.id === candidate.source_question_id &&
      question.version === candidate.source_question_version &&
      question.sourceHash === candidate.source_hash,
  ) ?? manifest.questions.find(
    (question) =>
      candidate.source_kind === "mock_v4" &&
      question.lessonId === candidate.lesson_id &&
      question.sourceHash === candidate.source_hash,
  );
  if (!lesson || !sourceQuestion) {
    await failCandidate(supabase, candidateId, claim.leaseToken, "source_changed");
    return { status: "source_changed", questionId: null, aiDailyBudget: null };
  }
  const sourceSectionIds = stringArray(candidate.source_section_ids);
  const sections = lesson.sections.filter((section) =>
    sourceSectionIds.includes(section.id),
  );
  if (!sections.length) {
    await failCandidate(supabase, candidateId, claim.leaseToken, "source_changed");
    return { status: "source_changed", questionId: null, aiDailyBudget: null };
  }

  const markProviderDispatched = async () => {
    try {
      await markMistakeGenerationDispatched(supabase, {
        candidateId,
        leaseToken: claim.leaseToken!,
      });
    } catch {
      throw new AiOperationNotStartedError(
        "Mistake generation dispatch could not be confirmed",
      );
    }
  };

  let providerCompleted = false;
  try {
    let provider: "openai" | "gemini" = "openai";
    let result;
    let aiDailyBudget = null;
    try {
      const openAi = await withAiBudget(
        supabase,
        COACH_RESERVATION_USD_MICROS.mistakeCard,
        {
          beforeProviderDispatch: markProviderDispatched,
          invokeProvider: () =>
            generateMistakeCardWithOpenAI({
              candidate: {
                criterion: candidate.criterion_text,
                evidence: candidate.safe_evidence,
                occurrenceCount: candidate.occurrence_count,
              },
              question: sourceQuestion,
              lesson,
              sections,
              safetyIdentifier: safetyIdentifier(userId),
            }),
        },
      );
      result = openAi.result;
      aiDailyBudget = openAi.dailyBudget;
    } catch (error) {
      result = await runGeminiBudgetFallback(error, supabase, async () => {
        await markProviderDispatched();
        return generateMistakeCardWithGemini({
          candidate: {
            criterion: candidate.criterion_text,
            evidence: candidate.safe_evidence,
            occurrenceCount: candidate.occurrence_count,
          },
          question: sourceQuestion,
          lesson,
          sections,
        });
      });
      provider = "gemini";
    }
    providerCompleted = true;
    const draft = buildMaterializedDraft({
      draft: result.data,
      sourceQuestion,
      lesson,
      sourceSectionIds,
    });
    const completion = await completeMistakeCandidateWithRetry(supabase, {
      candidateId,
      leaseToken: claim.leaseToken,
      draft,
      provider,
      model: result.model,
    });
    return {
      status: completion.status ?? "pending_review",
      questionId: completion.questionId ?? null,
      aiDailyBudget,
    };
  } catch (error) {
    if (error instanceof AiOperationOutcomeUnknownError) {
      try {
        await terminateCandidateGeneration(
          supabase,
          candidateId,
          claim.leaseToken,
          "provider_outcome_unknown",
        );
        throw new MistakeCandidateCompletionUnconfirmedError(
          error,
          true,
        );
      } catch (transitionError) {
        if (
          transitionError instanceof
            MistakeCandidateCompletionUnconfirmedError
        ) {
          throw transitionError;
        }
        // If this transition response is also lost, protocol v3 converts the
        // expired lease to dead_letter before any future claim can call AI.
        throw new MistakeCandidateCompletionUnconfirmedError({
          cause: error,
          transitionError,
        });
      }
    }
    if (error instanceof MistakeCandidateCompletionUnconfirmedError) {
      throw error;
    }
    if (error instanceof MistakeCandidateCompletionRejectedError) {
      // The completion helper already terminalized this exact lease. Calling
      // the retryable failure transition now would only return lease_invalid
      // and hide the definitive completion error.
      throw error;
    }
    if (providerCompleted) {
      try {
        // Protocol v3 already defines completion_rejected as a terminal,
        // dispatched-lease transition. Local materialization failures belong
        // on that path because retrying them would purchase the same result.
        await terminateCandidateGeneration(
          supabase,
          candidateId,
          claim.leaseToken,
          "completion_rejected",
        );
      } catch (transitionError) {
        throw new MistakeCandidateCompletionUnconfirmedError({
          cause: error,
          transitionError,
        });
      }
      throw error;
    }
    const errorCode =
      error instanceof AiDailyBudgetExceededError
        ? "daily_budget_exceeded"
        : error instanceof AiMonthlyBudgetExceededError
          ? "monthly_budget_exceeded"
          : error instanceof AllAiQuotasExceededError
            ? "all_ai_quotas_exceeded"
            : "generation_failed";
    await failCandidate(supabase, candidateId, claim.leaseToken, errorCode);
    throw error;
  }
}

export async function markMistakeGenerationDispatched(
  supabase: SupabaseClient,
  input: {
    candidateId: string;
    leaseToken: string;
  },
) {
  const { data, error } = await supabase.rpc(
    "mark_mistake_generation_dispatched",
    {
      p_candidate_id: input.candidateId,
      p_lease_token: input.leaseToken,
    },
  );
  if (error) {
    if (isMissingMistakeSchema(error)) {
      throw new MistakeQueueConfigurationError();
    }
    throw new Error(`Mistake dispatch failed: ${error.code}`);
  }
  if (
    !isRecord(data) ||
    data.status !== "dispatched" ||
    typeof data.dispatchedAt !== "string" ||
    !Number.isFinite(Date.parse(data.dispatchedAt))
  ) {
    throw new MistakeQueueConfigurationError();
  }
}

type MistakeCompletionInput = {
  candidateId: string;
  leaseToken: string;
  draft: Record<string, unknown>;
  provider: "openai" | "gemini";
  model: string;
};

export async function completeMistakeCandidateWithRetry(
  supabase: SupabaseClient,
  input: MistakeCompletionInput,
) {
  const args = {
    p_candidate_id: input.candidateId,
    p_lease_token: input.leaseToken,
    p_draft: input.draft,
    p_provider: input.provider,
    p_model: input.model,
    p_prompt_version: MISTAKE_CARD_PROMPT_VERSION,
  };
  let firstOutcomeWasAmbiguous = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error, status } = await supabase.rpc(
        "complete_mistake_flashcard_candidate",
        args,
      );
      if (error) {
        if (
          firstOutcomeWasAmbiguous ||
          databaseMutationOutcomeIsUnknown(error, status)
        ) {
          firstOutcomeWasAmbiguous = true;
          if (attempt === 0) continue;
          const terminal = await terminalizeAmbiguousCompletion(
            supabase,
            input,
            error,
          );
          if (terminal) return terminal;
          throw new MistakeCandidateCompletionUnconfirmedError(error, true);
        }
        try {
          const terminal = await terminateCandidateGeneration(
            supabase,
            input.candidateId,
            input.leaseToken,
            "completion_rejected",
          );
          if (
            terminal.status === "pending_review" ||
            terminal.status === "needs_grounding"
          ) {
            return terminal;
          }
        } catch (transitionError) {
          throw new MistakeCandidateCompletionUnconfirmedError(
            transitionError,
          );
        }
        throw new MistakeCandidateCompletionRejectedError(error);
      }
      if (
        !isRecord(data) ||
        (data.status !== "pending_review" &&
          data.status !== "needs_grounding")
      ) {
        throw new MistakeCandidateCompletionUnconfirmedError(
          new Error("Unexpected mistake completion response"),
        );
      }
      return {
        status: data.status,
        questionId:
          typeof data.questionId === "string"
            ? data.questionId
            : null,
      };
    } catch (error) {
      if (error instanceof MistakeCandidateCompletionRejectedError) {
        throw error;
      }
      if (error instanceof MistakeCandidateCompletionUnconfirmedError) {
        if (error.terminalized) throw error;
        const terminal = await terminalizeAmbiguousCompletion(
          supabase,
          input,
          error.cause,
        );
        if (terminal) return terminal;
        throw new MistakeCandidateCompletionUnconfirmedError(
          error.cause,
          true,
        );
      }
      firstOutcomeWasAmbiguous = true;
      if (attempt === 1) {
        const terminal = await terminalizeAmbiguousCompletion(
          supabase,
          input,
          error,
        );
        if (terminal) return terminal;
        throw new MistakeCandidateCompletionUnconfirmedError(error, true);
      }
    }
  }

  throw new MistakeCandidateCompletionUnconfirmedError(
    new Error("Mistake completion retry exhausted"),
  );
}

async function terminalizeAmbiguousCompletion(
  supabase: SupabaseClient,
  input: MistakeCompletionInput,
  cause: unknown,
) {
  try {
    const terminal = await terminateCandidateGeneration(
      supabase,
      input.candidateId,
      input.leaseToken,
      "completion_outcome_unknown",
    );
    return terminal.status === "pending_review" ||
      terminal.status === "needs_grounding"
      ? terminal
      : null;
  } catch (transitionError) {
    throw new MistakeCandidateCompletionUnconfirmedError({
      cause,
      transitionError,
    });
  }
}

function buildMaterializedDraft({
  draft,
  sourceQuestion,
  lesson,
  sourceSectionIds,
}: {
  draft: MistakeFlashcardDraft;
  sourceQuestion: ContentQuestion;
  lesson: GeneratedLesson;
  sourceSectionIds: string[];
}) {
  const taxonomy = remediationTaxonomy(
    sourceQuestion.taxonomy,
    draft,
    lesson.id,
  );
  const question = {
    id: `${lesson.id}-mistake-preview`,
    lessonId: lesson.id,
    ...draft,
    code: draft.code ?? undefined,
    sources: sourceSectionIds.map((sectionId) => ({ sectionId })),
    sourceHash: lesson.sourceHash,
    status: "draft" as const,
    version: 1,
    taxonomy,
  };
  return {
    ...question,
    contentChecksum: questionRevisionChecksum(question),
  };
}

function remediationTaxonomy(
  source: QuestionTaxonomy,
  draft: MistakeFlashcardDraft,
  lessonId: string,
): QuestionTaxonomy {
  const replacements = new Map([
    ["skill", draft.type.replace("_", "-")],
    ["difficulty", draft.difficulty],
    ["response", draft.responseMode],
  ]);
  const tags = source.tags.map((tag) => {
    const [namespace] = tag.split("::");
    const replacement = replacements.get(namespace);
    return replacement ? `${namespace}::${replacement}` : tag;
  });
  return {
    ...source,
    skill: draft.type,
    difficulty: draft.difficulty,
    responseMode: draft.responseMode,
    sourceLessonId: lessonId,
    tags,
  };
}

async function recordCandidate(
  supabase: SupabaseClient,
  input: {
    sourceKind: "coach" | "mock_v4";
    sourceAttemptId: string;
    question: ContentQuestion;
    sourceContentRevision: string;
    criterionKey: string;
    criterionText: string;
    conceptFingerprint: string;
    evidenceFingerprint: string;
    signal: "missed" | "partial";
    rating: Rating | null;
    score: number | null;
    safeEvidence: Record<string, unknown>;
    competency: string | null;
    lesson: GeneratedLesson | null;
    sourceSectionIds: string[];
  },
) {
  const { data, error } = await supabase.rpc(
    "record_mistake_flashcard_candidate",
    {
      p_source_kind: input.sourceKind,
      p_source_attempt_id: input.sourceAttemptId,
      p_source_question_id: input.question.id,
      p_source_question_version: input.question.version,
      p_source_content_revision: input.sourceContentRevision,
      p_criterion_key: input.criterionKey,
      p_criterion_text: input.criterionText,
      p_concept_fingerprint: input.conceptFingerprint,
      p_evidence_fingerprint: input.evidenceFingerprint,
      p_signal: input.signal,
      p_rating: input.rating,
      p_score: input.score,
      p_safe_evidence: input.safeEvidence,
      p_competency: input.competency,
      p_lesson_id: input.lesson?.id ?? null,
      p_source_hash: input.lesson?.sourceHash ?? null,
      p_source_section_ids: input.sourceSectionIds,
    },
  );
  if (error) {
    if (isMissingMistakeSchema(error)) {
      throw new MistakeQueueConfigurationError();
    }
    throw new Error(`Mistake capture failed: ${error.code}`);
  }
  return data as RecordedCandidate;
}

async function readGenerationMode(
  supabase: SupabaseClient,
): Promise<MistakeGenerationMode> {
  const { data, error } = await supabase
    .from("mistake_flashcard_preferences")
    .select("generation_mode")
    .maybeSingle();
  if (error) return "ask";
  return mistakeGenerationModeSchema.catch("ask").parse(data?.generation_mode);
}

async function failCandidate(
  supabase: SupabaseClient,
  candidateId: string,
  leaseToken: string,
  code: string,
) {
  const { data, error } = await supabase.rpc(
    "fail_mistake_flashcard_candidate",
    {
    p_candidate_id: candidateId,
    p_lease_token: leaseToken,
    p_error_code: code,
    },
  );
  if (error) {
    throw new Error(`Mistake failure transition failed: ${error.code}`);
  }
  const status =
    isRecord(data) && typeof data.status === "string"
      ? data.status
      : null;
  if (
    status !== "failed" &&
    status !== "dead_letter"
  ) {
    throw new Error("Mistake failure transition was not confirmed");
  }
  return status;
}

async function terminateCandidateGeneration(
  supabase: SupabaseClient,
  candidateId: string,
  leaseToken: string,
  errorCode:
    | "provider_outcome_unknown"
    | "completion_outcome_unknown"
    | "completion_rejected",
) {
  const { data, error } = await supabase.rpc(
    "terminate_mistake_flashcard_generation",
    {
      p_candidate_id: candidateId,
      p_lease_token: leaseToken,
      p_error_code: errorCode,
    },
  );
  if (error) {
    throw new Error(`Mistake generation termination failed: ${error.code}`);
  }
  if (
    !isRecord(data) ||
    typeof data.status !== "string" ||
    ![
      "dead_letter",
      "needs_grounding",
      "pending_review",
      "approved",
      "reinforce_existing",
      "dismissed",
    ].includes(data.status)
  ) {
    throw new Error("Mistake generation termination was not confirmed");
  }
  return {
    status: data.status,
    questionId:
      typeof data.materializedQuestionId === "string"
        ? data.materializedQuestionId
        : null,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function databaseMutationOutcomeIsUnknown(
  error: { code?: string | null },
  status: number | undefined,
) {
  return (
    status === 0 ||
    status === 408 ||
    (typeof status === "number" && status >= 500) ||
    (status === undefined && !error.code)
  );
}

function isMissingMistakeSchema(error: { code?: string | null }) {
  return new Set(["42P01", "42703", "42883", "PGRST202", "PGRST204"]).has(
    error.code ?? "",
  );
}

export class MistakeQueueConfigurationError extends Error {
  constructor() {
    super("Mistake flashcard migration is missing");
    this.name = "MistakeQueueConfigurationError";
  }
}

export class MistakeCandidateCompletionUnconfirmedError extends Error {
  constructor(
    readonly cause: unknown,
    readonly terminalized = false,
  ) {
    super("Mistake flashcard completion could not be confirmed");
    this.name = "MistakeCandidateCompletionUnconfirmedError";
  }
}

export class MistakeCandidateCompletionRejectedError extends Error {
  constructor(readonly cause: unknown) {
    super("Mistake flashcard completion was rejected");
    this.name = "MistakeCandidateCompletionRejectedError";
  }
}
