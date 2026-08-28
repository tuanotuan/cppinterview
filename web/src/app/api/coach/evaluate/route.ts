import {
  AiBudgetConfigurationError,
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationNotStartedError,
  AiOperationOutcomeUnknownError,
  withAiBudget,
} from "@/lib/ai/budget";
import { isUnmeteredLocalAiEnabled } from "@/lib/ai/access";
import {
  attachPublicAiDeviceCookie,
  completePublicAiAdmission,
  isPublicAiEnabled,
  markPublicAiAdmissionOutcomeUnknown,
  PublicAiIdentityUnavailableError,
  PublicAiRequestAlreadyCompletedError,
  PublicAiRequestInProgressError,
  PublicAiRequestOutcomeUnknownError,
  releasePublicAiAdmission,
  reservePublicAiAdmission,
  type PublicAiAdmission,
} from "@/lib/ai/public-ai-admission.server";
import {
  markPublicAiAdmissionDispatched,
  PublicAiSiteBudgetConfigurationError,
  PublicAiSiteBudgetExceededError,
  withPublicAiSiteBudget,
} from "@/lib/ai/public-ai-budget.server";
import {
  PUBLIC_AI_QUOTA_LIMIT,
  PublicAiQuotaConfigurationError,
  PublicAiQuotaExceededError,
  PublicAiQuotaIdempotencyConflictError,
} from "@/lib/ai/public-ai-quota.server";
import { coachRequestSchema } from "@/lib/ai/contracts";
import {
  CoachEvaluationBusyError,
  CoachEvaluationConfigurationError,
  CoachEvaluationIdempotencyConflictError,
  coachEvaluationRequestFingerprint,
  completeCoachEvaluation,
  markCoachEvaluationDispatched,
  markCoachEvaluationOutcomeUnknown,
  releaseCoachEvaluation,
  reserveCoachEvaluation,
  type CoachEvaluationRequestIdentity,
  type CoachEvaluationReservation,
} from "@/lib/ai/coach-reservation.server";
import {
  AllAiQuotasExceededError,
  GeminiFallbackProviderError,
  runGeminiBudgetFallback,
} from "@/lib/ai/fallback";
import { evaluateWithGemini } from "@/lib/ai/gemini";
import {
  CoachConfigurationError,
  evaluateWithOpenAI,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { consumeCoachRequest } from "@/lib/ai/rate-limit";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
} from "@/lib/content/question-store-server";
import {
  isQuestionApproved,
  rowsToApprovals,
  type QuestionApproval,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";
import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limit = consumeCoachRequest(clientKey);

  if (!limit.allowed) {
    return Response.json(
      {
        error: "Bạn đang gọi AI quá nhanh. Vui lòng chờ một chút rồi thử lại.",
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Yêu cầu không chứa JSON hợp lệ.", code: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Yêu cầu gửi tới trợ lý AI không hợp lệ.",
        code: "invalid_request",
      },
      { status: 400 },
    );
  }

  const supabaseConfigured = isSupabaseConfigured();
  if (!supabaseConfigured && !isUnmeteredLocalAiEnabled()) {
    return Response.json(
      {
        error:
          "Trợ lý AI chưa có xác thực và cơ chế giới hạn chi phí an toàn.",
        code: "service_not_configured",
      },
      { status: 503 },
    );
  }

  const supabase = supabaseConfigured
    ? await createSupabaseServerClient()
    : null;
  const authResult = supabase ? await supabase.auth.getUser() : null;
  const user = authResult?.data.user ?? null;
  const isAdmin = Boolean(user && isTuanotuanQuestionAdmin(user));
  if (!isAdmin && !isPublicAiEnabled() && !isUnmeteredLocalAiEnabled()) {
    return Response.json(
      {
        error: "Trợ lý AI công khai đang tạm thời chưa mở.",
        code: "public_ai_disabled",
      },
      { status: 503 },
    );
  }
  if (supabase && !parsed.data.idempotencyKey) {
    return Response.json(
      {
        error:
          "Yêu cầu chấm bài đang thiếu khóa chống gửi trùng. Vui lòng tải lại trang rồi thử lại.",
        code: "idempotency_key_required",
      },
      { status: 400 },
    );
  }

  let approvals: QuestionApproval[] = [];
  let manifest = getRepoContentManifest();
  if (supabase && isAdmin) {
    const [approvalsResult, overridesResult] = await Promise.all([
      supabase
        .from("question_approvals")
        .select("question_id, question_version, source_hash"),
      loadQuestionOverrides(supabase),
    ]);
    if (approvalsResult.error || overridesResult.error) {
      return Response.json(
        {
          error: "Không đọc được ngân hàng câu hỏi.",
          code: "approval_lookup_failed",
        },
        { status: 502 },
      );
    }
    approvals = rowsToApprovals(
      (approvalsResult.data ?? []) as QuestionApprovalRow[],
    );
    manifest = await loadQuestionStoreManifest({
      supabase,
      overrides: overridesResult.overrides,
    });
  }

  const question = manifest.questions.find((item) => {
    if (item.id !== parsed.data.questionId) return false;
    return (
      item.status !== "archived" &&
      (item.status === "verified" || isQuestionApproved(item, approvals))
    );
  });
  if (!question) {
    return Response.json(
      { error: "Không tìm thấy câu hỏi đã duyệt.", code: "question_not_found" },
      { status: 404 },
    );
  }

  const lesson = manifest.lessons.find((item) => item.id === question.lessonId);
  if (!lesson) {
    return Response.json(
      { error: "Bài học nguồn đang thiếu.", code: "lesson_not_found" },
      { status: 500 },
    );
  }

  const evaluationIdentity: CoachEvaluationRequestIdentity = {
    questionId: question.id,
    questionVersion: question.version,
    sourceRevision: manifest.sourceRevision,
    candidateAnswer: parsed.data.answer,
    responseLocale: parsed.data.responseLocale,
  };

  let evaluationReservation: CoachEvaluationReservation | null = null;
  let evaluationFingerprint: string | null = null;
  let publicAdmission: PublicAiAdmission | null = null;
  if (isAdmin && supabase && user && parsed.data.idempotencyKey) {
    evaluationFingerprint =
      coachEvaluationRequestFingerprint(evaluationIdentity);
    try {
      const reservation = await reserveCoachEvaluation(supabase, {
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint: evaluationFingerprint,
        identity: evaluationIdentity,
      });
      evaluationFingerprint = reservation.requestFingerprint;
      if (reservation.status === "completed") {
        if (!reservation.feedback || !reservation.model) {
          throw new CoachEvaluationConfigurationError(
            "Completed coach evaluation cache is incomplete",
          );
        }
        return Response.json({
          feedback: reservation.feedback,
          model: reservation.model,
          provider: providerFromModel(reservation.model),
          attemptId: reservation.attemptId,
          cached: true,
          aiDailyBudget: null,
          aiUsageRecorded: true,
        });
      }
      if (reservation.status === "outcome_unknown") {
        return Response.json(
          {
            error:
              "Không thể xác nhận kết quả lượt chấm trước. Để tránh tính phí hai lần, hệ thống sẽ không tự chạy lại cùng câu trả lời; hãy sửa câu trả lời hoặc chuyển sang thẻ khác.",
            code: "evaluation_outcome_unconfirmed",
          },
          { status: 409 },
        );
      }
      evaluationReservation = reservation;
    } catch (error) {
      if (error instanceof CoachEvaluationIdempotencyConflictError) {
        return Response.json(
          {
            error:
              "Khóa chống gửi trùng không còn khớp với câu hỏi hoặc câu trả lời này.",
            code: "idempotency_conflict",
          },
          { status: 409 },
        );
      }
      if (error instanceof CoachEvaluationBusyError) {
        return Response.json(
          {
            error:
              "Câu trả lời này đang được chấm. Vui lòng chờ một chút rồi thử lại.",
            code: "evaluation_in_progress",
          },
          {
            status: 409,
            headers: {
              "Retry-After": String(error.retryAfterSeconds),
            },
          },
        );
      }
      console.error("AI coach reservation failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return Response.json(
        {
          error:
            "Cơ chế chống gửi trùng của trợ lý AI chưa sẵn sàng. Vui lòng thử lại sau.",
          code: "idempotency_not_configured",
        },
        { status: 503 },
      );
    }
  }

  if (!isAdmin && parsed.data.idempotencyKey) {
    try {
      publicAdmission = await reservePublicAiAdmission({
        request,
        user,
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint: coachEvaluationRequestFingerprint(evaluationIdentity),
        requestKind: "coach_evaluation",
      });
    } catch (error) {
      if (error instanceof PublicAiQuotaExceededError) {
        return Response.json(
          {
            error: "Bạn đã dùng hết 3 lượt AI trong 24 giờ qua. Vui lòng quay lại sau.",
            code: "public_ai_quota_exceeded",
            limit: PUBLIC_AI_QUOTA_LIMIT,
            remaining: error.remaining,
            resetsAt: error.resetsAt,
          },
          { status: 429 },
        );
      }
      if (
        error instanceof PublicAiRequestInProgressError ||
        error instanceof PublicAiRequestAlreadyCompletedError ||
        error instanceof PublicAiRequestOutcomeUnknownError ||
        error instanceof PublicAiQuotaIdempotencyConflictError
      ) {
        return Response.json(
          {
            error: "Lượt AI này đang được xử lý hoặc đã hoàn tất. Vui lòng đổi nội dung trước khi gửi lại.",
            code: "public_ai_request_unavailable",
          },
          { status: 409 },
        );
      }
      if (error instanceof PublicAiIdentityUnavailableError) {
        return Response.json(
          {
            error: "Không xác minh được thiết bị để áp dụng giới hạn AI an toàn.",
            code: "public_ai_identity_unavailable",
          },
          { status: 503 },
        );
      }
      console.error("Public AI admission failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        reason:
          error instanceof PublicAiQuotaConfigurationError
            ? error.reason
            : "unknown",
      });
      return Response.json(
        {
          error: "Cơ chế giới hạn AI công khai chưa sẵn sàng. Vui lòng thử lại sau.",
          code: "public_ai_not_configured",
        },
        { status: 503 },
      );
    }
  }

  const markEvaluationProviderDispatched = async () => {
    if (!supabase || !evaluationReservation?.leaseToken) return;
    try {
      await markCoachEvaluationDispatched(supabase, {
        idempotencyKey: evaluationReservation.idempotencyKey,
        leaseToken: evaluationReservation.leaseToken,
      });
    } catch {
      throw new AiOperationNotStartedError(
        "Coach evaluation dispatch could not be confirmed",
      );
    }
  };

  try {
    let provider: "openai" | "gemini" = "openai";
    let dailyBudget = null;
    let result;
    try {
      if (publicAdmission) {
        result = await withPublicAiSiteBudget(
          publicAdmission.client,
          publicAdmission.reservationId,
          COACH_RESERVATION_USD_MICROS.luna,
          {
            beforeProviderDispatch: () =>
              markPublicAiAdmissionDispatched(
                publicAdmission.client,
                publicAdmission.reservationId,
                publicAdmission.leaseToken,
              ),
            invokeProvider: () =>
              evaluateWithOpenAI({
                question,
                lesson,
                candidateAnswer: parsed.data.answer,
                safetyIdentifier: safetyIdentifier(publicAdmission.reservationId),
                responseLocale: parsed.data.responseLocale,
              }),
          },
        );
      } else {
        const openAiResult = await withAiBudget(
          supabase,
          COACH_RESERVATION_USD_MICROS.luna,
          {
            beforeProviderDispatch: markEvaluationProviderDispatched,
            invokeProvider: () =>
              evaluateWithOpenAI({
                question,
                lesson,
                candidateAnswer: parsed.data.answer,
                safetyIdentifier: safetyIdentifier(user?.id || clientKey),
                responseLocale: parsed.data.responseLocale,
              }),
          },
        );
        result = openAiResult.result;
        dailyBudget = openAiResult.dailyBudget;
      }
    } catch (error) {
      if (publicAdmission) throw error;
      result = await runGeminiBudgetFallback(error, supabase, async () => {
        await markEvaluationProviderDispatched();
        return evaluateWithGemini({
          question,
          lesson,
          candidateAnswer: parsed.data.answer,
          responseLocale: parsed.data.responseLocale,
        });
      });
      provider = "gemini";
    }
    const { data: feedback, model } = result;
    const modelLabel =
      provider === "gemini" ? `Gemini dự phòng · ${model}` : model;

    let attemptId: number | null = null;
    let responseFeedback = feedback;
    let responseModel = modelLabel;
    if (
      supabase &&
      parsed.data.idempotencyKey &&
      evaluationFingerprint &&
      evaluationReservation?.leaseToken
    ) {
      let completion: CoachEvaluationReservation;
      try {
        completion = await completeCoachEvaluation(supabase, {
          idempotencyKey: evaluationReservation.idempotencyKey,
          requestFingerprint: evaluationFingerprint,
          leaseToken: evaluationReservation.leaseToken,
          identity: evaluationIdentity,
          feedback,
          model: modelLabel,
        });
      } catch {
        try {
          completion = await completeCoachEvaluation(supabase, {
            idempotencyKey: evaluationReservation.idempotencyKey,
            requestFingerprint: evaluationFingerprint,
            leaseToken: evaluationReservation.leaseToken,
            identity: evaluationIdentity,
            feedback,
            model: modelLabel,
          });
        } catch (retryError) {
          try {
            completion = await markCoachEvaluationOutcomeUnknown(supabase, {
              idempotencyKey: evaluationReservation.idempotencyKey,
              leaseToken: evaluationReservation.leaseToken,
            });
          } catch {
            throw new CoachEvaluationFinalizationError(retryError, false);
          }
          if (completion.status !== "completed") {
            throw new CoachEvaluationFinalizationError(retryError, true);
          }
        }
      }
      if (!completion.feedback || !completion.model) {
        throw new CoachEvaluationFinalizationError(
          new Error("Completed coach evaluation cache is incomplete"),
          true,
        );
      }
      attemptId = completion.attemptId;
      responseFeedback = completion.feedback;
      responseModel = completion.model;
      provider = providerFromModel(responseModel);
    } else if (supabase && user) {
      const attempt = await supabase.from("coach_attempts").insert({
        user_id: user.id,
        question_id: question.id,
        question_version: question.version,
        source_commit_sha: manifest.sourceRevision,
        candidate_answer: parsed.data.answer,
        score: feedback.score,
        verdict: feedback.verdict,
        suggested_rating: feedback.suggestedRating,
        feedback,
        model: modelLabel,
        idempotency_key: parsed.data.idempotencyKey ?? null,
        response_locale: parsed.data.responseLocale,
      }).select("id").single();
      if (attempt.error) {
        console.error("AI coach history save failed", { code: attempt.error.code });
      } else {
        attemptId = attempt.data.id;
      }
    }

    if (publicAdmission) {
      try {
        await completePublicAiAdmission(publicAdmission);
      } catch (completionError) {
        console.error("Public AI admission completion could not be confirmed", {
          name:
            completionError instanceof Error
              ? completionError.name
              : "UnknownError",
        });
        try {
          await markPublicAiAdmissionOutcomeUnknown(publicAdmission);
        } catch (transitionError) {
          console.error("Public AI admission terminalization failed", {
            name:
              transitionError instanceof Error
                ? transitionError.name
                : "UnknownError",
          });
        }
      }
    }

    return attachPublicAiDeviceCookie(Response.json({
      feedback: responseFeedback,
      model: responseModel,
      provider,
      aiDailyBudget: dailyBudget,
      aiUsageRecorded:
        publicAdmission !== null || provider === "gemini" || dailyBudget !== null,
      publicAiQuota: publicAdmission
        ? {
            limit: PUBLIC_AI_QUOTA_LIMIT,
            remaining: publicAdmission.remaining,
            resetsAt: publicAdmission.resetsAt,
          }
        : null,
      attemptId,
    }), publicAdmission);
  } catch (error) {
    if (error instanceof CoachEvaluationFinalizationError) {
      console.error("AI coach completion could not be confirmed", {
        name:
          error.cause instanceof Error
            ? error.cause.name
            : "UnknownError",
      });
      return Response.json(
        {
          error:
            error.terminalized
              ? "Câu trả lời đã được chấm nhưng không thể xác nhận việc lưu kết quả. Để tránh tính phí hai lần, hệ thống sẽ không tự chấm lại cùng lượt này."
              : "Câu trả lời đã được chấm nhưng chưa thể lưu kết quả an toàn. Hệ thống đang khóa lượt này để tránh chấm trùng.",
          code: "evaluation_completion_unconfirmed",
        },
        error.terminalized
          ? { status: 409 }
          : {
              status: 503,
              headers: { "Retry-After": "10" },
            },
      );
    }

    if (error instanceof AiOperationOutcomeUnknownError) {
      console.error("AI coach provider outcome could not be confirmed", {
        name:
          error.cause instanceof Error
            ? error.cause.name
            : "UnknownError",
      });
      let terminalized = false;
      if (publicAdmission) {
        try {
          await markPublicAiAdmissionOutcomeUnknown(publicAdmission);
          terminalized = true;
        } catch (transitionError) {
          console.error("Public AI unknown-outcome transition failed", {
            name: transitionError instanceof Error ? transitionError.name : "UnknownError",
          });
        }
      } else if (
        supabase &&
        evaluationReservation?.leaseToken
      ) {
        try {
          const terminal = await markCoachEvaluationOutcomeUnknown(supabase, {
            idempotencyKey: evaluationReservation.idempotencyKey,
            leaseToken: evaluationReservation.leaseToken,
          });
          if (
            terminal.status === "completed" &&
            terminal.feedback &&
            terminal.model
          ) {
            return Response.json({
              feedback: terminal.feedback,
              model: terminal.model,
              provider: providerFromModel(terminal.model),
              attemptId: terminal.attemptId,
              cached: true,
              aiDailyBudget: null,
              aiUsageRecorded: true,
            });
          }
          terminalized = terminal.status === "outcome_unknown";
        } catch (transitionError) {
          console.error("AI coach unknown-outcome transition failed", {
            name:
              transitionError instanceof Error
                ? transitionError.name
                : "UnknownError",
          });
        }
      }
      return Response.json(
        {
          error:
            terminalized
              ? "Nhà cung cấp AI không xác nhận được kết quả lượt chấm. Để tránh tính phí hai lần, hệ thống sẽ không tự chạy lại cùng câu trả lời."
              : "Nhà cung cấp AI chưa xác nhận được kết quả lượt chấm. Hệ thống đang khóa lượt này để tránh tính phí hai lần.",
          code: "evaluation_outcome_unconfirmed",
        },
        terminalized
          ? { status: 409 }
          : {
              status: 503,
              headers: { "Retry-After": "10" },
            },
      );
    }

    if (publicAdmission) {
      try {
        await releasePublicAiAdmission(publicAdmission);
      } catch (releaseError) {
        console.error("Public AI admission release failed", {
          name: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    } else if (
      supabase &&
      parsed.data.idempotencyKey &&
      evaluationReservation?.leaseToken
    ) {
      try {
        await releaseCoachEvaluation(supabase, {
          idempotencyKey: evaluationReservation.idempotencyKey,
          leaseToken: evaluationReservation.leaseToken,
        });
      } catch (releaseError) {
        console.error("AI coach reservation release failed", {
          name:
            releaseError instanceof Error
              ? releaseError.name
              : "UnknownError",
        });
        return Response.json(
          {
            error:
              "Không thể mở lại lượt chấm sau sự cố. Vui lòng thử lại sau.",
            code: "evaluation_release_failed",
          },
          {
            status: 503,
            headers: { "Retry-After": "10" },
          },
        );
      }
    }

    if (error instanceof AllAiQuotasExceededError) {
      return Response.json(
        {
          error:
            "OpenAI đã hết hạn mức và Gemini miễn phí cũng đang bận hoặc hết hạn mức. Vui lòng thử lại sau.",
          code: "all_ai_quotas_exceeded",
        },
        { status: 429 },
      );
    }
    if (error instanceof GeminiFallbackProviderError) {
      console.error("Gemini fallback coach request failed", {
        name: error.cause instanceof Error ? error.cause.name : "UnknownError",
      });
      return Response.json(
        {
          error:
            "Gemini dự phòng chưa trả lời được. Vui lòng thử lại sau.",
          code: "fallback_provider_error",
        },
        { status: 502 },
      );
    }
    if (error instanceof CoachConfigurationError) {
      return Response.json(
        {
          error: "Trợ lý AI chưa được cấu hình khóa truy cập.",
          code: "not_configured",
        },
        { status: 503 },
      );
    }

    if (error instanceof PublicAiSiteBudgetExceededError) {
      return Response.json(
        {
          error:
            error.period === "daily"
              ? "Lượt AI công khai hôm nay đã đạt ngân sách an toàn. Vui lòng quay lại ngày mai."
              : "Lượt AI công khai đã đạt ngân sách tháng này. Vui lòng quay lại sau.",
          code: `public_ai_${error.period}_budget_exceeded`,
        },
        { status: 429 },
      );
    }

    if (
      error instanceof PublicAiSiteBudgetConfigurationError ||
      error instanceof PublicAiQuotaConfigurationError
    ) {
      return Response.json(
        {
          error: "Cơ chế giới hạn AI công khai chưa được cấu hình đầy đủ.",
          code: "public_ai_budget_not_configured",
        },
        { status: 503 },
      );
    }

    if (error instanceof AiMonthlyBudgetExceededError) {
      return Response.json(
        {
          error: "Đã chạm ngân sách AI tháng này. Website sẽ không gọi thêm để giữ giới hạn chi tiêu.",
          code: "monthly_budget_exceeded",
        },
        { status: 429 },
      );
    }

    if (error instanceof AiDailyBudgetExceededError) {
      return Response.json(
        {
          error:
            "Đã dùng hết hạn mức AI hôm nay. Hạn mức sẽ tự đặt lại lúc 00:00 giờ Việt Nam.",
          code: "daily_budget_exceeded",
        },
        { status: 429 },
      );
    }

    if (error instanceof AiBudgetConfigurationError) {
      return Response.json(
        {
          error:
            "Cơ chế giới hạn chi phí AI chưa được cài đặt trong Supabase.",
          code: "budget_not_configured",
        },
        { status: 503 },
      );
    }

    const status = getProviderStatus(error);
    const providerCode = getProviderCode(error);
    console.error("AI coach request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status,
    });

    if (providerCode === "insufficient_quota") {
      return Response.json(
        {
          error:
            "Dự án OpenAI chưa có tín dụng hoặc đã dùng hết ngân sách tháng.",
          code: "provider_quota_exceeded",
        },
        { status: 429 },
      );
    }

    if (status === 429) {
      return Response.json(
        {
          error:
            "OpenAI đang giới hạn tạm thời hoặc dự án đã chạm ngân sách. Vui lòng thử lại sau.",
          code: "provider_rate_limited",
        },
        { status: 429 },
      );
    }

    return Response.json(
      {
        error: "Trợ lý AI chưa trả lời được. Vui lòng thử lại sau.",
        code: "provider_error",
      },
      { status: 502 },
    );
  }
}

function getProviderStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function getProviderCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function providerFromModel(model: string): "openai" | "gemini" {
  return model.startsWith("Gemini") ? "gemini" : "openai";
}

class CoachEvaluationFinalizationError extends Error {
  constructor(
    readonly cause: unknown,
    readonly terminalized: boolean,
  ) {
    super("Coach evaluation completion could not be confirmed");
    this.name = "CoachEvaluationFinalizationError";
  }
}
