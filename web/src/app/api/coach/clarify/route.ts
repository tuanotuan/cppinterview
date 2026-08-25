import {
  AiBudgetConfigurationError,
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationOutcomeUnknownError,
  withAiBudget,
} from "@/lib/ai/budget";
import { questionClarificationRequestSchema } from "@/lib/ai/contracts";
import {
  clarifyQuestionWithOpenAI,
  CoachConfigurationError,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { consumeCoachRequest } from "@/lib/ai/rate-limit";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import {
  isQuestionApproved,
  rowsToApprovals,
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
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
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
  const parsed = questionClarificationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Câu hỏi cần làm rõ không hợp lệ.", code: "invalid_request" },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      {
        error: "Trợ lý AI chưa có xác thực và cơ chế giới hạn chi phí an toàn.",
        code: "service_not_configured",
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user || !isTuanotuanQuestionAdmin(user)) {
    return Response.json(
      {
        error: "Bạn cần đăng nhập bằng tài khoản quản trị để dùng chức năng này.",
        code: "admin_required",
      },
      { status: 403 },
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
      { error: "Không đọc được ngân hàng câu hỏi.", code: "question_lookup_failed" },
      { status: 502 },
    );
  }

  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: overridesResult.overrides,
  });
  const approvals = rowsToApprovals(
    (approvalsResult.data ?? []) as QuestionApprovalRow[],
  );
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

  try {
    const { result, dailyBudget } = await withAiBudget(
      supabase,
      COACH_RESERVATION_USD_MICROS.clarification,
      {
        beforeProviderDispatch: async () => undefined,
        invokeProvider: () =>
          clarifyQuestionWithOpenAI({
            question,
            lesson,
            safetyIdentifier: safetyIdentifier(`${user.id}:${question.id}:clarify`),
            responseLocale: parsed.data.responseLocale,
          }),
      },
    );
    return Response.json({
      clarification: result.data,
      model: result.model,
      aiDailyBudget: dailyBudget,
      aiUsageRecorded: Boolean(dailyBudget),
    });
  } catch (error) {
    if (error instanceof AiMonthlyBudgetExceededError) {
      return Response.json(
        { error: "Đã chạm ngân sách AI tháng này.", code: "monthly_budget_exceeded" },
        { status: 429 },
      );
    }
    if (error instanceof AiDailyBudgetExceededError) {
      return Response.json(
        {
          error: "Đã dùng hết hạn mức AI hôm nay. Hạn mức sẽ tự đặt lại lúc 00:00 giờ Việt Nam.",
          code: "daily_budget_exceeded",
        },
        { status: 429 },
      );
    }
    if (error instanceof AiOperationOutcomeUnknownError) {
      return Response.json(
        {
          error: "Chưa xác nhận được trạng thái lượt Luna này. Hệ thống không tự thử lại để tránh tính phí trùng.",
          code: "clarification_outcome_unconfirmed",
        },
        { status: 503 },
      );
    }
    if (error instanceof AiBudgetConfigurationError) {
      return Response.json(
        { error: "Cơ chế giới hạn chi phí AI chưa sẵn sàng.", code: "budget_not_configured" },
        { status: 503 },
      );
    }
    if (error instanceof CoachConfigurationError) {
      return Response.json(
        { error: "Trợ lý AI chưa được cấu hình khóa truy cập.", code: "not_configured" },
        { status: 503 },
      );
    }
    console.error("Question clarification failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Luna chưa làm rõ câu hỏi được. Vui lòng thử lại sau.", code: "provider_error" },
      { status: 502 },
    );
  }
}
