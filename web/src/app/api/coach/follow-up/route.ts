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
  coachFollowUpRequestSchema,
  type CoachFollowUpResponse,
} from "@/lib/ai/contracts";
import {
  CoachFollowUpBusyError,
  CoachFollowUpIdempotencyConflictError,
  CoachFollowUpReservationConfigurationError,
  coachFollowUpRequestFingerprint,
  completeCoachFollowUp,
  markCoachFollowUpDispatched,
  markCoachFollowUpOutcomeUnknown,
  releaseCoachFollowUp,
  reserveCoachFollowUp,
  type CoachFollowUpRequestIdentity,
  type CoachFollowUpReservation,
} from "@/lib/ai/coach-follow-up-reservation.server";
import {
  AllAiQuotasExceededError,
  GeminiFallbackProviderError,
  runGeminiBudgetFallback,
} from "@/lib/ai/fallback";
import { answerCoachFollowUpWithGemini } from "@/lib/ai/gemini";
import {
  answerCoachFollowUpWithOpenAI,
  CoachConfigurationError,
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
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
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

  const parsed = coachFollowUpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Câu hỏi bổ sung không hợp lệ hoặc cuộc trò chuyện đã vượt quá 8 tin nhắn.",
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
  if (
    supabase &&
    (authResult?.error ||
      !authResult?.data.user ||
      !isAllowedPracticeUser(authResult.data.user))
  ) {
    return Response.json(
      {
        error: "Đăng nhập GitHub để hỏi tiếp trợ lý AI.",
        code: "authentication_required",
      },
      { status: 401 },
    );
  }
  if (supabase && !parsed.data.idempotencyKey) {
    return Response.json(
      {
        error:
          "Yêu cầu hỏi tiếp đang thiếu khóa chống gửi trùng. Vui lòng tải lại trang rồi thử lại.",
        code: "idempotency_key_required",
      },
      { status: 400 },
    );
  }

  let approvals: QuestionApproval[] = [];
  let manifest = getRepoContentManifest();
  if (supabase) {
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

  const question = manifest.questions.find(
    (item) =>
      item.id === parsed.data.questionId &&
      item.status !== "archived" &&
      (item.status === "verified" || isQuestionApproved(item, approvals)),
  );
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

  const followUpIdentity: CoachFollowUpRequestIdentity = {
    questionId: question.id,
    questionVersion: question.version,
    sourceRevision: manifest.sourceRevision,
    candidateAnswer: parsed.data.candidateAnswer,
    feedback: parsed.data.feedback,
    messages: parsed.data.messages,
  };
  let followUpReservation: CoachFollowUpReservation | null = null;
  let followUpFingerprint: string | null = null;
  if (supabase && parsed.data.idempotencyKey) {
    followUpFingerprint = coachFollowUpRequestFingerprint(
      followUpIdentity,
    );
    try {
      const reservation = await reserveCoachFollowUp(supabase, {
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint: followUpFingerprint,
        identity: followUpIdentity,
      });
      if (reservation.status === "completed") {
        return completedFollowUpResponse(reservation, null, true);
      }
      if (reservation.status === "outcome_unknown") {
        return followUpOutcomeUnknownResponse(true);
      }
      followUpReservation = reservation;
    } catch (error) {
      if (error instanceof CoachFollowUpIdempotencyConflictError) {
        return Response.json(
          {
            error:
              "Khóa chống gửi trùng không còn khớp với nội dung hỏi tiếp này.",
            code: "idempotency_conflict",
          },
          { status: 409 },
        );
      }
      if (error instanceof CoachFollowUpBusyError) {
        return Response.json(
          {
            error:
              "Câu hỏi này đang được xử lý. Vui lòng chờ một chút rồi thử lại.",
            code: "follow_up_in_progress",
          },
          {
            status: 409,
            headers: {
              "Retry-After": String(error.retryAfterSeconds),
            },
          },
        );
      }
      console.error("AI coach follow-up reservation failed", {
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

  const markFollowUpProviderDispatched = async () => {
    if (!supabase || !followUpReservation?.leaseToken) return;
    try {
      await markCoachFollowUpDispatched(supabase, {
        idempotencyKey: followUpReservation.idempotencyKey,
        leaseToken: followUpReservation.leaseToken,
      });
    } catch {
      throw new AiOperationNotStartedError(
        "Coach follow-up dispatch could not be confirmed",
      );
    }
  };

  try {
    let provider: "openai" | "gemini" = "openai";
    let dailyBudget = null;
    let result;
    try {
      const openAiResult = await withAiBudget(
        supabase,
        COACH_RESERVATION_USD_MICROS.terra,
        {
          beforeProviderDispatch: markFollowUpProviderDispatched,
          invokeProvider: () =>
            answerCoachFollowUpWithOpenAI({
              question,
              lesson,
              candidateAnswer: parsed.data.candidateAnswer,
              feedback: parsed.data.feedback,
              messages: parsed.data.messages,
              safetyIdentifier: safetyIdentifier(
                authResult?.data.user?.id || clientKey,
              ),
            }),
        },
      );
      result = openAiResult.result;
      dailyBudget = openAiResult.dailyBudget;
    } catch (error) {
      result = await runGeminiBudgetFallback(error, supabase, async () => {
        await markFollowUpProviderDispatched();
        return answerCoachFollowUpWithGemini({
          question,
          lesson,
          candidateAnswer: parsed.data.candidateAnswer,
          feedback: parsed.data.feedback,
          messages: parsed.data.messages,
        });
      });
      provider = "gemini";
    }
    const modelLabel =
      provider === "gemini"
        ? `Gemini dự phòng · ${result.model}`
        : result.model;
    if (
      supabase &&
      followUpFingerprint &&
      followUpReservation?.leaseToken
    ) {
      const completion = await persistCoachFollowUpCompletion(
        supabase,
        {
          reservation: followUpReservation,
          requestFingerprint: followUpFingerprint,
          response: result.data,
          model: modelLabel,
          provider,
        },
      );
      return completedFollowUpResponse(
        completion,
        dailyBudget,
        false,
      );
    }
    return Response.json({
      reply: result.data,
      model: modelLabel,
      provider,
      aiDailyBudget: dailyBudget,
      aiUsageRecorded: provider === "gemini" || dailyBudget !== null,
    });
  } catch (error) {
    if (error instanceof CoachFollowUpFinalizationError) {
      console.error("AI coach follow-up completion could not be confirmed", {
        name:
          error.cause instanceof Error
            ? error.cause.name
            : "UnknownError",
      });
      return followUpOutcomeUnknownResponse(error.terminalized);
    }

    if (error instanceof AiOperationOutcomeUnknownError) {
      console.error("AI coach follow-up outcome could not be confirmed", {
        name:
          error.cause instanceof Error
            ? error.cause.name
            : "UnknownError",
      });
      let terminalized = false;
      if (
        supabase &&
        followUpFingerprint &&
        followUpReservation?.leaseToken
      ) {
        try {
          const terminal = await markCoachFollowUpOutcomeUnknown(
            supabase,
            {
              idempotencyKey: followUpReservation.idempotencyKey,
              requestFingerprint: followUpFingerprint,
              leaseToken: followUpReservation.leaseToken,
            },
          );
          if (terminal.status === "completed") {
            return completedFollowUpResponse(terminal, null, true);
          }
          terminalized = terminal.status === "outcome_unknown";
        } catch (markError) {
          console.error("AI coach follow-up unknown marker failed", {
            name:
              markError instanceof Error
                ? markError.name
                : "UnknownError",
          });
        }
      }
      return followUpOutcomeUnknownResponse(terminalized);
    }

    if (
      supabase &&
      followUpReservation?.leaseToken
    ) {
      try {
        await releaseCoachFollowUp(supabase, {
          idempotencyKey: followUpReservation.idempotencyKey,
          leaseToken: followUpReservation.leaseToken,
        });
      } catch (releaseError) {
        console.error("AI coach follow-up reservation release failed", {
          name:
            releaseError instanceof Error
              ? releaseError.name
              : "UnknownError",
        });
        return followUpOutcomeUnknownResponse(false);
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
      console.error("Gemini fallback follow-up failed", {
        name: error.cause instanceof Error ? error.cause.name : "UnknownError",
      });
      return Response.json(
        {
          error:
            "Gemini dự phòng chưa giải thích thêm được. Vui lòng thử lại sau.",
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
    console.error("AI coach follow-up failed", {
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
          error: "AI chưa giải thích thêm được. Vui lòng thử lại sau.",
          code: "provider_error",
        },
      { status: 502 },
    );
  }
}

function getProviderStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

function getProviderCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

async function persistCoachFollowUpCompletion(
  client: Parameters<typeof completeCoachFollowUp>[0],
  input: {
    reservation: CoachFollowUpReservation;
    requestFingerprint: string;
    response: CoachFollowUpResponse;
    model: string;
    provider: "openai" | "gemini";
  },
) {
  let completionError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await completeCoachFollowUp(client, {
        idempotencyKey: input.reservation.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        leaseToken: input.reservation.leaseToken!,
        response: input.response,
        model: input.model,
        provider: input.provider,
      });
    } catch (error) {
      completionError = error;
    }
  }

  try {
    const terminal = await markCoachFollowUpOutcomeUnknown(client, {
      idempotencyKey: input.reservation.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      leaseToken: input.reservation.leaseToken!,
    });
    if (terminal.status === "completed") {
      return terminal;
    }
    throw new CoachFollowUpFinalizationError(
      completionError,
      terminal.status === "outcome_unknown",
    );
  } catch (markError) {
    if (markError instanceof CoachFollowUpFinalizationError) {
      throw markError;
    }
    throw new CoachFollowUpFinalizationError(markError);
  }
}

function completedFollowUpResponse(
  reservation: CoachFollowUpReservation,
  dailyBudget: unknown,
  cached: boolean,
) {
  if (
    reservation.status !== "completed" ||
    !reservation.response ||
    !reservation.model ||
    !reservation.provider
  ) {
    throw new CoachFollowUpReservationConfigurationError(
      "Completed coach follow-up cache is incomplete",
    );
  }
  return Response.json({
    reply: reservation.response,
    model: reservation.model,
    provider: reservation.provider,
    aiDailyBudget: dailyBudget,
    aiUsageRecorded:
      cached ||
      reservation.provider === "gemini" ||
      dailyBudget !== null,
    cached,
  });
}

function followUpOutcomeUnknownResponse(terminalized: boolean) {
  return Response.json(
    {
      error:
        "Chưa thể xác nhận kết quả của lượt hỏi này. Hệ thống đã khóa lượt để tránh tính phí hai lần; hãy đổi nội dung nếu muốn tạo một lượt mới.",
      code: "follow_up_outcome_unconfirmed",
    },
    terminalized
      ? { status: 409 }
      : {
          status: 503,
          headers: { "Retry-After": "10" },
        },
  );
}

class CoachFollowUpFinalizationError extends Error {
  constructor(
    readonly cause: unknown,
    readonly terminalized = false,
  ) {
    super("Coach follow-up completion could not be confirmed");
    this.name = "CoachFollowUpFinalizationError";
  }
}
