import { questionRevisionChecksum } from "@/lib/content/backfill";
import { manualQuestionRequestSchema } from "@/lib/content/question-overrides";
import { getQuestionStoreMode } from "@/lib/content/question-store-config";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import type { ContentQuestion, Question } from "@/lib/content/schema";
import { buildQuestionTaxonomy } from "@/lib/content/taxonomy";
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

  let manifest;
  try {
    manifest = await loadQuestionStoreManifest({ supabase });
  } catch {
    return Response.json(
      { error: "Ngân hàng câu hỏi Supabase chưa sẵn sàng." },
      { status: 503 },
    );
  }
  const lesson = manifest.lessons.find((item) => item.id === parsed.data.lessonId);
  if (!lesson) {
    return Response.json({ error: "Không tìm thấy bài học nguồn." }, { status: 404 });
  }
  const validSectionIds = new Set(lesson.sections.map((section) => section.id));
  if (parsed.data.sourceSectionIds.some((id) => !validSectionIds.has(id))) {
    return Response.json(
      { error: "Có mục nguồn không thuộc bài học đã chọn." },
      { status: 400 },
    );
  }

  const questionBase: Question = {
    id: `${lesson.id}-manual-preview`,
    lessonId: lesson.id,
    ...parsed.data.content,
    code: parsed.data.content.code ?? undefined,
    sources: parsed.data.sourceSectionIds.map((sectionId) => ({ sectionId })),
    sourceHash: lesson.sourceHash,
    status: "draft",
    version: 1,
  };
  const question: ContentQuestion = {
    ...questionBase,
    taxonomy: buildQuestionTaxonomy(questionBase, lesson),
  };
  const draft = {
    ...parsed.data.content,
    code: parsed.data.content.code,
    sources: question.sources,
    sourceHash: question.sourceHash,
    taxonomy: question.taxonomy,
    contentChecksum: questionRevisionChecksum(question),
  };

  const { data, error } = await supabase.rpc("create_admin_content_question", {
    p_draft: draft,
    p_lesson_id: lesson.id,
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
