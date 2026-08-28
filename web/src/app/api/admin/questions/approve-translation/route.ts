import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import {
  approveQuestionTranslationsSchema,
} from "@/lib/content/question-translation-approval";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import { findExactQuestionTranslation } from "@/lib/content/translations";
import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Chức năng duyệt bản dịch chưa được cấu hình." },
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

  const parsed = approveQuestionTranslationsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Dữ liệu duyệt bản dịch không hợp lệ." },
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

  const questions = new Map(
    manifest.questions.map((question) => [question.id, question]),
  );
  const translations = parsed.data.translations.map((approval) => {
    const question = questions.get(approval.questionId);
    if (
      !question ||
      question.status === "archived" ||
      question.version !== approval.questionVersion ||
      question.sourceHash !== approval.sourceHash
    ) {
      return null;
    }
    const translation = findExactQuestionTranslation(question, approval.locale);
    if (!translation || translation.status !== "draft") return null;
    return { approval, translation };
  });

  if (translations.some((translation) => translation === null)) {
    return Response.json(
      {
        error:
          "Câu hỏi hoặc bản dịch đã thay đổi; hãy tải lại danh sách chờ duyệt.",
      },
      { status: 409 },
    );
  }

  const approvedAt = new Date().toISOString();
  const rows = translations.map((candidate) => {
    if (!candidate) throw new Error("Validated translation is missing");
    return {
      question_id: candidate.approval.questionId,
      question_version: candidate.approval.questionVersion,
      source_hash: candidate.approval.sourceHash,
      locale: candidate.approval.locale,
      prompt: candidate.translation.prompt,
      hint: candidate.translation.hint,
      answer: candidate.translation.answer,
      rubric: candidate.translation.rubric,
      translation_status: "verified",
      approved_by: authData.user.id,
      approved_at: approvedAt,
      updated_at: approvedAt,
    };
  });

  const { error } = await supabase
    .from("content_question_translations")
    .upsert(rows, {
      onConflict: "question_id,question_version,locale",
    });
  if (error) {
    return Response.json(
      { error: "Không lưu được kết quả duyệt bản dịch." },
      { status: 502 },
    );
  }

  return Response.json({ approved: parsed.data.translations });
}
