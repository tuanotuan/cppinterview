import { createHash } from "node:crypto";

import {
  CodeExecutionBusyError,
  CodeExecutionConfigurationError,
  CodeExecutionIdempotencyConflictError,
  CodeExecutionQuotaExceededError,
  createCodeExecutionAdminClient,
  finishCodeExecution,
  reserveCodeExecution,
} from "@/lib/code-runner/admission.server";
import {
  codeExecutionResultSchema,
  isSourceWithinByteLimit,
  mockCodeRunRequestSchema,
} from "@/lib/code-runner/contracts";
import { mockCodeRunRequestV4Schema } from "@/lib/mock-interview/contracts-v4";
import {
  CodeRunnerConfigurationError,
  getCodeRunnerConfig,
} from "@/lib/code-runner/config.server";
import {
  mockExecutionSpecForQuestion,
} from "@/lib/code-runner/execution-specs.server";
import { executeMockCode } from "@/lib/code-runner/vercel-sandbox.server";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import {
  loadQuestionStoreManifest,
} from "@/lib/content/question-store-server";
import {
  buildWorldQuantBankCatalog,
  resolveTargetedMockPlan,
  targetedMockCandidates,
  WORLDQUANT_CURATED_CATALOG,
} from "@/lib/mock-interview/catalog";
import {
  worldQuantMockSetById,
  WORLDQUANT_ROLE_QUESTIONS,
} from "@/lib/mock-interview/profile";
import { buildWorldQuantTargetedMockPlan } from "@/lib/mock-interview/target-plan";
import {
  rowsToApprovals,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_REQUEST_BYTES = 20 * 1024;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return errorResponse(
      503,
      "Supabase chưa được cấu hình nên trình chạy mã tạm thời bị khóa.",
      "runner_not_configured",
    );
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return errorResponse(
      415,
      "API chạy mã chỉ nhận application/json.",
      "unsupported_media_type",
    );
  }
  const declaredLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BYTES
  ) {
    return errorResponse(
      413,
      "Yêu cầu chạy mã vượt giới hạn 20 KiB.",
      "request_too_large",
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return errorResponse(
      413,
      "Yêu cầu chạy mã vượt giới hạn 20 KiB.",
      "request_too_large",
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "JSON không hợp lệ.", "invalid_json");
  }
  const parsedV4 = mockCodeRunRequestV4Schema.safeParse(body);
  const parsedLegacy = parsedV4.success
    ? null
    : mockCodeRunRequestSchema.safeParse(body);
  if (
    (!parsedV4.success && !parsedLegacy?.success) ||
    !isSourceWithinByteLimit(
      parsedV4.success
        ? parsedV4.data.code
        : mockCodeRunRequestSchema.parse(body).code,
    )
  ) {
    return errorResponse(
      400,
      "Yêu cầu chạy mã không hợp lệ hoặc mã nguồn vượt giới hạn.",
      "invalid_request",
    );
  }
  const runRequest = parsedV4.success
    ? {
        kind: "v4" as const,
        raw: parsedV4.data,
        idempotencyKey: parsedV4.data.idempotencyKey,
        sessionId: parsedV4.data.sessionId,
        sourceRevision: parsedV4.data.sourceRevision,
        questionId: parsedV4.data.question.question.id,
        questionVersion: parsedV4.data.question.question.version,
        contentRevision:
          parsedV4.data.question.question.contentRevision,
        code: parsedV4.data.code,
      }
    : {
        kind: "legacy" as const,
        raw: mockCodeRunRequestSchema.parse(body),
        idempotencyKey:
          mockCodeRunRequestSchema.parse(body).idempotencyKey,
        sessionId: mockCodeRunRequestSchema.parse(body).sessionId,
        sourceRevision:
          mockCodeRunRequestSchema.parse(body).sourceRevision,
        questionId:
          mockCodeRunRequestSchema.parse(body).questionId,
        questionVersion:
          mockCodeRunRequestSchema.parse(body).questionVersion,
        contentRevision:
          mockCodeRunRequestSchema.parse(body).contentRevision,
        code: mockCodeRunRequestSchema.parse(body).code,
      };

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } =
    await supabase.auth.getUser();
  if (authError || !authData.user) {
    return errorResponse(
      401,
      "Đăng nhập GitHub để chạy mã.",
      "authentication_required",
    );
  }
  if (!isAllowedPracticeUser(authData.user)) {
    return errorResponse(
      403,
      "Tài khoản này không có quyền dùng trình chạy mã.",
      "forbidden",
    );
  }

  const target =
    runRequest.kind === "v4"
      ? await resolveV4RunTarget(runRequest.raw, supabase)
      : resolveRunTarget(runRequest.raw);
  if (!target.ok) return target.response;

  let admissionClient: ReturnType<
    typeof createCodeExecutionAdminClient
  >;
  let runnerConfig: ReturnType<typeof getCodeRunnerConfig>;
  try {
    admissionClient = createCodeExecutionAdminClient();
    runnerConfig = getCodeRunnerConfig();
  } catch (error) {
    return handleRunError(error);
  }
  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        codeHash: createHash("sha256")
          .update(runRequest.code)
          .digest("hex"),
        contentRevision: runRequest.contentRevision,
        language: target.spec.language,
        questionId: runRequest.questionId,
        questionVersion: runRequest.questionVersion,
        sessionId: runRequest.sessionId,
        sourceRevision: runRequest.sourceRevision,
        specRevision: target.spec.revision,
        toolchainSnapshotHash: createHash("sha256")
          .update(runnerConfig.snapshotId)
          .digest("hex"),
      }),
    )
    .digest("hex");
  let reservationId: string | null = null;
  try {
    const reservation = await reserveCodeExecution(admissionClient, {
      userId: authData.user.id,
      idempotencyKey: runRequest.idempotencyKey,
      purpose: "sample",
      jobCount: 1,
      requestFingerprint,
    });
    reservationId = reservation.reservationId;

    if (reservation.status !== "running") {
      const cached = parseCachedResult(
        reservation.cachedResult,
        target.spec,
        runRequest.code,
      );
      if (cached) return Response.json({ ok: true, result: cached });
      return errorResponse(
        409,
        "Lượt chạy cũ đã kết thúc nhưng kết quả lưu tạm không còn hợp lệ. Hãy chạy lại.",
        "cached_result_invalid",
      );
    }
    if (!reservation.isNew) {
      return errorResponse(
        409,
        "Lượt chạy này vẫn đang xử lý. Chờ một chút rồi nhấn lại.",
        "run_in_progress",
      );
    }

    const result = await executeMockCode({
      spec: target.spec,
      source: runRequest.code,
      suite: "sample",
    });
    try {
      const finalized = await finishCodeExecution(admissionClient, {
        userId: authData.user.id,
        reservationId,
        status: "completed",
        cachedResult: { ok: true, result },
      });
      if (finalized.status !== "completed") {
        throw new Error("Sample execution finalization is indeterminate");
      }
    } catch {
      try {
        const recovered = await reserveCodeExecution(admissionClient, {
          userId: authData.user.id,
          idempotencyKey: runRequest.idempotencyKey,
          purpose: "sample",
          jobCount: 1,
          requestFingerprint,
        });
        const cached = parseCachedResult(
          recovered.cachedResult,
          target.spec,
          runRequest.code,
        );
        if (recovered.status === "completed" && cached) {
          return Response.json({ ok: true, result: cached });
        }
      } catch {
        // Preserve the pending key so a later retry can recover the cache.
      }
      return errorResponse(
        503,
        "Mã đã chạy nhưng kết quả lưu tạm chưa được xác nhận. Hãy giữ nguyên lượt này và thử lại.",
        "run_finalization_indeterminate",
      );
    }
    return Response.json({ ok: true, result });
  } catch (error) {
    if (reservationId) {
      await finishCodeExecution(admissionClient, {
        userId: authData.user.id,
        reservationId,
        status: "failed",
        cachedResult: {
          ok: false,
          code: publicErrorCode(error),
        },
      }).catch(() => undefined);
    }
    return handleRunError(error);
  }
}

async function resolveV4RunTarget(
  request: ReturnType<typeof mockCodeRunRequestV4Schema.parse>,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<
  | {
      ok: true;
      spec: NonNullable<
        ReturnType<typeof mockExecutionSpecForQuestion>
      >;
    }
  | { ok: false; response: Response }
> {
  const [approvalsResult, overridesResult] = await Promise.all([
    supabase
      .from("question_approvals")
      .select("question_id, question_version, source_hash"),
    loadQuestionOverrides(supabase),
  ]);
  if (approvalsResult.error || overridesResult.error) {
    return {
      ok: false,
      response: errorResponse(
        502,
        "Không đọc được ngân hàng câu hỏi để xác minh bộ đề.",
        "question_bank_failed",
      ),
    };
  }
  const manifest = await loadQuestionStoreManifest({
    supabase,
    overrides: overridesResult.overrides,
  });
  const approvals = rowsToApprovals(
    (approvalsResult.data ?? []) as QuestionApprovalRow[],
  );
  const catalog = [
    ...buildWorldQuantBankCatalog({ manifest, approvals }),
    ...WORLDQUANT_CURATED_CATALOG,
  ];
  let expectedPlan;
  try {
    expectedPlan = buildWorldQuantTargetedMockPlan({
      profileId: request.plan.profileId,
      mode: request.plan.mode,
      targetCompetency: request.plan.targetCompetency,
      variant: request.plan.variant,
      durationMinutes: request.plan.durationMinutes,
      candidates: targetedMockCandidates(catalog),
    });
  } catch {
    return {
      ok: false,
      response: errorResponse(
        409,
        "Cấu trúc bộ đề không còn hợp lệ. Hãy tạo buổi phỏng vấn mới.",
        "plan_invalid",
      ),
    };
  }
  if (
    manifest.sourceRevision !== request.sourceRevision ||
    JSON.stringify(expectedPlan) !== JSON.stringify(request.plan) ||
    !resolveTargetedMockPlan({ plan: request.plan, catalog })
  ) {
    return {
      ok: false,
      response: errorResponse(
        409,
        "Ngân hàng câu hỏi hoặc cấu trúc bộ đề đã thay đổi. Hãy tạo buổi phỏng vấn mới.",
        "plan_changed",
      ),
    };
  }

  const identity = request.question.question;
  const question =
    identity.origin === "role_profile"
      ? WORLDQUANT_ROLE_QUESTIONS.find(
          (item) => item.id === identity.id,
        )
      : null;
  if (
    !question ||
    question.version !== identity.version ||
    question.contentRevision !== identity.contentRevision
  ) {
    return {
      ok: false,
      response: errorResponse(
        409,
        "Câu có thể chạy mã không còn khớp với danh mục trên máy chủ.",
        "content_changed",
      ),
    };
  }
  const spec = mockExecutionSpecForQuestion(question);
  if (
    !spec ||
    spec.revision !== identity.execution?.specRevision
  ) {
    return {
      ok: false,
      response: errorResponse(
        422,
        "Câu này không có đặc tả chạy mã đúng phiên bản.",
        "not_runnable",
      ),
    };
  }
  return { ok: true, spec };
}

function resolveRunTarget(
  request: ReturnType<typeof mockCodeRunRequestSchema.parse>,
):
  | {
      ok: true;
      spec: NonNullable<
        ReturnType<typeof mockExecutionSpecForQuestion>
      >;
    }
  | { ok: false; response: Response } {
  const mockSet = worldQuantMockSetById(request.setId);
  if (
    !mockSet ||
    mockSet.version !== request.setVersion ||
    !mockSet.questionIds.some(
      (questionId) => questionId === request.questionId,
    )
  ) {
    return {
      ok: false,
      response: errorResponse(
        409,
        "Bộ đề đã thay đổi. Hãy tạo buổi phỏng vấn mới.",
        "set_changed",
      ),
    };
  }
  const question = WORLDQUANT_ROLE_QUESTIONS.find(
    (item) => item.id === request.questionId,
  );
  if (
    !question ||
    question.origin !== request.origin ||
    question.version !== request.questionVersion ||
    question.contentRevision !== request.contentRevision
  ) {
    return {
      ok: false,
      response: errorResponse(
        409,
        "Câu hỏi hoặc đặc tả chạy mã đã thay đổi. Hãy tạo buổi phỏng vấn mới.",
        "content_changed",
      ),
    };
  }
  const spec = mockExecutionSpecForQuestion(question);
  if (!spec) {
    return {
      ok: false,
      response: errorResponse(
        422,
        "Câu này không có bộ khung kiểm thử an toàn để chạy.",
        "not_runnable",
      ),
    };
  }
  return { ok: true, spec };
}

function parseCachedResult(
  value: Record<string, unknown> | null,
  spec: NonNullable<ReturnType<typeof mockExecutionSpecForQuestion>>,
  source: string,
) {
  if (!value || value.ok !== true) return null;
  const parsed = codeExecutionResultSchema.safeParse(value.result);
  if (!parsed.success) return null;
  const result = parsed.data;
  return result.suite === "sample" &&
    result.codeHash ===
      createHash("sha256").update(source).digest("hex") &&
    result.specRevision === spec.revision &&
    result.language === spec.language
    ? result
    : null;
}

function handleRunError(error: unknown) {
  if (error instanceof CodeExecutionQuotaExceededError) {
    return errorResponse(
      429,
      "Đã hết hạn mức chạy kiểm thử mẫu hôm nay. Hạn mức được đặt lại lúc 00:00 giờ Việt Nam.",
      "daily_quota_exceeded",
    );
  }
  if (error instanceof CodeExecutionBusyError) {
    return errorResponse(
      409,
      "Một lượt chạy mã khác đang xử lý. Hãy chờ nó kết thúc rồi thử lại.",
      "runner_busy",
    );
  }
  if (error instanceof CodeExecutionIdempotencyConflictError) {
    return errorResponse(
      409,
      "Khóa chống gửi trùng đã được dùng cho một yêu cầu khác.",
      "idempotency_conflict",
    );
  }
  if (
    error instanceof CodeExecutionConfigurationError ||
    error instanceof CodeRunnerConfigurationError
  ) {
    return errorResponse(
      503,
      "Trình chạy mã chưa được cấu hình đầy đủ.",
      "runner_not_configured",
    );
  }
  console.error("Mock code execution failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return errorResponse(
    502,
    "Môi trường chạy mã cô lập tạm thời chưa hoạt động. Vui lòng thử lại sau.",
    "sandbox_failed",
  );
}

function publicErrorCode(error: unknown) {
  if (error instanceof CodeRunnerConfigurationError) {
    return "runner_not_configured";
  }
  if (error instanceof CodeExecutionConfigurationError) {
    return "admission_not_configured";
  }
  return "sandbox_failed";
}

function errorResponse(status: number, error: string, code: string) {
  return Response.json({ ok: false, error, code }, { status });
}
