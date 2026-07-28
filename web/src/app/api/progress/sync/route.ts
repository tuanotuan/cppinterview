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
  type PracticeReviewRow,
  type QuestionLearningStateRow,
} from "@/lib/practice/cloud";
import {
  captureCoachMistakes,
  MistakeQueueConfigurationError,
  type MistakeCaptureResult,
} from "@/lib/practice/mistake-cards.server";
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
      { error: "Cần đăng nhập GitHub để đồng bộ." },
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

  const orderedReviews = [...parsed.data.reviews]
    .sort(
      (left, right) =>
        left.reviewedOn.localeCompare(right.reviewedOn) ||
        left.questionId.localeCompare(right.questionId),
    );
  for (const review of orderedReviews) {
    const question = questionById.get(review.questionId)!;
    const { error } = await supabase.rpc("record_practice_review", {
      p_question_id: review.questionId,
      p_question_version: question.version,
      p_source_hash: question.sourceHash,
      p_reviewed_on: review.reviewedOn,
      p_rating: review.rating,
    });
    if (error) {
      return Response.json(
        { error: "Không lưu được trạng thái học theo lịch Anki." },
        { status: 502 },
      );
    }
  }

  let mistakeCapture: MistakeCaptureResult | null = null;
  let mistakeQueueAvailable = true;
  if (parsed.data.mistakeCapture) {
    const capture = parsed.data.mistakeCapture;
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
    const feedback = coachFeedbackSchema.safeParse(attempt.data?.feedback);
    if (
      !attempt.error &&
      attempt.data &&
      question &&
      lesson &&
      attempt.data.question_id === question.id &&
      attempt.data.question_version === question.version &&
      feedback.success
    ) {
      try {
        mistakeCapture = await captureCoachMistakes({
          supabase,
          userId: authData.user.id,
          attemptId: attempt.data.id,
          question,
          lesson,
          feedback: feedback.data,
          rating: capture.rating,
        });
      } catch (error) {
        if (error instanceof MistakeQueueConfigurationError) {
          mistakeQueueAvailable = false;
        } else {
          console.error("Mistake capture failed", {
            name: error instanceof Error ? error.name : "UnknownError",
          });
        }
      }
    }
  }

  const [reviewsResult, statesResult] = await Promise.all([
    supabase
      .from("practice_reviews")
      .select(
        "question_id, reviewed_on, rating, next_due_on, question_version, source_hash, learning_state_after, interval_days_after, lapse_count_after",
      )
      .order("reviewed_on", { ascending: false })
      .limit(1000),
    supabase
      .from("user_question_states")
      .select(
        "question_id, question_version, source_hash, learning_state, due_on, interval_days, review_count, lapse_count, last_rating, last_reviewed_on, is_suspended, is_leech, content_changed, history_reset_on",
      ),
  ]);
  if (reviewsResult.error || statesResult.error) {
    return Response.json(
      { error: "Không đọc được tiến độ học trực tuyến." },
      { status: 502 },
    );
  }

  return Response.json({
    progress: rowsToProgress(
      (reviewsResult.data ?? []) as PracticeReviewRow[],
    ),
    questionStates: rowsToLearningStates(
      (statesResult.data ?? []) as QuestionLearningStateRow[],
    ),
    mistakeCapture,
    mistakeQueueAvailable,
  });
}
