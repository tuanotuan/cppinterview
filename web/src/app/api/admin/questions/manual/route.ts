import { manualQuestionRequestSchema } from "@/lib/content/question-overrides";
import { getQuestionStoreMode } from "@/lib/content/question-store-config";
import { buildStandaloneManualQuestion } from "@/lib/content/standalone-manual-question";
import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
  }
  if (getQuestionStoreMode() !== "db") {
    return Response.json(
      {
        error:
          "Tạo câu hỏi thủ công cần QUESTION_STORE=db để câu hỏi được lưu an toàn trong ngân hàng Supabase.",
      },
      { status: 409 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || !isTuanotuanQuestionAdmin(authData.user)) {
    return Response.json(
      { error: "Cần đăng nhập bằng tài khoản quản trị viên." },
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
  const parsed = manualQuestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Nội dung câu hỏi không hợp lệ.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const draft = buildStandaloneManualQuestion(parsed.data);

  const { data, error } = await supabase.rpc("create_standalone_admin_content_question", {
    p_draft: draft,
  });
  if (error) {
    console.error("Manual question creation failed", { code: error.code });
    return Response.json(
      { error: error.message || "Không tạo được câu hỏi thủ công." },
      { status: error.code === "PGRST202" ? 503 : 502 },
    );
  }
  if (!isManualQuestionResult(data)) {
    return Response.json(
      { error: "Cơ sở dữ liệu trả về kết quả tạo câu hỏi không hợp lệ." },
      { status: 502 },
    );
  }
  return Response.json(data, { status: 201 });
}

function isManualQuestionResult(value: unknown): value is {
  questionId: string;
  version: number;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { questionId?: unknown }).questionId === "string" &&
      typeof (value as { version?: unknown }).version === "number",
  );
}
