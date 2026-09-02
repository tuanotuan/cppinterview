import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import { coachFeedbackSchema } from "@/lib/ai/contracts";
import {
  activeQuestionIds,
  rowsToApprovals,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";
import {
  hasAnkiTransition,
  rowsToLearningStates,
  rowsToProgress,
  syncProgressSchema,
} from "@/lib/practice/cloud";
import {
  buildLearningStates,
  filterReviewsForLearningHistory,
} from "@/lib/practice/learning-state";
import {
  normalizeReviewWithFsrs,
  replaceDailyReview,
} from "@/lib/practice/fsrs-sync";
import { FSRS_SCHEDULER_VERSION } from "@/lib/practice/fsrs-scheduler";
import {
  captureCoachMistakes,
  MistakeQueueConfigurationError,
  type MistakeCaptureResult,
} from "@/lib/practice/mistake-cards.server";
import { readAllPracticeReviewRows } from "@/lib/practice/practice-review-reader.server";
import { readQuestionLearningStateRows } from "@/lib/practice/question-learning-state-reader.server";
import {
  legacyReviewOutcomeMatchesMistakeCapture,
  mistakeCaptureMarkerKey,
  parsePracticeReviewOutcome,
  practiceReviewDiscardIdentity,
  reviewOutcomeMatchesMistakeCapture,
  type MistakeCaptureMarker,
  type MistakeCaptureResolution,
  type PracticeReviewOutcome,
} from "@/lib/practice/progress-sync";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Đồng bộ trực tuyến chưa được cấu hình." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || !isAllowedPracticeUser(authData.user)) {
    return Response.json(
      { error: "Cần đăng nhập để đồng bộ." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Yêu cầu không chứa JSON hợp lệ." },
      { status: 400 },
    );
  }

  const parsed = syncProgressSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dữ liệu tiến độ không hợp lệ." },
      { status: 400 },
    );
  }

  const [approvalsResult, overridesResult] = await Promise.all([
    supabase
      .from("question_approvals")
      .select("question_id, question_version, source_hash"),
    loadQuestionOverrides(supabase),
  ]);
  if (approvalsResult.error || overridesResult.error) {
    return Response.json(
      { error: "Không đọc được kết quả duyệt câu hỏi." },
      { status: 502 },
    );
  }
  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: overridesResult.overrides,
  });
  const allowedQuestionIds = activeQuestionIds(
    manifest.questions,
    rowsToApprovals(
      (approvalsResult.data ?? []) as QuestionApprovalRow[],
    ),
  );
  const questionById = new Map(
    manifest.questions.map((question) => [question.id, question]),
  );
  const invalidReview = parsed.data.reviews.some((review) => {
    if (!allowedQuestionIds.has(review.questionId)) return true;
    if (!hasAnkiTransition(review)) return false;
    const question = questionById.get(review.questionId);
    return (
      !question ||
      review.questionVersion !== question.version ||
      review.sourceHash !== question.sourceHash
    );
  });
  if (invalidReview) {
    return Response.json(
      { error: "Dữ liệu tiến độ không hợp lệ." },
      { status: 400 },
    );
  }

  // Read reviews first, then the generation-bearing state. If a reset commits
  // between these reads, the later state filters the older generation before
  // any queued review is normalized or written.
  const initialReviewsResult = await readAllPracticeReviewRows(supabase);
  const initialStatesResult = await readQuestionLearningStateRows(supabase);
  if (initialReviewsResult.error || initialStatesResult.error) {
    return Response.json(
      { error: "Không đọc được tiến độ học trực tuyến." },
      { status: 502 },
    );
  }
  const initialQuestionStates = rowsToLearningStates(
    initialStatesResult.rows,
  );
  const initialCloudProgress = rowsToProgress(initialReviewsResult.rows);
  let workingReviews = filterReviewsForLearningHistory(
    initialCloudProgress.reviews,
    initialQuestionStates,
  );
  const workingStates = buildLearningStates(
    manifest.questions
      .filter((question) => allowedQuestionIds.has(question.id))
      .map((question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
      })),
    workingReviews,
    initialQuestionStates,
  );

  const orderedReviews = [...parsed.data.reviews]
    .sort(
      (left, right) =>
        left.reviewedOn.localeCompare(right.reviewedOn) ||
        left.questionId.localeCompare(right.questionId),
    );
  const reviewOutcomes: PracticeReviewOutcome[] = [];
  const resetDiscardedReviews: typeof orderedReviews = [];
  for (const review of orderedReviews) {
    const question = questionById.get(review.questionId)!;
    const currentState = workingStates.get(review.questionId)!;
    const normalized = normalizeReviewWithFsrs(
      currentState,
      review,
      workingReviews,
    );
    const fsrsResult = await supabase.rpc(
      "record_practice_review",
      {
        p_question_id: review.questionId,
        p_question_version: question.version,
        p_source_hash: question.sourceHash,
        p_reviewed_on: review.reviewedOn,
        p_rating: review.rating,
        p_history_reset_token: review.historyResetToken ?? null,
        p_interval_days_after: normalized.review.intervalDaysAfter!,
        p_scheduler_version: FSRS_SCHEDULER_VERSION,
      },
    );
    let rpcError = fsrsResult.error;
    let rpcData = fsrsResult.data;
    let assumeLegacyRecorded = false;
    let outcome: PracticeReviewOutcome | null = null;
    if (rpcError && isMissingPracticeReviewRpc(rpcError)) {
      const generationResult = await supabase.rpc(
        "record_practice_review",
        {
          p_question_id: review.questionId,
          p_question_version: question.version,
          p_source_hash: question.sourceHash,
          p_reviewed_on: review.reviewedOn,
          p_rating: review.rating,
          p_history_reset_token: review.historyResetToken ?? null,
        },
      );
      rpcError = generationResult.error;
      rpcData = generationResult.data;
      if (
        rpcError &&
        review.historyResetToken === undefined &&
        isMissingPracticeReviewRpc(rpcError)
      ) {
        const legacyResult = await supabase.rpc(
          "record_practice_review",
          {
            p_question_id: review.questionId,
            p_question_version: question.version,
            p_source_hash: question.sourceHash,
            p_reviewed_on: review.reviewedOn,
            p_rating: review.rating,
          },
        );
        rpcError = legacyResult.error;
        assumeLegacyRecorded = !rpcError;
      }
    }
    if (!rpcError && assumeLegacyRecorded) {
      outcome = {
        review: normalized.review,
        status: "recorded",
        rating: review.rating,
      };
    } else if (!rpcError) {
      outcome = parsePracticeReviewOutcome(
        normalized.review,
        rpcData,
      );
    }
    if (rpcError) {
      return Response.json(
        { error: "Không lưu được trạng thái học theo lịch Anki." },
        { status: 502 },
      );
    }
    if (!outcome) {
      return Response.json(
        { error: "Không xác nhận được trạng thái học theo lịch Anki." },
        { status: 502 },
      );
    }
    reviewOutcomes.push(outcome);
    if (outcome.status === "reset_discarded") {
      resetDiscardedReviews.push(review);
    } else if (outcome.rating === normalized.review.rating) {
      workingReviews = replaceDailyReview(
        workingReviews,
        normalized.review,
      );
      workingStates.set(review.questionId, normalized.state);
    }
  }
  const discardedReviews = resetDiscardedReviews.map((review) =>
    practiceReviewDiscardIdentity(review),
  );

  let mistakeCapture: MistakeCaptureResult | null = null;
  let mistakeQueueAvailable = true;
  const mistakeCaptureResolutions: MistakeCaptureResolution[] = [];
  const captureRequests = new Map<
    string,
    {
      coachAttemptId: number;
      questionId: string;
      reviewedOn: string | null;
      rating: "again" | "hard";
      source: "review" | "legacy";
    }
  >();
  for (const review of orderedReviews) {
    if (!review.coachAttemptId) continue;
    const marker: MistakeCaptureMarker = {
      coachAttemptId: review.coachAttemptId,
      questionId: review.questionId,
      reviewedOn: review.reviewedOn,
      rating: review.rating,
    };
    if (review.rating !== "again" && review.rating !== "hard") {
      mistakeCaptureResolutions.push({
        ...marker,
        disposition: "discarded",
      });
      continue;
    }
    captureRequests.set(`review:${mistakeCaptureMarkerKey(marker)}`, {
      coachAttemptId: review.coachAttemptId,
      questionId: review.questionId,
      reviewedOn: review.reviewedOn,
      rating: review.rating,
      source: "review",
    });
  }
  if (parsed.data.mistakeCapture) {
    const capture = parsed.data.mistakeCapture;
    const duplicatesEmbeddedMarker = [...captureRequests.values()].some(
      (request) =>
        request.source === "review" &&
        request.coachAttemptId === capture.coachAttemptId &&
        request.questionId === capture.questionId &&
        request.rating === capture.rating,
    );
    if (!duplicatesEmbeddedMarker) {
      captureRequests.set(
        `legacy:${capture.coachAttemptId}:${capture.questionId}:${capture.rating}`,
        {
          ...capture,
          reviewedOn: null,
          source: "legacy",
        },
      );
    }
  }

  const capturedCandidates = new Map<
    string,
    MistakeCaptureResult["candidates"][number]
  >();
  let captureGenerationMode: MistakeCaptureResult["generationMode"] | null =
    null;
  for (const capture of captureRequests.values()) {
    const marker: MistakeCaptureMarker | null =
      capture.source === "review" && capture.reviewedOn
        ? {
            coachAttemptId: capture.coachAttemptId,
            questionId: capture.questionId,
            reviewedOn: capture.reviewedOn,
            rating: capture.rating,
          }
        : null;
    const acceptedCaptureRating = marker
      ? reviewOutcomeMatchesMistakeCapture(reviewOutcomes, marker)
      : legacyReviewOutcomeMatchesMistakeCapture(
          reviewOutcomes,
          capture,
        );
    if (!acceptedCaptureRating) {
      if (marker) {
        mistakeCaptureResolutions.push({
          ...marker,
          disposition: "discarded",
        });
      }
      continue;
    }
    const question = questionById.get(capture.questionId);
    const lesson = question
      ? manifest.lessons.find((item) => item.id === question.lessonId)
      : null;
    const attempt = await supabase
      .from("coach_attempts")
      .select("id, question_id, question_version, feedback")
      .eq("id", capture.coachAttemptId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (attempt.error) {
      return Response.json(
        { error: "Chưa xác nhận được lần chấm để tạo thẻ ôn tập." },
        { status: 502 },
      );
    }
    const feedback = coachFeedbackSchema.safeParse(attempt.data?.feedback);
    if (
      !attempt.data ||
      !question ||
      !lesson ||
      attempt.data.question_id !== question.id ||
      attempt.data.question_version !== question.version ||
      !feedback.success
    ) {
      if (marker) {
        mistakeCaptureResolutions.push({
          ...marker,
          disposition: "discarded",
        });
      }
      continue;
    }
    try {
      const captured = await captureCoachMistakes({
        supabase,
        userId: authData.user.id,
        attemptId: attempt.data.id,
        question,
        lesson,
        feedback: feedback.data,
        rating: capture.rating,
      });
      captureGenerationMode = captured.generationMode;
      for (const candidate of captured.candidates) {
        capturedCandidates.set(candidate.id, candidate);
      }
      if (marker) {
        mistakeCaptureResolutions.push({
          ...marker,
          disposition: "acknowledged",
        });
      }
    } catch (error) {
      if (error instanceof MistakeQueueConfigurationError) {
        mistakeQueueAvailable = false;
        return Response.json(
          { error: "Hộp lỗi cần ôn chưa được cập nhật cơ sở dữ liệu." },
          { status: 503 },
        );
      }
      console.error("Mistake capture failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return Response.json(
        { error: "Chưa lưu được điểm cần cải thiện để thử lại sau." },
        { status: 502 },
      );
    }
  }
  if (captureGenerationMode) {
    mistakeCapture = {
      candidates: [...capturedCandidates.values()],
      generationMode: captureGenerationMode,
    };
  }

  // Re-read after the writes so the response remains the authoritative cloud
  // snapshot rather than the in-memory normalization used above.
  const reviewsResult = await readAllPracticeReviewRows(supabase);
  const statesResult = await readQuestionLearningStateRows(supabase);
  if (reviewsResult.error || statesResult.error) {
    return Response.json(
      { error: "Không đọc được tiến độ học trực tuyến." },
      { status: 502 },
    );
  }

  const questionStates = rowsToLearningStates(statesResult.rows);
  const cloudProgress = rowsToProgress(reviewsResult.rows);
  const progress = {
    ...cloudProgress,
    reviews: filterReviewsForLearningHistory(
      cloudProgress.reviews,
      questionStates,
    ),
  };

  return Response.json({
    progress,
    questionStates,
    discardedReviews,
    mistakeCapture,
    mistakeCaptureResolutions,
    mistakeQueueAvailable,
  });
}

function isMissingPracticeReviewRpc(error: { code?: string | null }) {
  return error.code === "PGRST202" || error.code === "42883";
}
