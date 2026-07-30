import { z } from "zod";

import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import { loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import {
  rowsToLearningStates,
  rowsToProgress,
} from "@/lib/practice/cloud";
import { filterReviewsForLearningHistory } from "@/lib/practice/learning-state";
import { readAllPracticeReviewRows } from "@/lib/practice/practice-review-reader.server";
import { readQuestionLearningStateRows } from "@/lib/practice/question-learning-state-reader.server";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    action: z.enum(["suspend", "unsuspend", "reset", "reschedule"]),
    dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "reschedule" && !value.dueOn) {
      context.addIssue({ code: "custom", message: "dueOn is required" });
    }
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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Thao tác với lịch học không hợp lệ." },
      { status: 400 },
    );
  }

  const loaded = await loadQuestionOverrides(supabase);
  if (loaded.error) {
    return Response.json(
      { error: "Không đọc được các thay đổi của câu hỏi." },
      { status: 502 },
    );
  }
  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: loaded.overrides,
  });

  const question = manifest.questions.find(
    (item) => item.id === parsed.data.questionId && item.status !== "archived",
  );
  if (!question) {
    return Response.json({ error: "Không tìm thấy câu hỏi hiện tại." }, { status: 404 });
  }

  const { error: mutationError } = await supabase.rpc(
    "manage_question_schedule",
    {
      p_question_id: question.id,
      p_question_version: question.version,
      p_source_hash: question.sourceHash,
      p_action: parsed.data.action,
      p_due_on: parsed.data.dueOn ?? null,
    },
  );
  if (mutationError) {
    return Response.json(
      { error: mutationError.message || "Không cập nhật được lịch học." },
      { status: 502 },
    );
  }

  const reviewsResult = await readAllPracticeReviewRows(supabase, {
    questionId: question.id,
  });
  const stateResult = await readQuestionLearningStateRows(supabase, {
    questionId: question.id,
  });
  if (
    stateResult.error ||
    reviewsResult.error ||
    stateResult.rows.length !== 1
  ) {
    return Response.json(
      { error: "Đã cập nhật nhưng chưa đọc lại được trạng thái." },
      { status: 502 },
    );
  }

  const learning = rowsToLearningStates(stateResult.rows)[0]!;
  const progress = rowsToProgress(reviewsResult.rows);

  return Response.json({
    learning,
    reviewHistory: filterReviewsForLearningHistory(
      progress.reviews,
      [learning],
    ).sort(
      (left, right) =>
        right.reviewedOn.localeCompare(left.reviewedOn),
    ),
  });
}
