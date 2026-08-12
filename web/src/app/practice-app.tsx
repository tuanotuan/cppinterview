"use client";

import Link, { useLinkStatus } from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

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
import {
  ENABLED_PRACTICE_DECK_IDS,
  PRACTICE_DECKS,
} from "@/lib/content/decks";
import type {
  ContentLanguage,
  ContentQuestion,
  PracticeDeckId,
} from "@/lib/content/schema";
import type { EditableQuestionContent } from "@/lib/content/question-overrides";
import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import {
  questionDifficultyLabels,
  questionResponseModeLabels,
} from "@/lib/content/user-facing-labels";
import type { PracticeAccount } from "@/lib/practice/cloud-server";
import {
  buildCandidateAnswer,
  requiresCodeAnswer,
} from "@/lib/practice/candidate-answer";
import { QuestionEditorDialog } from "./question-editor-dialog";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  buildCustomStudyQueue,
  type CustomStudyFilters,
} from "@/lib/practice/custom-study";
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
  parseStudySession,
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
  buildAnkiDailyQueue,
  buildLearningStates,
  countLearningStates,
  filterReviewsForLearningHistory,
  ratingIntervalDays,
  scheduleQuestionReview,
  type QuestionLearningState,
} from "@/lib/practice/learning-state";
import type { FocusQueueReason } from "@/lib/worldquant/focus-plan";
import {
  worldQuantCompetencies,
  type WorldQuantCompetencyKey,
} from "@/lib/worldquant/readiness";

const MonacoCodeEditor = dynamic(
  () =>
    import("./scenario-code-editor").then((module) => module.MonacoCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-96 place-items-center bg-[#0b241d] font-mono text-xs text-white/45">
        Đang tải trình soạn mã…
      </div>
    ),
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

const ratingOptions: Array<{
  value: Rating;
  label: string;
  interval: string;
  tone: string;
}> = [
  { value: "again", label: "Chưa nhớ", interval: "1 ngày", tone: "red" },
  { value: "hard", label: "Khó", interval: "2 ngày", tone: "orange" },
  { value: "good", label: "Ổn", interval: "4 ngày", tone: "green" },
  { value: "easy", label: "Dễ", interval: "7 ngày", tone: "lime" },
];

type PracticeStandard = "cpp98" | "cpp11" | "cpp20" | "python3" | "cmake";

const learningStateLabels = {
  new: "Mới",
  learning: "Đang học",
  review: "Ôn tập",
  relearning: "Học lại",
} as const;

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
  focusReturnHref,
  mistakeQuestionIds,
}: {
  questions: PracticeQuestion[];
  reviewQueue: PracticeQuestion[];
  sourceRevision: string;
  cloudEnabled: boolean;
  account: PracticeAccount | null;
  guestMode: boolean;
  canManageQuestionBank: boolean;
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
  focusReturnHref: string | null;
  mistakeQuestionIds: string[];
}) {
  const accountId = account?.id ?? null;
  const usesPublicAi = !canManageQuestionBank;
  const studySessionKey = useMemo(
    () => studySessionStorageKey(accountId),
    [accountId],
  );
  const savedItemsKey = useMemo(
    () => savedItemsStorageKey(accountId),
    [accountId],
  );
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
  const [customStudyIds, setCustomStudyIds] = useState<string[] | null>(null);
  const [customStudyNotice, setCustomStudyNotice] = useState<string | null>(null);
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
  const [deckTransitionPending, startDeckTransition] = useTransition();
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
  const scrollToRatingWhenAvailable = useRef(false);
  const scrollToCoachFeedbackWhenAvailable = useRef(false);
  const pendingSessionSaveRef = useRef<(() => void) | null>(null);
  const coachRequestTokensRef = useRef<Record<string, string>>({});
  const clarificationRequestTokensRef = useRef<Record<string, string>>({});
  const reviewCompletionLocksRef = useRef<Set<string>>(new Set());
  const studySessionGenerationRef = useRef(0);
  const [hydratedStudySessionKey, setHydratedStudySessionKey] =
    useState<string | null>(null);
  const sessionHydrated =
    hydratedStudySessionKey === studySessionKey;
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
            `Đã phát hiện ${candidates.length} điểm cần cải thiện; đang tạo thẻ ôn tập để chờ duyệt.`,
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
            `Đã đưa ${candidates.length} lỗi vào Hộp lỗi cần ôn. Mở trang Quản trị để tạo thẻ.`,
          );
        }
      } else if (payload.mistakeQueueAvailable === false) {
        setMistakeNotice(
          "Danh sách lỗi chưa được cài bản cập nhật cơ sở dữ liệu trong Supabase.",
        );
      }
    },
    [],
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
    if (sessionHydrationStarted.current === studySessionKey) return;
    sessionHydrationStarted.current = studySessionKey;

    const session = parseStudySession(
      window.localStorage.getItem(studySessionKey),
      sessionQuestions,
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
    setHydratedStudySessionKey(studySessionKey);
  }, [sessionQuestions, studySessionKey]);

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
              "Phiên ôn tập trọng tâm đã được tiếp tục ở một thẻ trình duyệt khác. Trang này đã tải tiến độ mới nhất và sẽ không ghi đè.",
            );
          })
          .catch(() => {
            setFocusNotice(
              "Danh sách đã được đối chiếu trong thẻ này nhưng trình duyệt không lưu được thay đổi.",
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
            "Phiên ôn tập trọng tâm đã được tiếp tục ở một thẻ trình duyệt khác. Trang này đã tải tiến độ mới nhất và sẽ không ghi đè.",
          );
        })
        .catch(() => {
          setFocusNotice(
            "Danh sách đã được đối chiếu trong thẻ này nhưng trình duyệt không lưu được thay đổi.",
          );
        });
    } catch {
      setFocusNotice(
        "Danh sách đã được đối chiếu trong thẻ này nhưng trình duyệt không lưu được thay đổi.",
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
    requestedFocusId,
    today,
  ]);

  const {
    completedToday,
    deckCounts,
    deckQuestions,
    latest,
    learningCounts,
    learningStates,
    questionById,
    remainingIds,
    selectedPendingReview,
    streak,
  } = useMemo(() => {
    const nextDeckCounts = {
      "cpp-interview": 0,
      "python-interview": 0,
      "cmake-build-systems": 0,
    } satisfies Record<PracticeDeckId, number>;
    availableQuestions.forEach((question) => {
      nextDeckCounts[question.taxonomy.deckId] += 1;
    });

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
    const nextLearningStates = buildLearningStates(
      nextDeckQuestions.map((question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
      })),
      nextDeckReviews,
      cloudQuestionStates.filter((state) =>
        deckQuestionIds.has(state.questionId),
      ),
    );
    const nextLatest = latestReviews(nextDeckReviews);
    const nextRemainingIds = buildAnkiDailyQueue(
      nextLearningStates,
      today,
      { priorityQuestionIds: mistakeQuestionIds },
    ).filter(
      (questionId) => nextLatest.get(questionId)?.reviewedOn !== today,
    );
    const nextCompletedToday = new Set(
      nextDeckReviews
        .filter((review) => review.reviewedOn === today)
        .map((review) => review.questionId),
    ).size;

    return {
      completedToday: nextCompletedToday,
      deckCounts: nextDeckCounts,
      deckQuestions: nextDeckQuestions,
      latest: nextLatest,
      learningCounts: countLearningStates(nextLearningStates.values()),
      learningStates: nextLearningStates,
      questionById: nextQuestionById,
      remainingIds: nextRemainingIds,
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
    );
    clearStudySessionState();
    setSelectedQuestionId(null);
    if (!ids.length) {
      setCustomStudyIds(null);
      setCustomStudyNotice(
        "Không còn câu phù hợp với lựa chọn từ trang Thống kê.",
      );
      return;
    }
    setCustomStudyIds(ids);
    setCustomStudyNotice(
      `Đã mở phiên luyện từ Thống kê gồm ${ids.length} câu.`,
    );
    window.scrollTo({ top: 0 });
  }, [
    deckQuestions,
    clearStudySessionState,
    hasFocusRequest,
    initialCustomStudyFilters,
    learningStates,
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
  const repairItem = isFocusActive
    ? null
    : nextRecallRepair(
        repairQueue,
        validRepairQuestions,
        { allowEarly: !normalCurrent },
      );
  const repairQuestion = repairItem
    ? allQuestionById.get(repairItem.questionId)
    : undefined;
  const current = isFocusActive
    ? focusQuestion
    : repairQuestion ?? normalCurrent;

  if (snapshot === null) {
    return <LoadingScreen />;
  }

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
    ? isFocusActive || isRepairActive
      ? allLearningStates.get(current.id)
      : learningStates.get(current.id)
    : undefined;
  const isRandomQuestion = Boolean(
    !isFocusActive &&
      !isRepairActive &&
      current &&
      selectedQuestionId === current.id &&
      !remainingIds.includes(current.id),
  );
  const isCustomStudyQuestion = Boolean(
    !isFocusActive &&
      !isRepairActive &&
      current &&
      customStudyIds?.includes(current.id),
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
          "Phiên ôn tập trọng tâm đã được tiếp tục ở một thẻ trình duyệt khác. Trang này đã tải tiến độ mới nhất và sẽ không khôi phục danh sách cũ.",
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
          "Phiên ôn tập trọng tâm đã được tiếp tục ở một thẻ trình duyệt khác. Trang này đã tải tiến độ mới nhất và sẽ không khôi phục danh sách cũ.",
        );
        return result.session?.sessionId === requestedFocusId
          ? result.session
          : nextSession;
      }
      setFocusNotice(null);
      return nextSession;
    } catch {
      setFocusNotice(
        "Tiến độ phiên ôn tập mới chỉ được giữ trong thẻ này vì trình duyệt không ghi được vào bộ nhớ trên thiết bị.",
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
        setCustomStudyNotice("Đã hoàn thành phiên học tự chọn.");
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

  function startCustomStudy(filters: CustomStudyFilters) {
    const ids = buildCustomStudyQueue(
      deckQuestions,
      learningStates,
      today,
      filters,
    );
    if (!ids.length) {
      setCustomStudyNotice("Không có câu nào khớp bộ lọc của phiên học tự chọn.");
      return;
    }
    clearStudySessionState();
    setSelectedQuestionId(null);
    setCustomStudyIds(ids);
    setCustomStudyNotice(`Đã tạo phiên học tự chọn gồm ${ids.length} câu.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showRandomQuestion() {
    if (!randomCandidates.length) return;
    const next = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
    clearStudySessionState();
    setCustomStudyIds(null);
    setSelectedQuestionId(next.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectDeck(deck: PracticeDeckId) {
    if (isFocusActive) return;
    if (deck === requestedDeck) return;
    setRequestedDeck(deck);
    const url = new URL(window.location.href);
    url.searchParams.set("deck", deck);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
    startDeckTransition(() => {
      clearStudySessionState();
      setSelectedQuestionId(null);
      setCustomStudyIds(null);
      setCustomStudyNotice(null);
      setSelectedDeck(deck);
    });
  }

  function pauseFocusSprint() {
    window.location.assign(focusReturnHref ?? "/worldquant");
  }

  async function cancelFocusSprint() {
    try {
      if (
        !requestedFocusId ||
        !focusSession
      ) {
        setFocusNotice(
          "Phiên ôn tập đã được tiếp tục ở một thẻ trình duyệt khác. Trang này sẽ không xóa tiến độ mới nhất; hãy tạm dừng để về Trung tâm chuẩn bị.",
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
          "Phiên ôn tập đã được tiếp tục ở một thẻ trình duyệt khác. Trang này sẽ không xóa tiến độ mới nhất; hãy tạm dừng để về Trung tâm chuẩn bị.",
        );
        return;
      }
      window.location.assign(focusReturnHref ?? "/worldquant");
    } catch {
      setFocusNotice(
        "Chưa xóa được phiên ôn tập khỏi bộ nhớ trên thiết bị. Hãy kiểm tra quyền lưu trữ của trình duyệt rồi thử lại.",
      );
    }
  }

  function toggleReferenceAnswer() {
    if (!current) return;
    const willReveal = !revealed.has(current.id);
    scrollToRatingWhenAvailable.current =
      willReveal && !rescueRetryBlocksRating(currentRescueRetry);
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
        throw new Error(payload.error || "Không thể lưu thay đổi của thẻ.");
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
          : "Không thể lưu thay đổi của thẻ.",
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
          publicAiCoachErrorMessage(payload) ||
            payload.error ||
            "Trợ lý AI chưa trả lời được.",
        );
      }

      const nextRescueRetry = resolveRescueRetryAfterCoach({
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
            "AI đã chấm xong nhưng số liệu sử dụng chưa được lưu. Hãy tạm dừng gọi thêm OpenAI và kiểm tra nhật ký.",
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
          error instanceof Error ? error.message : "Trợ lý AI chưa trả lời được.",
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
        body: JSON.stringify({ questionId }),
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
          payload.error || "Luna chưa làm rõ câu hỏi được.",
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
            "Luna đã trả lời nhưng số liệu sử dụng chưa được lưu. Hãy tạm dừng gọi thêm AI và kiểm tra nhật ký.",
        }));
      }
    } catch (error) {
      if (clarificationRequestTokensRef.current[questionId] === requestToken) {
        setQuestionClarificationErrors((errors) => ({
          ...errors,
          [questionId]:
            error instanceof Error
              ? error.message
              : "Luna chưa làm rõ câu hỏi được.",
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
          publicAiCoachErrorMessage(payload) ||
            payload.error ||
            "AI chưa giải thích thêm được.",
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
          [questionId]: "AI đã trả lời nhưng số liệu sử dụng chưa được lưu.",
        }));
      }
    } catch (error) {
      if (studySessionGenerationRef.current !== sessionGeneration) {
        return;
      }
      setFollowUpErrors((errors) => ({
        ...errors,
        [questionId]:
          error instanceof Error ? error.message : "AI chưa giải thích thêm được.",
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
      ? `Câu trả lời tôi tự làm: ${answer}\n\nHãy nhận xét câu trả lời như người phỏng vấn: chỉ ra phần đúng, phần thiếu hoặc sai, rồi mới giải thích để tôi hiểu sâu hơn.`
      : "Tôi để trống vì chưa biết cách trả lời. Hãy dạy tôi từ đầu, giải thích từng ý và đưa ra một câu trả lời phỏng vấn mẫu dễ học.";

    setDeepDiveLoading(questionId);
    setDeepDiveErrors((errors) => ({ ...errors, [questionId]: "" }));
    try {
      const requestMessages = [
        {
          role: "user" as const,
          content: `Đây là câu hỏi phỏng vấn mở rộng: ${followUpQuestion}\n\n${answerContext}`,
        },
      ];
      const idempotencyKey = await coachFollowUpIdempotencyKey({
        questionId,
        questionVersion: current.version,
        sourceRevision,
        candidateAnswer: coachAnswers[questionId] ?? "",
        feedback: coachFeedback[questionId],
        messages: requestMessages,
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
          publicAiCoachErrorMessage(payload) ||
            payload.error ||
            "AI chưa chấm được câu mở rộng.",
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
          [questionId]: "AI đã trả lời nhưng số liệu sử dụng chưa được lưu.",
        }));
      }
    } catch (error) {
      if (studySessionGenerationRef.current !== sessionGeneration) {
        return;
      }
      setDeepDiveErrors((errors) => ({
        ...errors,
        [questionId]:
          error instanceof Error ? error.message : "AI chưa chấm được câu mở rộng.",
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

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-[#173f35]/15 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Về trang chủ Recall"
              title="Về trang chủ Recall"
              className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91] shadow-sm focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            >
              {PRACTICE_DECKS[requestedDeck].badge}
            </Link>
            <div>
              <p className="font-semibold tracking-[-0.02em]">Recall</p>
              <p className="text-xs text-[#64736c]">Luyện phỏng vấn</p>
            </div>
            {isFocusActive ? (
              <span className="rounded-full border border-[#356b58]/20 bg-[#d7ff91]/55 px-3 py-1.5 font-mono text-[11px] font-bold text-[#173f35]">
                PHIÊN ÔN TẬP TRỌNG TÂM WQ
              </span>
            ) : (
              <DeckSwitcher
                selected={requestedDeck}
                counts={deckCounts}
                pending={deckTransitionPending}
                onSelect={selectDeck}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <StatPill icon="◆" value={`${streak} ngày`} label="chuỗi ngày" />
            <StatPill
              icon="✓"
              value={`${completedToday}/${dailyTotal || 1}`}
              label="hôm nay"
            />
            {account && aiBudgetCacheHydrated && aiDailyBudget ? (
              <AiBudgetPill budget={aiDailyBudget} />
            ) : usesPublicAi ? (
              <PublicAiQuotaPill quota={publicAiQuota} />
            ) : null}
            {!isFocusActive ? (
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
            <AccountControl
              account={account}
              cloudEnabled={cloudEnabled}
              guestMode={guestMode}
              syncStatus={syncStatus}
              selectedDeck={requestedDeck}
            />
          </div>
          </div>
          <nav
            aria-label="Điều hướng học tập"
            className="mt-5 hidden items-center gap-1 lg:flex"
          >
            <WorkspaceNavLink href="/practice" active>
              Học hôm nay
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/worldquant/mission">
              Nhiệm vụ
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/worldquant">
              Trung tâm chuẩn bị
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/mock-interview">
              Phỏng vấn thử
            </WorkspaceNavLink>
            <WorkspaceNavLink href="/learn">Thư viện</WorkspaceNavLink>
            <WorkspaceNavLink href={`/stats?deck=${requestedDeck}`}>
              Tiến độ
            </WorkspaceNavLink>
          </nav>
        </header>

        {authNotice ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#ba4b2f]/25 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
          >
            {authNotice}
          </p>
        ) : null}

        {canManageQuestionBank && questionAdminError && !questionAdminEditing ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#ba4b2f]/25 bg-[#f8e8df] px-4 py-3 text-sm text-[#8e3825]"
          >
            {questionAdminError}
          </p>
        ) : null}

        {mistakeNotice ? (
          <div
            role="status"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#356b58]/25 bg-[#eaf4df] px-4 py-3 text-sm text-[#245748]"
          >
            <span>{mistakeNotice}</span>
            <Link href="/admin#mistake-inbox" className="font-bold underline">
              Mở Hộp lỗi cần ôn
            </Link>
          </div>
        ) : null}

        {!isFocusActive ? (
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

        {isFocusActive && focusSession ? (
          <section className="mt-6 rounded-3xl border border-[#356b58]/20 bg-[#eaf4df] p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#356b58] uppercase">
                  Phiên ôn tập trọng tâm WorldQuant
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#173f35]">
                  Câu {focusPosition}/{focusQueueTotal} · giữ nguyên danh sách đã
                  chốt
                </h1>
                <p className="mt-1 text-sm text-[#596a62]">
                  {focusStep
                    ? `${focusCompetencyLabel(focusStep.competency)} · ${focusReasonLabel(focusStep.queueReason)}`
                    : "Ôn theo điểm cần cải thiện đã chọn ở Trung tâm chuẩn bị."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pauseFocusSprint}
                  className="rounded-xl border border-[#356b58]/25 bg-white/70 px-4 py-2 text-sm font-bold text-[#356b58] transition hover:bg-white"
                >
                  Tạm dừng
                </button>
                <button
                  type="button"
                  onClick={cancelFocusSprint}
                  className="rounded-xl border border-[#ba4b2f]/20 bg-[#f8e8df] px-4 py-2 text-sm font-bold text-[#8e3825] transition hover:bg-[#f4d9cc]"
                >
                  Hủy phiên ôn tập
                </button>
              </div>
            </div>
            {focusStaleDroppedCount > 0 ? (
              <p className="mt-3 text-xs font-semibold text-[#8a5a20]">
                Đã bỏ {focusStaleDroppedCount} câu không còn hợp lệ, bị đình chỉ hoặc đã
                ôn hôm nay; không tự thay bằng nội dung khác.
              </p>
            ) : null}
            {focusNotice ? (
              <p
                className="mt-3 text-xs font-semibold text-[#a3321f]"
                role="alert"
              >
                {focusNotice}
              </p>
            ) : null}
          </section>
        ) : (
          <CustomStudyPanel
            key={selectedDeck}
            activeCount={customRemainingIds.length}
            notice={customStudyNotice}
            onStart={startCustomStudy}
            onStop={() => {
              setCustomStudyIds(null);
              setCustomStudyNotice(
                "Đã dừng phiên học tự chọn, quay lại lịch hôm nay.",
              );
            }}
          />
        )}

        {!isFocusActive && !current && selectedPendingReview.length ? (
          <section className="mt-7 rounded-3xl border border-[#ba4b2f]/25 bg-[#fff4df] p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.15em] text-[#ba4b2f] uppercase">
              Danh sách chờ duyệt
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  {selectedPendingReview.length} câu chờ duyệt
                </h1>
                <p className="mt-1 text-sm text-[#64736c]">
                  Duyệt xong, các câu này sẽ được đưa vào lịch ôn cá nhân.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void approveAllPending()}
                disabled={approvalStatus === "saving"}
                className="rounded-2xl bg-[#ba4b2f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#963a25] disabled:cursor-wait disabled:opacity-60"
              >
                {approvalStatus === "saving" ? "Đang duyệt…" : "Duyệt tất cả"}
              </button>
            </div>
            {approvalStatus === "error" ? (
              <p className="mt-3 text-xs font-semibold text-[#a3321f]">
                Chưa lưu được kết quả duyệt. Kiểm tra bản cập nhật cơ sở dữ liệu
                rồi thử lại.
              </p>
            ) : null}
          </section>
        ) : null}

        {current ? (
          <div className="grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-10">
            <section id="practice-question" className="scroll-mt-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#d7ff91] px-3 py-1 font-mono text-xs font-bold text-[#173f35]">
                    {isFocusActive
                      ? "ÔN TẬP TRỌNG TÂM"
                      : isCustomStudyQuestion
                      ? "PHIÊN HỌC TỰ CHỌN"
                      : isRandomQuestion
                      ? "CÂU NGẪU NHIÊN"
                      : completedToday === 0
                        ? "CÂU HÔM NAY"
                        : "ÔN ĐẾN HẠN"}
                  </span>
                  <span className="font-mono text-xs text-[#6c7b73]">
                    {isFocusActive
                      ? `${focusPosition}/${focusQueueTotal}`
                      : isCustomStudyQuestion && customStudyIds
                      ? `${customStudyIds.length - customRemainingIds.length + 1}/${customStudyIds.length}`
                      : isRandomQuestion
                      ? "ngoài lịch hôm nay"
                      : `${completedToday + 1}/${dailyTotal}`}
                  </span>
                  {currentLearningState ? (
                    <span className="rounded-full border border-[#173f35]/15 bg-white/55 px-2.5 py-1 font-mono text-[10px] font-bold text-[#356b58] uppercase">
                      {learningStateLabels[currentLearningState.state]}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                    className="rounded-xl border border-[#173f35]/18 bg-white/65 px-3 py-2 text-xs font-bold text-[#356b58] transition hover:-translate-y-0.5 hover:bg-white focus:ring-4 focus:ring-[#d7ff91]/55 focus:outline-none"
                  >
                    {isSaved(`question:${current.id}`) ? "★ Đã lưu" : "☆ Lưu câu hỏi"}
                  </button>
                  {canManageQuestionBank && !isFocusActive && !isRepairActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionAdminError(null);
                          setQuestionAdminEditing(true);
                        }}
                        className="rounded-xl border border-[#356b58]/30 bg-[#eaf4df] px-3 py-2 text-xs font-bold text-[#245748] transition hover:-translate-y-0.5 hover:bg-[#dff0d3] focus:ring-4 focus:ring-[#d7ff91]/55 focus:outline-none"
                      >
                        Chỉnh sửa thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveConfirmationOpen(true)}
                        disabled={questionAdminSaving}
                        className="rounded-xl border border-[#ba4b2f]/30 bg-white px-3 py-2 text-xs font-bold text-[#8e3825] transition hover:-translate-y-0.5 hover:bg-[#fff3eb] disabled:cursor-wait disabled:opacity-50 focus:ring-4 focus:ring-[#f8d1bc] focus:outline-none"
                      >
                        Xóa thẻ
                      </button>
                    </>
                  ) : null}
                  {!isFocusActive && !isRepairActive ? (
                    <button
                      type="button"
                      onClick={showRandomQuestion}
                      disabled={!randomCandidates.length}
                      className="rounded-xl border border-[#173f35]/18 bg-white/65 px-3 py-2 text-xs font-bold text-[#356b58] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91]/55 focus:outline-none"
                    >
                      ↻ Câu khác ngẫu nhiên
                    </button>
                  ) : null}
                  <span className="font-mono text-xs text-[#6c7b73]">{today}</span>
                </div>
              </div>

              <article className="overflow-hidden rounded-[2rem] border border-[#173f35]/15 bg-white/65 shadow-[0_20px_70px_rgba(23,63,53,0.08)] backdrop-blur-sm">
                <div className="p-6 sm:p-9 lg:p-11">
                  {isRepairActive ? (
                    <div className="mb-6 rounded-2xl border border-[#ba4b2f]/25 bg-[#f8e8df] p-4 text-sm leading-6 text-[#713929]">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
                        Ôn lại điểm yếu · lần {(repairItem?.attempts ?? 0) + 1}
                      </p>
                      <p className="mt-1 font-semibold">
                        Câu này quay lại sau các thẻ xen kẽ. Lần trả lời này
                        chỉ kiểm tra đã khắc phục điểm yếu hay chưa, không tạo
                        thêm một lượt ôn trong ngày.
                      </p>
                    </div>
                  ) : null}
                  {hasAnswered ? (
                    <div className="flex flex-wrap gap-2">
                      <Tag>{questionDifficultyLabels[current.difficulty]}</Tag>
                      <Tag>{questionResponseModeLabels[current.responseMode ?? "text"]}</Tag>
                    </div>
                  ) : null}

                  <h1
                    className={`${hasAnswered ? "mt-7" : ""} max-w-4xl font-semibold text-[#17221d] ${questionHeadingTypography(currentPrompt)}`}
                  >
                    <InlineCode text={currentPrompt} />
                  </h1>

                  {current.code ? (
                    <pre className="mt-7 overflow-x-auto rounded-2xl border border-[#d7ff91]/20 bg-[#102d26] p-5 font-mono text-[13px] leading-6 text-[#e8f4ec] shadow-inner sm:text-sm">
                      <code>{current.code}</code>
                    </pre>
                  ) : null}

                  {requiresCodeAnswer(current) ? (
                    <div id="practice-answer-area" className="mt-8 space-y-5">
                      <ScenarioCodeEditor
                        language={current.language}
                        value={codeAnswers[current.id] ?? ""}
                        onChange={(value) => updateCodeAnswer(current.id, value)}
                      />
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            className="text-sm font-semibold text-[#344a40]"
                            htmlFor="candidate-answer"
                          >
                            Giải thích lựa chọn thiết kế
                          </label>
                          <span className="font-mono text-[11px] text-[#6c7b73]">
                            không bắt buộc · tự lưu
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
                          className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[#173f35]/20 bg-[#fbfaf5] px-4 py-3 leading-7 outline-none transition focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45"
                          placeholder="Giải thích quyền sở hữu, API, các đánh đổi và quyết định quan trọng…"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        id="practice-answer-area"
                        className="mt-8 flex flex-wrap items-center justify-between gap-2"
                      >
                        <label
                          className="text-sm font-semibold text-[#344a40]"
                          htmlFor="candidate-answer"
                        >
                          Câu trả lời của bạn
                        </label>
                        <span className="font-mono text-[11px] text-[#6c7b73]">
                          ● tự lưu trên trình duyệt
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
                        className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#173f35]/20 bg-[#fbfaf5] px-4 py-3 leading-7 outline-none transition focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45"
                        placeholder="Tự trả lời như đang ngồi phỏng vấn, hoặc để trống nếu chưa biết…"
                      />
                    </>
                  )}

                  <p className="mt-3 text-xs leading-5 text-[#64736c]">
                    Chưa biết thì cứ để trống. Nhờ AI sẽ giải từ đầu; câu trả lời
                    không bị giới hạn ký tự.
                  </p>
                  {usesPublicAi ? (
                    <p className="mt-2 text-xs font-semibold text-[#356b58]">
                      Luna hỗ trợ tối đa 3 lượt AI trong 24 giờ; hạn mức áp dụng theo thiết bị và mạng.
                    </p>
                  ) : null}

                  {currentRescueRetry?.phase === "retrying" ? (
                    <div
                      id="rescue-retry-instruction"
                      className="mt-4 rounded-2xl border border-[#356b58]/25 bg-[#edf3e9] p-4 text-sm text-[#29493d]"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#356b58] uppercase">
                        Làm lại · lượt {currentRescueRetry.attempts + 1}
                      </p>
                      <p className="mt-1 font-semibold">
                        Tự trả lời lại bằng lời của bạn, không nhìn lời giải.
                        Khi xong, nhờ AI chấm lần làm lại.
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
                        className="rounded-xl px-1 py-2 text-sm font-semibold text-[#356b58] underline-offset-4 hover:underline"
                      >
                        {hints.has(current.id) ? "Ẩn gợi ý" : "Cần một gợi ý?"}
                      </button>
                      {canManageQuestionBank ? (
                        <button
                          type="button"
                          onClick={clarifyCurrentQuestion}
                          disabled={questionClarificationLoading === current.id}
                          className="rounded-xl border border-[#356b58]/25 bg-white px-3 py-2 text-sm font-semibold text-[#356b58] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91]/60 focus:outline-none"
                        >
                          {questionClarificationLoading === current.id
                            ? "Luna đang diễn giải…"
                            : questionClarifications[current.id]
                              ? "Làm rõ lại câu hỏi"
                              : "Làm rõ câu hỏi"}
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
                        className="rounded-xl border border-[#356b58]/25 bg-[#d7ff91] px-5 py-3 text-sm font-bold text-[#173f35] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91]/60 focus:outline-none"
                      >
                        {coachLoading === current.id
                          ? currentRescueRetry?.phase === "retrying"
                            ? "AI đang chấm lại…"
                            : "AI đang giúp…"
                          : currentRescueRetry?.phase === "rescue" &&
                              coachFeedback[current.id]
                            ? "Đọc lời giải bên dưới"
                            : currentRescueRetry?.phase === "retrying"
                              ? currentCandidateAnswer
                                ? "Nhờ AI chấm lần làm lại"
                                : "Nhờ AI giải lại"
                              : currentCandidateAnswer
                                ? "Nhờ AI chấm"
                                : "Nhờ AI giải"}
                      </button>
                      <button
                        type="button"
                        onClick={toggleReferenceAnswer}
                        className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245748] focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
                      >
                        {revealed.has(current.id) ? "Ẩn đáp án" : "Mở đáp án"}
                      </button>
                    </div>
                  </div>

                  {hints.has(current.id) ? (
                    <div className="mt-4 rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] p-4 text-sm leading-6 text-[#713929]">
                      <span className="mr-2 font-mono font-bold">gợi ý:</span>
                      <InlineCode text={current.hint} />
                    </div>
                  ) : null}

                  {questionClarifications[current.id] ? (
                    <section
                      className="mt-4 rounded-2xl border border-[#356b58]/20 bg-[#edf3e9] p-4 text-sm text-[#29493d]"
                      aria-live="polite"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#356b58] uppercase">
                          Luna làm rõ đề bài
                        </p>
                        <span className="rounded-full border border-[#356b58]/20 bg-white/65 px-2 py-1 font-mono text-[10px] text-[#356b58]">
                          {questionClarificationModels[current.id] || "Luna"}
                        </span>
                      </div>
                      <p className="mt-3 leading-6">
                        {questionClarifications[current.id].plainLanguage}
                      </p>
                      <div className="mt-4">
                        <div>
                          <p className="font-semibold text-[#173f35]">Đề thực ra muốn bạn làm gì?</p>
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
                      <p className="mt-4 border-t border-[#356b58]/15 pt-3 text-xs leading-5 text-[#52675e]">
                        Chỉ cần hiểu như vậy: {questionClarifications[current.id].scopeNote}
                      </p>
                      <p className="mt-2 text-xs text-[#52675e]">
                        Phần này chỉ diễn giải đề, không mở đáp án hay hướng giải.
                      </p>
                    </section>
                  ) : null}

                  {questionClarificationErrors[current.id] ? (
                    <p
                      className="mt-4 rounded-2xl border border-[#ba4b2f]/25 bg-[#f8e8df] p-4 text-sm text-[#8e3825]"
                      role="alert"
                    >
                      {questionClarificationErrors[current.id]}
                    </p>
                  ) : null}

                  {coachErrors[current.id] ? (
                    <p
                      className="mt-4 rounded-2xl border border-[#ba4b2f]/25 bg-[#f8e8df] p-4 text-sm text-[#8e3825]"
                      role="alert"
                    >
                      {coachErrors[current.id]}
                    </p>
                  ) : null}

                  {canRateCurrent && !rescueOutcomeRating ? (
                    <div
                      ref={handleRatingSectionRef}
                      className="sticky bottom-3 z-20 mt-5 scroll-m-4 rounded-3xl border-2 border-[#356b58]/35 bg-[#fffef9]/95 p-4 shadow-[0_16px_45px_rgba(23,63,53,0.18)] backdrop-blur-md sm:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#173f35]">
                            {isRepairActive
                              ? "Câu này đã được sửa chưa?"
                              : "Chấm mức độ ghi nhớ để sang câu tiếp theo"}
                          </p>
                          <p className="mt-0.5 text-xs text-[#5c6e65]">
                            {isRepairActive
                              ? "Ổn/Dễ kết thúc lượt ôn điểm yếu; Chưa nhớ/Khó sẽ đưa câu này trở lại sau vài thẻ."
                              : revealed.has(current.id)
                              ? "So với đáp án, bạn nhớ được đến đâu?"
                              : "AI đã chấm xong — giờ bạn hãy chọn mức phù hợp."}
                          </p>
                        </div>
                        {currentSuggestedRating ? (
                          <span className="rounded-full bg-[#d7ff91]/70 px-3 py-1 text-xs font-semibold text-[#356b58]">
                            AI gợi ý mức đánh giá: {currentSuggestedRating.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ratingOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => rateCurrent(option.value)}
                            data-tone={option.tone}
                            className="rating-button rounded-2xl border bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
                          >
                            <span className="block text-sm font-bold">{option.label}</span>
                            <span className="mt-1 block font-mono text-[11px] opacity-65">
                              {isRepairActive
                                ? option.value === "good" ||
                                  option.value === "easy"
                                  ? "đã khắc phục"
                                  : "lặp lại trong phiên"
                                : `lại sau ${
                                    currentLearningState
                                      ? `${ratingIntervalDays(currentLearningState, option.value)} ngày`
                                      : option.interval
                                  }`}
                            </span>
                          </button>
                        ))}
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
                              title: `Phản hồi AI · ${current.lessonTitle}`,
                              content: formatCoachFeedback(coachFeedback[current.id]),
                              context: displayQuestionPrompt(current),
                            })
                          }
                          onExpandNextStep={() =>
                            void askCoachFollowUp(
                              `Hãy biến bước tiếp theo này thành một bài học ngắn, dễ hiểu, có ví dụ ${current.language === "python" ? "Python" : "C++"} và một bài tập nhỏ: ${coachFeedback[current.id].nextStep}`,
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
                              title: `Tìm hiểu sâu · ${current.lessonTitle}`,
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
                              title: `AI giải thích · ${current.lessonTitle}`,
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
                    className="scroll-mt-6 border-t border-[#173f35]/12 bg-[#edf3e9] p-6 sm:p-9 lg:p-11"
                  >
                    <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#356b58] uppercase">
                      Đáp án tham khảo
                    </p>
                    <p className="mt-4 text-lg leading-8 font-medium text-[#213d32]">
                      <InlineCode text={current.answer.short} />
                    </p>
                    <details className="mt-5 rounded-2xl border border-[#173f35]/15 bg-white/60 p-4 open:pb-5">
                      <summary className="cursor-pointer text-sm font-bold text-[#356b58]">
                        Giải thích kỹ hơn
                      </summary>
                      <p className="mt-4 leading-7 text-[#465c52]">
                        <InlineCode text={current.answer.detailed} />
                      </p>
                    </details>

                    <div className="mt-7 grid gap-4 md:grid-cols-2">
                      <RubricList title="Ý chính cần có" items={current.rubric.required} />
                      <RubricList
                        title="Bẫy cần tránh"
                        items={current.rubric.misconceptions}
                        warning
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setVisibleSources, current.id)}
                      className="mt-6 text-sm font-bold text-[#356b58] underline decoration-[#356b58]/35 underline-offset-4"
                    >
                      {visibleSources.has(current.id)
                        ? "Ẩn ghi chú nguồn"
                        : "Đối chiếu ghi chú nguồn"}
                    </button>
                    {visibleSources.has(current.id) ? (
                      <SourceNotes question={current} />
                    ) : null}

                  </div>
                ) : null}
              </article>
            </section>

            <aside className="space-y-4 lg:pt-12">
              {!isFocusActive && selectedPendingReview.length ? (
                <div className="rounded-3xl border border-[#ba4b2f]/25 bg-[#fff4df] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs tracking-[0.15em] text-[#ba4b2f] uppercase">
                        Danh sách chờ duyệt
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {selectedPendingReview.length} câu chờ duyệt
                      </p>
                    </div>
                    <span className="rounded-full bg-[#ba4b2f] px-2.5 py-1 font-mono text-xs font-bold text-white">
                      {selectedPendingReview.length}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-[#596a62]">
                    {selectedPendingReview.slice(0, 3).map((question) => (
                      <li key={question.id} className="line-clamp-2">
                        <span className="font-mono text-[10px] font-bold text-[#ba4b2f] uppercase">
                          {question.status === "draft" ? "Bản nháp AI" : "Nguồn đã đổi"}
                        </span>{" "}
                        · {displayQuestionPrompt(question)}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void approveAllPending()}
                    disabled={approvalStatus === "saving"}
                    className="mt-5 w-full rounded-2xl bg-[#ba4b2f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#963a25] disabled:cursor-wait disabled:opacity-60"
                  >
                    {approvalStatus === "saving" ? "Đang duyệt…" : "Duyệt tất cả"}
                  </button>
                  {approvalStatus === "error" ? (
                    <p className="mt-3 text-xs font-semibold text-[#a3321f]">
                      Chưa lưu được kết quả duyệt. Kiểm tra bản cập nhật cơ sở dữ
                      liệu rồi thử lại.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-3xl bg-[#173f35] p-6 text-white">
                <p className="font-mono text-xs tracking-[0.15em] text-[#d7ff91] uppercase">
                  {isFocusActive
                    ? "Tiến độ phiên ôn tập trọng tâm"
                    : "Tiến độ hôm nay"}
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#d7ff91] transition-all"
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
                    ? `${focusSession?.remainingQuestions.length ?? 0} câu còn lại · mức đánh giá vẫn cập nhật lịch ôn chính`
                    : `${remainingIds.length} câu còn lại · ưu tiên câu mới trước`}
                </p>
                {!isFocusActive ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                    <LearningCount label="Mới" value={learningCounts.new} />
                    <LearningCount
                      label="Đang học"
                      value={learningCounts.learning}
                    />
                    <LearningCount label="Ôn tập" value={learningCounts.review} />
                    <LearningCount
                      label="Học lại"
                      value={learningCounts.relearning}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-[#173f35]/15 bg-white/55 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">Tiến độ đồng bộ trực tuyến</p>
                  <SyncDot status={syncStatus} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#64736c]">
                  {account
                    ? syncStatus === "error"
                      ? "Dữ liệu trên thiết bị vẫn an toàn; hệ thống sẽ tự thử lại và đồng bộ phần còn chờ khi kết nối trở lại."
                      : "Đồng bộ riêng tư giữa các thiết bị bằng tài khoản Recall."
                    : cloudEnabled
                      ? "Đăng nhập để bật đồng bộ nhiều thiết bị."
                      : "Chưa cấu hình Supabase; hiện tiến độ chỉ lưu trên thiết bị này."}
                </p>
              </div>

              {hasAnswered ? (
                <div className="rounded-3xl border border-[#173f35]/15 bg-white/55 p-6">
                  <p className="text-xs font-bold tracking-[0.14em] text-[#ba4b2f] uppercase">
                    Chủ đề
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight">
                    {current.lessonTitle}
                  </p>
                  <p className="mt-2 font-mono text-xs leading-5 text-[#6c7b73]">
                    {current.sourcePath}
                  </p>
                </div>
              ) : null}

              <div className="rounded-3xl border border-[#356b58]/20 bg-[#eef4e9] p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">Trợ lý AI</p>
                  <span className="size-2 rounded-full bg-[#65a30d] shadow-[0_0_0_4px_rgba(101,163,13,0.12)]" />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#64736c]">
                  Chấm theo đúng tiêu chí và ghi chú nguồn, sau đó gợi ý một câu
                  hỏi tiếp nối.
                </p>
                <span className="mt-4 inline-block rounded-full bg-[#d7ff91] px-3 py-1 font-mono text-[11px] font-semibold text-[#356b58]">
                  OpenAI · Luna cho AI Coach · Terra cho tổng kết phỏng vấn thử · Gemini khi hết hạn mức
                </span>
              </div>
            </aside>
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
            title="Xóa thẻ khỏi lịch học?"
            description="Thẻ sẽ không còn xuất hiện trong lịch luyện. Lịch sử ôn và các phản hồi AI vẫn được giữ để bạn có thể kiểm tra hoặc khôi phục sau này."
            confirmLabel="Xóa khỏi lịch học"
            busy={questionAdminSaving}
            onCancel={() => setArchiveConfirmationOpen(false)}
            onConfirm={() => {
              setArchiveConfirmationOpen(false);
              void mutateCurrentQuestion("archive");
            }}
          />
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#173f35]/12 py-5 font-mono text-[11px] text-[#78857f]">
          <span>
            {account
              ? `Đồng bộ riêng tư · ${account.displayName}`
              : "Tiến độ lưu trên trình duyệt này"}
          </span>
          <span>Nguồn {sourceRevision.slice(0, 7)}</span>
        </footer>
      </div>
    </main>
  );
}

function focusCompetencyLabel(competency: WorldQuantCompetencyKey) {
  return worldQuantCompetencies[competency].shortLabel;
}

function focusReasonLabel(reason: FocusQueueReason) {
  const labels: Record<FocusQueueReason, string> = {
    due_relearning: "học lại đã đến hạn",
    due_leech: "câu khó nhớ đã đến hạn",
    due: "đã đến hạn",
    relearning: "đang học lại",
    leech: "câu khó nhớ",
    learning: "đang học",
    new: "câu mới",
  };
  return labels[reason];
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="text-center">
        <span className="mx-auto grid size-12 animate-pulse place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
          R
        </span>
        <p className="mt-4 text-sm text-[#64736c]">Đang mở lịch ôn tập…</p>
      </div>
    </main>
  );
}

function FocusUnavailableScreen({
  storageError,
}: {
  storageError: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#ba4b2f]/20 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(23,63,53,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f8e8df] font-mono font-bold text-[#ba4b2f]">
          !
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#ba4b2f] uppercase">
          Không mở được Phiên ôn tập trọng tâm
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#17221d]">
          {storageError
            ? "Trình duyệt đang chặn bộ nhớ trên thiết bị"
            : "Không tìm thấy đúng phiên ôn tập trong đường dẫn này"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64736c]">
          Danh sách không được tự đoán lại hoặc thay bằng phiên khác. Hãy quay
          về Trung tâm chuẩn bị để tiếp tục phiên ôn tập còn lưu hoặc tạo kế
          hoạch mới.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/worldquant"
            className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
          >
            Về Trung tâm chuẩn bị
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#173f35]/18 bg-white px-5 py-3 text-sm font-bold text-[#356b58]"
          >
            Ôn tập bình thường
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
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-[#356b58]/18 bg-white/70 p-8 text-center shadow-[0_20px_70px_rgba(23,63,53,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#173f35] font-mono font-bold text-[#d7ff91]">
          ✓
        </span>
        <p className="mt-5 font-mono text-xs font-bold tracking-[0.14em] text-[#356b58] uppercase">
          Phiên ôn tập trọng tâm đã hoàn tất
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17221d]">
          Đã đánh giá {completedCount} câu
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64736c]">
          Mỗi mức đánh giá đã được xếp lịch và cập nhật bằng chứng sẵn sàng như
          một buổi luyện tập bình thường.
        </p>
        {staleDroppedCount > 0 ? (
          <p className="mt-3 rounded-xl bg-[#fff4df] px-4 py-3 text-xs font-semibold text-[#8a5a20]">
            {staleDroppedCount} câu không còn hợp lệ đã bị bỏ, không được tự
            thay bằng nội dung mới.
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 text-xs font-semibold text-[#a3321f]" role="alert">
            {notice}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={returnHref ?? "/worldquant"}
            className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
          >
            {returnHref
              ? "Tiếp tục bước kế tiếp trong nhiệm vụ"
              : "Xem mức sẵn sàng mới"}
          </Link>
          {returnHref ? (
            <Link
              href="/worldquant"
              className="rounded-xl border border-[#173f35]/18 bg-white px-5 py-3 text-sm font-bold text-[#356b58]"
            >
              Về Trung tâm chuẩn bị
            </Link>
          ) : null}
          <Link
            href="/"
            className="rounded-xl border border-[#173f35]/18 bg-white px-5 py-3 text-sm font-bold text-[#356b58]"
          >
            Tiếp tục luyện tập
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
  return (
    <section className="grid min-h-[72vh] place-items-center py-12">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#d7ff91] text-3xl text-[#173f35]">
          ✓
        </span>
        <p className="mt-7 font-mono text-xs font-bold tracking-[0.16em] text-[#356b58] uppercase">
          {today} · hoàn thành
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Xong buổi ôn hôm nay.
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#64736c]">
          {completedToday} câu đã tự chấm. Chuỗi học hiện tại là {streak} ngày
          — ngày mai quay lại, hệ thống sẽ chọn câu mới và đưa các câu đến hạn
          lên trước.
        </p>
        {hasRandomQuestion ? (
          <button
            type="button"
            onClick={onRandomQuestion}
            className="mt-7 rounded-2xl bg-[#173f35] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#245748] focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
          >
            ↻ Luyện thêm câu ngẫu nhiên
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
  const [learningState, setLearningState] = useState<
    CustomStudyFilters["learningState"]
  >("all");
  const [limit, setLimit] = useState(10);

  return (
    <details className="mt-5 rounded-2xl border border-[#173f35]/15 bg-white/55 px-4 py-3 open:bg-white/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[#356b58]">
        <span>Phiên học tự chọn · ôn theo trạng thái hoặc thẻ</span>
        <span className="font-mono text-xs">
          {activeCount ? `${activeCount} câu còn lại` : "Mở bộ lọc ↓"}
        </span>
      </summary>
      <div className="mt-4 grid gap-3 border-t border-[#173f35]/10 pt-4 sm:grid-cols-2">
        <StudySelect
          label="Trạng thái"
          value={learningState}
          onChange={(value) =>
            setLearningState(value as CustomStudyFilters["learningState"])
          }
          options={[
            ["all", "Tất cả"],
            ["new", "Mới"],
            ["learning", "Đang học"],
            ["review", "Ôn tập"],
            ["relearning", "Học lại"],
            ["due", "Đến hạn"],
            ["leech", "Câu khó nhớ"],
          ]}
        />
        <label className="text-xs font-bold text-[#52645c]">
          Số câu
          <input
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2 text-sm"
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
              skill: "all",
              topic: "all",
              lessonId: "all",
              limit,
            })
          }
          className="rounded-xl bg-[#173f35] px-4 py-2.5 text-xs font-bold text-white"
        >
          Bắt đầu phiên học
        </button>
        {activeCount ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl border border-[#ba4b2f]/25 bg-white px-4 py-2.5 text-xs font-bold text-[#8e3825]"
          >
            Dừng phiên
          </button>
        ) : null}
        {notice ? <p className="text-xs text-[#64736c]">{notice}</p> : null}
      </div>
      <p className="mt-3 text-[11px] text-[#718078]">
        Mức đánh giá trong phiên học tự chọn vẫn cập nhật lịch ôn ngắt quãng
        của câu hỏi.
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
    <label className="text-xs font-bold text-[#52645c]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2 text-sm"
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

function LearningCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <span className="block font-mono text-[10px] tracking-wide text-white/55 uppercase">
        {label}
      </span>
      <strong className="mt-0.5 block text-base text-[#d7ff91]">{value}</strong>
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
  const config = PRACTICE_DECKS[deck];
  return (
    <section className="grid min-h-[64vh] place-items-center py-12">
      <div className="max-w-xl rounded-[2rem] border border-[#173f35]/15 bg-white/65 p-8 text-center shadow-[0_20px_70px_rgba(23,63,53,0.08)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#173f35] font-mono text-lg font-bold text-[#d7ff91]">
          {config.badge}
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Chưa có câu đã duyệt trong {config.label}.
        </h1>
        <p className="mt-4 leading-7 text-[#64736c]">
          {pendingCount
            ? `${pendingCount} câu đang nằm trong danh sách chờ duyệt. Hãy duyệt để bắt đầu luyện.`
            : deck === "cmake-build-systems"
              ? "Thêm bài vào cmake/<tên-bài>/knowledge.md; quy trình sẽ tạo bản nháp và đưa vào danh sách chờ duyệt."
              : deck === "python-interview"
              ? "Thêm bài vào python/<tên-bài>/knowledge.md; quy trình sẽ tạo bản nháp và đưa vào danh sách chờ duyệt."
              : "Thêm hoặc duyệt câu hỏi trong trang Quản trị để bắt đầu luyện."}
        </p>
        <Link
          href="/admin"
          className="mt-7 inline-flex rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white"
        >
          Mở trang Quản trị
        </Link>
      </div>
    </section>
  );
}

function DeckSwitcher({
  selected,
  counts,
  pending,
  onSelect,
}: {
  selected: PracticeDeckId;
  counts: Record<PracticeDeckId, number>;
  pending: boolean;
  onSelect: (deck: PracticeDeckId) => void;
}) {
  return (
    <div
      className="ml-1 flex rounded-xl border border-[#173f35]/15 bg-white/55 p-1"
      aria-label="Chọn bộ câu hỏi"
    >
      {ENABLED_PRACTICE_DECK_IDS.map((deckId) => {
        const deck = PRACTICE_DECKS[deckId];
        const active = deckId === selected;
        return (
          <button
            key={deckId}
            type="button"
            onClick={() => onSelect(deckId)}
            aria-pressed={active}
            aria-busy={active && pending}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-[#173f35] text-white shadow-sm"
                : "text-[#52645c] hover:bg-white/75"
            }`}
          >
            {deck.badge}
            <span className={`ml-1 font-mono text-[9px] ${active ? "text-[#d7ff91]" : "text-[#78857f]"}`}>
              {counts[deckId]}
            </span>
            {active && pending ? (
              <span
                className="ml-1.5 inline-block size-2 animate-pulse rounded-full bg-[#d7ff91]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white/55 px-3 py-2">
      <span className="text-[#ba4b2f]">{icon}</span>
      <span className="font-mono text-xs font-bold">{value}</span>
      <span className="hidden text-xs text-[#6c7b73] sm:inline">{label}</span>
    </div>
  );
}

function AiBudgetPill({ budget }: { budget: AiDailyBudgetSnapshot }) {
  const low = budget.remainingPercent <= 20;
  const usedUsd = budget.actualUsdMicros / 1_000_000;
  const billingLabel = budget.billingSyncedAt
    ? `Chi phí toàn dự án OpenAI: $${((budget.billingUsdMicros ?? 0) / 1_000_000).toFixed(4)} · chỉ chi phí trang web bên dưới mới trừ hạn mức`
    : "Hạn mức trang web được tính từ số token của các lượt gọi tương tác";
  return (
    <div
      className="min-w-32 rounded-full border border-[#173f35]/15 bg-white/55 px-3 py-2"
      title={`${billingLabel} · trang web đã dùng $${usedUsd.toFixed(5)} · ${budget.requestCount} lượt gọi · ${budget.inputTokens + budget.outputTokens} token · mô hình cuối: ${budget.lastModel ?? "chưa có"} · hạn mức trang web/ngày $${(budget.limitUsdMicros / 1_000_000).toFixed(3)} · đặt lại lúc 00:00 giờ Việt Nam`}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase">
        <span>OpenAI hôm nay</span>
        <span className={low ? "text-[#ba4b2f]" : "text-[#245748]"}>
          {budget.remainingPercent}% còn lại
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#173f35]/15">
        <div
          className={`h-full rounded-full transition-[width] ${low ? "bg-[#ba4b2f]" : "bg-[#79b82a]"}`}
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
  const progress = dailyTotal ? Math.round((completedToday / dailyTotal) * 100) : 100;

  return (
    <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#173f35]/15 bg-[#173f35] text-white shadow-[0_20px_70px_rgba(23,63,53,0.16)]">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
            Không gian học hôm nay
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {hasCurrentQuestion
              ? "Sẵn sàng cho câu tiếp theo?"
              : "Bạn đã hoàn tất lịch học hôm nay."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {hasCurrentQuestion
              ? `${remainingCount} câu còn lại trong lịch. Tập trung trả lời trước, phản hồi và gợi ý sẽ chỉ xuất hiện sau đó.`
              : "Bạn có thể dừng tại đây, xem lại ghi chú đã lưu, hoặc luyện thêm một câu ngẫu nhiên ngoài lịch."}
          </p>
          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-6 rounded-xl bg-[#d7ff91] px-5 py-3 text-sm font-bold text-[#173f35] transition hover:-translate-y-0.5 hover:bg-[#e4ffb7] focus:ring-4 focus:ring-white/25 focus:outline-none"
          >
            {hasCurrentQuestion ? "Tiếp tục học →" : "Luyện thêm một câu →"}
          </button>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/8 p-5">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/72">
            <span>Tiến độ hôm nay</span>
            <span className="text-[#d7ff91]">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#d7ff91] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <TodayMetric label="Đã học" value={completedToday} />
            <TodayMetric label="Còn lại" value={remainingCount} />
            <TodayMetric label="Chuỗi" value={`${streak}d`} />
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
  const { limit, exhausted, label, progressPercent } =
    publicAiQuotaPresentation(quota);
  const reset = quota?.resetsAt ? formatPublicAiReset(quota.resetsAt) : null;

  return (
    <div
      className="min-w-32 rounded-full border border-[#173f35]/15 bg-white/55 px-3 py-2"
      title={
        reset
          ? `AI Luna dùng tối đa ${limit} lượt mỗi 24 giờ. Hạn mức hiện tại mở lại ${reset}.`
          : `AI Luna dùng tối đa ${limit} lượt mỗi 24 giờ theo thiết bị và mạng.`
      }
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase">
        <span>AI Luna</span>
        <span className={exhausted ? "text-[#ba4b2f]" : "text-[#245748]"}>
          {label}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#173f35]/15">
        <div
          className={`h-full rounded-full transition-[width] ${
            exhausted ? "bg-[#ba4b2f]" : "bg-[#79b82a]"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function publicAiCoachErrorMessage(payload: CoachApiPayload) {
  switch (payload.code) {
    case "public_ai_quota_exceeded":
      return payload.resetsAt
        ? `Bạn đã dùng hết lượt AI. Hạn mức sẽ mở lại ${formatPublicAiReset(payload.resetsAt)}.`
        : "Bạn đã dùng hết lượt AI trong 24 giờ qua. Vui lòng quay lại sau.";
    case "public_ai_request_unavailable":
      return "Lượt AI này đang được xử lý hoặc đã hoàn tất. Hãy chỉnh nội dung trước khi gửi lại.";
    case "public_ai_disabled":
      return "AI Luna đang tạm thời chưa mở. Vui lòng thử lại sau.";
    case "public_ai_identity_unavailable":
      return "Không xác minh được thiết bị để áp dụng giới hạn AI an toàn. Vui lòng thử lại.";
    case "public_ai_daily_budget_exceeded":
      return "AI Luna hôm nay đã đạt ngân sách an toàn. Vui lòng quay lại ngày mai.";
    case "public_ai_monthly_budget_exceeded":
      return "AI Luna đã đạt ngân sách tháng này. Vui lòng quay lại sau.";
    case "public_ai_not_configured":
    case "public_ai_budget_not_configured":
      return "AI Luna chưa sẵn sàng. Vui lòng thử lại sau.";
    default:
      return null;
  }
}

function formatPublicAiReset(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "sau";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(timestamp);
}

function TodayMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-black/10 px-2 py-3">
      <p className="text-lg font-semibold text-[#d7ff91]">{value}</p>
      <p className="mt-1 text-[10px] font-bold text-white/55 uppercase">{label}</p>
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
      className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
        active
          ? "bg-[#173f35] text-[#d7ff91]"
          : "text-[#64736c] hover:bg-white/65 hover:text-[#173f35]"
      }`}
    >
      {children}
      <HeaderNavPending />
    </Link>
  );
}

function HeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative inline-flex items-center gap-1.5 rounded-full border border-[#173f35]/15 bg-white/65 px-3 py-2 font-mono text-[10px] font-bold uppercase transition hover:border-[#356b58]/40"
    >
      <span>{children}</span>
      <HeaderNavPending />
    </Link>
  );
}

function HeaderNavPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      className="size-2 animate-spin rounded-full border border-[#356b58]/35 border-t-[#356b58]"
      aria-label="Đang chuyển trang"
    />
  ) : null;
}

function AccountControl({
  account,
  cloudEnabled,
  guestMode,
  syncStatus,
  selectedDeck,
}: {
  account: PracticeAccount | null;
  cloudEnabled: boolean;
  guestMode: boolean;
  syncStatus: SyncStatus;
  selectedDeck: PracticeDeckId;
}) {
  if (account) {
    return (
      <div className="flex items-center gap-2">
        <HeaderNavLink href="/mock-interview">
          Phỏng vấn thử
        </HeaderNavLink>
        <HeaderNavLink
          href={`/stats?deck=${selectedDeck}`}
        >
          Thống kê
        </HeaderNavLink>
        <HeaderNavLink
          href="/admin"
        >
          Quản trị
        </HeaderNavLink>
        <Link
          href="/profile"
          title="Mở trang cá nhân"
          className="flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white/65 px-2.5 py-1.5 transition hover:border-[#356b58]/40"
        >
            <span className="grid size-7 place-items-center rounded-full bg-[#173f35] text-xs font-bold text-[#d7ff91]">
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
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="grid size-9 place-items-center rounded-full border border-[#173f35]/15 bg-white/65 text-sm font-bold transition hover:border-[#ba4b2f]/40 hover:text-[#ba4b2f]"
          >
            ↪
          </button>
        </form>
      </div>
    );
  }

  if (guestMode && !account) {
    return (
      <span className="rounded-full border border-[#173f35]/12 bg-[#e7e3d8] px-3 py-2 font-mono text-[10px] font-semibold text-[#64736c]">
        luyện trên thiết bị
      </span>
    );
  }

  if (cloudEnabled) {
    return (
      <Link
        href={`/auth?next=${encodeURIComponent(`/practice?deck=${selectedDeck}`)}`}
        className="rounded-full bg-[#173f35] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#245748] focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <span className="rounded-full border border-[#173f35]/12 bg-[#e7e3d8] px-3 py-2 font-mono text-[10px] font-semibold text-[#64736c]">
      chỉ lưu trên thiết bị
    </span>
  );
}

function SyncDot({ status }: { status: SyncStatus }) {
  const labels: Record<SyncStatus, string> = {
    local: "Chỉ lưu trên thiết bị",
    syncing: "Đang đồng bộ",
    synced: "Đã đồng bộ",
    error: "Lỗi đồng bộ",
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
    <span className="rounded-full border border-[#173f35]/12 bg-[#edf0e8] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#52645c] uppercase">
      {children}
    </span>
  );
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
  const [expanded, setExpanded] = useState(false);
  const editor = scenarioEditorConfig(language);

  return (
    <section
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-[#071b16]/95 p-3 backdrop-blur-sm sm:p-6"
          : ""
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[#356b58]/35 bg-[#0d2821] shadow-[0_18px_55px_rgba(7,27,22,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#102f27] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="size-2.5 rounded-full bg-[#e2684a]" />
              <i className="size-2.5 rounded-full bg-[#e7b84b]" />
              <i className="size-2.5 rounded-full bg-[#75aa52]" />
            </span>
            <span className="font-mono text-xs font-bold text-[#d7ff91]">
              {editor.fileName}
            </span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] text-white/55">
              Thiết kế {editor.languageLabel}
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
                Chèn khung {editor.languageLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-[10px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {expanded ? "Thu nhỏ" : "Mở toàn màn hình"}
            </button>
          </div>
        </div>
        <div className="bg-[#0b241d]">
          <MonacoCodeEditor
            language={language}
            value={value}
            onChange={onChange}
            height={expanded ? "calc(100vh - 9rem)" : "24rem"}
            expanded={expanded}
            placeholder={editor.placeholder}
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/8 bg-[#102f27] px-4 py-2 font-mono text-[10px] text-white/40">
          <span>Monaco · Ctrl+F tìm kiếm · Alt+↑↓ chuyển dòng · Ctrl+S tự lưu</span>
          <span>{value.length} ký tự</span>
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
            : "bg-[#173f35]/8 text-[#245748]"
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
    <div className="my-3 overflow-hidden rounded-2xl border border-white/10 bg-[#102f27] text-[#e8f7df] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-4 py-2">
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#b9d7ca] uppercase">
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-md px-2 py-1 font-mono text-[10px] font-semibold text-[#d7ff91] transition hover:bg-white/10"
          aria-label="Sao chép đoạn mã"
        >
          {copied ? "Đã sao chép ✓" : "Sao chép"}
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
          ? "border-[#ba4b2f]/20 bg-[#f8e8df]"
          : "border-[#356b58]/15 bg-[#f8faf5]"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#52645c]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={warning ? "text-[#ba4b2f]" : "text-[#356b58]"}>
              {warning ? "×" : "✓"}
            </span>
            <span><InlineCode text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const verdictLabels: Record<CoachFeedback["verdict"], string> = {
  needs_work: "Cần ôn lại",
  partial: "Đúng một phần",
  solid: "Nắm khá chắc",
  strong: "Trả lời rất tốt",
};

const coverageLabels: Record<CoachFeedback["coverage"][number]["status"], string> = {
  missed: "Thiếu",
  partial: "Một phần",
  met: "Đạt",
};

function formatCoachFeedback(feedback: CoachFeedback) {
  const corrections = feedback.corrections.length
    ? `\n\nCần sửa:\n${feedback.corrections.map((item) => `- ${item}`).join("\n")}`
    : "";
  return `${feedback.score}/100 · ${verdictLabels[feedback.verdict]}\n\n${feedback.summary}\n\n${feedback.explanation}${corrections}`;
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
  if (state.phase === "retrying") return null;

  const passed = state.phase === "passed";
  const needsRepair = state.phase === "needs_repair";
  const outcomeLabel = passed
    ? state.reviewRating === "easy"
      ? "Dễ"
      : "Ổn"
    : needsRepair
      ? state.repairRating === "again"
        ? "Chưa nhớ"
        : "Khó"
      : null;

  return (
    <section
      className={`mt-5 rounded-3xl border-2 p-5 shadow-sm sm:p-6 ${
        state.phase === "rescue"
          ? "border-[#ba4b2f]/25 bg-[#fff4e8]"
          : passed
            ? "border-[#356b58]/30 bg-[#edf8e8]"
            : "border-[#ba4b2f]/25 bg-[#f8e8df]"
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#356b58] uppercase">
        {state.phase === "rescue"
          ? "Trợ giúp AI · đọc lời giải trước"
          : `Làm lại · lượt ${state.attempts}`}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#173f35]">
        {state.phase === "rescue"
          ? "Đã có lời giải — giờ đến lượt bạn tự làm lại"
          : passed
            ? `Đạt ${score}/100`
            : `Chưa đạt ${score}/100`}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52645c]">
        {state.phase === "rescue"
          ? "Đọc phần giải thích phía trên để hiểu, rồi đóng lời giải và trả lời lại bằng trí nhớ. Mức đánh giá đang khóa cho tới khi AI chấm lần làm lại."
          : passed
            ? `Lần làm lại đã đạt ngưỡng phỏng vấn. Hệ thống sẽ ghi mức ${outcomeLabel} và chuyển sang câu tiếp theo.`
            : `Lần làm lại vẫn còn điểm cần cải thiện. Hệ thống sẽ ghi mức ${outcomeLabel}, chuyển sang câu tiếp theo và đưa câu này vào Ôn lại điểm yếu sau vài thẻ.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {state.phase === "rescue" ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245748] focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
          >
            Tự làm lại không nhìn lời giải
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245748] focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
            >
              {passed
                ? "Đạt · sang câu tiếp"
                : "Ôn lại điểm yếu sau · sang câu tiếp"}
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-[#356b58]/25 bg-white/70 px-5 py-3 text-sm font-bold text-[#245748] transition hover:-translate-y-0.5 hover:bg-white focus:ring-4 focus:ring-[#d7ff91]/60 focus:outline-none"
            >
              {passed ? "Làm lại lần nữa" : "Thử lại ngay"}
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
  const suggestedRating = ratingOptions.find(
    (option) => option.value === feedback.suggestedRating,
  );

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#356b58]/20 bg-[#f6faef] shadow-[0_16px_45px_rgba(23,63,53,0.07)]">
      <div className="grid gap-5 bg-[#173f35] p-6 text-white sm:grid-cols-[6rem_1fr] sm:items-center">
        <div className="grid size-24 place-items-center rounded-full border-4 border-[#d7ff91]/70 bg-white/8">
          <div className="text-center">
            {rescueMode ? (
              <>
                <span className="block font-mono text-2xl font-bold text-[#d7ff91]">
                  AI
                </span>
                <span className="text-[9px] tracking-wider text-white/55 uppercase">
                  Trợ giúp
                </span>
              </>
            ) : (
              <>
                <span className="block font-mono text-3xl font-bold text-[#d7ff91]">
                  {feedback.score}
                </span>
                <span className="text-[10px] tracking-wider text-white/55 uppercase">
                  / 100
                </span>
              </>
            )}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold tracking-[0.15em] text-[#d7ff91] uppercase">
              {rescueMode
                ? "Trợ giúp AI · học từ đầu"
                : "Phản hồi phỏng vấn từ AI"}
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              {model || "OpenAI"}
            </span>
            <button
              type="button"
              onClick={onToggleSaveFeedback}
              className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80 transition hover:bg-white/20"
            >
              {feedbackSaved ? "★ Đã lưu" : "☆ Lưu phản hồi"}
            </button>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {rescueMode
              ? "Hiểu lời giải trước, rồi tự nói lại"
              : verdictLabels[feedback.verdict]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/72">{feedback.summary}</p>
        </div>
      </div>

      <div className="space-y-7 p-6 sm:p-7">
        {feedback.strengths.length ? (
          <div>
            <p className="text-sm font-bold text-[#245748]">Bạn làm tốt</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#52645c]">
              {feedback.strengths.map((strength) => (
                <li key={strength} className="flex gap-2">
                  <span className="text-[#65a30d]">✓</span>
                  <span><InlineCode text={strength} /></span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-sm font-bold text-[#245748]">
            Mức độ đáp ứng từng tiêu chí
          </p>
          <div className="mt-3 divide-y divide-[#173f35]/10 rounded-2xl border border-[#173f35]/12 bg-white/65 px-4">
            {feedback.coverage.map((item) => (
              <div key={item.criterion} className="grid gap-2 py-4 sm:grid-cols-[5rem_1fr]">
                <span
                  data-status={item.status}
                  className="coverage-status h-fit w-fit rounded-full px-2.5 py-1 text-[11px] font-bold"
                >
                  {coverageLabels[item.status]}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-6">
                    <InlineCode text={item.criterion} />
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#64736c]">
                    <InlineCode text={item.feedback} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {feedback.corrections.length ? (
          <div className="rounded-2xl border border-[#ba4b2f]/20 bg-[#f8e8df] p-5">
            <p className="text-sm font-bold text-[#8e3825]">Cần sửa</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#713929]">
              {feedback.corrections.map((correction) => (
                <li key={correction} className="flex gap-2">
                  <span>→</span>
                  <span><InlineCode text={correction} /></span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-sm font-bold text-[#245748]">Giải thích cho chắc</p>
          <div className="mt-2 leading-7 text-[#52645c]">
            <RichText text={feedback.explanation} />
          </div>
        </div>

        <div className={rescueMode ? "hidden" : "grid gap-3 sm:grid-cols-2"}>
          <div className="flex flex-col rounded-2xl bg-[#e8efe2] p-5">
            <p className="font-mono text-[11px] font-bold tracking-wider text-[#356b58] uppercase">
              Bước tiếp theo
            </p>
            <p className="mt-2 text-sm leading-6 text-[#465c52]">
              <InlineCode text={feedback.nextStep} />
            </p>
            <button
              type="button"
              onClick={onExpandNextStep}
              disabled={learningActionLoading || learningActionDisabled}
              className="mt-4 w-fit rounded-xl border border-[#356b58]/20 bg-white/65 px-3.5 py-2 text-xs font-bold text-[#245748] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91]/60 focus:outline-none"
            >
              {learningActionLoading ? "AI đang mở rộng…" : "Học tiếp phần này →"}
            </button>
          </div>
          <div className="flex flex-col rounded-2xl bg-[#d7ff91]/55 p-5">
            <p className="font-mono text-[11px] font-bold tracking-wider text-[#356b58] uppercase">
              Người phỏng vấn hỏi tiếp
            </p>
            <p className="mt-2 text-sm leading-6 font-semibold text-[#29493d]">
              <InlineCode text={feedback.followUpQuestion} />
            </p>
            <button
              type="button"
              onClick={onExploreInterviewerQuestion}
              className="mt-4 w-fit rounded-xl bg-[#173f35] px-3.5 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#245748] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-white/70 focus:outline-none"
            >
              {deepDiveOpen ? "Ẩn câu mở rộng ↑" : "Tự trả lời câu này →"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#6c7b73]">
          {rescueMode ? (
            <>
              Mức đánh giá đang khóa · đọc để hiểu rồi bấm{" "}
              <strong>Tự làm lại không nhìn lời giải</strong>.
            </>
          ) : (
            <>
              AI gợi ý mức đánh giá: <strong>{suggestedRating?.label}</strong> ·
              hãy tự quyết định sau khi đối chiếu đáp án nguồn.
            </>
          )}
        </p>
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
  const sourceById = new Map(
    question.sourceSections.map((section) => [section.id, section]),
  );
  const citedSections = (feedback?.sourceSectionIds ?? [])
    .map((id) => sourceById.get(id))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return (
    <section className="mt-5 rounded-3xl border border-[#7fb43d]/30 bg-[#f3ffdd] p-5 shadow-[0_12px_35px_rgba(23,63,53,0.05)] sm:p-6">
      <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#356b58] uppercase">
        Câu phỏng vấn mở rộng
      </p>
      <h3 className="mt-3 text-xl leading-8 font-semibold text-[#203d32]">
        <InlineCode text={prompt} />
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#64736c]">
        Tự trả lời như một câu phỏng vấn mới, hoặc để trống nếu chưa biết để AI
        dạy từ đầu.
      </p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor={`deep-dive-${question.id}`} className="text-sm font-bold text-[#29493d]">
          Câu trả lời của bạn
        </label>
        <textarea
          id={`deep-dive-${question.id}`}
          value={answer}
          onChange={(event) => onAnswer(event.target.value)}
          rows={5}
          disabled={loading}
          placeholder="Trả lời câu mở rộng trước khi xem nhận xét của AI…"
          className="mt-2 w-full resize-y rounded-2xl border border-[#356b58]/20 bg-white/80 px-4 py-3 leading-7 outline-none transition focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55 disabled:bg-[#edf1ea]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-[#718078]">
            ● tự lưu · không có đáp án mẫu
          </span>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#173f35] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
          >
            {loading
              ? "AI đang giúp…"
              : answer.trim()
                ? "Nhờ AI chấm câu mở rộng"
                : "Nhờ AI giải câu mở rộng"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl bg-[#f8e8df] px-3 py-2 text-sm text-[#8e3825]" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <div className="mt-5 rounded-2xl border border-[#356b58]/15 bg-white/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-[#245748]">
                Nhận xét của người phỏng vấn AI
              </p>
              {model ? (
                <span className="rounded-full bg-[#e8efe2] px-2 py-0.5 font-mono text-[10px] text-[#356b58]">
                  {model}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onToggleSaveFeedback}
              className="rounded-lg border border-[#356b58]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#356b58]"
            >
              {feedbackSaved ? "★ Đã lưu" : "☆ Lưu nhận xét"}
            </button>
          </div>
          <div className="mt-3 text-sm leading-7 text-[#465c52]">
            <RichText text={feedback.answer} />
          </div>
          {citedSections.length ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#173f35]/10 pt-3">
              {citedSections.map((section) => (
                <span key={section.id} className="rounded-full bg-[#e8efe2] px-2.5 py-1 text-[11px] font-semibold text-[#356b58]">
                  Nguồn: {section.heading}
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
  const limitReached = messages.length >= 8;
  const sourceById = new Map(
    question.sourceSections.map((section) => [section.id, section]),
  );

  return (
    <section className="mt-5 rounded-3xl border border-[#173f35]/16 bg-white/70 p-5 shadow-[0_12px_35px_rgba(23,63,53,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#356b58] uppercase">
            Chưa hiểu? Hỏi tiếp AI
          </p>
          <p className="mt-2 text-sm leading-6 text-[#64736c]">
            AI sẽ giải thích lại dựa trên câu này, phản hồi vừa chấm và ghi chú nguồn.
          </p>
        </div>
        <span className="rounded-full bg-[#edf3e9] px-3 py-1 font-mono text-[11px] text-[#52645c]">
          {Math.floor(messages.length / 2)}/4 lượt
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
                    ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#173f35] px-4 py-3 text-sm leading-6 text-white"
                    : "max-w-[94%] rounded-2xl rounded-bl-md border border-[#356b58]/15 bg-[#f6faef] px-4 py-4 text-sm leading-6 text-[#465c52]"
                }
              >
                <RichText
                  text={message.content}
                  inverted={message.role === "user"}
                />
                {message.role === "assistant" && message.model ? (
                  <span className="mt-3 inline-block rounded-full bg-[#e8efe2] px-2 py-0.5 font-mono text-[10px] text-[#356b58]">
                    {message.model}
                  </span>
                ) : null}
                {citedSections.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#173f35]/10 pt-3">
                    {citedSections.map((section) => (
                      <span
                        key={section.id}
                        title={`#${section.id}`}
                        className="rounded-full bg-[#e8efe2] px-2.5 py-1 text-[11px] font-semibold text-[#356b58]"
                      >
                        Nguồn: {section.heading}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.checkQuestion ? (
                  <p className="mt-3 rounded-xl bg-[#d7ff91]/45 px-3 py-2 text-xs font-semibold text-[#29493d]">
                    Tự kiểm tra: <InlineCode text={message.checkQuestion} />
                  </p>
                ) : null}
                {message.role === "assistant" ? (
                  <button
                    type="button"
                    onClick={() => onToggleSaveMessage(index, message)}
                    className="mt-3 rounded-lg border border-[#356b58]/15 bg-white/60 px-2.5 py-1.5 text-[11px] font-bold text-[#356b58] transition hover:bg-white"
                  >
                    {isMessageSaved(index) ? "★ Đã lưu" : "☆ Lưu câu trả lời AI"}
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
          Câu hỏi bổ sung cho trợ lý AI
        </label>
        <textarea
          id={`follow-up-${question.id}`}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          maxLength={2000}
          rows={3}
          disabled={loading || limitReached}
          placeholder="Ví dụ: Tại sao chỗ này lại là hành vi không xác định (undefined behavior)? Có thể giải thích bằng ví dụ nhỏ không?"
          className="w-full resize-y rounded-2xl border border-[#173f35]/18 bg-white px-4 py-3 text-sm leading-6 text-[#1e352d] outline-none transition placeholder:text-[#819087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/45 disabled:bg-[#edf1ea]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#78867f]">
            {limitReached
              ? "Đã đủ 4 lượt. Chấm lại để bắt đầu hội thoại mới."
              : "Enter để xuống dòng · tối đa 2.000 ký tự"}
          </p>
          <button
            type="submit"
            disabled={!input.trim() || loading || limitReached}
            className="rounded-xl bg-[#173f35] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:ring-4 focus:ring-[#d7ff91] focus:outline-none"
          >
            {loading ? "AI đang giải thích…" : "Hỏi tiếp AI"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-xl bg-[#f8e8df] px-3 py-2 text-sm text-[#8e3825]" role="alert">
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
        <div key={section.id} className="rounded-2xl bg-[#102d26] p-5 text-[#e8f4ec]">
          <p className="font-mono text-xs text-[#d7ff91]">#{section.id}</p>
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#173f35]/15 bg-white/55 px-3 py-2 text-xs font-bold transition hover:bg-white"
      >
        ☆ Đã lưu {items.length ? `(${items.length})` : ""}
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
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102d26]/35 p-3 backdrop-blur-sm sm:p-5" role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Nội dung đã lưu"
        className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/35 bg-[#f7f5ed] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#173f35]/12 p-5 sm:p-7">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.15em] text-[#ba4b2f] uppercase">
              Nội dung đã lưu
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Nội dung đáng xem lại</h2>
            <p className="mt-2 text-sm text-[#64736c]">
              {items.length} mục · lưu trên trình duyệt này
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh sách đã lưu"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#173f35]/15 bg-white text-lg font-bold"
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
            <div className="rounded-2xl border border-dashed border-[#173f35]/20 px-5 py-12 text-center text-sm leading-6 text-[#64736c]">
              Chưa lưu gì. Dùng nút ☆ ở câu hỏi hoặc phản hồi AI mà bạn thấy
              đáng xem lại.
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
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-2xl border border-[#173f35]/12 bg-white/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${item.kind === "question" ? "bg-[#d7ff91] text-[#356b58]" : "bg-[#e3ddff] text-[#55468c]"}`}>
          {item.kind === "question" ? "Câu hỏi" : "AI trả lời"}
        </span>
        <time className="font-mono text-[10px] text-[#78867f]">
          {new Date(item.savedAt).toLocaleDateString("vi-VN")}
        </time>
      </div>
      <h3 className="mt-3 font-semibold">{item.title}</h3>
      {item.context ? (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#718078]">
          <InlineCode text={item.context} />
        </p>
      ) : null}
      <details
        className="group mt-3 rounded-xl bg-[#f2f4ed] px-3 py-2.5"
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none text-xs font-bold text-[#356b58]">
          <span className="group-open:hidden">Xem nội dung ↓</span>
          <span className="hidden group-open:inline">Thu gọn ↑</span>
        </summary>
        {expanded ? (
          <div className="mt-3 text-sm leading-6 text-[#465c52]">
            <RichText text={item.content} />
          </div>
        ) : null}
      </details>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenQuestion(item.questionId)}
          className="rounded-lg border border-[#356b58]/18 bg-white px-3 py-2 text-xs font-bold text-[#356b58]"
        >
          Mở câu gốc
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-lg px-3 py-2 text-xs font-bold text-[#a0442d] hover:bg-[#f8e8df]"
        >
          Bỏ lưu
        </button>
      </div>
    </article>
  );
}
