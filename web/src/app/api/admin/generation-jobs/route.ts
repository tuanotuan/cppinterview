import { z } from "zod";

import { QUESTION_GENERATOR_PROMPT_VERSION } from "@/lib/content/drafts";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const retrySchema = z.object({
  jobId: z.number().int().positive(),
  confirmAmbiguousOutcome: z.boolean(),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || !isAllowedPracticeUser(authData.user)) {
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
  const parsed = retrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Tác vụ tạo nội dung không hợp lệ." },
      { status: 400 },
    );
  }
  const { data, error } = await supabase.rpc("retry_content_generation_job", {
    p_job_id: parsed.data.jobId,
    p_generator_version: QUESTION_GENERATOR_PROMPT_VERSION,
    p_confirm_ambiguous_outcome: parsed.data.confirmAmbiguousOutcome,
  });
  if (error) {
    const requiresConfirmation = error.message.includes(
      "explicit retry confirmation",
    );
    let message = "Không thể chạy lại tác vụ tạo nội dung.";
    if (requiresConfirmation) {
      message =
        "Nhà cung cấp AI có thể đã xử lý yêu cầu trước đó. Bạn phải xác nhận rõ trước khi chạy lại.";
    } else if (error.message.includes("retry audit limit")) {
      message = "Tác vụ đã đạt giới hạn số lần chạy lại có lưu dấu vết.";
    } else if (error.message.includes("obsolete generator version")) {
      message = "Tác vụ dùng phiên bản bộ sinh câu hỏi cũ và không thể chạy lại.";
    } else if (error.message.includes("not retryable")) {
      message = "Tác vụ không còn ở trạng thái có thể chạy lại.";
    }
    return Response.json(
      { error: message, requiresConfirmation },
      { status: 409 },
    );
  }
  const result = z.object({
    ok: z.literal(true),
    status: z.enum(["pending", "superseded"]),
    confirmedAmbiguousOutcome: z.boolean(),
  }).safeParse(data);
  if (!result.success) {
    return Response.json(
      { error: "Supabase trả về kết quả chạy lại không hợp lệ." },
      { status: 502 },
    );
  }
  return Response.json(result.data);
}
