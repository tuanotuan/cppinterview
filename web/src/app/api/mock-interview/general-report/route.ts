import { createHash } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import {
  attachPublicAiDeviceCookie,
  completePublicAiAdmission,
  isPublicAiEnabled,
  markPublicAiAdmissionOutcomeUnknown,
  releasePublicAiAdmission,
  reservePublicAiAdmission,
  PublicAiIdentityUnavailableError,
  PublicAiRequestAlreadyCompletedError,
  PublicAiRequestInProgressError,
  PublicAiRequestOutcomeUnknownError,
  type PublicAiAdmission,
} from "@/lib/ai/public-ai-admission.server";
import {
  markPublicAiAdmissionDispatched,
  PublicAiSiteBudgetConfigurationError,
  PublicAiSiteBudgetExceededError,
  withPublicAiSiteBudget,
} from "@/lib/ai/public-ai-budget.server";
import {
  PublicAiQuotaConfigurationError,
  PublicAiQuotaExceededError,
  PublicAiQuotaIdempotencyConflictError,
} from "@/lib/ai/public-ai-quota.server";
import {
  evaluateGeneralCppMockInterviewWithOpenAI,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { AiOperationOutcomeUnknownError } from "@/lib/ai/budget";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
import {
  buildGeneralCppHistoryPublicAttempt,
  buildGeneralCppReviewSnapshot,
  generalCppCompletedArtifactSchema,
  generalCppReportRequestSchema,
  normalizeGeneralCppReportForSubmission,
  type GeneralCppCompletedArtifact,
  type GeneralCppHistoryPublicAttempt,
  type GeneralCppReportRequest,
  type GeneralCppReviewSnapshot,
} from "@/lib/mock-interview/contracts-v5";
import { resolveGeneralCppInterviewPlan } from "@/lib/mock-interview/general-catalog";
import {
  buildGeneralCppReportInstructions,
  buildGeneralCppReportPrompt,
} from "@/lib/mock-interview/general-report-prompt";
import {
  completeMockInterviewAttempt,
  createMockHistoryAdminClient,
  markMockInterviewAttemptDispatched,
  reserveMockInterviewAttempt,
} from "@/lib/mock-interview/history.server";
import { loadGeneralCppPublishedBank } from "@/lib/mock-interview/published-bank.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 160 * 1024;

export async function POST(request: Request) {
  const parsedBody = await readBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = generalCppReportRequestSchema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        code: "invalid_request",
        error: "Dữ liệu phiên phỏng vấn không hợp lệ.",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const locale = input.responseLocale;

  if (!isPublicAiEnabled()) {
    return localizedError(
      locale,
      503,
      "public_ai_not_configured",
      "Chấm phỏng vấn bằng AI chưa được bật. Vui lòng thử lại sau.",
      "AI interview grading is not enabled. Please try again later.",
    );
  }

  const bank = await loadGeneralCppPublishedBank(locale);
  if (
    input.sourceRevision !== bank.manifest.sourceRevision ||
    input.plan.catalogRevision !== bank.manifest.sourceRevision
  ) {
    return localizedError(
      locale,
      409,
      "catalog_changed",
      "Ngân hàng câu hỏi vừa được cập nhật. Hãy bắt đầu một phiên mới.",
      "The question bank was updated. Start a new interview session.",
    );
  }

  let resolvedQuestions;
  try {
    resolvedQuestions = resolveGeneralCppInterviewPlan({
      plan: input.plan,
      catalog: bank.catalog,
    });
  } catch {
    resolvedQuestions = null;
  }
  if (!resolvedQuestions) {
    return localizedError(
      locale,
      409,
      "plan_stale",
      "Bộ câu hỏi không còn khớp với ngân hàng đã duyệt. Hãy tạo phiên mới.",
      "This question set no longer matches the published bank. Start a new session.",
    );
  }

  let review: GeneralCppReviewSnapshot;
  let publicAttempt: GeneralCppHistoryPublicAttempt;
  try {
    review = buildGeneralCppReviewSnapshot({
      request: input,
      catalog: resolvedQuestions,
    });
    publicAttempt = buildGeneralCppHistoryPublicAttempt({
      request: input,
      review,
    });
  } catch (error) {
    console.error("General C++ mock review snapshot failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return localizedError(
      locale,
      503,
      "review_snapshot_unavailable",
      "Chưa thể chuẩn bị bản lưu báo cáo. Vui lòng thử lại sau.",
      "The saved report snapshot could not be prepared. Please try again later.",
    );
  }

  const user = await optionalUser();
  const requestFingerprint = sha256Json(input);
  let admission: PublicAiAdmission | null = null;
  try {
    admission = await reservePublicAiAdmission({
      request,
      user,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      // Mock grading shares the existing public evaluation bucket. The quota
      // remains three paid AI requests per account/device/IP window.
      requestKind: "coach_evaluation",
    });
  } catch (error) {
    return admissionError(error, locale);
  }

  let providerResult;
  try {
    const prompt = buildGeneralCppReportPrompt({
      request: input,
      catalog: resolvedQuestions,
      manifest: bank.manifest,
    });
    providerResult = await withPublicAiSiteBudget(
      admission.client,
      admission.reservationId,
      COACH_RESERVATION_USD_MICROS.luna,
      {
        beforeProviderDispatch: () =>
          markPublicAiAdmissionDispatched(
            admission!.client,
            admission!.reservationId,
            admission!.leaseToken,
          ),
        invokeProvider: () =>
          evaluateGeneralCppMockInterviewWithOpenAI({
            instructions: buildGeneralCppReportInstructions(locale),
            prompt,
            safetyIdentifier: safetyIdentifier(admission!.reservationId),
          }),
      },
    );
  } catch (error) {
    if (
      error instanceof PublicAiSiteBudgetExceededError ||
      error instanceof PublicAiSiteBudgetConfigurationError
    ) {
      await releasePublicAiAdmission(admission).catch(() => undefined);
    } else if (error instanceof AiOperationOutcomeUnknownError) {
      await markPublicAiAdmissionOutcomeUnknown(admission).catch(() => undefined);
    } else {
      // Provider errors known not to have started are safe to retry with the
      // same immutable request and idempotency key.
      await releasePublicAiAdmission(admission).catch(() => undefined);
    }
    return attachPublicAiDeviceCookie(providerError(error, locale), admission);
  }

  let artifact: GeneralCppCompletedArtifact;
  try {
    const normalized = normalizeGeneralCppReportForSubmission({
      rawReport: providerResult.data,
      plan: input.plan,
      responses: input.items.map((item) => item.response),
      locale,
    });
    if (normalized.usedBlankFallback) {
      console.warn("General C++ mock used deterministic blank-answer fallback");
    }
    artifact = generalCppCompletedArtifactSchema.parse({
      schemaVersion: 5,
      responseLocale: locale,
      sessionId: input.sessionId,
      profileId: input.plan.profileId,
      profileVersion: input.plan.profileVersion,
      plan: input.plan,
      startedAt: input.startedAt,
      completedAt: input.submittedAt,
      report: normalized.report,
      model: providerResult.model,
      provider: "openai",
    });
  } catch (error) {
    console.error("General C++ mock report normalization failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    await completePublicAiAdmission(admission).catch(() => undefined);
    return attachPublicAiDeviceCookie(
      localizedError(
        locale,
        502,
        "invalid_ai_report",
        "AI chưa tạo được báo cáo hợp lệ. Vui lòng bắt đầu một phiên mới.",
        "AI did not produce a valid report. Please start a new session.",
      ),
      admission,
    );
  }

  try {
    await completePublicAiAdmission(admission);
  } catch (error) {
    console.error("General C++ public AI admission completion failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    await markPublicAiAdmissionOutcomeUnknown(admission).catch(() => undefined);
  }

  const historySaved = user
    ? await persistCloudHistory({
        user,
        input,
        artifact,
        publicAttempt,
        requestFingerprint,
      })
    : false;
  return attachPublicAiDeviceCookie(
    Response.json(
      {
        ok: true,
        artifact,
        review,
        historySaved,
        quota: {
          remaining: admission.remaining,
          resetsAt: admission.resetsAt,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    ),
    admission,
  );
}

async function persistCloudHistory({
  user,
  input,
  artifact,
  publicAttempt,
  requestFingerprint,
}: {
  user: User;
  input: GeneralCppReportRequest;
  artifact: GeneralCppCompletedArtifact;
  publicAttempt: GeneralCppHistoryPublicAttempt;
  requestFingerprint: string;
}) {
  try {
    const client = createMockHistoryAdminClient();
    const planFingerprint = sha256Json(input.plan);
    const attempt = await reserveMockInterviewAttempt(client, {
      userId: user.id,
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      profileId: input.plan.profileId,
      profileVersion: input.plan.profileVersion,
      roleProfileId: input.plan.profileId,
      roleProfileVersion: input.plan.profileVersion,
      blueprintId: "balanced-cpp-standards",
      blueprintVersion: input.plan.planVersion,
      blueprintFingerprint: planFingerprint,
      durationMinutes: input.plan.durationMinutes,
      publicAttempt,
    });
    if (attempt.status === "completed") return true;
    if (!attempt.leaseToken) return false;
    await markMockInterviewAttemptDispatched(client, {
      userId: user.id,
      attemptId: attempt.attemptId,
      leaseToken: attempt.leaseToken,
    });
    await completeMockInterviewAttempt(client, {
      userId: user.id,
      attemptId: attempt.attemptId,
      leaseToken: attempt.leaseToken,
      report: JSON.parse(JSON.stringify(artifact)) as Record<string, unknown>,
    });
    return true;
  } catch (error) {
    console.error("General C++ mock cloud history save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}

async function optionalUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = await createSupabaseServerClient();
    const auth = await client.auth.getUser();
    return auth.error ? null : auth.data.user;
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: Response }
> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "request_too_large", error: "Request is too large." },
        { status: 413 },
      ),
    };
  }
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, code: "request_too_large", error: "Request is too large." },
          { status: 413 },
        ),
      };
    }
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "invalid_json", error: "Invalid JSON." },
        { status: 400 },
      ),
    };
  }
}

function admissionError(error: unknown, locale: "vi" | "en") {
  if (error instanceof PublicAiQuotaExceededError) {
    return localizedError(
      locale,
      429,
      "quota_exceeded",
      "Bạn đã dùng hết lượt AI công khai trong 24 giờ. Hãy thử lại sau.",
      "You have used the public AI allowance for this 24-hour window. Try again later.",
      { remaining: error.remaining, resetsAt: error.resetsAt },
    );
  }
  if (
    error instanceof PublicAiRequestInProgressError ||
    error instanceof PublicAiRequestAlreadyCompletedError ||
    error instanceof PublicAiRequestOutcomeUnknownError
  ) {
    return localizedError(
      locale,
      409,
      "request_not_repeatable",
      "Yêu cầu chấm này đã được gửi. Hãy giữ báo cáo hiện có hoặc bắt đầu phiên mới.",
      "This grading request has already been sent. Keep the existing report or start a new session.",
    );
  }
  if (error instanceof PublicAiQuotaIdempotencyConflictError) {
    return localizedError(
      locale,
      409,
      "idempotency_conflict",
      "Mã gửi lại không khớp phiên phỏng vấn.",
      "The retry key does not match this interview session.",
    );
  }
  if (
    error instanceof PublicAiIdentityUnavailableError ||
    error instanceof PublicAiQuotaConfigurationError
  ) {
    return localizedError(
      locale,
      503,
      "public_ai_not_configured",
      "Cơ chế giới hạn AI công khai chưa sẵn sàng. Vui lòng thử lại sau.",
      "Public AI quota enforcement is not ready. Please try again later.",
    );
  }
  console.error("General C++ mock admission failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return localizedError(
    locale,
    503,
    "admission_failed",
    "Chưa thể bắt đầu chấm phỏng vấn. Vui lòng thử lại sau.",
    "Interview grading could not start. Please try again later.",
  );
}

function providerError(error: unknown, locale: "vi" | "en") {
  if (error instanceof AiOperationOutcomeUnknownError) {
    return localizedError(
      locale,
      409,
      "outcome_unknown",
      "Kết quả chấm trước đó không thể xác nhận. Để tránh gọi AI trùng, hãy bắt đầu một phiên mới.",
      "The previous grading outcome could not be confirmed. To avoid a duplicate AI call, start a new session.",
    );
  }
  if (error instanceof PublicAiSiteBudgetExceededError) {
    return localizedError(
      locale,
      429,
      "site_budget_exceeded",
      "Ngân sách AI hôm nay đã hết. Vui lòng thử lại sau.",
      "Today's AI budget has been reached. Please try again later.",
    );
  }
  if (error instanceof PublicAiSiteBudgetConfigurationError) {
    return localizedError(
      locale,
      503,
      "site_budget_not_configured",
      "Cơ chế ngân sách AI chưa sẵn sàng. Vui lòng thử lại sau.",
      "AI budget enforcement is not ready. Please try again later.",
    );
  }
  console.error("General C++ mock provider failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return localizedError(
    locale,
    502,
    "ai_failed",
    "AI chưa trả lời được lần này. Vui lòng thử lại sau.",
    "AI could not grade this interview. Please try again later.",
  );
}

function localizedError(
  locale: "vi" | "en",
  status: number,
  code: string,
  vi: string,
  en: string,
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    { ok: false, code, error: locale === "en" ? en : vi, ...extra },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function sha256Json(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
