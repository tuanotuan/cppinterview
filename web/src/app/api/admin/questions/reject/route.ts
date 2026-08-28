import {
  rejectQueuedQuestionResultSchema,
  rejectQueuedQuestionSchema,
} from "@/lib/content/question-rejection";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Chức năng từ chối câu hỏi chưa được cấu hình." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (
    authError ||
    !authData.user ||
    !isTuanotuanQuestionAdmin(authData.user)
  ) {
    return Response.json(
      { error: "Cần đăng nhập bằng tài khoản quản trị viên." },
      { status: 401 },
    );
  }

  const parsed = rejectQueuedQuestionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Dữ liệu từ chối câu hỏi không hợp lệ." },
      { status: 400 },
    );
  }

  const overrides = await loadQuestionOverrides(supabase);
  if (overrides.error) {
    return Response.json(
      { error: "Không đọc được ngân hàng câu hỏi." },
      { status: 502 },
    );
  }

  let manifest: Awaited<ReturnType<typeof loadQuestionStoreManifest>>;
  try {
    manifest = await loadQuestionStoreManifest({
      supabase,
      overrides: overrides.overrides,
    });
  } catch {
    return Response.json(
      { error: "Không đọc được ngân hàng câu hỏi." },
      { status: 502 },
    );
  }

  const question = manifest.questions.find(
    (item) => item.id === parsed.data.questionId,
  );
  if (!question) {
    return Response.json(
      { error: "Không tìm thấy câu hỏi trong hàng đợi." },
      { status: 404 },
    );
  }
  if (
    !new Set(["draft", "needs_review"]).has(question.status) ||
    question.version !== parsed.data.questionVersion ||
    question.sourceHash !== parsed.data.sourceHash
  ) {
    return Response.json(
      {
        error:
          "Câu hỏi đã thay đổi hoặc không còn trong hàng đợi. Hãy tải lại trang.",
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.rpc(
    "reject_queued_content_question",
    {
      p_question_id: parsed.data.questionId,
      p_question_version: parsed.data.questionVersion,
      p_source_hash: parsed.data.sourceHash,
    },
  );
  if (error) {
    return Response.json(
      { error: "Không từ chối được câu hỏi. Hãy thử lại sau." },
      { status: 502 },
    );
  }

  const result = rejectQueuedQuestionResultSchema.safeParse(data);
  if (!result.success) {
    return Response.json(
      { error: "Phản hồi từ ngân hàng câu hỏi không hợp lệ." },
      { status: 502 },
    );
  }
  if (result.data.status === "not_found") {
    return Response.json(
      { error: "Không tìm thấy câu hỏi trong hàng đợi." },
      { status: 404 },
    );
  }
  if (
    result.data.status === "version_conflict" ||
    result.data.status === "not_pending"
  ) {
    return Response.json(
      {
        error:
          "Câu hỏi đã thay đổi hoặc không còn trong hàng đợi. Hãy tải lại trang.",
      },
      { status: 409 },
    );
  }

  return Response.json({
    status: result.data.status,
    questionId: parsed.data.questionId,
  });
}
