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
import {
  buildLessonAssistantContext,
  LessonAssistantContextTooLargeError,
} from "@/lib/ai/lesson-assistant-context.server";
import {
  LessonAssistantBusyError,
  LessonAssistantIdempotencyConflictError,
  LessonAssistantReservationConfigurationError,
  completeLessonAssistantResponse,
  lessonAssistantRequestFingerprint,
  markLessonAssistantDispatched,
  markLessonAssistantOutcomeUnknown,
  releaseLessonAssistantResponse,
  reserveLessonAssistantResponse,
  type LessonAssistantReservation,
} from "@/lib/ai/lesson-assistant-reservation.server";
import {
  lessonAssistantRequestSchema,
  type LessonAssistantResponse,
} from "@/lib/ai/lesson-assistant";
import type { LessonAssistantRequestIdentity } from "@/lib/ai/lesson-assistant-idempotency-client";
import {
  answerLessonWithOpenAI,
  CoachConfigurationError,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { consumeCoachRequest } from "@/lib/ai/rate-limit";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { localizeContentManifest } from "@/lib/content/translations";
import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AiResponseLocale } from "@/lib/ai/contracts";

export const runtime = "nodejs";

const LESSON_ASSISTANT_MAX_REQUEST_BYTES = 64_000;

export async function POST(request: Request) {
  const earlyLocale = readRequestedLocaleHeader(request);
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limit = consumeCoachRequest(clientKey);
  if (!limit.allowed) {
    return errorResponse(
      earlyLocale,
      "rate_limited",
      429,
      "Bạn đang gọi AI quá nhanh. Vui lòng chờ một chút rồi thử lại.",
      "You are sending AI requests too quickly. Wait a moment and try again.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > LESSON_ASSISTANT_MAX_REQUEST_BYTES
  ) {
    return errorResponse(
      earlyLocale,
      "request_too_large",
      413,
      "Yêu cầu vượt quá giới hạn kích thước an toàn.",
      "The request exceeds the safe size limit.",
    );
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof LessonAssistantRequestTooLargeError) {
      return errorResponse(
        earlyLocale,
        "request_too_large",
        413,
        "Yêu cầu vượt quá giới hạn kích thước an toàn.",
        "The request exceeds the safe size limit.",
      );
    }
    return errorResponse(
      earlyLocale,
      "invalid_json",
      400,
      "Yêu cầu không chứa JSON hợp lệ.",
      "The request does not contain valid JSON.",
    );
  }

  const requestedLocale = readRequestedLocale(body);
  const parsed = lessonAssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      requestedLocale,
      "invalid_request",
      400,
      "Câu hỏi không hợp lệ hoặc cuộc trò chuyện đã vượt quá 4 lượt hỏi.",
      "The question is invalid or this conversation has exceeded four turns.",
    );
  }
  const locale = parsed.data.responseLocale;

  const supabaseConfigured = isSupabaseConfigured();
  if (!supabaseConfigured && !isUnmeteredLocalAiEnabled()) {
    return errorResponse(
      locale,
      "service_not_configured",
      503,
      "Trợ lý AI chưa có xác thực và cơ chế giới hạn chi phí an toàn.",
      "The AI assistant is missing authentication and safe cost controls.",
    );
  }

  const supabase = supabaseConfigured
    ? await createSupabaseServerClient()
    : null;
  const authResult = supabase ? await supabase.auth.getUser() : null;
  const user = authResult?.data.user ?? null;
  const isAdmin = Boolean(user && isTuanotuanQuestionAdmin(user));
  if (!isAdmin && !isPublicAiEnabled() && !isUnmeteredLocalAiEnabled()) {
    return errorResponse(
      locale,
      "public_ai_disabled",
      503,
      "Trợ lý AI công khai đang tạm thời chưa mở.",
      "Public AI access is temporarily unavailable.",
    );
  }
  if (supabase && !parsed.data.idempotencyKey) {
    return errorResponse(
      locale,
      "idempotency_key_required",
      400,
      "Yêu cầu đang thiếu khóa chống gửi trùng. Vui lòng tải lại trang rồi thử lại.",
      "This request is missing its duplicate-prevention key. Reload the page and try again.",
    );
  }

  const manifest = localizeContentManifest(
    getRepoContentManifest(),
    locale,
  );
  const lesson = manifest.lessons.find(
    (item) => item.id === parsed.data.lessonId,
  );
  if (!lesson) {
    return errorResponse(
      locale,
      "lesson_not_found",
      404,
      "Không tìm thấy bài học hiện hành.",
      "The current lesson could not be found.",
    );
  }

  let context;
  try {
    context = buildLessonAssistantContext(lesson);
  } catch (error) {
    if (error instanceof LessonAssistantContextTooLargeError) {
      console.error("Lesson assistant context exceeds its size contract", {
        lessonId: lesson.id,
        characters: error.characters,
      });
      return errorResponse(
        locale,
        "lesson_context_too_large",
        503,
        "Bài học này hiện quá dài để gửi an toàn cho trợ lý AI.",
        "This lesson is currently too large to send safely to the AI assistant.",
      );
    }
    throw error;
  }

  const identity: LessonAssistantRequestIdentity = {
    lessonId: lesson.id,
    contextHash: context.contextHash,
    messages: parsed.data.messages,
    responseLocale: locale,
  };
  const requestFingerprint = lessonAssistantRequestFingerprint(identity);
  let ownerReservation: LessonAssistantReservation | null = null;
  let publicAdmission: PublicAiAdmission | null = null;

  if (isAdmin && supabase && parsed.data.idempotencyKey) {
    try {
      const reservation = await reserveLessonAssistantResponse(supabase, {
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint,
        identity,
      });
      if (reservation.status === "completed") {
        return completedResponse(reservation, null, true);
      }
      if (reservation.status === "outcome_unknown") {
        return outcomeUnknownResponse(locale, true);
      }
      ownerReservation = reservation;
    } catch (error) {
      if (error instanceof LessonAssistantIdempotencyConflictError) {
        return errorResponse(
          locale,
          "idempotency_conflict",
          409,
          "Khóa chống gửi trùng không còn khớp với câu hỏi này.",
          "The duplicate-prevention key no longer matches this question.",
        );
      }
      if (error instanceof LessonAssistantBusyError) {
        return errorResponse(
          locale,
          "lesson_ai_in_progress",
          409,
          "Câu hỏi này đang được xử lý. Vui lòng chờ một chút rồi thử lại.",
          "This question is already being processed. Wait a moment and try again.",
          { "Retry-After": String(error.retryAfterSeconds) },
        );
      }
      console.error("Lesson assistant reservation failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return errorResponse(
        locale,
        "idempotency_not_configured",
        503,
        "Cơ chế chống gửi trùng của trợ lý AI chưa sẵn sàng. Vui lòng thử lại sau.",
        "The AI assistant's duplicate-prevention mechanism is not ready. Try again later.",
      );
    }
  }

  if (!isAdmin && parsed.data.idempotencyKey) {
    try {
      publicAdmission = await reservePublicAiAdmission({
        request,
        user,
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint,
        requestKind: "lesson_assistant",
      });
    } catch (error) {
      if (error instanceof PublicAiQuotaExceededError) {
        return Response.json(
          {
            error: localized(
              locale,
              "Bạn đã dùng hết 3 lượt AI trong 24 giờ qua. Vui lòng quay lại sau.",
              "You have used all three AI turns in the past 24 hours. Please come back later.",
            ),
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
        return errorResponse(
          locale,
          "public_ai_request_unavailable",
          409,
          "Lượt AI này đang được xử lý hoặc đã hoàn tất. Hãy đổi câu hỏi trước khi gửi lại.",
          "This AI turn is already processing or completed. Change the question before sending again.",
        );
      }
      if (error instanceof PublicAiIdentityUnavailableError) {
        return errorResponse(
          locale,
          "public_ai_identity_unavailable",
          503,
          "Không xác minh được thiết bị để áp dụng giới hạn AI an toàn.",
          "The device could not be verified for safe AI quota enforcement.",
        );
      }
      console.error("Public lesson assistant admission failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        reason:
          error instanceof PublicAiQuotaConfigurationError
            ? error.reason
            : "unknown",
      });
      return errorResponse(
        locale,
        "public_ai_not_configured",
        503,
        "Cơ chế giới hạn AI công khai chưa sẵn sàng. Vui lòng thử lại sau.",
        "Public AI quota enforcement is not ready. Try again later.",
      );
    }
  }

  const markOwnerDispatched = async () => {
    if (!supabase || !ownerReservation?.leaseToken) return;
    try {
      await markLessonAssistantDispatched(supabase, {
        idempotencyKey: ownerReservation.idempotencyKey,
        leaseToken: ownerReservation.leaseToken,
      });
    } catch (error) {
      throw new AiOperationNotStartedError(
        "Lesson assistant dispatch could not be confirmed",
        { cause: error },
      );
    }
  };

  try {
    let dailyBudget = null;
    let result;
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
            answerLessonWithOpenAI({
              context,
              messages: parsed.data.messages,
              responseLocale: locale,
              safetyIdentifier: safetyIdentifier(
                publicAdmission.reservationId,
              ),
            }),
        },
      );
    } else {
      const budgeted = await withAiBudget(
        supabase,
        COACH_RESERVATION_USD_MICROS.luna,
        {
          beforeProviderDispatch: markOwnerDispatched,
          invokeProvider: () =>
            answerLessonWithOpenAI({
              context,
              messages: parsed.data.messages,
              responseLocale: locale,
              safetyIdentifier: safetyIdentifier(user?.id || clientKey),
            }),
        },
      );
      result = budgeted.result;
      dailyBudget = budgeted.dailyBudget;
    }

    if (supabase && ownerReservation?.leaseToken) {
      const completion = await persistOwnerCompletion(supabase, {
        reservation: ownerReservation,
        requestFingerprint,
        response: result.data,
        model: result.model,
      });
      return completedResponse(completion, dailyBudget, false);
    }

    if (publicAdmission) {
      await completePublicAdmissionOrTerminalize(publicAdmission);
    }
    return attachPublicAiDeviceCookie(
      Response.json({
        reply: result.data,
        model: result.model,
        provider: "openai",
        aiDailyBudget: dailyBudget,
        aiUsageRecorded: publicAdmission !== null || dailyBudget !== null,
        publicAiQuota: publicAdmission
          ? {
              limit: PUBLIC_AI_QUOTA_LIMIT,
              remaining: publicAdmission.remaining,
              resetsAt: publicAdmission.resetsAt,
            }
          : null,
        cached: false,
      }),
      publicAdmission,
    );
  } catch (error) {
    if (error instanceof LessonAssistantFinalizationError) {
      console.error("Lesson assistant completion could not be confirmed", {
        name: error.cause instanceof Error ? error.cause.name : "UnknownError",
      });
      return outcomeUnknownResponse(locale, error.terminalized);
    }

    if (error instanceof AiOperationOutcomeUnknownError) {
      console.error("Lesson assistant provider outcome could not be confirmed", {
        name: error.cause instanceof Error ? error.cause.name : "UnknownError",
      });
      let terminalized = false;
      if (publicAdmission) {
        try {
          await markPublicAiAdmissionOutcomeUnknown(publicAdmission);
          terminalized = true;
        } catch (markError) {
          console.error("Public lesson assistant unknown marker failed", {
            name: markError instanceof Error ? markError.name : "UnknownError",
          });
        }
      } else if (supabase && ownerReservation?.leaseToken) {
        try {
          const terminal = await markLessonAssistantOutcomeUnknown(
            supabase,
            {
              idempotencyKey: ownerReservation.idempotencyKey,
              requestFingerprint,
              leaseToken: ownerReservation.leaseToken,
            },
          );
          if (terminal.status === "completed") {
            return completedResponse(terminal, null, true);
          }
          terminalized = terminal.status === "outcome_unknown";
        } catch (markError) {
          console.error("Lesson assistant unknown marker failed", {
            name: markError instanceof Error ? markError.name : "UnknownError",
          });
        }
      }
      return outcomeUnknownResponse(locale, terminalized);
    }

    if (publicAdmission) {
      try {
        await releasePublicAiAdmission(publicAdmission);
      } catch (releaseError) {
        console.error("Public lesson assistant admission release failed", {
          name:
            releaseError instanceof Error
              ? releaseError.name
              : "UnknownError",
        });
      }
    } else if (supabase && ownerReservation?.leaseToken) {
      try {
        await releaseLessonAssistantResponse(supabase, {
          idempotencyKey: ownerReservation.idempotencyKey,
          leaseToken: ownerReservation.leaseToken,
        });
      } catch (releaseError) {
        console.error("Lesson assistant reservation release failed", {
          name:
            releaseError instanceof Error
              ? releaseError.name
              : "UnknownError",
        });
        return outcomeUnknownResponse(locale, false);
      }
    }

    if (error instanceof CoachConfigurationError) {
      return errorResponse(
        locale,
        "not_configured",
        503,
        "Trợ lý AI chưa được cấu hình khóa truy cập.",
        "The AI assistant access key is not configured.",
      );
    }
    if (error instanceof AiOperationNotStartedError) {
      console.error("Lesson assistant provider preflight failed", {
        name: error.name,
        causeName:
          error.cause instanceof Error ? error.cause.name : "UnknownError",
      });
      return errorResponse(
        locale,
        "provider_not_started",
        503,
        "Chưa thể chuẩn bị lượt hỏi AI. Không có yêu cầu nào được gửi tới OpenAI; vui lòng thử lại sau.",
        "The AI turn could not be prepared. No request was sent to OpenAI; try again later.",
        { "Retry-After": "10" },
      );
    }
    if (error instanceof PublicAiSiteBudgetExceededError) {
      return errorResponse(
        locale,
        `public_ai_${error.period}_budget_exceeded`,
        429,
        error.period === "daily"
          ? "Lượt AI công khai hôm nay đã đạt ngân sách an toàn. Vui lòng quay lại ngày mai."
          : "Lượt AI công khai đã đạt ngân sách tháng này. Vui lòng quay lại sau.",
        error.period === "daily"
          ? "Today's public AI safety budget has been reached. Please return tomorrow."
          : "This month's public AI safety budget has been reached. Please return later.",
      );
    }
    if (
      error instanceof PublicAiSiteBudgetConfigurationError ||
      error instanceof PublicAiQuotaConfigurationError
    ) {
      return errorResponse(
        locale,
        "public_ai_budget_not_configured",
        503,
        "Cơ chế giới hạn AI công khai chưa được cấu hình đầy đủ.",
        "Public AI cost controls are not fully configured.",
      );
    }
    if (error instanceof AiMonthlyBudgetExceededError) {
      return errorResponse(
        locale,
        "monthly_budget_exceeded",
        429,
        "Đã chạm ngân sách AI tháng này. Website sẽ không gọi thêm để giữ giới hạn chi tiêu.",
        "This month's AI budget has been reached. No more calls will be made to keep spending bounded.",
      );
    }
    if (error instanceof AiDailyBudgetExceededError) {
      return errorResponse(
        locale,
        "daily_budget_exceeded",
        429,
        "Đã dùng hết hạn mức AI hôm nay. Hạn mức tự đặt lại lúc 00:00 giờ Việt Nam.",
        "Today's AI allowance is exhausted. It resets at 00:00 Vietnam time.",
      );
    }
    if (error instanceof AiBudgetConfigurationError) {
      return errorResponse(
        locale,
        "budget_not_configured",
        503,
        "Cơ chế giới hạn chi phí AI chưa được cài đặt trong Supabase.",
        "AI cost controls have not been installed in Supabase.",
      );
    }

    const status = getProviderStatus(error);
    const providerCode = getProviderCode(error);
    console.error("Lesson assistant request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status,
    });
    if (providerCode === "insufficient_quota") {
      return errorResponse(
        locale,
        "provider_quota_exceeded",
        429,
        "Dự án OpenAI chưa có tín dụng hoặc đã dùng hết ngân sách tháng.",
        "The OpenAI project has no remaining credit or monthly budget.",
      );
    }
    if (status === 429) {
      return errorResponse(
        locale,
        "provider_rate_limited",
        429,
        "OpenAI đang giới hạn tạm thời. Vui lòng thử lại sau.",
        "OpenAI is temporarily rate-limiting requests. Try again later.",
      );
    }
    return errorResponse(
      locale,
      "provider_error",
      502,
      "AI chưa trả lời được câu hỏi này. Vui lòng thử lại sau.",
      "The AI could not answer this question. Try again later.",
    );
  }
}

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) return JSON.parse("");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let serialized = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > LESSON_ASSISTANT_MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new LessonAssistantRequestTooLargeError();
      }
      serialized += decoder.decode(value, { stream: true });
    }
    serialized += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(serialized);
}

function readRequestedLocaleHeader(request: Request): AiResponseLocale {
  return request.headers.get("x-response-locale") === "en" ? "en" : "vi";
}

function readRequestedLocale(value: unknown): AiResponseLocale {
  if (
    typeof value === "object" &&
    value !== null &&
    "responseLocale" in value &&
    value.responseLocale === "en"
  ) {
    return "en";
  }
  return "vi";
}

function localized(
  locale: AiResponseLocale,
  vietnamese: string,
  english: string,
) {
  return locale === "en" ? english : vietnamese;
}

function errorResponse(
  locale: AiResponseLocale,
  code: string,
  status: number,
  vietnamese: string,
  english: string,
  headers?: HeadersInit,
) {
  return Response.json(
    { error: localized(locale, vietnamese, english), code },
    { status, headers },
  );
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

async function persistOwnerCompletion(
  client: Parameters<typeof completeLessonAssistantResponse>[0],
  input: {
    reservation: LessonAssistantReservation;
    requestFingerprint: string;
    response: LessonAssistantResponse;
    model: string;
  },
) {
  let completionError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await completeLessonAssistantResponse(client, {
        idempotencyKey: input.reservation.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        leaseToken: input.reservation.leaseToken!,
        response: input.response,
        model: input.model,
      });
    } catch (error) {
      completionError = error;
    }
  }

  try {
    const terminal = await markLessonAssistantOutcomeUnknown(client, {
      idempotencyKey: input.reservation.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      leaseToken: input.reservation.leaseToken!,
    });
    if (terminal.status === "completed") return terminal;
    throw new LessonAssistantFinalizationError(
      completionError,
      terminal.status === "outcome_unknown",
    );
  } catch (markError) {
    if (markError instanceof LessonAssistantFinalizationError) {
      throw markError;
    }
    throw new LessonAssistantFinalizationError(markError);
  }
}

function completedResponse(
  reservation: LessonAssistantReservation,
  dailyBudget: unknown,
  cached: boolean,
) {
  if (
    reservation.status !== "completed" ||
    !reservation.response ||
    !reservation.model
  ) {
    throw new LessonAssistantReservationConfigurationError(
      "Completed lesson assistant cache is incomplete",
    );
  }
  return Response.json({
    reply: reservation.response,
    model: reservation.model,
    provider: "openai",
    aiDailyBudget: dailyBudget,
    aiUsageRecorded: cached || dailyBudget !== null,
    publicAiQuota: null,
    cached,
  });
}

function outcomeUnknownResponse(
  locale: AiResponseLocale,
  terminalized: boolean,
) {
  return Response.json(
    {
      error: localized(
        locale,
        "Chưa thể xác nhận kết quả của lượt hỏi này. Hệ thống đã khóa lượt để tránh tính phí hai lần; hãy đổi câu hỏi nếu muốn tạo lượt mới.",
        "The result of this turn could not be confirmed. It has been locked to prevent duplicate billing; change the question to create a new turn.",
      ),
      code: "lesson_ai_outcome_unconfirmed",
    },
    terminalized
      ? { status: 409 }
      : { status: 503, headers: { "Retry-After": "10" } },
  );
}

async function completePublicAdmissionOrTerminalize(
  admission: PublicAiAdmission,
) {
  try {
    await completePublicAiAdmission(admission);
  } catch (completionError) {
    console.error("Public lesson assistant completion was not confirmed", {
      name:
        completionError instanceof Error
          ? completionError.name
          : "UnknownError",
    });
    try {
      await markPublicAiAdmissionOutcomeUnknown(admission);
    } catch (transitionError) {
      console.error("Public lesson assistant terminalization failed", {
        name:
          transitionError instanceof Error
            ? transitionError.name
            : "UnknownError",
      });
    }
  }
}

class LessonAssistantFinalizationError extends Error {
  constructor(
    readonly cause: unknown,
    readonly terminalized = false,
  ) {
    super("Lesson assistant completion could not be confirmed");
    this.name = "LessonAssistantFinalizationError";
  }
}

class LessonAssistantRequestTooLargeError extends Error {}
