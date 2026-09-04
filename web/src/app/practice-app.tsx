"use client";

import NextLink, { useLinkStatus } from "next/link";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { BrandMark } from "@/app/brand-mark";
import { LanguageSwitcher } from "@/app/language-switcher";

import type {
  CoachFeedback,
  CoachFollowUpResponse,
  QuestionClarification,
} from "@/lib/ai/contracts";
import {
  publicAiQuotaPresentation,
  type PublicAiQuotaSnapshot,
} from "@/lib/ai/public-ai-quota-display";
import {
  mergeAiDailyBudgetSnapshot,
  type AiDailyBudgetSnapshot,
} from "@/lib/ai/budget";
import {
  coachEvaluationIdempotencyKey,
  coachFollowUpIdempotencyKey,
} from "@/lib/ai/coach-idempotency-client";
import {
  aiDailyBudgetStorageKey,
  parseCurrentAiDailyBudgetSnapshot,
} from "@/lib/ai/budget-cache";
import { PRACTICE_DECKS } from "@/lib/content/decks";
import type {
  ContentLanguage,
  ContentQuestion,
  PracticeDeckId,
} from "@/lib/content/schema";
import type { EditableQuestionContent } from "@/lib/content/question-overrides";
import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import type { PracticeAccount } from "@/lib/practice/cloud-server";
import {
  buildCandidateAnswer,
  requiresCodeAnswer,
} from "@/lib/practice/candidate-answer";
import { CodeReviewWorkspace } from "./code-review-workspace";
import { QuestionEditorDialog } from "./question-editor-dialog";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  buildCustomStudyQueue,
  type CustomStudyFilters,
} from "@/lib/practice/custom-study";
import { completeLessonCheckQuestion } from "@/lib/practice/lesson-check";
import { focusEligibleQuestionIdentities } from "@/lib/practice/focus-eligibility";
import {
  compareAndSetFocusSessionSnapshotLocked,
  completeFocusSessionQuestion,
  focusSessionMatchesAccount,
  parseFocusSession,
  readFocusSessionSnapshot,
  reconcileFocusSession,
  type FocusSession,
} from "@/lib/practice/focus-session";
import { scenarioEditorConfig } from "@/lib/practice/scenario-editor";
import {
  parseSavedItems,
  removeSavedItem,
  savedItemsStorageKey,
  upsertSavedItem,
  type SavedItem,
} from "@/lib/practice/saved-items";
import {
  hydrateStudySession,
  serializeStudySession,
  studySessionStorageKey,
  type QuestionStudySession,
} from "@/lib/practice/study-session";
import {
  EMPTY_RECALL_REPAIR_QUEUE,
  advanceRecallRepairQueue,
  alignRecallRepairQueueWithAuthoritativeReviews,
  enqueueRecallRepair,
  nextRecallRepair,
  rateRecallRepair,
  readRecallRepairQueue,
  reconcileRecallRepairQueue,
  subscribeToRecallRepairQueue,
  updateRecallRepairQueueLocked,
  type RecallRepairQueue,
} from "@/lib/practice/repair-queue";
import {
  mergeProgressAfterCloudSync,
  parseDiscardedPracticeReviews,
  parseMistakeCaptureResolutions,
  partitionReviewsForCurrentQuestions,
  practiceReviewDiscardIdentity,
  type MistakeCaptureResolution,
} from "@/lib/practice/progress-sync";
import {
  beginRescueRetry,
  canRateRescueRetryAttempt,
  rescueRetryBlocksRating,
  rescueRetryOutcomeRating,
  restoreRescueRetryState,
  resolveRescueRetryAfterCoach,
  type RescueRetryState,
} from "@/lib/practice/rescue-retry";
import {
  calculateStreak,
  latestReviews,
  localDateKey,
  mergeProgress,
  parseProgress,
  reviewsForCloudSync,
  type PracticeProgress,
  type Rating,
  type Review,
} from "@/lib/practice/scheduler";
import {
  EMPTY_PROGRESS_STORAGE_SNAPSHOT as EMPTY_SNAPSHOT,
  acknowledgePracticeRepairSnapshotLocked,
  mutatePracticeProgressSnapshotLocked,
  recordPracticeReviewSnapshotLocked,
  readPracticeProgressSnapshot as getProgressSnapshot,
  subscribeToPracticeProgress as subscribeToProgress,
} from "@/lib/practice/storage";
import {
  buildAnkiDailyPlan,
  buildLearningStates,
  filterReviewsForLearningHistory,
  previewQuestionRatingIntervals,
  scheduleQuestionReview,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";

const MonacoCodeEditor = dynamic(
  () =>
    import("./scenario-code-editor").then((module) => module.MonacoCodeEditor),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  },
);
type SyncStatus = "local" | "syncing" | "synced" | "error";
type ProgressSyncPayload = {
  progress: PracticeProgress;
  questionStates: QuestionLearningState[];
  mistakeCapture?: {
    candidates: Array<{ id: string }>;
    generationMode: "ask" | "auto" | "off";
  } | null;
  mistakeCaptureResolutions?: unknown;
  discardedReviews?: unknown;
  mistakeQueueAvailable?: boolean;
};
type FocusHydrationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "missing"
  | "storage_error";
type FollowUpChatMessage = {
  role: "user" | "assistant";
  content: string;
  sourceSectionIds?: string[];
  checkQuestion?: string;
  model?: string;
};
type CoachApiPayload = {
  aiDailyBudget?: AiDailyBudgetSnapshot | null;
  aiUsageRecorded?: boolean;
  code?: string;
  error?: string;
  limit?: number;
  publicAiQuota?: PublicAiQuotaSnapshot | null;
  remaining?: number | null;
  resetsAt?: string | null;
};

const ratingOptionDefinitions: Array<{
  value: Rating;
  labelKey: "again" | "hard" | "good" | "easy";
  tone: string;
}> = [
  { value: "again", labelKey: "again", tone: "red" },
  { value: "hard", labelKey: "hard", tone: "orange" },
  { value: "good", labelKey: "good", tone: "green" },
  { value: "easy", labelKey: "easy", tone: "lime" },
];

type PracticeStandard =
  | "cpp98"
  | "cpp11"
  | "cpp14"
  | "cpp17"
  | "cpp20"
  | "cpp23"
  | "dailycpp";

function useRatingOptions() {
  const t = useTranslations("Practice");
  return ratingOptionDefinitions.map((option) => ({
    ...option,
    label: t(`rating.${option.labelKey}`),
  }));
}

function EditorLoading() {
  const t = useTranslations("Practice");
  return (
    <div className="grid h-96 place-items-center bg-[#092c51] font-mono text-xs text-white/45">
      {t("editorLoading")}
    </div>
  );
}

export type PracticeQuestion = ContentQuestion & {
  lessonTitle: string;
  language: ContentLanguage;
  track: PracticeStandard;
  standard: PracticeStandard;
  sourcePath: string;
  sourceSections: Array<{
    id: string;
    heading: string;
    excerpt: string;
  }>;
};

function getServerProgressSnapshot() {
  return null;
}

function readScopedFocusSession(accountId: string | null) {
  const session = parseFocusSession(
    readFocusSessionSnapshot(accountId),
  );
  return session && focusSessionMatchesAccount(session, accountId)
    ? session
    : null;
}

function authoritativeRecallRepairReviews(
  cloudProgress: PracticeProgress,
  localReviews: readonly Review[],
  now: string,
) {
  const cloudByKey = new Map(
    cloudProgress.reviews.map((review) => [
      `${review.questionId}:${review.reviewedOn}`,
      review,
    ]),
  );
  const byQuestion = new Map<
    string,
    {
      questionId: string;
      questionVersion: number;
      sourceHash: string;
      historyResetToken: string | null;
      localRating: Rating;
      rating: Rating;
      now: string;
    }
  >();
  const reviewedOnByQuestion = new Map<string, string>();

  for (const localReview of localReviews) {
    const cloudReview = cloudByKey.get(
      `${localReview.questionId}:${localReview.reviewedOn}`,
    );
    const questionVersion =
      cloudReview?.questionVersion ?? localReview.questionVersion;
    const sourceHash =
      cloudReview?.sourceHash ?? localReview.sourceHash;
    if (
      !cloudReview ||
      !questionVersion ||
      !sourceHash
    ) {
      continue;
    }
    const previousReviewedOn = reviewedOnByQuestion.get(
      localReview.questionId,
    );
    if (
      previousReviewedOn &&
      previousReviewedOn > localReview.reviewedOn
    ) {
      continue;
    }
    reviewedOnByQuestion.set(
      localReview.questionId,
      localReview.reviewedOn,
    );
    byQuestion.set(localReview.questionId, {
      questionId: localReview.questionId,
      questionVersion,
      sourceHash,
      historyResetToken:
        cloudReview.historyResetToken ??
        localReview.historyResetToken ??
        null,
      localRating: localReview.rating,
      rating: cloudReview.rating,
      now,
    });
  }

  return [...byQuestion.values()];
}

export function PracticeApp({
  questions,
  reviewQueue,
  sourceRevision,
  cloudEnabled,
  account,
  guestMode,
  canManageQuestionBank,
  questionBankAvailable,
  initialCloudProgress,
  initialQuestionStates,
  cloudSetupError,
  initialAiDailyBudget,
  initialPublicAiQuota,
  authNotice,
  initialDeck,
  requestedFocusId,
  invalidFocusRequest,
  initialCustomStudyFilters,
  initialCustomStudyQuestionIds,
  initialLessonCheck,
  focusReturnHref,
  mistakeQuestionIds,
  locale,
}: {
  questions: PracticeQuestion[];
  reviewQueue: PracticeQuestion[];
  sourceRevision: string;
  cloudEnabled: boolean;
  account: PracticeAccount | null;
  guestMode: boolean;
  canManageQuestionBank: boolean;
  questionBankAvailable: boolean;
  initialCloudProgress: PracticeProgress;
  initialQuestionStates: QuestionLearningState[];
  cloudSetupError: boolean;
  initialAiDailyBudget: AiDailyBudgetSnapshot | null;
  initialPublicAiQuota: PublicAiQuotaSnapshot | null;
  authNotice: string | null;
  initialDeck: PracticeDeckId;
  requestedFocusId: string | null;
  invalidFocusRequest: boolean;
  initialCustomStudyFilters: CustomStudyFilters | null;
  initialCustomStudyQuestionIds: string[] | null;
  initialLessonCheck: {
    lessonId: string;
    lessonTitle: string;
    restart: boolean;
    questionIds: string[];
  } | null;
  focusReturnHref: string | null;
  mistakeQuestionIds: string[];
  locale: Locale;
}) {
  const common = useTranslations("Common");
  const practiceT = useTranslations("Practice");
  const ratingOptions = useRatingOptions();
  const learningStateLabels = {
    new: practiceT("learningState.new"),
    learning: practiceT("learningState.learning"),
    review: practiceT("learningState.review"),
    relearning: practiceT("learningState.relearning"),
  } as const;
  const accountId = account?.id ?? null;
  const isLessonCheck = initialLessonCheck !== null;
  const shouldRestartLessonCheck = initialLessonCheck?.restart === true;
  const usesPublicAi = !canManageQuestionBank;
  const studySessionKey = useMemo(
    () => {
      const baseKey = studySessionStorageKey(accountId);
      return initialLessonCheck
        ? `${baseKey}:lesson-check:${initialLessonCheck.lessonId}`
        : baseKey;
    },
    [accountId, initialLessonCheck],
  );
  const savedItemsKey = useMemo(
    () => savedItemsStorageKey(accountId),
    [accountId],
  );
  const studySessionHydrationKey = `${studySessionKey}:${
    shouldRestartLessonCheck ? "restart" : "resume"
  }`;
  const subscribeToScopedProgress = useMemo(
    () => (callback: () => void) =>
      subscribeToProgress(accountId, callback),
    [accountId],
  );
  const getScopedProgressSnapshot = useMemo(
    () => () => getProgressSnapshot(accountId),
    [accountId],
  );
  const hasFocusRequest = requestedFocusId !== null || invalidFocusRequest;
  const snapshot = useSyncExternalStore(
    subscribeToScopedProgress,
    getScopedProgressSnapshot,
    getServerProgressSnapshot,
  );
  const progress = useMemo(
    () => parseProgress(snapshot === EMPTY_SNAPSHOT ? null : snapshot),
    [snapshot],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [repairQueue, setRepairQueue] = useState<RecallRepairQueue>(
    EMPTY_RECALL_REPAIR_QUEUE,
  );
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [hints, setHints] = useState<Set<string>>(() => new Set());
  const [answerRevealUsedByQuestion, setAnswerRevealUsedByQuestion] =
    useState<Set<string>>(() => new Set());
  const [hintUsedByQuestion, setHintUsedByQuestion] = useState<Set<string>>(
    () => new Set(),
  );
  const [coachFeedbackUsedByQuestion, setCoachFeedbackUsedByQuestion] =
    useState<Set<string>>(() => new Set());
  const [visibleSources, setVisibleSources] = useState<Set<string>>(
    () => new Set(),
  );
  const [coachFeedback, setCoachFeedback] = useState<Record<string, CoachFeedback>>(
    {},
  );
  const [coachModels, setCoachModels] = useState<Record<string, string>>({});
  const [coachAnswers, setCoachAnswers] = useState<Record<string, string>>({});
  const [questionClarifications, setQuestionClarifications] = useState<
    Record<string, QuestionClarification>
  >({});
  const [questionClarificationModels, setQuestionClarificationModels] =
    useState<Record<string, string>>({});
  const [questionClarificationLoading, setQuestionClarificationLoading] =
    useState<string | null>(null);
  const [questionClarificationErrors, setQuestionClarificationErrors] =
    useState<Record<string, string>>({});
  const [rescueRetryByQuestion, setRescueRetryByQuestion] = useState<
    Record<string, RescueRetryState>
  >({});
  const [coachAttemptIds, setCoachAttemptIds] = useState<Record<string, number>>({});
  const [coachIdempotencyKeys, setCoachIdempotencyKeys] = useState<
    Record<string, string>
  >({});
  const [coachLoading, setCoachLoading] = useState<string | null>(null);
  const [coachErrors, setCoachErrors] = useState<Record<string, string>>({});
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});
  const [followUpChats, setFollowUpChats] = useState<
    Record<string, FollowUpChatMessage[]>
  >({});
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({});
  const [deepDiveOpen, setDeepDiveOpen] = useState<Set<string>>(() => new Set());
  const [deepDiveAnswers, setDeepDiveAnswers] = useState<Record<string, string>>({});
  const [deepDiveFeedback, setDeepDiveFeedback] = useState<
    Record<string, CoachFollowUpResponse>
  >({});
  const [deepDiveModels, setDeepDiveModels] = useState<Record<string, string>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);
  const [deepDiveErrors, setDeepDiveErrors] = useState<Record<string, string>>({});
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [aiDailyBudget, setAiDailyBudget] = useState(initialAiDailyBudget);
  const [aiBudgetCacheHydrated, setAiBudgetCacheHydrated] = useState(false);
  const [publicAiQuota, setPublicAiQuota] =
    useState<PublicAiQuotaSnapshot | null>(initialPublicAiQuota);
  const [cloudQuestionStates, setCloudQuestionStates] = useState(
    initialQuestionStates,
  );
  const [cloudProgress, setCloudProgress] = useState(
    initialCloudProgress,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const [distractionFreeMode, setDistractionFreeMode] = useState(false);
  const [customStudyIds, setCustomStudyIds] = useState<string[] | null>(null);
  const [customStudyNotice, setCustomStudyNotice] = useState<string | null>(null);
  const [lessonCheckCompletedIds, setLessonCheckCompletedIds] = useState<
    string[]
  >([]);
  const [mistakeNotice, setMistakeNotice] = useState<string | null>(null);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [focusHydrationStatus, setFocusHydrationStatus] =
    useState<FocusHydrationStatus>(
      requestedFocusId
        ? "loading"
        : invalidFocusRequest
          ? "missing"
          : "idle",
    );
  const [focusStaleDroppedCount, setFocusStaleDroppedCount] = useState(0);
  const [focusNotice, setFocusNotice] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    cloudSetupError ? "error" : account ? "syncing" : "local",
  );
  const [syncRetryNonce, setSyncRetryNonce] = useState(0);
  const [availableQuestions, setAvailableQuestions] = useState(questions);
  const [pendingReview, setPendingReview] = useState(reviewQueue);
  const [selectedDeck, setSelectedDeck] = useState(initialDeck);
  const [requestedDeck, setRequestedDeck] = useState(initialDeck);
  const [approvalStatus, setApprovalStatus] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [questionAdminEditing, setQuestionAdminEditing] = useState(false);
  const [questionAdminSaving, setQuestionAdminSaving] = useState(false);
  const [questionAdminError, setQuestionAdminError] = useState<string | null>(
    null,
  );
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const initialSyncStarted = useRef<string | null>(null);
  const initialSyncRetryCountRef = useRef(0);
  const initialSyncRetryTimerRef = useRef<number | null>(null);
  const sessionHydrationStarted = useRef<string | null>(null);
  const focusHydrationStarted = useRef<string | null>(null);
  const customStudyLaunchStarted = useRef(false);
  const initialCustomStudyQuestionIdSet = useMemo(
    () =>
      initialCustomStudyQuestionIds
        ? new Set(initialCustomStudyQuestionIds)
        : undefined,
    [initialCustomStudyQuestionIds],
  );
  const scrollToRatingWhenAvailable = useRef(false);
  const scrollToReferenceAnswerWhenAvailable = useRef(false);
  const scrollToCoachFeedbackWhenAvailable = useRef(false);
  const pendingSessionSaveRef = useRef<(() => void) | null>(null);
  const coachRequestTokensRef = useRef<Record<string, string>>({});
  const clarificationRequestTokensRef = useRef<Record<string, string>>({});
  const reviewCompletionLocksRef = useRef<Set<string>>(new Set());
  const studySessionGenerationRef = useRef(0);
  const [hydratedStudySessionKey, setHydratedStudySessionKey] =
    useState<string | null>(null);
  const sessionHydrated =
    hydratedStudySessionKey === studySessionHydrationKey;
  const applyPublicAiQuota = useCallback(
    (payload: CoachApiPayload) => {
      if (!usesPublicAi) return;
      if (payload.publicAiQuota) {
        setPublicAiQuota(payload.publicAiQuota);
        return;
      }
      if (payload.code === "public_ai_quota_exceeded") {
        setPublicAiQuota({
          limit:
            typeof payload.limit === "number" && payload.limit > 0
              ? payload.limit
              : 3,
          remaining:
            typeof payload.remaining === "number" ? payload.remaining : 0,
          resetsAt: typeof payload.resetsAt === "string" ? payload.resetsAt : null,
        });
      }
    },
    [usesPublicAi],
  );
  const handleMistakeSyncPayload = useCallback(
    (payload: ProgressSyncPayload) => {
      const candidates = payload.mistakeCapture?.candidates ?? [];
      if (candidates.length) {
        if (payload.mistakeCapture?.generationMode === "auto") {
          setMistakeNotice(
            practiceT("notice.mistakesGenerating", {
              count: candidates.length,
            }),
          );
          void Promise.allSettled(
            candidates.map((candidate) =>
              fetch("/api/mistakes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateId: candidate.id }),
              }),
            ),
          );
        } else if (payload.mistakeCapture?.generationMode === "ask") {
          setMistakeNotice(
            practiceT("notice.mistakesQueued", {
              count: candidates.length,
            }),
          );
        }
      } else if (payload.mistakeQueueAvailable === false) {
        setMistakeNotice(
          practiceT("notice.mistakesUnavailable"),
        );
      }
    },
    [practiceT],
  );
  const sessionQuestions = useMemo(() => {
    const byId = new Map<string, PracticeQuestion>();
    [...availableQuestions, ...pendingReview].forEach((question) =>
      byId.set(question.id, question),
    );
    return [...byId.values()];
  }, [availableQuestions, pendingReview]);
  const clearStudySessionState = useCallback(() => {
    studySessionGenerationRef.current += 1;
    coachRequestTokensRef.current = {};
    clarificationRequestTokensRef.current = {};
    scrollToRatingWhenAvailable.current = false;
    scrollToReferenceAnswerWhenAvailable.current = false;
    scrollToCoachFeedbackWhenAvailable.current = false;
    setAnswers({});
    setCodeAnswers({});
    setCoachFeedback({});
    setCoachModels({});
    setCoachAnswers({});
    setQuestionClarifications({});
    setQuestionClarificationModels({});
    setQuestionClarificationLoading(null);
    setQuestionClarificationErrors({});
    setRescueRetryByQuestion({});
    setCoachAttemptIds({});
    setCoachIdempotencyKeys({});
    setCoachErrors({});
    setCoachLoading(null);
    setFollowUpInputs({});
    setFollowUpChats({});
    setFollowUpErrors({});
    setFollowUpLoading(null);
    setDeepDiveAnswers({});
    setDeepDiveFeedback({});
    setDeepDiveErrors({});
    setDeepDiveLoading(null);
    setDeepDiveOpen(new Set());
    setRevealed(new Set());
    setHints(new Set());
    setVisibleSources(new Set());
  }, []);
  useEffect(() => {
    if (initialAiDailyBudget) {
      setAiDailyBudget((current) =>
        mergeAiDailyBudgetSnapshot(current, initialAiDailyBudget),
      );
    }
  }, [initialAiDailyBudget]);

  useEffect(() => {
    if (!accountId) {
      setAiBudgetCacheHydrated(true);
      return;
    }
    let cached: AiDailyBudgetSnapshot | null = null;
    try {
      cached = parseCurrentAiDailyBudgetSnapshot(
        window.localStorage.getItem(aiDailyBudgetStorageKey(accountId)),
      );
    } catch {
      // A failed cache read must not affect server-side budget enforcement.
    }
    if (cached) {
      setAiDailyBudget((current) =>
        mergeAiDailyBudgetSnapshot(current, cached),
      );
    }
    setAiBudgetCacheHydrated(true);
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !aiBudgetCacheHydrated || !aiDailyBudget) return;
    const serialized = JSON.stringify(aiDailyBudget);
    if (!parseCurrentAiDailyBudgetSnapshot(serialized)) return;
    try {
      window.localStorage.setItem(
        aiDailyBudgetStorageKey(accountId),
        serialized,
      );
    } catch {
      // Budget enforcement remains server-side if browser storage is unavailable.
    }
  }, [accountId, aiBudgetCacheHydrated, aiDailyBudget]);

  useEffect(() => {
    if (sessionHydrationStarted.current === studySessionHydrationKey) return;
    sessionHydrationStarted.current = studySessionHydrationKey;

    const session = hydrateStudySession(
      window.localStorage,
      studySessionKey,
      sessionQuestions,
      { reset: shouldRestartLessonCheck },
    );
    const restoredAnswers: Record<string, string> = {};
    const restoredCodeAnswers: Record<string, string> = {};
    const restoredFeedback: Record<string, CoachFeedback> = {};
    const restoredModels: Record<string, string> = {};
    const restoredCoachAnswers: Record<string, string> = {};
    const restoredQuestionClarifications: Record<string, QuestionClarification> = {};
    const restoredQuestionClarificationModels: Record<string, string> = {};
    const restoredRescueRetry: Record<string, RescueRetryState> = {};
    const restoredAttemptIds: Record<string, number> = {};
    const restoredIdempotencyKeys: Record<string, string> = {};
    const restoredInputs: Record<string, string> = {};
    const restoredChats: Record<string, FollowUpChatMessage[]> = {};
    const restoredDeepDiveAnswers: Record<string, string> = {};
    const restoredDeepDiveFeedback: Record<string, CoachFollowUpResponse> = {};
    const restoredDeepDiveModels: Record<string, string> = {};
    const restoredDeepDiveOpen = new Set<string>();
    const restoredRevealed = new Set<string>();
    const restoredHints = new Set<string>();
    const restoredAnswerRevealUsed = new Set<string>();
    const restoredHintUsed = new Set<string>();
    const restoredCoachFeedbackUsed = new Set<string>();
    const restoredVisibleSources = new Set<string>();

    Object.entries(session.questions).forEach(([questionId, saved]) => {
      if (saved.answer !== undefined) restoredAnswers[questionId] = saved.answer;
      if (saved.codeAnswer !== undefined) {
        restoredCodeAnswers[questionId] = saved.codeAnswer;
      }
      if (saved.revealed) restoredRevealed.add(questionId);
      if (saved.hint) restoredHints.add(questionId);
      if (saved.answerRevealUsed || saved.revealed) {
        restoredAnswerRevealUsed.add(questionId);
      }
      if (saved.hintUsed || saved.hint) restoredHintUsed.add(questionId);
      if (saved.coachFeedbackUsed || saved.coachFeedback) {
        restoredCoachFeedbackUsed.add(questionId);
      }
      if (saved.sourceVisible) restoredVisibleSources.add(questionId);
      if (saved.coachFeedback) restoredFeedback[questionId] = saved.coachFeedback;
      if (saved.coachModel) restoredModels[questionId] = saved.coachModel;
      if (saved.coachAnswer !== undefined) {
        restoredCoachAnswers[questionId] = saved.coachAnswer;
      }
      if (saved.questionClarification) {
        restoredQuestionClarifications[questionId] = saved.questionClarification;
      }
      if (saved.questionClarificationModel) {
        restoredQuestionClarificationModels[questionId] =
          saved.questionClarificationModel;
      }
      const restoredRetryState = restoreRescueRetryState({
        persisted: saved.rescueRetry,
        hasFeedback: Boolean(saved.coachFeedback),
        coachAnswer: saved.coachAnswer,
      });
      if (restoredRetryState) {
        restoredRescueRetry[questionId] = restoredRetryState;
      }
      if (saved.coachAttemptId) restoredAttemptIds[questionId] = saved.coachAttemptId;
      if (saved.coachIdempotencyKey) {
        restoredIdempotencyKeys[questionId] = saved.coachIdempotencyKey;
      }
      if (saved.followUpInput) restoredInputs[questionId] = saved.followUpInput;
      if (saved.followUpChat) restoredChats[questionId] = saved.followUpChat;
      if (saved.deepDiveOpen) restoredDeepDiveOpen.add(questionId);
      if (saved.deepDiveAnswer) {
        restoredDeepDiveAnswers[questionId] = saved.deepDiveAnswer;
      }
      if (saved.deepDiveFeedback) {
        restoredDeepDiveFeedback[questionId] = saved.deepDiveFeedback;
      }
      if (saved.deepDiveModel) restoredDeepDiveModels[questionId] = saved.deepDiveModel;
    });

    setAnswers(restoredAnswers);
    setCodeAnswers(restoredCodeAnswers);
    setRevealed(restoredRevealed);
    setHints(restoredHints);
    setAnswerRevealUsedByQuestion(restoredAnswerRevealUsed);
    setHintUsedByQuestion(restoredHintUsed);
    setCoachFeedbackUsedByQuestion(restoredCoachFeedbackUsed);
    setVisibleSources(restoredVisibleSources);
    setCoachFeedback(restoredFeedback);
    setCoachModels(restoredModels);
    setCoachAnswers(restoredCoachAnswers);
    setQuestionClarifications(restoredQuestionClarifications);
    setQuestionClarificationModels(restoredQuestionClarificationModels);
    setRescueRetryByQuestion(restoredRescueRetry);
    setCoachAttemptIds(restoredAttemptIds);
    setCoachIdempotencyKeys(restoredIdempotencyKeys);
    setFollowUpInputs(restoredInputs);
    setFollowUpChats(restoredChats);
    setDeepDiveOpen(restoredDeepDiveOpen);
    setDeepDiveAnswers(restoredDeepDiveAnswers);
    setDeepDiveFeedback(restoredDeepDiveFeedback);
    setDeepDiveModels(restoredDeepDiveModels);
    setSelectedQuestionId(session.activeQuestionId ?? null);
    if (shouldRestartLessonCheck) {
      setLessonCheckCompletedIds([]);
    }
    setHydratedStudySessionKey(studySessionHydrationKey);

    if (shouldRestartLessonCheck) {
      const url = new URL(window.location.href);
      url.searchParams.delete("restart");
      window.history.replaceState(null, "", url);
    }
  }, [
    sessionQuestions,
    shouldRestartLessonCheck,
    studySessionHydrationKey,
    studySessionKey,
  ]);

  useEffect(() => {
    setSavedItems(parseSavedItems(window.localStorage.getItem(savedItemsKey)));
  }, [savedItemsKey]);

  useEffect(() => {
    if (!sessionHydrated) return;

    const saveSession = () => {
      const savedQuestions: Record<string, QuestionStudySession> = {};
      sessionQuestions.forEach((question) => {
        const answer = answers[question.id];
        const codeAnswer = codeAnswers[question.id];
        const feedback = coachFeedback[question.id];
        const model = coachModels[question.id];
        const coachAnswer = coachAnswers[question.id];
        const hasCoachAnswer = coachAnswer !== undefined;
        const questionClarification = questionClarifications[question.id];
        const questionClarificationModel =
          questionClarificationModels[question.id];
        const rescueRetry = rescueRetryByQuestion[question.id];
        const coachAttemptId = coachAttemptIds[question.id];
        const coachIdempotencyKey = coachIdempotencyKeys[question.id];
        const followUpInput = followUpInputs[question.id];
        const followUpChat = followUpChats[question.id];
        const deepDiveAnswer = deepDiveAnswers[question.id];
        const savedDeepDiveFeedback = deepDiveFeedback[question.id];
        const deepDiveModel = deepDiveModels[question.id];
        const isDeepDiveOpen = deepDiveOpen.has(question.id);
        const isRevealed = revealed.has(question.id);
        const hasHint = hints.has(question.id);
        const answerRevealUsed = answerRevealUsedByQuestion.has(question.id);
        const hintUsed = hintUsedByQuestion.has(question.id);
        const coachFeedbackUsed =
          coachFeedbackUsedByQuestion.has(question.id);
        const sourceVisible = visibleSources.has(question.id);
        const hasSession = Boolean(
          answer ||
            codeAnswer ||
            feedback ||
            questionClarification ||
            rescueRetry ||
            coachIdempotencyKey ||
            followUpInput ||
            followUpChat?.length ||
            deepDiveAnswer ||
            savedDeepDiveFeedback ||
            isDeepDiveOpen ||
            isRevealed ||
            hasHint ||
            answerRevealUsed ||
            hintUsed ||
            coachFeedbackUsed ||
            sourceVisible,
        );
        if (!hasSession) return;

        savedQuestions[question.id] = {
          questionVersion: question.version,
          sourceHash: question.sourceHash,
          ...(answer ? { answer } : {}),
          ...(codeAnswer ? { codeAnswer } : {}),
          ...(isRevealed ? { revealed: true } : {}),
          ...(hasHint ? { hint: true } : {}),
          ...(answerRevealUsed ? { answerRevealUsed: true } : {}),
          ...(hintUsed ? { hintUsed: true } : {}),
          ...(coachFeedbackUsed ? { coachFeedbackUsed: true } : {}),
          ...(sourceVisible ? { sourceVisible: true } : {}),
          ...(feedback ? { coachFeedback: feedback } : {}),
          ...(model ? { coachModel: model } : {}),
          ...(hasCoachAnswer ? { coachAnswer: coachAnswer ?? "" } : {}),
          ...(questionClarification
            ? { questionClarification }
            : {}),
          ...(questionClarificationModel
            ? { questionClarificationModel }
            : {}),
          ...(rescueRetry ? { rescueRetry } : {}),
          ...(coachAttemptId ? { coachAttemptId } : {}),
          ...(coachIdempotencyKey ? { coachIdempotencyKey } : {}),
          ...(followUpInput ? { followUpInput } : {}),
          ...(followUpChat?.length ? { followUpChat } : {}),
          ...(isDeepDiveOpen ? { deepDiveOpen: true } : {}),
          ...(deepDiveAnswer ? { deepDiveAnswer } : {}),
          ...(savedDeepDiveFeedback
            ? { deepDiveFeedback: savedDeepDiveFeedback }
            : {}),
          ...(deepDiveModel ? { deepDiveModel } : {}),
        };
      });

      try {
        window.localStorage.setItem(
          studySessionKey,
          serializeStudySession(
            savedQuestions,
            selectedQuestionId ?? undefined,
          ),
        );
      } catch {
        // Practice remains usable if browser storage is unavailable or full.
      }
    };
    pendingSessionSaveRef.current = saveSession;
    const timeoutId = window.setTimeout(() => {
      saveSession();
      if (pendingSessionSaveRef.current === saveSession) {
        pendingSessionSaveRef.current = null;
      }
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [
    answers,
    answerRevealUsedByQuestion,
    coachAnswers,
    coachAttemptIds,
    coachFeedback,
    coachFeedbackUsedByQuestion,
    coachIdempotencyKeys,
    coachModels,
    questionClarifications,
    questionClarificationModels,
    codeAnswers,
    deepDiveAnswers,
    deepDiveFeedback,
    deepDiveModels,
    deepDiveOpen,
    followUpChats,
    followUpInputs,
    hints,
    hintUsedByQuestion,
    revealed,
    rescueRetryByQuestion,
    selectedQuestionId,
    sessionHydrated,
    sessionQuestions,
    studySessionKey,
    visibleSources,
  ]);

  useEffect(
    () => () => {
      pendingSessionSaveRef.current?.();
      pendingSessionSaveRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const retryWhenOnline = () => {
      if (!accountId) return;
      if (initialSyncRetryTimerRef.current !== null) {
        window.clearTimeout(initialSyncRetryTimerRef.current);
        initialSyncRetryTimerRef.current = null;
      }
      initialSyncRetryCountRef.current = 0;
      initialSyncStarted.current = null;
      setSyncRetryNonce((value) => value + 1);
    };
    window.addEventListener("online", retryWhenOnline);
    return () => {
      window.removeEventListener("online", retryWhenOnline);
      if (initialSyncRetryTimerRef.current !== null) {
        window.clearTimeout(initialSyncRetryTimerRef.current);
        initialSyncRetryTimerRef.current = null;
      }
    };
  }, [accountId]);

  useEffect(() => {
    if (!account) {
      initialSyncStarted.current = null;
      return;
    }
    if (
      snapshot === null ||
      initialSyncStarted.current === account.id
    ) {
      return;
    }
    initialSyncStarted.current = account.id;

    const cloudReviewKeys = new Set(
      initialCloudProgress.reviews.map(
        (review) => `${review.questionId}:${review.reviewedOn}`,
      ),
    );
    const currentQuestionIdentities = availableQuestions.map(
      (question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
      }),
    );
    const localRecallReviews =
      partitionReviewsForCurrentQuestions(
        parseProgress(
          snapshot === EMPTY_SNAPSHOT ? null : snapshot,
        ).reviews.filter(
          (review) => review.reviewedOn === localDateKey(),
        ),
        currentQuestionIdentities,
      ).accepted;
    void (async () => {
      try {
        const merged =
          await mutatePracticeProgressSnapshotLocked(
            account.id,
            (current) => {
              const localProgress: PracticeProgress = {
                ...current,
                reviews: filterReviewsForLearningHistory(
                  current.reviews,
                  initialQuestionStates,
                ),
              };
              return mergeProgress(
                initialCloudProgress,
                localProgress,
              );
            },
          );
        const syncCandidates = filterReviewsForLearningHistory(
          reviewsForCloudSync(merged.reviews),
          initialQuestionStates,
        ).filter(
          (review) =>
            review.coachAttemptId !== undefined ||
            !cloudReviewKeys.has(
              `${review.questionId}:${review.reviewedOn}`,
            ),
        );
        const partitionedReviews =
          partitionReviewsForCurrentQuestions(
            syncCandidates,
            currentQuestionIdentities,
          );
        const localDiscardedResolutions =
          partitionedReviews.discarded.flatMap(
            ({ review }): MistakeCaptureResolution[] =>
              review.coachAttemptId === undefined
                ? []
                : [
                    {
                      coachAttemptId: review.coachAttemptId,
                      questionId: review.questionId,
                      reviewedOn: review.reviewedOn,
                      rating: review.rating,
                      disposition: "discarded",
                    },
                  ],
          );
        const localDiscardedReviews =
          partitionedReviews.discarded.map(({ review }) =>
            practiceReviewDiscardIdentity(review),
          );
        const localOnlyReviews = partitionedReviews.accepted;
        const response = await fetch("/api/progress/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviews: localOnlyReviews }),
        });
        if (!response.ok) throw new Error("Cloud sync failed");
        const payload = (await response.json()) as ProgressSyncPayload;
        const captureResolutions = [
          ...localDiscardedResolutions,
          ...parseMistakeCaptureResolutions(
            payload.mistakeCaptureResolutions,
          ),
        ];
        await mutatePracticeProgressSnapshotLocked(
          account.id,
          (current) =>
            mergeProgressAfterCloudSync(
              {
                ...current,
                reviews: filterReviewsForLearningHistory(
                  current.reviews,
                  payload.questionStates,
                ),
              },
              payload.progress,
              captureResolutions,
              [
                ...localDiscardedReviews,
                ...parseDiscardedPracticeReviews(
                  payload.discardedReviews,
                ),
              ],
            ),
        );
        setCloudProgress(payload.progress);
        setCloudQuestionStates(payload.questionStates);
        const authoritativeRepairs =
          authoritativeRecallRepairReviews(
            payload.progress,
            localRecallReviews,
            new Date().toISOString(),
          );
        if (authoritativeRepairs.length) {
          const alignRepairQueue = (queue: RecallRepairQueue) =>
            alignRecallRepairQueueWithAuthoritativeReviews(
              queue,
              authoritativeRepairs,
            );
          setRepairQueue(alignRepairQueue);
          try {
            setRepairQueue(
              await updateRecallRepairQueueLocked(
                account.id,
                alignRepairQueue,
              ),
            );
          } catch {
            // The authoritative in-tab queue remains usable without storage.
          }
        }
        handleMistakeSyncPayload(payload);
        initialSyncRetryCountRef.current = 0;
        if (initialSyncRetryTimerRef.current !== null) {
          window.clearTimeout(initialSyncRetryTimerRef.current);
          initialSyncRetryTimerRef.current = null;
        }
        setSyncStatus("synced");
      } catch {
        if (initialSyncStarted.current === account.id) {
          initialSyncStarted.current = null;
          if (
            navigator.onLine &&
            initialSyncRetryCountRef.current < 3
          ) {
            const delayMs =
              1_000 * 2 ** initialSyncRetryCountRef.current;
            initialSyncRetryCountRef.current += 1;
            initialSyncRetryTimerRef.current = window.setTimeout(
              () => {
                initialSyncRetryTimerRef.current = null;
                setSyncRetryNonce((value) => value + 1);
              },
              delayMs,
            );
          }
        }
        setSyncStatus("error");
      }
    })();
  }, [
    account,
    availableQuestions,
    handleMistakeSyncPayload,
    initialCloudProgress,
    initialQuestionStates,
    snapshot,
    syncRetryNonce,
  ]);

  const today = localDateKey();
  const focusProgressReviews = useMemo(
    () =>
      filterReviewsForLearningHistory(
        mergeProgress(cloudProgress, progress).reviews,
        cloudQuestionStates,
      ),
    [cloudProgress, cloudQuestionStates, progress],
  );
  const {
    allLatest,
    allLearningStates,
    allQuestionById,
    allQuestionIdentities,
  } = useMemo(() => {
    const questionIds = new Set(
      availableQuestions.map((question) => question.id),
    );
    const reviews = focusProgressReviews.filter((review) =>
      questionIds.has(review.questionId),
    );
    return {
      allLatest: latestReviews(reviews),
      allLearningStates: buildLearningStates(
        availableQuestions.map((question) => ({
          id: question.id,
          version: question.version,
          sourceHash: question.sourceHash,
        })),
        reviews,
        cloudQuestionStates.filter((state) =>
          questionIds.has(state.questionId),
        ),
      ),
      allQuestionById: new Map(
        availableQuestions.map((question) => [question.id, question]),
      ),
      allQuestionIdentities: availableQuestions.map((question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
        deckId: question.taxonomy.deckId,
      })),
    };
  }, [availableQuestions, cloudQuestionStates, focusProgressReviews]);

  const validRepairQuestions = useMemo(
    () =>
      new Map(
        allQuestionIdentities.map((question) => [
          question.id,
          {
            version: question.version,
            sourceHash: question.sourceHash,
            historyResetToken:
              allLearningStates.get(question.id)?.historyResetToken ??
              null,
          },
        ]),
      ),
    [allLearningStates, allQuestionIdentities],
  );

  useEffect(() => {
    const markedReviews = progress.reviews.filter(
      (
        review,
      ): review is Review & { repairPendingAt: string } =>
        review.repairPendingAt !== undefined,
    );
    if (!markedReviews.length) return;

    const recoverable = markedReviews.filter((review) => {
      const identity = validRepairQuestions.get(review.questionId);
      if (!identity) return false;
      return (
        (review.rating === "again" || review.rating === "hard") &&
        identity.version === review.questionVersion &&
        identity.sourceHash === review.sourceHash &&
        identity.historyResetToken ===
          (review.historyResetToken ?? null)
      );
    });
    const discarded = markedReviews.filter(
      (review) => !recoverable.includes(review),
    );
    const acknowledge = (
      review: Review & { repairPendingAt: string },
    ) =>
      acknowledgePracticeRepairSnapshotLocked(accountId, {
        questionId: review.questionId,
        reviewedOn: review.reviewedOn,
        repairPendingAt: review.repairPendingAt,
      });

    void Promise.allSettled(discarded.map(acknowledge));
    if (!recoverable.length) return;

    void updateRecallRepairQueueLocked(accountId, (queue) => {
      let next = reconcileRecallRepairQueue(
        queue,
        validRepairQuestions,
      );
      for (const review of recoverable) {
        if (
          next.items.some(
            (item) => item.questionId === review.questionId,
          )
        ) {
          continue;
        }
        next = enqueueRecallRepair(next, {
          questionId: review.questionId,
          questionVersion: review.questionVersion!,
          sourceHash: review.sourceHash!,
          historyResetToken: review.historyResetToken ?? null,
          rating: review.rating as "again" | "hard",
          now: review.repairPendingAt,
        });
      }
      return next;
    })
      .then(async (queue) => {
        setRepairQueue(queue);
        await Promise.all(recoverable.map(acknowledge));
      })
      .catch(() => {
        // Keep the journal markers for the next storage/reload retry.
      });
  }, [accountId, progress.reviews, validRepairQuestions]);

  useEffect(() => {
    const refresh = () => {
      const stored = readRecallRepairQueue(accountId);
      const reconciled = reconcileRecallRepairQueue(
        stored,
        validRepairQuestions,
      );
      if (JSON.stringify(reconciled) !== JSON.stringify(stored)) {
        void updateRecallRepairQueueLocked(
          accountId,
          (current) =>
            reconcileRecallRepairQueue(
              current,
              validRepairQuestions,
            ),
        )
          .then(setRepairQueue)
          .catch(() => {
            // A stale repair card can still be dropped for this tab.
          });
      }
      setRepairQueue(reconciled);
    };
    refresh();
    return subscribeToRecallRepairQueue(accountId, refresh);
  }, [accountId, validRepairQuestions]);

  useEffect(() => {
    const hydrationIdentity = requestedFocusId
      ? `${accountId ?? "local"}:${requestedFocusId}`
      : null;
    if (
      !requestedFocusId ||
      snapshot === null ||
      focusHydrationStarted.current === hydrationIdentity
    ) {
      return;
    }
    focusHydrationStarted.current = hydrationIdentity;
    setFocusHydrationStatus("loading");

    try {
      const stored = readScopedFocusSession(accountId);
      if (!stored || stored.sessionId !== requestedFocusId) {
        setFocusSession(null);
        setFocusHydrationStatus("missing");
        return;
      }

      const completedIds = new Set(
        stored.completedQuestions.map((question) => question.id),
      );
      const reconciled = reconcileFocusSession(
        stored,
        focusEligibleQuestionIdentities({
          questions: allQuestionIdentities,
          learningStates: allLearningStates,
          latest: allLatest,
          completedQuestionIds: completedIds,
          today,
        }),
      );
      const hydratedSession = reconciled.session;
      const hydratedStaleDroppedCount = reconciled.staleDroppedCount;

      if (reconciled.staleDroppedCount > 0) {
        void compareAndSetFocusSessionSnapshotLocked(
          accountId,
          stored,
          reconciled.session,
        )
          .then((result) => {
            if (result.applied) return;
            if (result.session?.sessionId === requestedFocusId) {
              setFocusSession(result.session);
              setFocusStaleDroppedCount(0);
            }
            setFocusNotice(
              practiceT("notice.focusAdvancedElsewhere"),
            );
          })
          .catch(() => {
            setFocusNotice(
              practiceT("notice.focusReconciledUnsaved"),
            );
          });
      }
      setFocusSession(hydratedSession);
      setFocusStaleDroppedCount(hydratedStaleDroppedCount);
      setFocusHydrationStatus("ready");
      setSelectedQuestionId(null);
      setCustomStudyIds(null);
      setCustomStudyNotice(null);

      const nextQuestion = hydratedSession.remainingQuestions[0];
      if (hydratedSession.status === "active" && nextQuestion) {
        setRequestedDeck(nextQuestion.deckId);
        setSelectedDeck(nextQuestion.deckId);
        const url = new URL(window.location.href);
        url.searchParams.set("deck", nextQuestion.deckId);
        window.history.replaceState(null, "", url);
      }
    } catch {
      setFocusSession(null);
      setFocusHydrationStatus("storage_error");
    }
  }, [
    accountId,
    allLatest,
    allLearningStates,
    allQuestionIdentities,
    practiceT,
    requestedFocusId,
    snapshot,
    today,
  ]);

  useEffect(() => {
    if (
      focusHydrationStatus !== "ready" ||
      focusSession?.status !== "active" ||
      !requestedFocusId
    ) {
      return;
    }

    const completedIds = new Set(
      focusSession.completedQuestions.map((question) => question.id),
    );
    const reconciled = reconcileFocusSession(
      focusSession,
      focusEligibleQuestionIdentities({
        questions: allQuestionIdentities,
        learningStates: allLearningStates,
        latest: allLatest,
        completedQuestionIds: completedIds,
        today,
      }),
    );
    if (reconciled.staleDroppedCount === 0) return;

    const sessionForTab = reconciled.session;
    const staleDroppedCount = reconciled.staleDroppedCount;
    try {
      void compareAndSetFocusSessionSnapshotLocked(
        accountId,
        focusSession,
        reconciled.session,
      )
        .then((result) => {
          if (result.applied) return;
          if (result.session?.sessionId === requestedFocusId) {
            setFocusSession(result.session);
            setFocusStaleDroppedCount(0);
          }
          setFocusNotice(
            practiceT("notice.focusAdvancedElsewhere"),
          );
        })
        .catch(() => {
          setFocusNotice(
            practiceT("notice.focusReconciledUnsaved"),
          );
        });
    } catch {
      setFocusNotice(
        practiceT("notice.focusReconciledUnsaved"),
      );
    }
    setFocusSession(sessionForTab);
    const sessionHead = sessionForTab.remainingQuestions[0];
    if (sessionForTab.status === "active" && sessionHead) {
      setRequestedDeck(sessionHead.deckId);
      setSelectedDeck(sessionHead.deckId);
      const url = new URL(window.location.href);
      url.searchParams.set("deck", sessionHead.deckId);
      window.history.replaceState(null, "", url);
    }
    if (staleDroppedCount > 0) {
      setFocusStaleDroppedCount(
        (current) => current + staleDroppedCount,
      );
    }
  }, [
    accountId,
    allLatest,
    allLearningStates,
    allQuestionIdentities,
    focusHydrationStatus,
    focusSession,
    practiceT,
    requestedFocusId,
    today,
  ]);

  const {
    completedToday,
    dailyCounts,
    deckQuestions,
    latest,
    learningStates,
    questionById,
    remainingIds,
    selectedPendingReview,
    streak,
  } = useMemo(() => {
    const nextDeckQuestions = availableQuestions.filter(
      (question) => question.taxonomy.deckId === selectedDeck,
    );
    const deckQuestionIds = new Set(
      nextDeckQuestions.map((question) => question.id),
    );
    const nextDeckReviews = filterReviewsForLearningHistory(
      progress.reviews,
      cloudQuestionStates,
    ).filter((review) => deckQuestionIds.has(review.questionId));
    const nextSelectedPendingReview = pendingReview.filter(
      (question) => question.taxonomy.deckId === selectedDeck,
    );
    const nextQuestionById = new Map(
      nextDeckQuestions.map((question) => [question.id, question]),
    );
    const nextCloudStates = cloudQuestionStates.filter((state) =>
      deckQuestionIds.has(state.questionId),
    );
    const nextQuestionIdentities = nextDeckQuestions.map(
      (question, position) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
        newCardSequence:
          question.standard === "cpp98"
            ? null
            : {
                standard: question.standard,
                difficulty: question.difficulty,
                position,
              },
      }),
    );
    const nextLearningStates = buildLearningStates(
      nextQuestionIdentities,
      nextDeckReviews,
      nextCloudStates,
    );
    const nextLatest = latestReviews(nextDeckReviews);
    const nextDailyPlan = buildAnkiDailyPlan(
      nextQuestionIdentities,
      nextDeckReviews,
      nextCloudStates,
      today,
      { priorityQuestionIds: mistakeQuestionIds },
    );

    return {
      completedToday: nextDailyPlan.completedCount,
      dailyCounts: nextDailyPlan.counts,
      deckQuestions: nextDeckQuestions,
      latest: nextLatest,
      learningStates: nextLearningStates,
      questionById: nextQuestionById,
      remainingIds: nextDailyPlan.remainingIds,
      selectedPendingReview: nextSelectedPendingReview,
      streak: calculateStreak(nextDeckReviews, today),
    };
  }, [
    availableQuestions,
    cloudQuestionStates,
    mistakeQuestionIds,
    pendingReview,
    progress.reviews,
    selectedDeck,
    today,
  ]);

  const lessonCheckIds = useMemo(
    () =>
      initialLessonCheck
        ? initialLessonCheck.questionIds.filter((questionId) =>
            allQuestionById.has(questionId),
          )
        : [],
    [allQuestionById, initialLessonCheck],
  );
  const lessonCheckCompleted = useMemo(
    () => new Set(lessonCheckCompletedIds),
    [lessonCheckCompletedIds],
  );
  const lessonCheckRemainingIds = lessonCheckIds.filter(
    (questionId) => !lessonCheckCompleted.has(questionId),
  );

  useEffect(() => {
    if (
      customStudyLaunchStarted.current ||
      !initialCustomStudyFilters ||
      hasFocusRequest ||
      snapshot === null ||
      !sessionHydrated
    ) {
      return;
    }
    customStudyLaunchStarted.current = true;
    const ids = buildCustomStudyQueue(
      deckQuestions,
      learningStates,
      today,
      initialCustomStudyFilters,
      initialCustomStudyQuestionIdSet,
    );
    clearStudySessionState();
    setSelectedQuestionId(null);
    if (!ids.length) {
      setCustomStudyIds(null);
      setCustomStudyNotice(
        practiceT("notice.statsEmpty"),
      );
      return;
    }
    setCustomStudyIds(ids);
    setCustomStudyNotice(
      practiceT("notice.statsOpened", { count: ids.length }),
    );
    window.scrollTo({ top: 0 });
  }, [
    deckQuestions,
    clearStudySessionState,
    hasFocusRequest,
    initialCustomStudyFilters,
    initialCustomStudyQuestionIdSet,
    learningStates,
    practiceT,
    sessionHydrated,
    snapshot,
    today,
  ]);

  const selectedQuestion = selectedQuestionId
    ? questionById.get(selectedQuestionId)
    : undefined;
  const focusQuestionRef =
    focusHydrationStatus === "ready" && focusSession?.status === "active"
      ? focusSession.remainingQuestions[0]
      : undefined;
  const focusQuestion = focusQuestionRef
    ? allQuestionById.get(focusQuestionRef.id)
    : undefined;
  const isFocusActive = Boolean(focusQuestionRef && focusQuestion);
  const customRemainingIds = (customStudyIds ?? []).filter(
    (questionId) =>
      questionById.has(questionId) &&
      latest.get(questionId)?.reviewedOn !== today,
  );
  const normalCurrent =
    selectedQuestion && latest.get(selectedQuestion.id)?.reviewedOn !== today
      ? selectedQuestion
      : customStudyIds
        ? questionById.get(customRemainingIds[0])
        : questionById.get(remainingIds[0]);
  const lessonCheckCurrent = allQuestionById.get(
    lessonCheckRemainingIds[0],
  );
  const repairItem = isFocusActive || isLessonCheck
    ? null
    : nextRecallRepair(
        repairQueue,
        validRepairQuestions,
        { allowEarly: !normalCurrent },
      );
  const repairQuestion = repairItem
    ? allQuestionById.get(repairItem.questionId)
    : undefined;
  const current = isLessonCheck
    ? lessonCheckCurrent
    : isFocusActive
      ? focusQuestion
      : repairQuestion ?? normalCurrent;

  const isRepairActive = Boolean(
    repairItem && current?.id === repairItem.questionId,
  );
  const currentPrompt = current ? displayQuestionPrompt(current) : "";
  const currentCandidateAnswer = current
    ? buildCandidateAnswer(
        current,
        answers[current.id] ?? "",
        codeAnswers[current.id] ?? "",
      )
    : "";
  const currentLearningState = current
    ? isLessonCheck
      ? undefined
      : isFocusActive || isRepairActive
      ? allLearningStates.get(current.id)
      : learningStates.get(current.id)
    : undefined;
  const currentRatingIntervals = useMemo(
    () =>
      currentLearningState
        ? previewQuestionRatingIntervals(
            currentLearningState,
            focusProgressReviews,
            today,
          )
        : null,
    [currentLearningState, focusProgressReviews, today],
  );
  const isRandomQuestion = Boolean(
    !isLessonCheck &&
    !isFocusActive &&
      !isRepairActive &&
      current &&
      selectedQuestionId === current.id &&
      !remainingIds.includes(current.id),
  );
  const isCustomStudyQuestion = Boolean(
    !isLessonCheck &&
    !isFocusActive &&
      !isRepairActive &&
      current &&
      customStudyIds?.includes(current.id),
  );
  const isLessonCheckQuestion = Boolean(
    isLessonCheck && current && lessonCheckIds.includes(current.id),
  );
  const randomCandidates = deckQuestions.filter(
    (question) =>
      question.id !== current?.id && latest.get(question.id)?.reviewedOn !== today,
  );
  const hasAnswered = Boolean(
    current &&
      (coachFeedback[current.id] ||
        answerRevealUsedByQuestion.has(current.id)),
  );
  const currentRescueRetry = current
    ? rescueRetryByQuestion[current.id]
    : undefined;
  const rescueOutcomeRating = rescueRetryOutcomeRating(
    currentRescueRetry,
  );
  const canRateCurrent = Boolean(
    current &&
      canRateRescueRetryAttempt({
        hasCurrentFeedback: Boolean(coachFeedback[current.id]),
        answerRevealUsed: answerRevealUsedByQuestion.has(current.id),
        state: currentRescueRetry,
      }),
  );
  const currentSuggestedRating = current
    ? ratingOptions.find(
        (option) => option.value === coachFeedback[current.id]?.suggestedRating,
      )
    : undefined;
  const dailyTotal = completedToday + remainingIds.length;
  const focusQueueTotal = focusSession
    ? focusSession.completedQuestions.length +
      focusSession.remainingQuestions.length
    : 0;
  const focusPosition = focusSession
    ? Math.min(focusSession.completedQuestions.length + 1, focusQueueTotal)
    : 0;
  const focusStep = current
    ? focusSession?.plan.questions.find(
        (step) => step.question.id === current.id,
      )
    : undefined;

  useEffect(() => {
    if (!distractionFreeMode) return;

    document.body.dataset.practiceFocusMode = "true";
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDistractionFreeMode(false);
        return;
      }

      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (
        !isTyping &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        if (!current) return;
        const willReveal = !revealed.has(current.id);
        if (willReveal) {
          scrollToReferenceAnswerWhenAvailable.current = true;
          setAnswerRevealUsedByQuestion((used) => {
            if (used.has(current.id)) return used;
            const next = new Set(used);
            next.add(current.id);
            return next;
          });
        }
        setRevealed((values) => {
          const next = new Set(values);
          if (next.has(current.id)) {
            next.delete(current.id);
          } else {
            next.add(current.id);
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => {
      delete document.body.dataset.practiceFocusMode;
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [current, distractionFreeMode, revealed]);

  if (snapshot === null) {
    return <LoadingScreen />;
  }

  async function approveAllPending() {
    if (!selectedPendingReview.length || approvalStatus === "saving") return;
    setApprovalStatus("saving");
    try {
      const response = await fetch("/api/questions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: selectedPendingReview.map((question) => ({
            questionId: question.id,
            questionVersion: question.version,
            sourceHash: question.sourceHash,
          })),
        }),
      });
      if (!response.ok) throw new Error("Approval failed");
      setAvailableQuestions((currentQuestions) => {
        const known = new Set(currentQuestions.map((question) => question.id));
        return [
          ...currentQuestions,
          ...selectedPendingReview.filter((question) => !known.has(question.id)),
        ];
      });
      const approvedIds = new Set(
        selectedPendingReview.map((question) => question.id),
      );
      setPendingReview((current) =>
        current.filter((question) => !approvedIds.has(question.id)),
      );
      setApprovalStatus("idle");
    } catch {
      setApprovalStatus("error");
    }
  }

  async function persistFocusSessionIfCurrent(
    baseSession: FocusSession,
    nextSession: FocusSession,
  ) {
    try {
      if (!requestedFocusId) {
          setFocusNotice(
            practiceT("notice.focusRestoreElsewhere"),
        );
        return nextSession;
      }
      const result = await compareAndSetFocusSessionSnapshotLocked(
        accountId,
        baseSession,
        nextSession,
      );
      if (!result.applied) {
          setFocusNotice(
            practiceT("notice.focusRestoreElsewhere"),
        );
        return result.session?.sessionId === requestedFocusId
          ? result.session
          : nextSession;
      }
      setFocusNotice(null);
      return nextSession;
    } catch {
      setFocusNotice(
        practiceT("notice.focusLocalOnly"),
      );
      return nextSession;
    }
  }

  async function rateCurrent(rating: Rating) {
    if (!current || !currentLearningState || !canRateCurrent) return;
    const rescueRetry = rescueRetryByQuestion[current.id];
    if (rescueRetryBlocksRating(rescueRetry)) return;
    if (reviewCompletionLocksRef.current.has(current.id)) return;
    const lockedQuestionId = current.id;
    const ratingSessionGeneration =
      studySessionGenerationRef.current;
    const ratingStillOwnsSession = () =>
      studySessionGenerationRef.current ===
      ratingSessionGeneration;
    const releaseAfter = Date.now() + 1_000;
    reviewCompletionLocksRef.current.add(lockedQuestionId);
    try {
      const reviewRating =
        rescueRetryOutcomeRating(rescueRetry) ?? rating;
      const occurredAt = new Date();
      const occurredAtIso = occurredAt.toISOString();
      const reviewedOn = localDateKey(occurredAt);

      if (isRepairActive) {
        const updateRepair = (queue: RecallRepairQueue) =>
          rateRecallRepair(
            reconcileRecallRepairQueue(
              queue,
              validRepairQuestions,
            ),
            current.id,
            reviewRating,
          );
        setRepairQueue(updateRepair);
        void updateRecallRepairQueueLocked(
          accountId,
          updateRepair,
        )
          .then(async (queue) => {
            setRepairQueue(queue);
            const pendingMarkers = progress.reviews.filter(
              (
                review,
              ): review is Review & { repairPendingAt: string } =>
                review.questionId === current.id &&
                review.repairPendingAt !== undefined,
            );
            await Promise.all(
              pendingMarkers.map((review) =>
                acknowledgePracticeRepairSnapshotLocked(
                  accountId,
                  {
                    questionId: review.questionId,
                    reviewedOn: review.reviewedOn,
                    repairPendingAt: review.repairPendingAt,
                  },
                ),
              ),
            );
          })
          .catch(() => {
            // Keep a pending journal marker if durable queue completion fails.
          });
        setSelectedQuestionId(null);
        clearRecordedAttemptEvidence(current.id);
        clearStudySessionState();
        return;
      }

      let persistedReview: Review;
      let reviewWasRecorded: boolean;
      try {
        const result = await recordPracticeReviewSnapshotLocked(
          accountId,
          {
            questionId: current.id,
            questionVersion: current.version,
            sourceHash: current.sourceHash,
            reviewedOn,
            prepareProgress: (storedProgress) => {
              const merged = mergeProgress(
                cloudProgress,
                storedProgress,
              );
              return {
                ...merged,
                reviews: filterReviewsForLearningHistory(
                  merged.reviews,
                  cloudQuestionStates,
                ),
              };
            },
            createReview: (lockedProgress) => {
              const lockedState = buildLearningStates(
                [
                  {
                    id: current.id,
                    version: current.version,
                    sourceHash: current.sourceHash,
                  },
                ],
                lockedProgress.reviews,
                cloudQuestionStates.filter(
                  (state) => state.questionId === current.id,
                ),
              ).get(current.id);
              if (!lockedState) {
                throw new Error(
                  "Practice learning state is unavailable while rating",
                );
              }
              const scheduledReview = scheduleQuestionReview(
                lockedState,
                reviewRating,
                reviewedOn,
                lockedProgress.reviews,
              ).review;
              const attemptId = coachAttemptIds[current.id];
              const needsRepair =
                scheduledReview.rating === "again" ||
                scheduledReview.rating === "hard";
              return {
                ...scheduledReview,
                ...(needsRepair
                  ? { repairPendingAt: occurredAtIso }
                  : {}),
                ...(account && attemptId && needsRepair
                  ? { coachAttemptId: attemptId }
                  : {}),
              };
            },
          },
        );
        persistedReview = result.review;
        reviewWasRecorded = result.status === "recorded";
      } catch {
        setSyncStatus("error");
        return;
      }
      if (reviewWasRecorded) {
        const updateQueueAfterReview = (queue: RecallRepairQueue) => {
          let next = advanceRecallRepairQueue(
            reconcileRecallRepairQueue(
              queue,
              validRepairQuestions,
            ),
          );
          if (
            persistedReview.rating === "again" ||
            persistedReview.rating === "hard"
          ) {
            next = enqueueRecallRepair(next, {
              questionId: current.id,
              questionVersion: current.version,
              sourceHash: current.sourceHash,
              historyResetToken:
                persistedReview.historyResetToken ?? null,
              rating: persistedReview.rating,
              now: occurredAtIso,
            });
          }
          return next;
        };
        setRepairQueue(updateQueueAfterReview);
        try {
          const queue = await updateRecallRepairQueueLocked(
            accountId,
            updateQueueAfterReview,
          );
          setRepairQueue(queue);
          if (persistedReview.repairPendingAt) {
            await acknowledgePracticeRepairSnapshotLocked(
              accountId,
              {
                questionId: persistedReview.questionId,
                reviewedOn: persistedReview.reviewedOn,
                repairPendingAt: persistedReview.repairPendingAt,
              },
            );
          }
        } catch {
          // The progress marker remains durable so a later load can finish
          // this queue write without losing the failed review.
        }
      }
      if (account) {
        void syncReviews([persistedReview]);
      }
      if (
        ratingStillOwnsSession() &&
        isCustomStudyQuestion &&
        customRemainingIds.length <= 1
      ) {
        setCustomStudyIds(null);
        setCustomStudyNotice(practiceT("customStudy.completed"));
      }
      if (
        ratingStillOwnsSession() &&
        isFocusActive &&
        focusSession
      ) {
        const nextSession = completeFocusSessionQuestion(
          focusSession,
          current.id,
        );
        const sessionForTab = await persistFocusSessionIfCurrent(
          focusSession,
          nextSession,
        );
        if (ratingStillOwnsSession()) {
          setFocusSession(sessionForTab);

          const nextQuestion = sessionForTab.remainingQuestions[0];
          if (sessionForTab.status === "active" && nextQuestion) {
            setRequestedDeck(nextQuestion.deckId);
            setSelectedDeck(nextQuestion.deckId);
            const url = new URL(window.location.href);
            url.searchParams.set("deck", nextQuestion.deckId);
            window.history.replaceState(null, "", url);
          }
        }
      }
      if (ratingStillOwnsSession()) {
        setSelectedQuestionId(null);
        clearRecordedAttemptEvidence(lockedQuestionId);
        clearStudySessionState();
      }
    } finally {
      window.setTimeout(() => {
        reviewCompletionLocksRef.current.delete(lockedQuestionId);
      }, Math.max(0, releaseAfter - Date.now()));
    }
  }

  function advanceLessonCheck() {
    if (!current || !isLessonCheckQuestion || !hasAnswered) return;
    const completedQuestionId = current.id;
    setLessonCheckCompletedIds((completedIds) =>
      completeLessonCheckQuestion(completedIds, completedQuestionId),
    );
    setSelectedQuestionId(null);
    clearRecordedAttemptEvidence(completedQuestionId);
    clearStudySessionState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCustomStudy(filters: CustomStudyFilters) {
    const ids = buildCustomStudyQueue(
      deckQuestions,
      learningStates,
      today,
      filters,
    );
    if (!ids.length) {
      setCustomStudyNotice(practiceT("customStudy.empty"));
      return;
    }
    setDistractionFreeMode(false);
    clearStudySessionState();
    setSelectedQuestionId(null);
    setCustomStudyIds(ids);
    setCustomStudyNotice(practiceT("customStudy.created", { count: ids.length }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showRandomQuestion() {
    if (!randomCandidates.length) return;
    const next = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
    setDistractionFreeMode(false);
    clearStudySessionState();
    setCustomStudyIds(null);
    setSelectedQuestionId(next.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enterDistractionFreeMode() {
    if (!current) return;
    setDistractionFreeMode(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById("practice-question")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function pauseFocusSprint() {
    window.location.assign(focusReturnHref ?? "/practice");
  }

  async function cancelFocusSprint() {
    try {
      if (
        !requestedFocusId ||
        !focusSession
      ) {
        setFocusNotice(
          practiceT("notice.focusCancelElsewhere"),
        );
        return;
      }
      const result = await compareAndSetFocusSessionSnapshotLocked(
        accountId,
        focusSession,
        null,
      );
      if (!result.applied) {
        const latest = result.session;
        if (latest?.sessionId === requestedFocusId) {
          setFocusSession(latest);
          const storedHead = latest.remainingQuestions[0];
          if (latest.status === "active" && storedHead) {
            setRequestedDeck(storedHead.deckId);
            setSelectedDeck(storedHead.deckId);
            const url = new URL(window.location.href);
            url.searchParams.set("deck", storedHead.deckId);
            window.history.replaceState(null, "", url);
          }
        }
        setFocusNotice(
          practiceT("notice.focusCancelElsewhere"),
        );
        return;
      }
      window.location.assign(focusReturnHref ?? "/practice");
    } catch {
      setFocusNotice(
        practiceT("notice.focusDeleteFailed"),
      );
    }
  }

  function toggleReferenceAnswer() {
    if (!current) return;
    const willReveal = !revealed.has(current.id);
    scrollToReferenceAnswerWhenAvailable.current = willReveal;
    scrollToRatingWhenAvailable.current = false;
    if (willReveal) {
      setAnswerRevealUsedByQuestion((used) => {
        if (used.has(current.id)) return used;
        const next = new Set(used);
        next.add(current.id);
        return next;
      });
    }
    toggleSet(setRevealed, current.id);
  }

  function handleRatingSectionRef(node: HTMLDivElement | null) {
    if (!node || !scrollToRatingWhenAvailable.current) return;
    scrollToRatingWhenAvailable.current = false;
    window.requestAnimationFrame(() =>
      node.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function handleReferenceAnswerRef(node: HTMLDivElement | null) {
    if (!node || !scrollToReferenceAnswerWhenAvailable.current) return;
    scrollToReferenceAnswerWhenAvailable.current = false;
    window.requestAnimationFrame(() =>
      node.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function handleCoachFeedbackSectionRef(node: HTMLDivElement | null) {
    if (!node || !scrollToCoachFeedbackWhenAvailable.current) return;
    scrollToCoachFeedbackWhenAvailable.current = false;
    window.requestAnimationFrame(() =>
      node.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function clearRecordedAttemptEvidence(questionId: string) {
    setAnswerRevealUsedByQuestion((used) =>
      withoutSetValue(used, questionId),
    );
    setHintUsedByQuestion((used) =>
      withoutSetValue(used, questionId),
    );
    setCoachFeedbackUsedByQuestion((used) =>
      withoutSetValue(used, questionId),
    );
  }

  async function syncReviews(reviews: Review[]) {
    setSyncStatus("syncing");
    try {
      const storedSnapshot = getProgressSnapshot(accountId);
      const storedProgress = parseProgress(
        storedSnapshot === EMPTY_SNAPSHOT ? null : storedSnapshot,
      );
      const reviewsByKey = new Map(
        [
          ...reviewsForCloudSync(storedProgress.reviews),
          ...reviews,
        ].map((review) => [
          `${review.questionId}:${review.reviewedOn}`,
          review,
        ]),
      );
      const partitionedReviews =
        partitionReviewsForCurrentQuestions(
          [...reviewsByKey.values()],
          availableQuestions.map((question) => ({
            id: question.id,
            version: question.version,
            sourceHash: question.sourceHash,
          })),
        );
      const localDiscardedResolutions =
        partitionedReviews.discarded.flatMap(
          ({ review }): MistakeCaptureResolution[] =>
            review.coachAttemptId === undefined
              ? []
              : [
                  {
                    coachAttemptId: review.coachAttemptId,
                    questionId: review.questionId,
                    reviewedOn: review.reviewedOn,
                    rating: review.rating,
                    disposition: "discarded",
                  },
                ],
        );
      const localDiscardedReviews =
        partitionedReviews.discarded.map(({ review }) =>
          practiceReviewDiscardIdentity(review),
        );
      const outboundReviews = partitionedReviews.accepted;
      const response = await fetch("/api/progress/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: outboundReviews }),
      });
      if (!response.ok) throw new Error("Cloud sync failed");
      const payload = (await response.json()) as ProgressSyncPayload;
      const captureResolutions = [
        ...localDiscardedResolutions,
        ...parseMistakeCaptureResolutions(
          payload.mistakeCaptureResolutions,
        ),
      ];
      await mutatePracticeProgressSnapshotLocked(
        accountId,
        (current) =>
          mergeProgressAfterCloudSync(
            {
              ...current,
              reviews: filterReviewsForLearningHistory(
                current.reviews,
                payload.questionStates,
              ),
            },
            payload.progress,
            captureResolutions,
            [
              ...localDiscardedReviews,
              ...parseDiscardedPracticeReviews(
                payload.discardedReviews,
              ),
            ],
          ),
      );
      setCloudProgress(payload.progress);
      setCloudQuestionStates(payload.questionStates);
      const authoritativeRepairs =
        authoritativeRecallRepairReviews(
          payload.progress,
          outboundReviews.filter(
            (review) => review.reviewedOn === localDateKey(),
          ),
          new Date().toISOString(),
        );
      if (authoritativeRepairs.length) {
        const alignRepairQueue = (queue: RecallRepairQueue) =>
          alignRecallRepairQueueWithAuthoritativeReviews(
            queue,
            authoritativeRepairs,
          );
        setRepairQueue(alignRepairQueue);
        try {
          setRepairQueue(
            await updateRecallRepairQueueLocked(
              accountId,
              alignRepairQueue,
            ),
          );
        } catch {
          // The authoritative in-tab queue remains usable without storage.
        }
      }
      handleMistakeSyncPayload(payload);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    }
  }

  async function mutateCurrentQuestion(
    action: "edit" | "archive",
    content?: EditableQuestionContent,
  ) {
    if (!current || !canManageQuestionBank || questionAdminSaving) return;
    const questionId = current.id;
    setQuestionAdminSaving(true);
    setQuestionAdminError(null);
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, questionId, content }),
      });
      const payload = (await response.json()) as {
        question?: ContentQuestion;
        error?: string;
      };
      if (!response.ok || !payload.question) {
        throw new Error(payload.error || practiceT("notice.cardSaveFailed"));
      }

      if (action === "archive") {
        setAvailableQuestions((items) =>
          items.filter((item) => item.id !== questionId),
        );
        setPendingReview((items) =>
          items.filter((item) => item.id !== questionId),
        );
        setSelectedQuestionId((selected) =>
          selected === questionId ? null : selected,
        );
        deleteSavedItem(`question:${questionId}`);
        clearStudySessionState();
      } else {
        const nextQuestion: PracticeQuestion = {
          ...current,
          ...payload.question,
          code: payload.question.code,
        };
        // An edit invalidates its approval. Remove the old revision from this
        // study session immediately; the replacement is visible only after it
        // returns through the normal review queue.
        setAvailableQuestions((items) =>
          items.filter((item) => item.id !== questionId),
        );
        setPendingReview((items) => {
          const withoutCurrent = items.filter((item) => item.id !== questionId);
          return [...withoutCurrent, nextQuestion];
        });
        setSelectedQuestionId((selected) =>
          selected === questionId ? null : selected,
        );
        invalidateCoachRequest(questionId);
        clearCoachEvaluation(questionId);
        clearRecordedAttemptEvidence(questionId);
        setAnswers((items) => omitRecordKey(items, questionId));
        setCodeAnswers((items) => omitRecordKey(items, questionId));
        setRevealed((items) => withoutSetValue(items, questionId));
        setHints((items) => withoutSetValue(items, questionId));
        setVisibleSources((items) => withoutSetValue(items, questionId));
        clearStudySessionState();
      }
      setQuestionAdminEditing(false);
    } catch (error) {
      setQuestionAdminError(
        error instanceof Error
          ? error.message
          : practiceT("notice.cardSaveFailed"),
      );
    } finally {
      setQuestionAdminSaving(false);
    }
  }

  async function askCoach() {
    if (!current) return;
    const questionId = current.id;
    if (coachRequestTokensRef.current[questionId]) return;
    const answer = currentCandidateAnswer;
    const rescueRetryBeforeRequest =
      rescueRetryByQuestion[questionId];

    const requestToken = crypto.randomUUID();
    coachRequestTokensRef.current[questionId] = requestToken;
    setCoachLoading(questionId);
    setCoachErrors((errors) => ({ ...errors, [questionId]: "" }));

    try {
      const idempotencyKey = await coachEvaluationIdempotencyKey({
        questionId,
        questionVersion: current.version,
        sourceRevision,
        candidateAnswer: answer,
        responseLocale: locale,
      });
      setCoachIdempotencyKeys((keys) => ({
        ...keys,
        [questionId]: idempotencyKey,
      }));
      const response = await fetch("/api/coach/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answer,
          idempotencyKey,
          responseLocale: locale,
        }),
      });
      const payload = (await response.json()) as CoachApiPayload & {
        feedback?: CoachFeedback;
        model?: string;
        attemptId?: number | null;
      };
      applyPublicAiQuota(payload);

      if (
        coachRequestTokensRef.current[questionId] !== requestToken
      ) {
        if (payload.aiDailyBudget) {
          setAiDailyBudget((current) =>
            mergeAiDailyBudgetSnapshot(
              current,
              payload.aiDailyBudget!,
            ),
          );
        }
        return;
      }

      if (!response.ok || !payload.feedback) {
        throw new Error(
          publicAiCoachErrorMessage(payload, locale, practiceT) ||
            payload.error ||
            practiceT("notice.coachFailed"),
        );
      }

      const nextRescueRetry = isLessonCheck
        ? undefined
        : resolveRescueRetryAfterCoach({
            previous: rescueRetryBeforeRequest,
            candidateAnswer: answer,
            score: payload.feedback.score,
          });
      scrollToRatingWhenAvailable.current = !nextRescueRetry;
      scrollToCoachFeedbackWhenAvailable.current =
        Boolean(nextRescueRetry);
      setRescueRetryByQuestion((states) =>
        nextRescueRetry
          ? { ...states, [questionId]: nextRescueRetry }
          : omitRecordKey(states, questionId),
      );
      setCoachFeedback((feedback) => ({
        ...feedback,
        [questionId]: payload.feedback!,
      }));
      setCoachFeedbackUsedByQuestion((used) => {
        if (used.has(questionId)) return used;
        const next = new Set(used);
        next.add(questionId);
        return next;
      });
      setCoachModels((models) => ({
        ...models,
        [questionId]: payload.model || "OpenAI",
      }));
      setCoachAnswers((evaluatedAnswers) => ({
        ...evaluatedAnswers,
        [questionId]: answer,
      }));
      if (payload.attemptId) {
        setCoachAttemptIds((ids) => ({
          ...ids,
          [questionId]: payload.attemptId!,
        }));
      }
      if (payload.aiDailyBudget) {
        setAiDailyBudget((current) =>
          mergeAiDailyBudgetSnapshot(current, payload.aiDailyBudget!),
        );
      }
      if (payload.aiUsageRecorded === false) {
        setCoachErrors((errors) => ({
          ...errors,
          [questionId]:
            practiceT("notice.coachUsageFailed"),
        }));
      }
      setFollowUpChats((chats) => ({ ...chats, [questionId]: [] }));
      setDeepDiveOpen((open) => withoutSetValue(open, questionId));
      setDeepDiveAnswers((answers) => omitRecordKey(answers, questionId));
      setDeepDiveFeedback((feedback) => omitRecordKey(feedback, questionId));
      setDeepDiveModels((models) => omitRecordKey(models, questionId));
    } catch (error) {
      if (
        coachRequestTokensRef.current[questionId] !== requestToken
      ) {
        return;
      }
      setCoachErrors((errors) => ({
        ...errors,
        [questionId]:
          error instanceof Error ? error.message : practiceT("notice.coachFailed"),
      }));
    } finally {
      if (
        coachRequestTokensRef.current[questionId] === requestToken
      ) {
        delete coachRequestTokensRef.current[questionId];
        setCoachLoading((loading) =>
          loading === questionId ? null : loading,
        );
      }
    }
  }

  async function clarifyCurrentQuestion() {
    if (!current || !canManageQuestionBank) return;
    const questionId = current.id;
    if (clarificationRequestTokensRef.current[questionId]) return;

    const requestToken = crypto.randomUUID();
    clarificationRequestTokensRef.current[questionId] = requestToken;
    setQuestionClarificationLoading(questionId);
    setQuestionClarificationErrors((errors) => ({
      ...errors,
      [questionId]: "",
    }));

    try {
      const response = await fetch("/api/coach/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, responseLocale: locale }),
      });
      const payload = (await response.json()) as CoachApiPayload & {
        clarification?: QuestionClarification;
        model?: string;
      };
      if (clarificationRequestTokensRef.current[questionId] !== requestToken) {
        if (payload.aiDailyBudget) {
          setAiDailyBudget((currentBudget) =>
            mergeAiDailyBudgetSnapshot(
              currentBudget,
              payload.aiDailyBudget!,
            ),
          );
        }
        return;
      }
      if (!response.ok || !payload.clarification) {
        throw new Error(
          payload.error || practiceT("notice.clarifyFailed"),
        );
      }

      setQuestionClarifications((clarifications) => ({
        ...clarifications,
        [questionId]: payload.clarification!,
      }));
      setQuestionClarificationModels((models) => ({
        ...models,
        [questionId]: payload.model || "Luna",
      }));
      if (payload.aiDailyBudget) {
        setAiDailyBudget((currentBudget) =>
          mergeAiDailyBudgetSnapshot(currentBudget, payload.aiDailyBudget!),
        );
      }
      if (payload.aiUsageRecorded === false) {
        setQuestionClarificationErrors((errors) => ({
          ...errors,
          [questionId]:
            practiceT("notice.clarifyUsageFailed"),
        }));
      }
    } catch (error) {
      if (clarificationRequestTokensRef.current[questionId] === requestToken) {
        setQuestionClarificationErrors((errors) => ({
          ...errors,
          [questionId]:
            error instanceof Error
              ? error.message
              : practiceT("notice.clarifyFailed"),
        }));
      }
    } finally {
      if (clarificationRequestTokensRef.current[questionId] === requestToken) {
        delete clarificationRequestTokensRef.current[questionId];
        setQuestionClarificationLoading((loading) =>
          loading === questionId ? null : loading,
        );
      }
    }
  }

  async function askCoachFollowUp(contentOverride?: string) {
    if (!current || !coachFeedback[current.id]) return;
    const questionId = current.id;
    const sessionGeneration = studySessionGenerationRef.current;
    const content =
      contentOverride?.trim() ?? followUpInputs[current.id]?.trim() ?? "";
    const existingMessages = followUpChats[current.id] ?? [];
    if (!content || existingMessages.length >= 8) return;

    const requestMessages = [
      ...existingMessages.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      })),
      { role: "user" as const, content },
    ];
    setFollowUpLoading(questionId);
    setFollowUpErrors((errors) => ({ ...errors, [questionId]: "" }));

    try {
      const idempotencyKey = await coachFollowUpIdempotencyKey({
        questionId,
        questionVersion: current.version,
        sourceRevision,
        candidateAnswer: coachAnswers[questionId] ?? "",
        feedback: coachFeedback[questionId],
        messages: requestMessages,
        responseLocale: locale,
      });
      const response = await fetch("/api/coach/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          candidateAnswer: coachAnswers[questionId] ?? "",
          feedback: coachFeedback[questionId],
          messages: requestMessages,
          idempotencyKey,
          responseLocale: locale,
        }),
      });
      const payload = (await response.json()) as CoachApiPayload & {
        reply?: CoachFollowUpResponse;
        model?: string;
      };
      applyPublicAiQuota(payload);
      if (studySessionGenerationRef.current !== sessionGeneration) {
        if (payload.aiDailyBudget) {
          setAiDailyBudget((current) =>
            mergeAiDailyBudgetSnapshot(
              current,
              payload.aiDailyBudget!,
            ),
          );
        }
        return;
      }
      if (!response.ok || !payload.reply) {
        throw new Error(
          publicAiCoachErrorMessage(payload, locale, practiceT) ||
            payload.error ||
            practiceT("notice.followUpFailed"),
        );
      }

      setFollowUpChats((chats) => ({
        ...chats,
        [questionId]: [
          ...(chats[questionId] ?? []),
          { role: "user", content },
          {
            role: "assistant",
            content: payload.reply!.answer,
            sourceSectionIds: payload.reply!.sourceSectionIds,
            checkQuestion: payload.reply!.checkQuestion,
            model: payload.model,
          },
        ],
      }));
      setFollowUpInputs((inputs) => ({ ...inputs, [questionId]: "" }));
      if (payload.aiDailyBudget) {
        setAiDailyBudget((current) =>
          mergeAiDailyBudgetSnapshot(current, payload.aiDailyBudget!),
        );
      }
      if (payload.aiUsageRecorded === false) {
        setFollowUpErrors((errors) => ({
          ...errors,
          [questionId]: practiceT("notice.aiUsageFailed"),
        }));
      }
    } catch (error) {
      if (studySessionGenerationRef.current !== sessionGeneration) {
        return;
      }
      setFollowUpErrors((errors) => ({
        ...errors,
        [questionId]:
          error instanceof Error ? error.message : practiceT("notice.followUpFailed"),
      }));
    } finally {
      if (studySessionGenerationRef.current === sessionGeneration) {
        setFollowUpLoading((loading) =>
          loading === questionId ? null : loading,
        );
      }
    }
  }

  async function submitDeepDiveAnswer() {
    if (!current || !coachFeedback[current.id]) return;
    const questionId = current.id;
    const sessionGeneration = studySessionGenerationRef.current;
    const answer = deepDiveAnswers[questionId]?.trim() ?? "";
    const followUpQuestion = coachFeedback[questionId].followUpQuestion;
    const answerContext = answer
      ? locale === "en"
        ? `My answer: ${answer}\n\nReview it as an interviewer: identify what is correct, missing, or wrong, then explain the topic more deeply.`
        : `Câu trả lời tôi tự làm: ${answer}\n\nHãy nhận xét câu trả lời như người phỏng vấn: chỉ ra phần đúng, phần thiếu hoặc sai, rồi mới giải thích để tôi hiểu sâu hơn.`
      : locale === "en"
        ? "I left this blank because I do not know how to answer yet. Teach it from first principles and give me a concise interview-ready example answer."
        : "Tôi để trống vì chưa biết cách trả lời. Hãy dạy tôi từ đầu, giải thích từng ý và đưa ra một câu trả lời phỏng vấn mẫu dễ học.";

    setDeepDiveLoading(questionId);
    setDeepDiveErrors((errors) => ({ ...errors, [questionId]: "" }));
    try {
      const requestMessages = [
        {
          role: "user" as const,
          content: locale === "en"
            ? `This is the extended interview question: ${followUpQuestion}\n\n${answerContext}`
            : `Đây là câu hỏi phỏng vấn mở rộng: ${followUpQuestion}\n\n${answerContext}`,
        },
      ];
      const idempotencyKey = await coachFollowUpIdempotencyKey({
        questionId,
        questionVersion: current.version,
        sourceRevision,
        candidateAnswer: coachAnswers[questionId] ?? "",
        feedback: coachFeedback[questionId],
        messages: requestMessages,
        responseLocale: locale,
      });
      const response = await fetch("/api/coach/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          candidateAnswer: coachAnswers[questionId] ?? "",
          feedback: coachFeedback[questionId],
          messages: requestMessages,
          idempotencyKey,
          responseLocale: locale,
        }),
      });
      const payload = (await response.json()) as CoachApiPayload & {
        reply?: CoachFollowUpResponse;
        model?: string;
      };
      applyPublicAiQuota(payload);
      if (studySessionGenerationRef.current !== sessionGeneration) {
        if (payload.aiDailyBudget) {
          setAiDailyBudget((current) =>
            mergeAiDailyBudgetSnapshot(
              current,
              payload.aiDailyBudget!,
            ),
          );
        }
        return;
      }
      if (!response.ok || !payload.reply) {
        throw new Error(
          publicAiCoachErrorMessage(payload, locale, practiceT) ||
            payload.error ||
            practiceT("notice.deepDiveFailed"),
        );
      }
      setDeepDiveFeedback((feedback) => ({
        ...feedback,
        [questionId]: payload.reply!,
      }));
      setDeepDiveModels((models) => ({
        ...models,
        [questionId]: payload.model || "OpenAI",
      }));
      if (payload.aiDailyBudget) {
        setAiDailyBudget((current) =>
          mergeAiDailyBudgetSnapshot(current, payload.aiDailyBudget!),
        );
      }
      if (payload.aiUsageRecorded === false) {
        setDeepDiveErrors((errors) => ({
          ...errors,
          [questionId]: practiceT("notice.aiUsageFailed"),
        }));
      }
    } catch (error) {
      if (studySessionGenerationRef.current !== sessionGeneration) {
        return;
      }
      setDeepDiveErrors((errors) => ({
        ...errors,
        [questionId]:
          error instanceof Error ? error.message : practiceT("notice.deepDiveFailed"),
      }));
    } finally {
      if (studySessionGenerationRef.current === sessionGeneration) {
        setDeepDiveLoading((loading) =>
          loading === questionId ? null : loading,
        );
      }
    }
  }

  function toggleSavedItem(item: Omit<SavedItem, "savedAt">) {
    setSavedItems((items) => {
      const exists = items.some((saved) => saved.id === item.id);
      const next = exists
        ? removeSavedItem(items, item.id)
        : upsertSavedItem(items, {
            ...item,
            savedAt: new Date().toISOString(),
          });
      try {
        window.localStorage.setItem(savedItemsKey, JSON.stringify(next));
      } catch {
        // Saving remains optional when browser storage is unavailable.
      }
      return next;
    });
  }

  function isSaved(itemId: string) {
    return savedItems.some((item) => item.id === itemId);
  }

  function deleteSavedItem(itemId: string) {
    setSavedItems((items) => {
      const next = removeSavedItem(items, itemId);
      try {
        window.localStorage.setItem(savedItemsKey, JSON.stringify(next));
      } catch {
        // Saved library remains usable in memory for this page view.
      }
      return next;
    });
  }

  function updateAnswer(questionId: string, value: string) {
    invalidateCoachRequest(questionId);
    setRescueRetryByQuestion((states) => {
      const state = states[questionId];
      return state
        ? { ...states, [questionId]: beginRescueRetry(state) }
        : states;
    });
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
    clearCoachEvaluation(questionId);
  }

  function updateCodeAnswer(questionId: string, value: string) {
    invalidateCoachRequest(questionId);
    setRescueRetryByQuestion((states) => {
      const state = states[questionId];
      return state
        ? { ...states, [questionId]: beginRescueRetry(state) }
        : states;
    });
    setCodeAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
    clearCoachEvaluation(questionId);
  }

  function startRescueRetry(questionId: string) {
    const focusTextAnswer =
      current?.id === questionId && !requiresCodeAnswer(current);
    invalidateCoachRequest(questionId);
    setRescueRetryByQuestion((states) => ({
      ...states,
      [questionId]: beginRescueRetry(states[questionId]),
    }));
    setAnswers((values) => omitRecordKey(values, questionId));
    setCodeAnswers((values) => omitRecordKey(values, questionId));
    setRevealed((values) => withoutSetValue(values, questionId));
    setHints((values) => withoutSetValue(values, questionId));
    setVisibleSources((values) => withoutSetValue(values, questionId));
    clearCoachEvaluation(questionId);
    window.requestAnimationFrame(() => {
      document
        .getElementById("practice-answer-area")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusTextAnswer) {
        document.getElementById("candidate-answer")?.focus();
      }
    });
  }

  function clearCoachEvaluation(questionId: string) {
    setCoachFeedback((values) => omitRecordKey(values, questionId));
    setCoachModels((values) => omitRecordKey(values, questionId));
    setCoachAnswers((values) => omitRecordKey(values, questionId));
    setCoachAttemptIds((values) => omitRecordKey(values, questionId));
    setCoachIdempotencyKeys((values) => omitRecordKey(values, questionId));
    setCoachErrors((values) => omitRecordKey(values, questionId));
    setFollowUpInputs((values) => omitRecordKey(values, questionId));
    setFollowUpChats((values) => omitRecordKey(values, questionId));
    setFollowUpErrors((values) => omitRecordKey(values, questionId));
    setFollowUpLoading((loading) =>
      loading === questionId ? null : loading,
    );
    setDeepDiveOpen((values) => withoutSetValue(values, questionId));
    setDeepDiveAnswers((values) => omitRecordKey(values, questionId));
    setDeepDiveFeedback((values) => omitRecordKey(values, questionId));
    setDeepDiveModels((values) => omitRecordKey(values, questionId));
    setDeepDiveErrors((values) => omitRecordKey(values, questionId));
    setDeepDiveLoading((loading) =>
      loading === questionId ? null : loading,
    );
  }

  function toggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) {
    setter((currentSet) => {
      const next = new Set(currentSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function invalidateCoachRequest(questionId: string) {
    studySessionGenerationRef.current += 1;
    delete coachRequestTokensRef.current[questionId];
    setCoachLoading((loading) =>
      loading === questionId ? null : loading,
    );
  }

  function omitRecordKey<T>(values: Record<string, T>, key: string) {
    return Object.fromEntries(
      Object.entries(values).filter(([entryKey]) => entryKey !== key),
    ) as Record<string, T>;
  }

  function withoutSetValue(values: Set<string>, value: string) {
    const next = new Set(values);
    next.delete(value);
    return next;
  }

  if (hasFocusRequest && focusHydrationStatus === "loading") {
    return <LoadingScreen />;
  }

  if (
    hasFocusRequest &&
    (focusHydrationStatus === "missing" ||
      focusHydrationStatus === "storage_error" ||
      (focusHydrationStatus === "ready" &&
        focusSession?.status === "active" &&
        !focusQuestion))
  ) {
    return (
      <FocusUnavailableScreen
        storageError={focusHydrationStatus === "storage_error"}
      />
    );
  }

  if (
    hasFocusRequest &&
    focusHydrationStatus === "ready" &&
    focusSession?.status === "completed"
  ) {
    return (
      <FocusCompletionScreen
        completedCount={focusSession.completedQuestions.length}
        staleDroppedCount={focusStaleDroppedCount}
        notice={focusNotice}
        returnHref={focusReturnHref}
      />
    );
  }

  if (isLessonCheck && !sessionHydrated) {
    return <LoadingScreen />;
  }

  if (initialLessonCheck && lessonCheckIds.length === 0) {
    return (
      <LessonCheckEmptyScreen
        lessonId={initialLessonCheck.lessonId}
        lessonTitle={initialLessonCheck.lessonTitle}
      />
    );
  }

  if (
    initialLessonCheck &&
    lessonCheckIds.length > 0 &&
    lessonCheckRemainingIds.length === 0
  ) {
    return (
      <LessonCheckCompletionScreen
        completedCount={lessonCheckIds.length}
        lessonId={initialLessonCheck.lessonId}
        lessonTitle={initialLessonCheck.lessonTitle}
      />
    );
  }

  return (
    <main
      data-practice-focus-mode={distractionFreeMode ? "true" : undefined}
      className="min-h-screen px-4 py-5 sm:px-7 lg:px-10"
    >
      <div className="ui-page-width">
        {distractionFreeMode && current ? (
          <PracticeFocusBar
            questionPosition={
              isLessonCheck
                ? `${lessonCheckIds.length - lessonCheckRemainingIds.length + 1}/${lessonCheckIds.length}`
                : isFocusActive
                  ? `${focusPosition}/${focusQueueTotal}`
                  : isCustomStudyQuestion && customStudyIds
                    ? `${customStudyIds.length - customRemainingIds.length + 1}/${customStudyIds.length}`
                    : isRandomQuestion
                      ? practiceT("question.outsideSchedule")
                      : `${completedToday + 1}/${dailyTotal || 1}`
            }
            answerRevealed={revealed.has(current.id)}
            onExit={() => setDistractionFreeMode(false)}
            onToggleAnswer={toggleReferenceAnswer}
          />
        ) : (
        <header className="ui-app-header px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={common("homeAria")}
              title={common("homeAria")}
              className="size-10 overflow-hidden rounded-xl focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
            >
              <BrandMark size="sm" />
            </Link>
            <div>
              <p className="font-semibold tracking-[-0.025em]">cppinterview</p>
              <p className="hidden text-xs text-[color:var(--ink-muted)] sm:block">
                {isLessonCheck && initialLessonCheck
                  ? initialLessonCheck.lessonTitle
                  : `${practiceT("workspaceTagline")} · ${practiceT("approvedCards", { count: deckQuestions.length })}`}
              </p>
            </div>
            {isFocusActive ? (
              <span className="hidden rounded-full border border-[color:var(--success)]/20 bg-[#e2f5ec] px-3 py-1.5 font-mono text-[11px] font-bold text-[color:var(--success)] sm:inline-flex">
                {practiceT("focusActive.badge")}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 text-sm">
            <LanguageSwitcher compact />
            {isLessonCheck ? (
              <span className="rounded-xl border border-[#0f3a69]/15 bg-white/65 px-3 py-2 font-mono text-xs font-bold text-[#285f86]">
                {lessonCheckIds.length - lessonCheckRemainingIds.length}/
                {lessonCheckIds.length}
              </span>
            ) : (
              <ProgressSummaryControl
                icon="✓"
                streak={streak}
                value={`${completedToday}/${dailyTotal || 1}`}
              />
            )}
            <div className="hidden items-center gap-2 sm:flex">
              {account && aiBudgetCacheHydrated && aiDailyBudget ? (
                <AiBudgetPill budget={aiDailyBudget} />
              ) : usesPublicAi ? (
                <PublicAiQuotaPill quota={publicAiQuota} />
              ) : null}
              {!isFocusActive && !isLessonCheck ? (
                <SavedItemsControl
                  items={savedItems}
                  onRemove={deleteSavedItem}
                  onOpenQuestion={(questionId) => {
                    const question = sessionQuestions.find(
                      (item) => item.id === questionId,
                    );
                    if (!question) return;
                    const nextDeck = question.taxonomy.deckId;
                    clearStudySessionState();
                    setRequestedDeck(nextDeck);
                    setSelectedDeck(nextDeck);
                    setSelectedQuestionId(questionId);
                    const url = new URL(window.location.href);
                    url.searchParams.set("deck", nextDeck);
                    window.history.replaceState(null, "", url);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ) : null}
            </div>
            <AccountControl
              account={account}
              canManageQuestionBank={canManageQuestionBank}
              cloudEnabled={cloudEnabled}
              guestMode={guestMode}
              syncStatus={syncStatus}
              selectedDeck={requestedDeck}
            />
          </div>
          </div>
          <nav
            aria-label={common("nav.primaryAria")}
            className="mt-4 hidden w-full grid-cols-4 gap-2 border-t border-[color:var(--border-subtle)] pt-3 lg:grid"
          >
            <WorkspaceNavLink href="/practice" active>
              {common("nav.practice")}
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/mock-interview">
              {common("nav.interview")}
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/learn">{common("nav.library")}</WorkspaceNavLink>
            <WorkspaceNavLink href={`/stats?deck=${requestedDeck}`}>
              {practiceT("stats")}
            </WorkspaceNavLink>
          </nav>
        </header>
        )}

        {authNotice ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#a65c0e]/25 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
          >
            {authNotice}
          </p>
        ) : null}

        {canManageQuestionBank && questionAdminError && !questionAdminEditing ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#a65c0e]/25 bg-[#fff1f1] px-4 py-3 text-sm text-[#c43d3d]"
          >
            {questionAdminError}
          </p>
        ) : null}

        {mistakeNotice ? (
          <div
            role="status"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#285f86]/25 bg-[#e6f8f5] px-4 py-3 text-sm text-[#16865a]"
          >
            <span>{mistakeNotice}</span>
            <NextLink
              href="/admin#mistake-inbox"
              className="font-bold underline"
            >
              {practiceT("notice.openMistakes")}
            </NextLink>
          </div>
        ) : null}

        {!isFocusActive && !isLessonCheck && !distractionFreeMode ? (
          <TodayWorkspace
            completedToday={completedToday}
            dailyTotal={dailyTotal}
            remainingCount={remainingIds.length}
            streak={streak}
            hasCurrentQuestion={Boolean(current)}
            onPrimaryAction={() => {
              if (current) {
                document
                  .getElementById("practice-question")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              showRandomQuestion();
            }}
          />
        ) : null}

        {isLessonCheck && initialLessonCheck && !distractionFreeMode ? (
          <section className="mt-6 rounded-[1.25rem] border border-[#285f86]/20 bg-[#e6f8f5] p-5 shadow-sm sm:p-6">
            <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
              {practiceT("lessonCheck.eyebrow")}
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#0f3a69] sm:text-2xl">
              {initialLessonCheck.lessonTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526276]">
              {practiceT("lessonCheck.description", {
                count: lessonCheckIds.length,
              })}
            </p>
          </section>
        ) : null}

        {!distractionFreeMode && isFocusActive && focusSession ? (
          <section className="mt-6 rounded-[1.25rem] border border-[#285f86]/20 bg-[#e6f8f5] p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
                  {practiceT("focusActive.eyebrow")}
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#0f3a69]">
                  {practiceT("focusActive.position", {
                    position: focusPosition,
                    total: focusQueueTotal,
                  })}
                </h1>
                <p className="mt-1 text-sm text-[#526276]">
                  {focusStep
                    ? `${practiceT(`focusActive.competency.${focusStep.competency}`)} · ${practiceT(`focusActive.reason.${focusStep.queueReason}`)}`
                    : practiceT("focusActive.defaultDescription")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pauseFocusSprint}
                  className="rounded-xl border border-[#285f86]/25 bg-white/70 px-4 py-2 text-sm font-bold text-[#285f86] transition hover:bg-white"
                >
                  {practiceT("focusActive.pause")}
                </button>
                <button
                  type="button"
                  onClick={cancelFocusSprint}
                  className="rounded-xl border border-[#a65c0e]/20 bg-[#fff1f1] px-4 py-2 text-sm font-bold text-[#c43d3d] transition hover:bg-[#f4d9cc]"
                >
                  {practiceT("focusActive.cancel")}
                </button>
              </div>
            </div>
            {focusStaleDroppedCount > 0 ? (
              <p className="mt-3 text-xs font-semibold text-[#8a5a20]">
                {practiceT("focusActive.stale", {
                  count: focusStaleDroppedCount,
                })}
              </p>
            ) : null}
            {focusNotice ? (
              <p
                className="mt-3 text-xs font-semibold text-[#c43d3d]"
                role="alert"
              >
                {focusNotice}
              </p>
            ) : null}
          </section>
        ) : !distractionFreeMode && !isLessonCheck ? (
          <CustomStudyPanel
            key={selectedDeck}
            activeCount={customRemainingIds.length}
            notice={customStudyNotice}
            onStart={startCustomStudy}
            onStop={() => {
              setCustomStudyIds(null);
              setCustomStudyNotice(practiceT("customStudy.stopped"));
            }}
          />
        ) : null}

        {!isFocusActive && !isLessonCheck && !distractionFreeMode && !current && selectedPendingReview.length ? (
          <section className="mt-7 rounded-[1.25rem] border border-[#a65c0e]/25 bg-[#fff4df] p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.15em] text-[#a65c0e] uppercase">
              {practiceT("reviewQueue.eyebrow")}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  {practiceT("reviewQueue.count", {
                    count: selectedPendingReview.length,
                  })}
                </h1>
                <p className="mt-1 text-sm text-[#526276]">
                  {practiceT("reviewQueue.description")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void approveAllPending()}
                disabled={approvalStatus === "saving"}
                className="rounded-2xl bg-[#a65c0e] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c43d3d] disabled:cursor-wait disabled:opacity-60"
              >
                {approvalStatus === "saving"
                  ? practiceT("reviewQueue.saving")
                  : practiceT("reviewQueue.approveAll")}
              </button>
            </div>
            {approvalStatus === "error" ? (
              <p className="mt-3 text-xs font-semibold text-[#c43d3d]">
                {practiceT("reviewQueue.error")}
              </p>
            ) : null}
          </section>
        ) : null}

        {!questionBankAvailable && !canManageQuestionBank ? (
          <QuestionBankUnavailableState />
        ) : current ? (
          <div
            className={
              distractionFreeMode || isLessonCheck
                ? "mx-auto max-w-4xl py-4 sm:py-6"
                : "grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-10"
            }
          >
            <section id="practice-question" className="scroll-mt-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#65e6d2] px-3 py-1 font-mono text-xs font-bold text-[#0f3a69]">
                    {isLessonCheck
                      ? practiceT("lessonCheck.questionBadge")
                      : isFocusActive
                      ? practiceT("question.focusSession")
                      : isCustomStudyQuestion
                      ? practiceT("question.customSession")
                      : isRandomQuestion
                      ? practiceT("question.random")
                      : completedToday === 0
                        ? practiceT("question.today")
                        : practiceT("question.due")}
                  </span>
                  <span className="font-mono text-xs text-[#64748b]">
                    {isLessonCheck
                      ? `${lessonCheckIds.length - lessonCheckRemainingIds.length + 1}/${lessonCheckIds.length}`
                      : isFocusActive
                      ? `${focusPosition}/${focusQueueTotal}`
                      : isCustomStudyQuestion && customStudyIds
                      ? `${customStudyIds.length - customRemainingIds.length + 1}/${customStudyIds.length}`
                      : isRandomQuestion
                      ? practiceT("question.outsideSchedule")
                      : `${completedToday + 1}/${dailyTotal}`}
                  </span>
                  {currentLearningState ? (
                    <span className="rounded-full border border-[#0f3a69]/15 bg-white/55 px-2.5 py-1 font-mono text-[10px] font-bold text-[#285f86] uppercase">
                      {learningStateLabels[currentLearningState.state]}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`flex flex-wrap items-center gap-3 ${
                    distractionFreeMode ? "hidden" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={enterDistractionFreeMode}
                    className="rounded-xl border border-[#285f86]/25 bg-[#eaf2f8] px-3 py-2 text-xs font-bold text-[#16865a] transition hover:-translate-y-0.5 hover:bg-[#e4f0df] focus:ring-4 focus:ring-[#65e6d2]/55 focus:outline-none"
                  >
                    {practiceT("question.focusMode")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSavedItem({
                        id: `question:${current.id}`,
                        kind: "question",
                        questionId: current.id,
                        title: current.lessonTitle,
                        content: displayQuestionPrompt(current),
                        context: current.code || current.sourcePath,
                      })
                    }
                    className="rounded-xl border border-[#0f3a69]/18 bg-white/65 px-3 py-2 text-xs font-bold text-[#285f86] transition hover:-translate-y-0.5 hover:bg-white focus:ring-4 focus:ring-[#65e6d2]/55 focus:outline-none"
                  >
                    {isSaved(`question:${current.id}`)
                      ? practiceT("question.saved")
                      : practiceT("question.save")}
                  </button>
                  {canManageQuestionBank && !isLessonCheck && !isFocusActive && !isRepairActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionAdminError(null);
                          setQuestionAdminEditing(true);
                        }}
                        className="rounded-xl border border-[#285f86]/30 bg-[#e6f8f5] px-3 py-2 text-xs font-bold text-[#16865a] transition hover:-translate-y-0.5 hover:bg-[#d7f7f2] focus:ring-4 focus:ring-[#65e6d2]/55 focus:outline-none"
                      >
                        {practiceT("question.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveConfirmationOpen(true)}
                        disabled={questionAdminSaving}
                        className="rounded-xl border border-[#a65c0e]/30 bg-white px-3 py-2 text-xs font-bold text-[#c43d3d] transition hover:-translate-y-0.5 hover:bg-[#fff3eb] disabled:cursor-wait disabled:opacity-50 focus:ring-4 focus:ring-[#f8d1bc] focus:outline-none"
                      >
                        {practiceT("question.delete")}
                      </button>
                    </>
                  ) : null}
                  {!isLessonCheck && !isFocusActive && !isRepairActive ? (
                    <button
                      type="button"
                      onClick={showRandomQuestion}
                      disabled={!randomCandidates.length}
                      className="rounded-xl border border-[#0f3a69]/18 bg-white/65 px-3 py-2 text-xs font-bold text-[#285f86] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#65e6d2]/55 focus:outline-none"
                    >
                      {practiceT("question.anotherRandom")}
                    </button>
                  ) : null}
                  {!isLessonCheck ? (
                    <span className="font-mono text-xs text-[#64748b]">
                      {today}
                    </span>
                  ) : null}
                </div>
              </div>

              <article className="overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] shadow-[var(--shadow-card)]">
                <div className="p-6 sm:p-9 lg:p-10">
                  {isRepairActive ? (
                    <div className="mb-6 rounded-2xl border border-[#a65c0e]/25 bg-[#fff1f1] p-4 text-sm leading-6 text-[#9f2f2f]">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
                        {practiceT("repair.eyebrow", {
                          count: (repairItem?.attempts ?? 0) + 1,
                        })}
                      </p>
                      <p className="mt-1 font-semibold">
                        {practiceT("repair.description")}
                      </p>
                    </div>
                  ) : null}
                  {hasAnswered ? (
                    <div className="flex flex-wrap gap-2">
                      <Tag>{practiceT(`question.difficulty.${current.difficulty}`)}</Tag>
                      <Tag>{practiceT(`question.responseMode.${current.responseMode ?? "text"}`)}</Tag>
                    </div>
                  ) : null}

                  <h1
                    className={`${hasAnswered ? "mt-7" : ""} max-w-4xl font-semibold text-[#172033] ${questionHeadingTypography(currentPrompt)}`}
                  >
                    <InlineCode text={currentPrompt} />
                  </h1>

                  {current.code && !isCodeReviewQuestion(current) ? (
                    <pre className="mt-7 overflow-x-auto rounded-2xl border border-[#65e6d2]/20 bg-[#092c51] p-5 font-mono text-[13px] leading-6 text-[#e6f8f5] shadow-inner sm:text-sm">
                      <code>{current.code}</code>
                    </pre>
                  ) : null}

                  {isCodeReviewQuestion(current) && current.code ? (
                    <CodeReviewWorkspace
                      code={current.code}
                      value={answers[current.id] ?? ""}
                      onChange={(value) => updateAnswer(current.id, value)}
                    />
                  ) : requiresCodeAnswer(current) ? (
                    <div id="practice-answer-area" className="mt-8 space-y-5">
                      <ScenarioCodeEditor
                        language={current.language}
                        value={codeAnswers[current.id] ?? ""}
                        onChange={(value) => updateCodeAnswer(current.id, value)}
                      />
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            className="text-sm font-semibold text-[#43546a]"
                            htmlFor="candidate-answer"
                          >
                            {practiceT("question.designExplanation")}
                          </label>
                          <span className="font-mono text-[11px] text-[#64748b]">
                            {practiceT("question.optionalAutosaved")}
                          </span>
                        </div>
                        <textarea
                          id="candidate-answer"
                          aria-describedby={
                            currentRescueRetry?.phase === "retrying"
                              ? "rescue-retry-instruction"
                              : undefined
                          }
                          value={answers[current.id] ?? ""}
                          onChange={(event) => updateAnswer(current.id, event.target.value)}
                          className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[#0f3a69]/20 bg-[#f8fafc] px-4 py-3 leading-7 outline-none transition focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45"
                          placeholder={practiceT("question.designPlaceholder")}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        id="practice-answer-area"
                        className="mt-8"
                      >
                        <label
                          className="text-sm font-semibold text-[#43546a]"
                          htmlFor="candidate-answer"
                        >
                          {practiceT("question.yourAnswer")}
                        </label>
                      </div>
                      <textarea
                        id="candidate-answer"
                        aria-describedby={
                          currentRescueRetry?.phase === "retrying"
                            ? "rescue-retry-instruction"
                            : undefined
                        }
                        value={answers[current.id] ?? ""}
                        onChange={(event) => updateAnswer(current.id, event.target.value)}
                        className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#0f3a69]/20 bg-[#f8fafc] px-4 py-3 leading-7 outline-none transition focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45"
                        placeholder={practiceT("question.answerPlaceholder")}
                      />
                    </>
                  )}

                  {currentRescueRetry?.phase === "retrying" ? (
                    <div
                      id="rescue-retry-instruction"
                      className="mt-4 rounded-2xl border border-[#285f86]/25 bg-[#eaf2f8] p-4 text-sm text-[#285f86]"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#285f86] uppercase">
                        {practiceT("question.retry", {
                          count: currentRescueRetry.attempts + 1,
                        })}
                      </p>
                      <p className="mt-1 font-semibold">
                        {practiceT("question.retryInstruction")}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setHintUsedByQuestion((used) => {
                            if (used.has(current.id)) return used;
                            const next = new Set(used);
                            next.add(current.id);
                            return next;
                          });
                          toggleSet(setHints, current.id);
                        }}
                        className="rounded-xl px-1 py-2 text-sm font-semibold text-[#285f86] underline-offset-4 hover:underline"
                      >
                        {hints.has(current.id)
                          ? practiceT("question.hideHint")
                          : practiceT("question.needHint")}
                      </button>
                      {canManageQuestionBank ? (
                        <button
                          type="button"
                          onClick={clarifyCurrentQuestion}
                          disabled={questionClarificationLoading === current.id}
                          className="rounded-xl border border-[#285f86]/25 bg-white px-3 py-2 text-sm font-semibold text-[#285f86] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eaf2f8] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#65e6d2]/60 focus:outline-none"
                        >
                          {questionClarificationLoading === current.id
                            ? practiceT("question.clarifyWorking")
                            : questionClarifications[current.id]
                              ? practiceT("question.clarifyAgain")
                              : practiceT("question.clarify")}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={askCoach}
                        disabled={
                          coachLoading === current.id ||
                          (currentRescueRetry?.phase === "rescue" &&
                            Boolean(coachFeedback[current.id]))
                        }
                        className="rounded-xl border border-[#285f86]/25 bg-[#65e6d2] px-5 py-3 text-sm font-bold text-[#0f3a69] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#65e6d2]/60 focus:outline-none"
                      >
                        {coachLoading === current.id
                          ? currentRescueRetry?.phase === "retrying"
                            ? practiceT("question.aiRechecking")
                            : practiceT("question.aiHelping")
                          : currentRescueRetry?.phase === "rescue" &&
                              coachFeedback[current.id]
                            ? practiceT("question.readSolution")
                            : currentRescueRetry?.phase === "retrying"
                              ? currentCandidateAnswer
                                ? practiceT("question.askAiRetryGrade")
                                : practiceT("question.askAiRetryExplain")
                              : currentCandidateAnswer
                                ? practiceT("question.askAiGrade")
                                : practiceT("question.askAiExplain")}
                      </button>
                      <button
                        type="button"
                        onClick={toggleReferenceAnswer}
                        className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
                      >
                        {revealed.has(current.id)
                          ? practiceT("question.hideAnswer")
                          : practiceT("question.showAnswer")}
                      </button>
                    </div>
                  </div>

                  {hints.has(current.id) ? (
                    <div className="mt-4 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] p-4 text-sm leading-6 text-[#9f2f2f]">
                      <span className="mr-2 font-mono font-bold">
                        {practiceT("question.hint")}
                      </span>
                      <InlineCode text={current.hint} />
                    </div>
                  ) : null}

                  {questionClarifications[current.id] ? (
                    <section
                      className="mt-4 rounded-2xl border border-[#285f86]/20 bg-[#eaf2f8] p-4 text-sm text-[#285f86]"
                      aria-live="polite"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#285f86] uppercase">
                          {practiceT("question.clarificationEyebrow")}
                        </p>
                        <span className="rounded-full border border-[#285f86]/20 bg-white/65 px-2 py-1 font-mono text-[10px] text-[#285f86]">
                          {questionClarificationModels[current.id] || "Luna"}
                        </span>
                      </div>
                      <p className="mt-3 leading-6">
                        {questionClarifications[current.id].plainLanguage}
                      </p>
                      <div className="mt-4">
                        <div>
                          <p className="font-semibold text-[#0f3a69]">
                            {practiceT("clarification.question")}
                          </p>
                          <ul className="mt-2 space-y-1.5 leading-6">
                            {questionClarifications[current.id].whatToAddress.map(
                              (item) => (
                                <li key={item} className="flex gap-2">
                                  <span aria-hidden="true">•</span>
                                  <span>{item}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-4 border-t border-[#285f86]/15 pt-3 text-xs leading-5 text-[#526276]">
                        {practiceT("clarification.scope", {
                          scope: questionClarifications[current.id].scopeNote,
                        })}
                      </p>
                      <p className="mt-2 text-xs text-[#526276]">
                        {practiceT("clarification.guard")}
                      </p>
                    </section>
                  ) : null}

                  {questionClarificationErrors[current.id] ? (
                    <p
                      className="mt-4 rounded-2xl border border-[#a65c0e]/25 bg-[#fff1f1] p-4 text-sm text-[#c43d3d]"
                      role="alert"
                    >
                      {questionClarificationErrors[current.id]}
                    </p>
                  ) : null}

                  {coachErrors[current.id] ? (
                    <p
                      className="mt-4 rounded-2xl border border-[#a65c0e]/25 bg-[#fff1f1] p-4 text-sm text-[#c43d3d]"
                      role="alert"
                    >
                      {coachErrors[current.id]}
                    </p>
                  ) : null}

                  {isLessonCheck && hasAnswered ? (
                    <div
                      ref={handleRatingSectionRef}
                      className="sticky bottom-24 z-20 mt-5 flex scroll-m-4 flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border-2 border-[#285f86]/35 bg-white/95 p-4 shadow-[0_16px_45px_rgba(15,58,105,0.18)] backdrop-blur-md sm:p-5 lg:bottom-3"
                      role="status"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0f3a69]">
                          {practiceT("lessonCheck.reviewed")}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5c6e65]">
                          {practiceT("lessonCheck.notScheduled")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={advanceLessonCheck}
                        className="min-h-12 rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
                      >
                        {lessonCheckRemainingIds.length === 1
                          ? practiceT("lessonCheck.finish")
                          : practiceT("lessonCheck.next")}
                      </button>
                    </div>
                  ) : null}

                  {!isLessonCheck && canRateCurrent && !rescueOutcomeRating ? (
                    <div
                      ref={handleRatingSectionRef}
                      className="sticky bottom-24 z-20 mt-5 scroll-m-4 rounded-[1.25rem] border-2 border-[#285f86]/35 bg-[#ffffff]/95 p-4 shadow-[0_16px_45px_rgba(15,58,105,0.18)] backdrop-blur-md sm:p-5 lg:bottom-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#0f3a69]">
                            {isRepairActive
                              ? practiceT("ratingPanel.repairTitle")
                              : practiceT("ratingPanel.titleBeforeAi")}
                          </p>
                          <p className="mt-0.5 text-xs text-[#5c6e65]">
                            {isRepairActive
                              ? practiceT("ratingPanel.repairDescription")
                              : revealed.has(current.id)
                              ? practiceT("ratingPanel.compare")
                              : practiceT("ratingPanel.afterAi")}
                          </p>
                        </div>
                        {currentSuggestedRating ? (
                          <span className="rounded-full bg-[#65e6d2]/70 px-3 py-1 text-xs font-semibold text-[#285f86]">
                            {practiceT("ratingPanel.suggestion", {
                              rating: currentSuggestedRating.label,
                            })}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ratingOptions.map((option) => {
                          const intervalLabel = isRepairActive
                            ? option.value === "good" ||
                              option.value === "easy"
                              ? practiceT("rating.fixed")
                              : practiceT("rating.repeatSession")
                            : currentRatingIntervals
                              ? practiceT("rating.againAfterDays", {
                                  count:
                                    currentRatingIntervals[option.value],
                                })
                              : practiceT("rating.calculating");
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => rateCurrent(option.value)}
                              data-tone={option.tone}
                              className="rating-button min-h-14 rounded-2xl border bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
                            >
                              <span className="block text-sm font-bold">
                                {option.label}
                              </span>
                              <span className="mt-1 block font-mono text-[11px] opacity-65">
                                {intervalLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {coachFeedback[current.id] ? (
                    <>
                      <div ref={handleCoachFeedbackSectionRef}>
                        <CoachFeedbackPanel
                          feedback={coachFeedback[current.id]}
                          model={coachModels[current.id]}
                          rescueMode={currentRescueRetry?.phase === "rescue"}
                          learningActionLoading={followUpLoading === current.id}
                          learningActionDisabled={
                            (followUpChats[current.id]?.length ?? 0) >= 8
                          }
                          deepDiveOpen={deepDiveOpen.has(current.id)}
                          feedbackSaved={isSaved(
                            `ai-feedback:${current.id}:${current.version}:${current.sourceHash}`,
                          )}
                          onToggleSaveFeedback={() =>
                            toggleSavedItem({
                              id: `ai-feedback:${current.id}:${current.version}:${current.sourceHash}`,
                              kind: "ai_answer",
                              questionId: current.id,
                              title: practiceT("savedTitle.feedback", {
                                title: current.lessonTitle,
                              }),
                              content: formatCoachFeedback(
                                coachFeedback[current.id],
                                practiceT(
                                  `coach.verdict.${coachFeedback[current.id].verdict}`,
                                ),
                                practiceT("coach.corrections"),
                              ),
                              context: displayQuestionPrompt(current),
                            })
                          }
                          onExpandNextStep={() =>
                            void askCoachFollowUp(
                              practiceT("expandNextStepPrompt", {
                                nextStep: coachFeedback[current.id].nextStep,
                              }),
                            )
                          }
                          onExploreInterviewerQuestion={() =>
                            toggleSet(setDeepDiveOpen, current.id)
                          }
                        />
                      </div>
                      {currentRescueRetry &&
                      currentRescueRetry.phase !== "retrying" ? (
                        <RescueRetryOutcomePanel
                          state={currentRescueRetry}
                          score={coachFeedback[current.id].score}
                          onRetry={() => startRescueRetry(current.id)}
                          onContinue={
                            rescueOutcomeRating
                              ? () => rateCurrent(rescueOutcomeRating)
                              : undefined
                          }
                        />
                      ) : null}
                      {currentRescueRetry?.phase !== "rescue" &&
                      deepDiveOpen.has(current.id) ? (
                        <DeepDivePracticePanel
                          question={current}
                          prompt={coachFeedback[current.id].followUpQuestion}
                          answer={deepDiveAnswers[current.id] ?? ""}
                          feedback={deepDiveFeedback[current.id]}
                          model={deepDiveModels[current.id]}
                          error={deepDiveErrors[current.id]}
                          loading={deepDiveLoading === current.id}
                          feedbackSaved={isSaved(
                            `ai-deep-dive:${current.id}:${current.version}:${current.sourceHash}`,
                          )}
                          onAnswer={(value) =>
                            setDeepDiveAnswers((answers) => ({
                              ...answers,
                              [current.id]: value,
                            }))
                          }
                          onSubmit={() => void submitDeepDiveAnswer()}
                          onToggleSaveFeedback={() => {
                            const feedback = deepDiveFeedback[current.id];
                            if (!feedback) return;
                            toggleSavedItem({
                              id: `ai-deep-dive:${current.id}:${current.version}:${current.sourceHash}`,
                              kind: "ai_answer",
                              questionId: current.id,
                              title: practiceT("savedTitle.deepDive", {
                                title: current.lessonTitle,
                              }),
                              content: feedback.answer,
                              context: coachFeedback[current.id].followUpQuestion,
                            });
                          }}
                        />
                      ) : null}
                      {currentRescueRetry?.phase !== "rescue" ? (
                        <CoachFollowUpPanel
                          question={current}
                          messages={followUpChats[current.id] ?? []}
                          input={followUpInputs[current.id] ?? ""}
                          error={followUpErrors[current.id]}
                          loading={followUpLoading === current.id}
                          isMessageSaved={(index) =>
                            isSaved(`ai-follow-up:${current.id}:${index}`)
                          }
                          onToggleSaveMessage={(index, message) =>
                            toggleSavedItem({
                              id: `ai-follow-up:${current.id}:${index}`,
                              kind: "ai_answer",
                              questionId: current.id,
                              title: practiceT("savedTitle.explanation", {
                                title: current.lessonTitle,
                              }),
                              content: message.content,
                              context: displayQuestionPrompt(current),
                            })
                          }
                          onInput={(value) =>
                            setFollowUpInputs((inputs) => ({
                              ...inputs,
                              [current.id]: value,
                            }))
                          }
                          onSubmit={askCoachFollowUp}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>

                {revealed.has(current.id) ? (
                  <div
                    ref={handleReferenceAnswerRef}
                    className="scroll-mt-6 border-t border-[#0f3a69]/12 bg-[#eaf2f8] p-6 sm:p-9 lg:p-11"
                  >
                    <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#285f86] uppercase">
                      {practiceT("question.referenceAnswer")}
                    </p>
                    <p className="mt-4 text-lg leading-8 font-medium text-[#213d32]">
                      <InlineCode text={current.answer.short} />
                    </p>
                    <details className="mt-5 rounded-2xl border border-[#0f3a69]/15 bg-white/60 p-4 open:pb-5">
                      <summary className="cursor-pointer text-sm font-bold text-[#285f86]">
                        {practiceT("question.moreExplanation")}
                      </summary>
                      <p className="mt-4 leading-7 text-[#526276]">
                        <InlineCode text={current.answer.detailed} />
                      </p>
                    </details>

                    <div className="mt-7 grid gap-4 md:grid-cols-2">
                      <RubricList
                        title={practiceT("question.requiredPoints")}
                        items={current.rubric.required}
                      />
                      <RubricList
                        title={practiceT("question.pitfalls")}
                        items={current.rubric.misconceptions}
                        warning
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setVisibleSources, current.id)}
                      className="mt-6 text-sm font-bold text-[#285f86] underline decoration-[#285f86]/35 underline-offset-4"
                    >
                      {visibleSources.has(current.id)
                        ? practiceT("question.hideSources")
                        : practiceT("question.showSources")}
                    </button>
                    {visibleSources.has(current.id) ? (
                      <SourceNotes question={current} />
                    ) : null}

                  </div>
                ) : null}
              </article>
            </section>

            {!distractionFreeMode && !isLessonCheck ? (
            <aside className="space-y-4 lg:pt-12">
              {!isFocusActive && selectedPendingReview.length ? (
                <div className="rounded-[1.25rem] border border-[#a65c0e]/25 bg-[#fff4df] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs tracking-[0.15em] text-[#a65c0e] uppercase">
                        {practiceT("reviewQueue.eyebrow")}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {practiceT("reviewQueue.count", {
                          count: selectedPendingReview.length,
                        })}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#a65c0e] px-2.5 py-1 font-mono text-xs font-bold text-white">
                      {selectedPendingReview.length}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-[#526276]">
                    {selectedPendingReview.slice(0, 3).map((question) => (
                      <li key={question.id} className="line-clamp-2">
                        <span className="font-mono text-[10px] font-bold text-[#a65c0e] uppercase">
                          {question.status === "draft"
                            ? practiceT("reviewQueue.aiDraft")
                            : practiceT("reviewQueue.sourceChanged")}
                        </span>{" "}
                        · {displayQuestionPrompt(question)}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void approveAllPending()}
                    disabled={approvalStatus === "saving"}
                    className="mt-5 w-full rounded-2xl bg-[#a65c0e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c43d3d] disabled:cursor-wait disabled:opacity-60"
                  >
                    {approvalStatus === "saving"
                      ? practiceT("reviewQueue.saving")
                      : practiceT("reviewQueue.approveAll")}
                  </button>
                  {approvalStatus === "error" ? (
                    <p className="mt-3 text-xs font-semibold text-[#c43d3d]">
                      {practiceT("reviewQueue.error")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1.25rem] bg-[#0f3a69] p-6 text-white">
                <p className="font-mono text-xs tracking-[0.15em] text-[#65e6d2] uppercase">
                  {isFocusActive
                    ? practiceT("progressPanel.focus")
                    : practiceT("progressPanel.today")}
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#65e6d2] transition-all"
                    style={{
                      width: `${
                        isFocusActive
                          ? focusQueueTotal
                            ? ((focusSession?.completedQuestions.length ?? 0) /
                                focusQueueTotal) *
                              100
                            : 0
                          : dailyTotal
                            ? (completedToday / dailyTotal) * 100
                            : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-white/65">
                  {isFocusActive
                    ? practiceT("progressPanel.focusRemaining", {
                        count: focusSession?.remainingQuestions.length ?? 0,
                      })
                    : practiceT("progressPanel.remaining", {
                        count: remainingIds.length,
                      })}
                </p>
                {!isFocusActive ? (
                  <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                    <DailyBucketCount
                      label={practiceT("progressPanel.new")}
                      value={dailyCounts.new}
                    />
                    <DailyBucketCount
                      label={practiceT("progressPanel.learning")}
                      value={dailyCounts.learning}
                    />
                    <DailyBucketCount
                      label={practiceT("progressPanel.due")}
                      value={dailyCounts.review}
                    />
                    <p role="status" aria-atomic="true" className="sr-only">
                      {practiceT("progressPanel.dailyStatus", {
                        new: dailyCounts.new,
                        learning: dailyCounts.learning,
                        due: dailyCounts.review,
                        total: remainingIds.length,
                      })}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/55 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">
                    {practiceT("progressPanel.cloudTitle")}
                  </p>
                  <SyncDot status={syncStatus} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#526276]">
                  {account
                      ? syncStatus === "error"
                      ? practiceT("progressPanel.cloudError")
                      : practiceT("progressPanel.cloudAccount")
                    : cloudEnabled
                      ? practiceT("progressPanel.cloudSignIn")
                      : practiceT("progressPanel.cloudUnavailable")}
                </p>
              </div>

              {hasAnswered ? (
                <div className="rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/55 p-6">
                  <p className="text-xs font-bold tracking-[0.14em] text-[#a65c0e] uppercase">
                    {practiceT("question.topic")}
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight">
                    {current.lessonTitle}
                  </p>
                  <p className="mt-2 font-mono text-xs leading-5 text-[#64748b]">
                    {current.sourcePath}
                  </p>
                </div>
              ) : null}

              <div className="rounded-[1.25rem] border border-[#285f86]/20 bg-[#eaf2f8] p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {practiceT("progressPanel.aiTitle")}
                  </p>
                  <span className="size-2 rounded-full bg-[#65a30d] shadow-[0_0_0_4px_rgba(101,163,13,0.12)]" />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#526276]">
                  {practiceT("progressPanel.aiDescription")}
                </p>
                <span className="mt-4 inline-block rounded-full bg-[#65e6d2] px-3 py-1 font-mono text-[11px] font-semibold text-[#285f86]">
                  {practiceT("progressPanel.aiProviders")}
                </span>
              </div>
            </aside>
            ) : null}
          </div>
        ) : deckQuestions.length ? (
          <CompletionScreen
            completedToday={completedToday}
            streak={streak}
            today={today}
            hasRandomQuestion={randomCandidates.length > 0}
            onRandomQuestion={showRandomQuestion}
          />
        ) : (
          <DeckEmptyState
            deck={selectedDeck}
            pendingCount={selectedPendingReview.length}
          />
        )}

        {canManageQuestionBank && questionAdminEditing && current ? (
          <QuestionEditorDialog
            key={`${current.id}:${current.version}`}
            question={current}
            saving={questionAdminSaving}
            error={questionAdminError}
            onClose={() => {
              if (questionAdminSaving) return;
              setQuestionAdminError(null);
              setQuestionAdminEditing(false);
            }}
            onSave={(content) => mutateCurrentQuestion("edit", content)}
          />
        ) : null}
        {canManageQuestionBank && archiveConfirmationOpen && current ? (
          <ConfirmationDialog
            title={practiceT("dialog.deleteTitle")}
            description={practiceT("dialog.deleteDescription")}
            confirmLabel={practiceT("dialog.deleteConfirm")}
            cancelLabel={practiceT("dialog.cancel")}
            busyLabel={practiceT("dialog.working")}
            busy={questionAdminSaving}
            onCancel={() => setArchiveConfirmationOpen(false)}
            onConfirm={() => {
              setArchiveConfirmationOpen(false);
              void mutateCurrentQuestion("archive");
            }}
          />
        ) : null}

      </div>
    </main>
  );
}

function PracticeFocusBar({
  questionPosition,
  answerRevealed,
  onExit,
  onToggleAnswer,
}: {
  questionPosition: string;
  answerRevealed: boolean;
  onExit: () => void;
  onToggleAnswer: () => void;
}) {
  const t = useTranslations("Practice");
  return (
    <header className="sticky top-3 z-30 mb-5 flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0f3a69]/20 bg-[color:var(--pine)] px-3 py-2 text-white shadow-[var(--shadow-lift)] sm:px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="min-h-10 rounded-lg px-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
        >
          {t("focus.exit")}
        </button>
        <span className="h-5 w-px bg-white/15" aria-hidden="true" />
        <div>
          <p className="ui-panel-label text-[color:var(--accent)]">{t("focus.mode")}</p>
          <p className="mt-0.5 font-mono text-xs text-white/65">
            {t("focus.question", { position: questionPosition })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleAnswer}
        className="min-h-10 rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/18 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
      >
        {answerRevealed ? t("question.hideAnswer") : t("question.showAnswer")}
        <span className="ml-2 hidden font-mono text-[10px] text-white/55 sm:inline">Alt + A</span>
      </button>
    </header>
  );
}

function LoadingScreen() {
  const t = useTranslations("Practice");
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="text-center">
        <BrandMark
          size="lg"
          className="mx-auto animate-pulse motion-reduce:animate-none"
        />
        <p className="mt-4 text-sm text-[#526276]">{t("focus.loading")}</p>
      </div>
    </main>
  );
}

function FocusUnavailableScreen({
  storageError,
}: {
  storageError: boolean;
}) {
  const t = useTranslations("Practice");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[1.25rem] border border-[#a65c0e]/20 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff1f1] font-mono font-bold text-[#a65c0e]">
          !
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#a65c0e] uppercase">
          {t("focus.unavailable")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#172033]">
          {storageError
            ? t("focus.storageBlocked")
            : t("focus.notFound")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#526276]">
          {t("focus.unavailableDescription")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/practice"
            className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a]"
          >
            {t("focus.back")}
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#0f3a69]/18 bg-white px-5 py-3 text-sm font-bold text-[#285f86]"
          >
            {t("focus.normal")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function LessonCheckEmptyScreen({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const t = useTranslations("Practice");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[1.25rem] border border-[#a65c0e]/20 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff1f1] font-mono font-bold text-[#a65c0e]">
          !
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#a65c0e] uppercase">
          {t("lessonCheck.eyebrow")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#172033]">
          {lessonTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#526276]">
          {t("lessonCheck.empty")}
        </p>
        <Link
          href={`/learn/${lessonId}`}
          className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          {t("lessonCheck.backToLesson")}
        </Link>
      </section>
    </main>
  );
}

function LessonCheckCompletionScreen({
  completedCount,
  lessonId,
  lessonTitle,
}: {
  completedCount: number;
  lessonId: string;
  lessonTitle: string;
}) {
  const t = useTranslations("Practice");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section
        className="w-full max-w-xl rounded-[1.25rem] border border-[#285f86]/18 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)]"
        aria-live="polite"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#0f3a69] font-mono font-bold text-[#65e6d2]">
          ✓
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
          {t("lessonCheck.completedEyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#172033]">
          {t("lessonCheck.completedTitle", { count: completedCount })}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#526276]">
          {t("lessonCheck.completedDescription", { title: lessonTitle })}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={`/learn/${lessonId}`}
            className="inline-flex min-h-12 items-center rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
          >
            {t("lessonCheck.backToLesson")}
          </Link>
          <Link
            href="/practice"
            className="inline-flex min-h-12 items-center rounded-xl border border-[#0f3a69]/18 bg-white px-5 py-3 text-sm font-bold text-[#285f86] transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
          >
            {t("lessonCheck.practiceNormally")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function FocusCompletionScreen({
  completedCount,
  staleDroppedCount,
  notice,
  returnHref,
}: {
  completedCount: number;
  staleDroppedCount: number;
  notice: string | null;
  returnHref: string | null;
}) {
  const t = useTranslations("Practice");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[1.25rem] border border-[#285f86]/18 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#0f3a69] font-mono font-bold text-[#65e6d2]">
          ✓
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
          {t("focus.completed")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#172033]">
          {t("focus.completedCount", { count: completedCount })}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#526276]">
          {t("focus.completedDescription")}
        </p>
        {staleDroppedCount > 0 ? (
          <p className="mt-3 rounded-xl bg-[#fff4df] px-4 py-3 text-xs font-semibold text-[#8a5a20]">
            {t("focus.staleDropped", { count: staleDroppedCount })}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 text-xs font-semibold text-[#c43d3d]" role="alert">
            {notice}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={returnHref ?? "/practice"}
            className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a]"
          >
            {returnHref
              ? t("focus.continueMission")
              : t("focus.back")}
          </Link>
          {returnHref ? (
            <Link
              href="/practice"
              className="rounded-xl border border-[#0f3a69]/18 bg-white px-5 py-3 text-sm font-bold text-[#285f86]"
            >
              {t("focus.back")}
            </Link>
          ) : null}
          <Link
            href="/"
            className="rounded-xl border border-[#0f3a69]/18 bg-white px-5 py-3 text-sm font-bold text-[#285f86]"
          >
            {t("focus.continuePractice")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function CompletionScreen({
  completedToday,
  streak,
  today,
  hasRandomQuestion,
  onRandomQuestion,
}: {
  completedToday: number;
  streak: number;
  today: string;
  hasRandomQuestion: boolean;
  onRandomQuestion: () => void;
}) {
  const t = useTranslations("Practice");
  return (
    <section className="grid min-h-[72vh] place-items-center py-12">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#65e6d2] text-3xl text-[#0f3a69]">
          ✓
        </span>
        <p className="mt-7 font-mono text-xs font-bold tracking-[0.16em] text-[#285f86] uppercase">
          {t("completion.eyebrow", { date: today })}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          {t("completion.title")}
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#526276]">
          {t("completion.description", {
            completed: completedToday,
            streak,
          })}
        </p>
        {hasRandomQuestion ? (
          <button
            type="button"
            onClick={onRandomQuestion}
            className="mt-7 rounded-2xl bg-[#0f3a69] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
          >
            {t("completion.random")}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function CustomStudyPanel({
  activeCount,
  notice,
  onStart,
  onStop,
}: {
  activeCount: number;
  notice: string | null;
  onStart: (filters: CustomStudyFilters) => void;
  onStop: () => void;
}) {
  const t = useTranslations("Practice");
  const [learningState, setLearningState] = useState<
    CustomStudyFilters["learningState"]
  >("all");
  const [limit, setLimit] = useState(10);

  return (
    <details className="mt-5 rounded-2xl border border-[#0f3a69]/15 bg-white/55 px-4 py-3 open:bg-white/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[#285f86]">
        <span>{t("customStudy.summary")}</span>
        <span className="font-mono text-xs">
          {activeCount
            ? t("customStudy.remaining", { count: activeCount })
            : t("customStudy.openFilters")}
        </span>
      </summary>
      <div className="mt-4 grid gap-3 border-t border-[#0f3a69]/10 pt-4 sm:grid-cols-2">
        <StudySelect
          label={t("customStudy.state")}
          value={learningState}
          onChange={(value) =>
            setLearningState(value as CustomStudyFilters["learningState"])
          }
          options={[
            ["all", t("learningState.all")],
            ["new", t("learningState.new")],
            ["learning", t("learningState.learning")],
            ["review", t("learningState.review")],
            ["relearning", t("learningState.relearning")],
            ["due", t("learningState.due")],
            ["leech", t("learningState.leech")],
          ]}
        />
        <label className="text-xs font-bold text-[#43546a]">
          {t("customStudy.questionCount")}
          <input
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            onStart({
              learningState,
              standard: "all",
              difficulty: "all",
              skill: "all",
              topic: "all",
              lessonId: "all",
              limit,
            })
          }
          className="rounded-xl bg-[#0f3a69] px-4 py-2.5 text-xs font-bold text-white"
        >
          {t("customStudy.start")}
        </button>
        {activeCount ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl border border-[#a65c0e]/25 bg-white px-4 py-2.5 text-xs font-bold text-[#c43d3d]"
          >
            {t("customStudy.stop")}
          </button>
        ) : null}
        {notice ? <p className="text-xs text-[#526276]">{notice}</p> : null}
      </div>
      <p className="mt-3 text-[11px] text-[#64748b]">
        {t("customStudy.scheduleNote")}
      </p>
    </details>
  );
}

function StudySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-xs font-bold text-[#43546a]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function DailyBucketCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-2 py-2.5 text-center">
      <span className="block whitespace-nowrap font-mono text-[10px] tracking-wide text-white/65 uppercase">
        {label}
      </span>
      <strong className="mt-0.5 block text-base text-[#65e6d2]">{value}</strong>
    </div>
  );
}

function DeckEmptyState({
  deck,
  pendingCount,
}: {
  deck: PracticeDeckId;
  pendingCount: number;
}) {
  const t = useTranslations("Practice");
  const config = PRACTICE_DECKS[deck];
  return (
    <section className="grid min-h-[64vh] place-items-center py-12">
      <div className="max-w-xl rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/65 p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-lg font-bold text-[#65e6d2]">
          {config.badge}
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {t("emptyDeck.title", { deck: t("workspaceTagline") })}
        </h1>
        <p className="mt-4 leading-7 text-[#526276]">
          {pendingCount
            ? t("emptyDeck.pending", { count: pendingCount })
            : t("emptyDeck.description")}
        </p>
        <NextLink
          href="/admin"
          className="mt-7 inline-flex rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white"
        >
          {t("emptyDeck.admin")}
        </NextLink>
      </div>
    </section>
  );
}

function QuestionBankUnavailableState() {
  const t = useTranslations("Practice");
  return (
    <section
      className="grid min-h-[64vh] place-items-center py-12"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-xl rounded-[1.25rem] border border-[#c43d3d]/25 bg-[#fff1f1] p-8 text-center shadow-[0_20px_70px_rgba(15,58,105,0.08)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-lg font-bold text-[#65e6d2]">
          C++
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {t("questionBankUnavailable.title")}
        </h1>
        <p className="mt-4 leading-7 text-[#526276]">
          {t("questionBankUnavailable.description")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 inline-flex rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          {t("questionBankUnavailable.retry")}
        </button>
      </div>
    </section>
  );
}

function ProgressSummaryControl({
  icon,
  streak,
  value,
}: {
  icon: string;
  streak: number;
  value: string;
}) {
  const t = useTranslations("Practice");
  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-3 py-2 text-xs font-bold text-[color:var(--pine)] transition hover:border-[#285f86]/35 hover:bg-white focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none">
        <span aria-hidden="true" className="text-[#a65c0e]">{icon}</span>
        <span className="hidden sm:inline">{t("header.progress")}</span>
        <span className="font-mono text-xs">{value}</span>
        <ChevronIcon />
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] p-3 shadow-[var(--shadow-lift)]">
        <p className="ui-eyebrow text-[#285f86]">{t("header.todayProgress")}</p>
        <div className="grid grid-cols-2 gap-2">
          <ProgressSummaryMetric label={t("header.studied")} value={value} />
          <ProgressSummaryMetric
            label={t("header.dayStreak")}
            value={t("header.days", { count: streak })}
          />
        </div>
        <Link href="/stats" className="mt-1 text-xs font-bold text-[#285f86] underline decoration-[#285f86]/35 underline-offset-4 hover:text-[#0f3a69]">
          {t("header.details")}
        </Link>
      </div>
    </details>
  );
}

function ProgressSummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2">
      <p className="text-sm font-bold text-[#0f3a69]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#43546a]">{label}</p>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5 transition group-open:rotate-180" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function AiBudgetPill({ budget }: { budget: AiDailyBudgetSnapshot }) {
  const t = useTranslations("Practice");
  const low = budget.remainingPercent <= 20;
  const usedUsd = budget.actualUsdMicros / 1_000_000;
  const billingLabel = budget.billingSyncedAt
    ? t("aiBudget.billing", {
        cost: ((budget.billingUsdMicros ?? 0) / 1_000_000).toFixed(4),
      })
    : t("aiBudget.tokenBased");
  return (
    <div
      className="min-w-32 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-3 py-2"
      title={t("aiBudget.tooltip", {
        billing: billingLabel,
        used: usedUsd.toFixed(5),
        requests: budget.requestCount,
        tokens: budget.inputTokens + budget.outputTokens,
        model: budget.lastModel ?? t("aiBudget.unknownModel"),
        limit: (budget.limitUsdMicros / 1_000_000).toFixed(3),
      })}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] font-bold uppercase">
        <span>{t("aiBudget.today")}</span>
        <span className={low ? "text-[#a65c0e]" : "text-[#16865a]"}>
          {t("aiBudget.remaining", { percent: budget.remainingPercent })}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#0f3a69]/15">
        <div
          className={`h-full rounded-full transition-[width] ${low ? "bg-[#a65c0e]" : "bg-[#138f8c]"}`}
          style={{ width: `${budget.remainingPercent}%` }}
        />
      </div>
    </div>
  );
}

function TodayWorkspace({
  completedToday,
  dailyTotal,
  remainingCount,
  streak,
  hasCurrentQuestion,
  onPrimaryAction,
}: {
  completedToday: number;
  dailyTotal: number;
  remainingCount: number;
  streak: number;
  hasCurrentQuestion: boolean;
  onPrimaryAction: () => void;
}) {
  const t = useTranslations("Practice");
  const progress = dailyTotal ? Math.round((completedToday / dailyTotal) * 100) : 100;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#0f3a69]/16 bg-[color:var(--pine)] text-white shadow-[var(--shadow-lift)]">
      <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end lg:p-10">
        <div>
          <p className="ui-panel-label text-[color:var(--accent)]">
            {t("today.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {hasCurrentQuestion
              ? t("today.ready")
              : t("today.complete")}
          </h1>
          <p className="text-on-dark-muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
            {hasCurrentQuestion
              ? t("today.remaining", { count: remainingCount })
              : t("today.completeDescription")}
          </p>
          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[color:var(--accent)] px-5 py-3 text-sm font-bold text-[color:var(--pine-strong)] transition hover:-translate-y-0.5 hover:bg-[#e1ffac] focus:ring-4 focus:ring-white/25 focus:outline-none"
          >
            {hasCurrentQuestion ? t("today.continue") : t("today.practiceMore")}
          </button>
        </div>
        <div className="border-l border-white/15 pl-5 sm:pl-6">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/72">
            <span>{t("today.progress")}</span>
            <span className="text-[#65e6d2]">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#65e6d2] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <TodayMetric label={t("today.studied")} value={completedToday} />
            <TodayMetric label={t("today.remainingMetric")} value={remainingCount} />
            <TodayMetric label={t("today.streak")} value={`${streak}d`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicAiQuotaPill({
  quota,
}: {
  quota: PublicAiQuotaSnapshot | null;
}) {
  const t = useTranslations("Practice");
  const locale = useLocale() as Locale;
  const { limit, remaining, exhausted, progressPercent } =
    publicAiQuotaPresentation(quota);
  const label = remaining === null
    ? t("aiQuota.checking")
    : t("aiQuota.remaining", { remaining, limit });
  const reset = quota?.resetsAt ? formatPublicAiReset(quota.resetsAt, locale) : null;

  return (
    <div
      className="min-w-32 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-3 py-2"
      title={
        reset
          ? t("aiQuota.reset", { limit, reset })
          : t("aiQuota.device", { limit })
      }
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase">
        <span>AI Luna</span>
        <span className={exhausted ? "text-[#a65c0e]" : "text-[#16865a]"}>
          {label}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#0f3a69]/15">
        <div
          className={`h-full rounded-full transition-[width] ${
            exhausted ? "bg-[#a65c0e]" : "bg-[#138f8c]"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

type PracticeAiQuotaTranslator = (
  key:
    | "aiQuota.usedUpReset"
    | "aiQuota.usedUp"
    | "aiQuota.requestUnavailable"
    | "aiQuota.disabled"
    | "aiQuota.identityUnavailable"
    | "aiQuota.dailyBudget"
    | "aiQuota.monthlyBudget"
    | "aiQuota.notReady",
  values?: Record<string, string | number>,
) => string;

function publicAiCoachErrorMessage(
  payload: CoachApiPayload,
  locale: Locale,
  t: PracticeAiQuotaTranslator,
) {
  switch (payload.code) {
    case "public_ai_quota_exceeded":
      return payload.resetsAt
        ? t("aiQuota.usedUpReset", {
            reset: formatPublicAiReset(payload.resetsAt, locale),
          })
        : t("aiQuota.usedUp");
    case "public_ai_request_unavailable":
      return t("aiQuota.requestUnavailable");
    case "public_ai_disabled":
      return t("aiQuota.disabled");
    case "public_ai_identity_unavailable":
      return t("aiQuota.identityUnavailable");
    case "public_ai_daily_budget_exceeded":
      return t("aiQuota.dailyBudget");
    case "public_ai_monthly_budget_exceeded":
      return t("aiQuota.monthlyBudget");
    case "public_ai_not_configured":
    case "public_ai_budget_not_configured":
      return t("aiQuota.notReady");
    default:
      return null;
  }
}

function formatPublicAiReset(value: string, locale: Locale) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return locale === "en" ? "later" : "sau";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(timestamp);
}

function TodayMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-black/12 px-2 py-3">
      <p className="text-lg font-semibold text-[#65e6d2]">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-white/70 uppercase">{label}</p>
    </div>
  );
}

function WorkspaceNavLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-center text-sm font-bold transition-colors focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none ${
        active
          ? "border-[#65e6d2]/70 bg-[#e6f8f5] text-[#0f3a69] shadow-[0_8px_22px_rgb(15_58_105_/_10%)] after:absolute after:inset-x-8 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[#22b8a7]"
          : "border-transparent text-[color:var(--ink-muted)] hover:border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--pine)] active:bg-[color:var(--accent-soft)]"
      }`}
    >
      {children}
      <HeaderNavPending />
    </Link>
  );
}

function AdminHeaderLink({ children }: { children: React.ReactNode }) {
  return (
    <NextLink
      href="/admin"
      className="relative inline-flex items-center gap-1.5 rounded-full border border-[#0f3a69]/15 bg-white/65 px-3 py-2 font-mono text-[10px] font-bold uppercase transition hover:border-[#285f86]/40"
    >
      <span>{children}</span>
      <HeaderNavPending />
    </NextLink>
  );
}

function HeaderNavPending() {
  const t = useTranslations("Practice");
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      className="size-2 animate-spin rounded-full border border-[#285f86]/35 border-t-[#285f86]"
      aria-label={t("header.pageLoading")}
    />
  ) : null;
}

function AccountControl({
  account,
  canManageQuestionBank,
  cloudEnabled,
  guestMode,
  syncStatus,
  selectedDeck,
}: {
  account: PracticeAccount | null;
  canManageQuestionBank: boolean;
  cloudEnabled: boolean;
  guestMode: boolean;
  syncStatus: SyncStatus;
  selectedDeck: PracticeDeckId;
}) {
  const t = useTranslations("Practice");
  if (account) {
    return (
      <div className="flex items-center gap-2">
        {canManageQuestionBank ? (
          <AdminHeaderLink>{t("header.admin")}</AdminHeaderLink>
        ) : null}
        <Link
          href="/profile"
          title={t("header.profile")}
          className="flex items-center gap-2 rounded-full border border-[#0f3a69]/15 bg-white/65 px-2.5 py-1.5 transition hover:border-[#285f86]/40"
        >
            <span className="grid size-7 place-items-center rounded-full bg-[#0f3a69] text-xs font-bold text-[#65e6d2]">
              {account.displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-28 truncate text-xs font-semibold sm:block">
              {account.login ? `@${account.login}` : account.displayName}
            </span>
            <SyncDot status={syncStatus} />
        </Link>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            title={t("header.signOut")}
            aria-label={t("header.signOut")}
            className="grid size-9 place-items-center rounded-full border border-[#0f3a69]/15 bg-white/65 text-sm font-bold transition hover:border-[#a65c0e]/40 hover:text-[#a65c0e]"
          >
            ↪
          </button>
        </form>
      </div>
    );
  }

  if (guestMode && !account) {
    return (
      <span className="rounded-full border border-[#0f3a69]/12 bg-[#e7e3d8] px-3 py-2 font-mono text-[10px] font-semibold text-[#526276]">
        {t("header.guestDevice")}
      </span>
    );
  }

  if (cloudEnabled) {
    return (
      <Link
        href={`/auth?next=${encodeURIComponent(`/practice?deck=${selectedDeck}`)}`}
        className="rounded-full bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
      >
        {t("header.signIn")}
      </Link>
    );
  }

  return (
    <span className="rounded-full border border-[#0f3a69]/12 bg-[#e7e3d8] px-3 py-2 font-mono text-[10px] font-semibold text-[#526276]">
      {t("header.localOnly")}
    </span>
  );
}

function SyncDot({ status }: { status: SyncStatus }) {
  const t = useTranslations("Practice");
  const labels: Record<SyncStatus, string> = {
    local: t("header.syncLocal"),
    syncing: t("header.syncing"),
    synced: t("header.synced"),
    error: t("header.syncError"),
  };

  return (
    <span
      aria-label={labels[status]}
      title={labels[status]}
      data-status={status}
      className="sync-dot inline-block size-2.5 shrink-0 rounded-full"
    />
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#0f3a69]/12 bg-[#eaf2f8] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#43546a] uppercase">
      {children}
    </span>
  );
}

function isCodeReviewQuestion(question: ContentQuestion) {
  return (
    question.interviewFormat ?? question.taxonomy.interviewFormat
  ) === "code_review";
}

function ScenarioCodeEditor({
  language,
  value,
  onChange,
}: {
  language: ContentLanguage;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Practice");
  const locale = useLocale() as Locale;
  const [expanded, setExpanded] = useState(false);
  const editor = scenarioEditorConfig(language, locale);

  return (
    <section
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-[#061a31]/95 p-3 backdrop-blur-sm sm:p-6"
          : ""
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[#285f86]/35 bg-[#0d2821] shadow-[0_18px_55px_rgba(7,27,22,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#092c51] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="size-2.5 rounded-full bg-[#e2684a]" />
              <i className="size-2.5 rounded-full bg-[#e7b84b]" />
              <i className="size-2.5 rounded-full bg-[#75aa52]" />
            </span>
            <span className="font-mono text-xs font-bold text-[#65e6d2]">
              {editor.fileName}
            </span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] text-white/55">
              {t("codeEditor.design", { language: editor.languageLabel })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!value ? (
              <button
                type="button"
                onClick={() =>
                  onChange(editor.template)
                }
                className="rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                {t("codeEditor.insert", { language: editor.languageLabel })}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-[10px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {expanded ? t("codeEditor.collapse") : t("codeEditor.fullscreen")}
            </button>
          </div>
        </div>
        <div className="bg-[#092c51]">
          <MonacoCodeEditor
            language={language}
            value={value}
            onChange={onChange}
            height={expanded ? "calc(100vh - 9rem)" : "24rem"}
            expanded={expanded}
            placeholder={editor.placeholder}
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/8 bg-[#092c51] px-4 py-2 font-mono text-[10px] text-white/40">
          <span>{t("codeEditor.shortcuts")}</span>
          <span>{t("codeEditor.characters", { count: value.length })}</span>
        </div>
      </div>
    </section>
  );
}

function InlineCode({ text, inverted = false }: { text: string; inverted?: boolean }) {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={`${part}-${index}`}
        className={`rounded-md px-1.5 py-0.5 font-mono text-[0.88em] ${
          inverted
            ? "bg-white/14 text-[#e7ffc2]"
            : "bg-[#0f3a69]/8 text-[#16865a]"
        }`}
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

function questionHeadingTypography(prompt: string) {
  const length = prompt.replace(/\s+/g, " ").trim().length;

  if (length >= 360) {
    return "text-xl leading-[1.35] tracking-[-0.025em] sm:text-2xl lg:text-[2rem]";
  }
  if (length >= 200) {
    return "text-2xl leading-[1.25] tracking-[-0.03em] sm:text-3xl lg:text-[2.35rem]";
  }
  return "text-3xl leading-[1.16] tracking-[-0.04em] sm:text-4xl lg:text-[2.85rem]";
}

function RichText({ text, inverted = false }: { text: string; inverted?: boolean }) {
  const fence = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
  const blocks: Array<
    | { kind: "text"; content: string }
    | { kind: "code"; content: string; language: string }
  > = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > cursor) {
      blocks.push({ kind: "text", content: text.slice(cursor, match.index) });
    }
    blocks.push({
      kind: "code",
      language: match[1].trim() || "code",
      content: match[2].replace(/\r\n/g, "\n").replace(/\n$/, ""),
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) blocks.push({ kind: "text", content: text.slice(cursor) });
  if (!blocks.length) {
    return (
      <span className="whitespace-pre-wrap">
        <InlineCode text={text} inverted={inverted} />
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) =>
        block.kind === "code" ? (
          <CodeBlock
            key={`code-${index}`}
            code={block.content}
            language={block.language}
          />
        ) : block.content.trim() ? (
          <div key={`text-${index}`} className="whitespace-pre-wrap">
            <InlineCode text={block.content.trim()} inverted={inverted} />
          </div>
        ) : null,
      )}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const t = useTranslations("Practice");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-white/10 bg-[#092c51] text-[#e8f7df] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-4 py-2">
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#b9d7ca] uppercase">
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-md px-2 py-1 font-mono text-[10px] font-semibold text-[#65e6d2] transition hover:bg-white/10"
          aria-label={t("codeEditor.copyAria")}
        >
          {copied ? t("codeEditor.copied") : t("codeEditor.copy")}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-left font-mono text-[12px] leading-6 [tab-size:2] sm:text-[13px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function RubricList({
  title,
  items,
  warning = false,
}: {
  title: string;
  items: string[];
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        warning
          ? "border-[#a65c0e]/20 bg-[#fff1f1]"
          : "border-[#285f86]/15 bg-[#f8fafc]"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#43546a]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={warning ? "text-[#a65c0e]" : "text-[#285f86]"}>
              {warning ? "×" : "✓"}
            </span>
            <span><InlineCode text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatCoachFeedback(
  feedback: CoachFeedback,
  verdictLabel: string,
  correctionsLabel: string,
) {
  const corrections = feedback.corrections.length
    ? `\n\n${correctionsLabel}\n${feedback.corrections.map((item) => `- ${item}`).join("\n")}`
    : "";
  return `${feedback.score}/100 · ${verdictLabel}\n\n${feedback.summary}\n\n${feedback.explanation}${corrections}`;
}

function RescueRetryOutcomePanel({
  state,
  score,
  onRetry,
  onContinue,
}: {
  state: RescueRetryState;
  score: number;
  onRetry: () => void;
  onContinue?: () => void;
}) {
  const t = useTranslations("Practice");
  if (state.phase === "retrying") return null;

  const passed = state.phase === "passed";
  const needsRepair = state.phase === "needs_repair";
  const outcomeLabel = passed
    ? state.reviewRating === "easy"
      ? t("rating.easy")
      : t("rating.good")
    : needsRepair
      ? state.repairRating === "again"
        ? t("rating.again")
        : t("rating.hard")
      : null;

  return (
    <section
      className={`mt-5 rounded-[1.25rem] border-2 p-5 shadow-sm sm:p-6 ${
        state.phase === "rescue"
          ? "border-[#a65c0e]/25 bg-[#fff4e8]"
          : passed
            ? "border-[#285f86]/30 bg-[#edf8e8]"
            : "border-[#a65c0e]/25 bg-[#fff1f1]"
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#285f86] uppercase">
        {state.phase === "rescue"
          ? t("rescue.helpEyebrow")
          : t("rescue.retryEyebrow", { count: state.attempts })}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0f3a69]">
        {state.phase === "rescue"
          ? t("rescue.helpTitle")
          : passed
            ? t("rescue.passed", { score })
            : t("rescue.failed", { score })}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#43546a]">
        {state.phase === "rescue"
          ? t("rescue.helpDescription")
          : passed
            ? t("rescue.passedDescription", { rating: outcomeLabel ?? "" })
            : t("rescue.failedDescription", { rating: outcomeLabel ?? "" })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {state.phase === "rescue" ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
          >
            {t("rescue.retryWithoutSolution")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
            >
              {passed
                ? t("rescue.passContinue")
                : t("rescue.repairContinue")}
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-[#285f86]/25 bg-white/70 px-5 py-3 text-sm font-bold text-[#16865a] transition hover:-translate-y-0.5 hover:bg-white focus:ring-4 focus:ring-[#65e6d2]/60 focus:outline-none"
            >
              {passed ? t("rescue.retryAgain") : t("rescue.retryNow")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CoachFeedbackPanel({
  feedback,
  model,
  rescueMode,
  learningActionLoading,
  learningActionDisabled,
  deepDiveOpen,
  feedbackSaved,
  onToggleSaveFeedback,
  onExpandNextStep,
  onExploreInterviewerQuestion,
}: {
  feedback: CoachFeedback;
  model?: string;
  rescueMode: boolean;
  learningActionLoading: boolean;
  learningActionDisabled: boolean;
  deepDiveOpen: boolean;
  feedbackSaved: boolean;
  onToggleSaveFeedback: () => void;
  onExpandNextStep: () => void;
  onExploreInterviewerQuestion: () => void;
}) {
  const t = useTranslations("Practice");
  const ratingOptions = useRatingOptions();
  const suggestedRating = ratingOptions.find(
    (option) => option.value === feedback.suggestedRating,
  );
  const metCoverage = feedback.coverage.filter((item) => item.status === "met");
  const incompleteCoverage = feedback.coverage.filter(
    (item) => item.status !== "met",
  );
  const strengths = feedback.strengths.length
    ? feedback.strengths
    : metCoverage.map((item) => item.criterion);
  const improvements = [
    ...feedback.corrections,
    ...incompleteCoverage.map(
      (item) => `${item.criterion}: ${item.feedback}`,
    ),
  ].slice(0, 3);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#285f86]/20 bg-[#f8fafc] shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-start justify-between gap-4 bg-[color:var(--pine)] p-5 text-white sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/8 text-center">
            <span className="font-mono text-xl font-bold text-[color:var(--accent)]">
              {rescueMode ? "AI" : feedback.score}
            </span>
            <span className="font-mono text-[9px] tracking-[0.1em] text-white/55 uppercase">
              {rescueMode ? t("coach.helpScore") : "/ 100"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="ui-panel-label text-[color:var(--accent)]">
                {rescueMode ? t("coach.help") : t("coach.feedback")}
              </p>
              <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] text-white/60">
                {model || "OpenAI"}
              </span>
            </div>
            <h2 className="mt-2 text-balance text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              {rescueMode
                ? t("coach.understandThenRetry")
                : t(`coach.verdict.${feedback.verdict}`)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
              {feedback.summary}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSaveFeedback}
          className="min-h-10 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-bold text-white/80 transition hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
        >
          {feedbackSaved ? t("coach.saved") : t("coach.saveFeedback")}
        </button>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-px overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] lg:grid-cols-3">
          <section className="bg-[color:var(--surface-raised)] p-5">
            <p className="ui-panel-label text-[#285f86]">{t("coach.strengths")}</p>
            {strengths.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#526276]">
                {strengths.slice(0, 3).map((strength) => (
                  <li key={strength} className="flex gap-2">
                    <span aria-hidden="true" className="font-bold text-[#65a30d]">✓</span>
                    <span><InlineCode text={strength} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#526276]">
                {t("coach.noStrength")}
              </p>
            )}
          </section>

          <section className="bg-[#fff8f2] p-5">
            <p className="ui-panel-label text-[#a34d30]">{t("coach.improvements")}</p>
            {improvements.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#9f2f2f]">
                {improvements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">→</span>
                    <span><InlineCode text={item} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#9f2f2f]">
                {t("coach.noImprovement")}
              </p>
            )}
          </section>

          <section className="flex flex-col bg-[#edffd0] p-5">
            <p className="ui-panel-label text-[#285f86]">{t("coach.next")}</p>
            <p className="mt-3 text-sm leading-6 font-semibold text-[#285f86]">
              <InlineCode text={feedback.nextStep} />
            </p>
            {rescueMode ? (
              <p className="mt-4 text-xs leading-5 text-[#43546a]">
                {t("coach.rescueNext")}
              </p>
            ) : (
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  onClick={onExpandNextStep}
                  disabled={learningActionLoading || learningActionDisabled}
                  className="min-h-10 rounded-lg border border-[#285f86]/20 bg-white/75 px-3 text-xs font-bold text-[#16865a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
                >
                  {learningActionLoading
                    ? t("coach.expanding")
                    : t("coach.learnMore")}
                </button>
                <button
                  type="button"
                  onClick={onExploreInterviewerQuestion}
                  className="min-h-10 rounded-lg bg-[color:var(--pine)] px-3 text-xs font-bold text-white transition hover:bg-[color:var(--pine-strong)] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  {deepDiveOpen
                    ? t("coach.hideExtended")
                    : t("coach.answerExtended")}
                </button>
              </div>
            )}
          </section>
        </div>

        {!rescueMode ? (
          <p className="rounded-lg border border-[#285f86]/16 bg-white/65 px-4 py-3 text-sm text-[#43546a]">
            {t("coach.suggestedRating", {
              rating: suggestedRating?.label ?? "",
            })}
          </p>
        ) : null}

        <details className="rounded-xl border border-[color:var(--border-subtle)] bg-white/65 p-4 open:bg-white">
          <summary className="cursor-pointer text-sm font-bold text-[#16865a] marker:text-[#285f86]">
            {t("coach.fullReason")}
          </summary>
          <div className="mt-5 space-y-6 border-t border-[color:var(--border-subtle)] pt-5">
            <div>
              <p className="text-sm font-bold text-[#16865a]">
                {t("coach.explanation")}
              </p>
              <div className="mt-2 leading-7 text-[#43546a]">
                <RichText text={feedback.explanation} />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-[#16865a]">
                {t("coach.fullRubric")}
              </p>
              <div className="mt-3 divide-y divide-[#0f3a69]/10 rounded-xl border border-[#0f3a69]/12 bg-white px-4">
                {feedback.coverage.map((item) => (
                  <div key={item.criterion} className="grid gap-2 py-4 sm:grid-cols-[5rem_1fr]">
                    <span
                      data-status={item.status}
                      className="coverage-status h-fit w-fit rounded-full px-2.5 py-1 text-[11px] font-bold"
                    >
                      {t(`coach.coverage.${item.status}`)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-6">
                        <InlineCode text={item.criterion} />
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#526276]">
                        <InlineCode text={item.feedback} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function DeepDivePracticePanel({
  question,
  prompt,
  answer,
  feedback,
  model,
  error,
  loading,
  feedbackSaved,
  onAnswer,
  onSubmit,
  onToggleSaveFeedback,
}: {
  question: PracticeQuestion;
  prompt: string;
  answer: string;
  feedback?: CoachFollowUpResponse;
  model?: string;
  error?: string;
  loading: boolean;
  feedbackSaved: boolean;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
  onToggleSaveFeedback: () => void;
}) {
  const t = useTranslations("Practice");
  const sourceById = new Map(
    question.sourceSections.map((section) => [section.id, section]),
  );
  const citedSections = (feedback?.sourceSectionIds ?? [])
    .map((id) => sourceById.get(id))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return (
    <section className="mt-5 rounded-[1.25rem] border border-[#138f8c]/30 bg-[#e6f8f5] p-5 shadow-[0_12px_35px_rgba(15,58,105,0.05)] sm:p-6">
      <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
        {t("deepDive.eyebrow")}
      </p>
      <h3 className="mt-3 text-xl leading-8 font-semibold text-[#172033]">
        <InlineCode text={prompt} />
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#526276]">
        {t("deepDive.description")}
      </p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor={`deep-dive-${question.id}`} className="text-sm font-bold text-[#285f86]">
          {t("deepDive.answer")}
        </label>
        <textarea
          id={`deep-dive-${question.id}`}
          value={answer}
          onChange={(event) => onAnswer(event.target.value)}
          rows={5}
          disabled={loading}
          placeholder={t("deepDive.placeholder")}
          className="mt-2 w-full resize-y rounded-2xl border border-[#285f86]/20 bg-white/80 px-4 py-3 leading-7 outline-none transition focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/55 disabled:bg-[#eaf2f8]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-[#64748b]">
            {t("deepDive.autosave")}
          </span>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#0f3a69] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
          >
            {loading
              ? t("question.aiHelping")
              : answer.trim()
                ? t("deepDive.grading")
                : t("deepDive.explaining")}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl bg-[#fff1f1] px-3 py-2 text-sm text-[#c43d3d]" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <div className="mt-5 rounded-2xl border border-[#285f86]/15 bg-white/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-[#16865a]">
                {t("deepDive.feedback")}
              </p>
              {model ? (
                <span className="rounded-full bg-[#eaf2f8] px-2 py-0.5 font-mono text-[10px] text-[#285f86]">
                  {model}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onToggleSaveFeedback}
              className="rounded-lg border border-[#285f86]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#285f86]"
            >
              {feedbackSaved ? t("deepDive.saved") : t("deepDive.save")}
            </button>
          </div>
          <div className="mt-3 text-sm leading-7 text-[#526276]">
            <RichText text={feedback.answer} />
          </div>
          {citedSections.length ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#0f3a69]/10 pt-3">
              {citedSections.map((section) => (
                <span key={section.id} className="rounded-full bg-[#eaf2f8] px-2.5 py-1 text-[11px] font-semibold text-[#285f86]">
                  {t("deepDive.source", { heading: section.heading })}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CoachFollowUpPanel({
  question,
  messages,
  input,
  error,
  loading,
  isMessageSaved,
  onToggleSaveMessage,
  onInput,
  onSubmit,
}: {
  question: PracticeQuestion;
  messages: FollowUpChatMessage[];
  input: string;
  error?: string;
  loading: boolean;
  isMessageSaved: (index: number) => boolean;
  onToggleSaveMessage: (index: number, message: FollowUpChatMessage) => void;
  onInput: (value: string) => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("Practice");
  const limitReached = messages.length >= 8;
  const sourceById = new Map(
    question.sourceSections.map((section) => [section.id, section]),
  );

  return (
    <section className="mt-5 rounded-[1.25rem] border border-[#0f3a69]/16 bg-white/70 p-5 shadow-[0_12px_35px_rgba(15,58,105,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#285f86] uppercase">
            {t("followUp.eyebrow")}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#526276]">
            {t("followUp.description")}
          </p>
        </div>
        <span className="rounded-full bg-[#eaf2f8] px-3 py-1 font-mono text-[11px] text-[#43546a]">
          {t("followUp.turns", { count: Math.floor(messages.length / 2) })}
        </span>
      </div>

      {messages.length ? (
        <div className="mt-5 space-y-4" aria-live="polite">
          {messages.map((message, index) => {
            const citedSections = (message.sourceSectionIds ?? [])
              .map((id) => sourceById.get(id))
              .filter((section): section is NonNullable<typeof section> => Boolean(section));
            return (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#0f3a69] px-4 py-3 text-sm leading-6 text-white"
                    : "max-w-[94%] rounded-2xl rounded-bl-md border border-[#285f86]/15 bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#526276]"
                }
              >
                <RichText
                  text={message.content}
                  inverted={message.role === "user"}
                />
                {message.role === "assistant" && message.model ? (
                  <span className="mt-3 inline-block rounded-full bg-[#eaf2f8] px-2 py-0.5 font-mono text-[10px] text-[#285f86]">
                    {message.model}
                  </span>
                ) : null}
                {citedSections.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#0f3a69]/10 pt-3">
                    {citedSections.map((section) => (
                      <span
                        key={section.id}
                        title={`#${section.id}`}
                        className="rounded-full bg-[#eaf2f8] px-2.5 py-1 text-[11px] font-semibold text-[#285f86]"
                      >
                        {t("followUp.source", { heading: section.heading })}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.checkQuestion ? (
                  <p className="mt-3 rounded-xl bg-[#65e6d2]/45 px-3 py-2 text-xs font-semibold text-[#285f86]">
                    {t("followUp.selfCheck")} <InlineCode text={message.checkQuestion} />
                  </p>
                ) : null}
                {message.role === "assistant" ? (
                  <button
                    type="button"
                    onClick={() => onToggleSaveMessage(index, message)}
                    className="mt-3 rounded-lg border border-[#285f86]/15 bg-white/60 px-2.5 py-1.5 text-[11px] font-bold text-[#285f86] transition hover:bg-white"
                  >
                    {isMessageSaved(index)
                      ? t("followUp.saved")
                      : t("followUp.save")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor={`follow-up-${question.id}`} className="sr-only">
          {t("followUp.label")}
        </label>
        <textarea
          id={`follow-up-${question.id}`}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          maxLength={2000}
          rows={3}
          disabled={loading || limitReached}
          placeholder={t("followUp.placeholder")}
          className="w-full resize-y rounded-2xl border border-[#0f3a69]/18 bg-white px-4 py-3 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/45 disabled:bg-[#eaf2f8]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#718096]">
            {limitReached
              ? t("followUp.limit")
              : t("followUp.helper")}
          </p>
          <button
            type="submit"
            disabled={!input.trim() || loading || limitReached}
            className="rounded-xl bg-[#0f3a69] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
          >
            {loading ? t("followUp.loading") : t("followUp.submit")}
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-xl bg-[#fff1f1] px-3 py-2 text-sm text-[#c43d3d]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function SourceNotes({ question }: { question: PracticeQuestion }) {
  return (
    <div className="mt-4 space-y-3">
      {question.sourceSections.map((section) => (
        <div key={section.id} className="rounded-2xl bg-[#092c51] p-5 text-[#e6f8f5]">
          <p className="font-mono text-xs text-[#65e6d2]">#{section.id}</p>
          <p className="mt-2 font-semibold">{section.heading}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/70">
            {section.excerpt}
            {section.excerpt.length === 900 ? "…" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function SavedItemsControl({
  items,
  onRemove,
  onOpenQuestion,
}: {
  items: SavedItem[];
  onRemove: (itemId: string) => void;
  onOpenQuestion: (questionId: string) => void;
}) {
  const t = useTranslations("Practice");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#0f3a69]/15 bg-white/55 px-3 py-2 text-xs font-bold transition hover:bg-white"
      >
        {t("saved.button", { count: items.length })}
      </button>
      {open ? (
        <SavedLibrary
          items={items}
          onClose={() => setOpen(false)}
          onRemove={onRemove}
          onOpenQuestion={(questionId) => {
            onOpenQuestion(questionId);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function SavedLibrary({
  items,
  onClose,
  onRemove,
  onOpenQuestion,
}: {
  items: SavedItem[];
  onClose: () => void;
  onRemove: (itemId: string) => void;
  onOpenQuestion: (questionId: string) => void;
}) {
  const t = useTranslations("Practice");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#092c51]/35 p-3 backdrop-blur-sm sm:p-5" role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("saved.dialog")}
        className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[1.25rem] border border-white/35 bg-[#f8fafc] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#0f3a69]/12 p-5 sm:p-7">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.15em] text-[#a65c0e] uppercase">
              {t("saved.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("saved.title")}</h2>
            <p className="mt-2 text-sm text-[#526276]">
              {t("saved.count", { count: items.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("saved.close")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#0f3a69]/15 bg-white text-lg font-bold"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {items.map((item) => (
            <SavedLibraryItem
              key={item.id}
              item={item}
              onOpenQuestion={onOpenQuestion}
              onRemove={onRemove}
            />
          ))}
          {!items.length ? (
            <div className="rounded-2xl border border-dashed border-[#0f3a69]/20 px-5 py-12 text-center text-sm leading-6 text-[#526276]">
              {t("saved.empty")}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function SavedLibraryItem({
  item,
  onOpenQuestion,
  onRemove,
}: {
  item: SavedItem;
  onOpenQuestion: (questionId: string) => void;
  onRemove: (itemId: string) => void;
}) {
  const t = useTranslations("Practice");
  const locale = useLocale() as Locale;
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-2xl border border-[#0f3a69]/12 bg-white/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${item.kind === "question" ? "bg-[#65e6d2] text-[#285f86]" : "bg-[#e3ddff] text-[#55468c]"}`}>
          {item.kind === "question" ? t("saved.question") : t("saved.aiAnswer")}
        </span>
        <time className="font-mono text-[10px] text-[#718096]">
          {new Date(item.savedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}
        </time>
      </div>
      <h3 className="mt-3 font-semibold">{item.title}</h3>
      {item.context ? (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#64748b]">
          <InlineCode text={item.context} />
        </p>
      ) : null}
      <details
        className="group mt-3 rounded-xl bg-[#f8fafc] px-3 py-2.5"
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none text-xs font-bold text-[#285f86]">
          <span className="group-open:hidden">{t("saved.view")}</span>
          <span className="hidden group-open:inline">{t("saved.collapse")}</span>
        </summary>
        {expanded ? (
          <div className="mt-3 text-sm leading-6 text-[#526276]">
            <RichText text={item.content} />
          </div>
        ) : null}
      </details>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenQuestion(item.questionId)}
          className="rounded-lg border border-[#285f86]/18 bg-white px-3 py-2 text-xs font-bold text-[#285f86]"
        >
          {t("saved.openOriginal")}
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-lg px-3 py-2 text-xs font-bold text-[#a0442d] hover:bg-[#fff1f1]"
        >
          {t("saved.remove")}
        </button>
      </div>
    </article>
  );
}
