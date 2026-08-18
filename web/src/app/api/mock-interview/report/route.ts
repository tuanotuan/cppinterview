import { createHash } from "node:crypto";

import {
  AiBudgetConfigurationError,
  AiDailyBudgetExceededError,
  AiMonthlyBudgetExceededError,
  AiOperationNotStartedError,
  AiOperationOutcomeUnknownError,
  withAiBudget,
} from "@/lib/ai/budget";
import {
  AllAiQuotasExceededError,
  GeminiFallbackProviderError,
  runGeminiBudgetFallback,
} from "@/lib/ai/fallback";
import { evaluateMockInterviewWithGemini } from "@/lib/ai/gemini";
import {
  CoachConfigurationError,
  evaluateMockInterviewWithOpenAI,
  safetyIdentifier,
} from "@/lib/ai/openai";
import { consumeCoachRequest } from "@/lib/ai/rate-limit";
import { COACH_RESERVATION_USD_MICROS } from "@/lib/ai/usage";
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
  isSourceWithinByteLimit,
  type CodeExecutionResult,
} from "@/lib/code-runner/contracts";
import {
  CodeRunnerConfigurationError,
  getCodeRunnerConfig,
} from "@/lib/code-runner/config.server";
import {
  mockExecutionSpecForQuestion,
  type MockExecutionSpec,
} from "@/lib/code-runner/execution-specs.server";
import { executeMockCode } from "@/lib/code-runner/vercel-sandbox.server";
import { loadQuestionOverrides } from "@/lib/content/question-overrides-server";
import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
} from "@/lib/content/question-store-server";
import {
  isQuestionApproved,
  rowsToApprovals,
  type QuestionApproval,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";
import {
  captureMockMistakes,
  MistakeQueueConfigurationError,
} from "@/lib/practice/mistake-cards.server";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildMockReportEvidenceCatalog,
  mockInterviewReportRequestSchema,
  normalizeMockInterviewReport,
} from "@/lib/mock-interview/contracts";
import {
  mockInterviewCompletedArtifactV4Schema,
  mockInterviewReportRequestV4Schema,
  mockInterviewScopedReportV4Schema,
  publicHiddenExecutionResultSchema,
  type MockInterviewReportRequestV4,
} from "@/lib/mock-interview/contracts-v4";
import {
  buildWorldQuantBankCatalog,
  legacyMockCompetencyForReadiness,
  resolveTargetedMockPlan,
  targetedMockCandidates,
  WORLDQUANT_CURATED_CATALOG,
} from "@/lib/mock-interview/catalog";
import {
  abortMockInterviewAttempt,
  createMockHistoryAdminClient,
  completeMockInterviewAttempt,
  failMockInterviewAttempt,
  markMockInterviewAttemptDispatched,
  MockHistoryBusyError,
  MockHistoryConfigurationError,
  MockHistoryIdempotencyConflictError,
  MockHistorySessionConflictError,
  readMockInterviewAttempt,
  releaseMockInterviewAttempt,
  reserveMockInterviewAttempt,
  type MockHistoryAttempt,
} from "@/lib/mock-interview/history.server";
import { inferMockCompetency } from "@/lib/mock-interview/profile";
import { worldQuantRoleQuestionForEvaluation } from "@/lib/mock-interview/profile-server";
import {
  buildMockInterviewReportPrompt,
  buildMockInterviewSystemInstruction,
  type MockEvaluationItem,
} from "@/lib/mock-interview/report-prompt";
import {
  buildWorldQuantTargetedMockPlan,
  type TargetedMockPlan,
} from "@/lib/mock-interview/target-plan";
import { buildWorldQuantMockDebrief } from "@/lib/worldquant/mock-debrief";
import {
  worldQuantRoleProfileById,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_REPORT_REQUEST_BYTES = 80 * 1024;

class CodeExecutionFinalizationIndeterminateError extends Error {
  constructor() {
    super("Code execution finalization is indeterminate");
    this.name = "CodeExecutionFinalizationIndeterminateError";
  }
}

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
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json(
      {
        error: "API báo cáo phỏng vấn chỉ nhận application/json.",
        code: "unsupported_media_type",
      },
      { status: 415 },
    );
  }
  const declaredLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REPORT_REQUEST_BYTES
  ) {
    return Response.json(
      {
        error: "Buổi phỏng vấn vượt giới hạn tạo báo cáo.",
        code: "request_too_large",
      },
      { status: 413 },
    );
  }

  const rawBody = await request.text();
  if (
    new TextEncoder().encode(rawBody).byteLength >
    MAX_REPORT_REQUEST_BYTES
  ) {
    return Response.json(
      {
        error: "Buổi phỏng vấn vượt giới hạn tạo báo cáo.",
        code: "request_too_large",
      },
      { status: 413 },
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: "Yêu cầu không chứa JSON hợp lệ.", code: "invalid_json" },
      { status: 400 },
    );
  }
  const parsedV4 = mockInterviewReportRequestV4Schema.safeParse(body);
  if (!parsedV4.success) {
    if (mockInterviewReportRequestSchema.safeParse(body).success) {
      return Response.json(
        {
          error:
            "Phiên bản phỏng vấn cũ không còn được hỗ trợ tạo báo cáo. Vui lòng tạo một buổi phỏng vấn mới.",
          code: "legacy_report_unsupported",
        },
        { status: 410 },
      );
    }
    return Response.json(
      {
        error:
          "Dữ liệu buổi phỏng vấn không hợp lệ hoặc có câu trả lời vượt giới hạn.",
        code: "invalid_request",
      },
      { status: 400 },
    );
  }
  const reportRequest = normalizeV4ReportRequest(parsedV4.data);
  if (
    reportRequest.items.reduce(
      (sum, item) =>
        sum + item.response.length + item.explanation.length,
      0,
    ) >
      50_000
  ) {
    return Response.json(
      {
        error: "Buổi phỏng vấn vượt giới hạn tạo báo cáo.",
        code: "request_too_large",
      },
      { status: 413 },
    );
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      {
        error:
          "Supabase chưa được cấu hình nên tính năng tạo báo cáo phỏng vấn tạm thời bị khóa.",
        code: "not_configured",
      },
      { status: 503 },
    );
  }
  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  if (authResult.error || !authResult.data.user) {
    return Response.json(
      {
        error: "Đăng nhập để chấm buổi phỏng vấn thử.",
        code: "authentication_required",
      },
      { status: 401 },
    );
  }
  if (!isAllowedPracticeUser(authResult.data.user)) {
    return Response.json(
      {
        error: "Tài khoản này không có quyền chấm buổi phỏng vấn thử.",
        code: "forbidden",
      },
      { status: 403 },
    );
  }

  let approvals: QuestionApproval[] = [];
  let manifest = getRepoContentManifest();
  {
    const [approvalsResult, overridesResult] = await Promise.all([
      supabase
        .from("question_approvals")
        .select("question_id, question_version, source_hash"),
      loadQuestionOverrides(supabase),
    ]);
    if (approvalsResult.error || overridesResult.error) {
      return Response.json(
        {
          error: "Không đọc được ngân hàng câu hỏi.",
          code: "question_bank_failed",
        },
        { status: 502 },
      );
    }
    approvals = rowsToApprovals(
      (approvalsResult.data ?? []) as QuestionApprovalRow[],
    );
    manifest = await loadQuestionStoreManifest({
      supabase,
      overrides: overridesResult.overrides,
    });
  }

  let resolvedV4Questions:
    | ReturnType<typeof resolveTargetedMockPlan>
    | null = null;
  {
    const catalog = [
      ...buildWorldQuantBankCatalog({ manifest, approvals }),
      ...WORLDQUANT_CURATED_CATALOG,
    ];
    let expectedPlan: TargetedMockPlan;
    try {
      expectedPlan = buildWorldQuantTargetedMockPlan({
        profileId: reportRequest.plan.profileId,
        mode: reportRequest.plan.mode,
        targetCompetency: reportRequest.plan.targetCompetency,
        variant: reportRequest.plan.variant,
        durationMinutes: reportRequest.plan.durationMinutes,
        candidates: targetedMockCandidates(catalog),
      });
    } catch {
      return Response.json(
        {
          error:
            "Vị trí hoặc năng lực trong bộ phỏng vấn không còn hợp lệ.",
          code: "plan_invalid",
        },
        { status: 409 },
      );
    }
    resolvedV4Questions = resolveTargetedMockPlan({
      plan: reportRequest.plan,
      catalog,
    });
    if (
      manifest.sourceRevision !== reportRequest.sourceRevision ||
      JSON.stringify(expectedPlan) !== JSON.stringify(reportRequest.plan) ||
      !resolvedV4Questions
    ) {
      return Response.json(
        {
          error:
            "Ngân hàng câu hỏi hoặc cấu trúc bộ đề đã thay đổi. Hãy tạo buổi phỏng vấn mới để dùng đúng phiên bản.",
          code: "plan_changed",
        },
        { status: 409 },
      );
    }
  }

  const evaluationItems: MockEvaluationItem[] = [];
  const executionTargets: Array<{
    questionId: string;
    source: string;
    spec: MockExecutionSpec;
  }> = [];
  for (const requestedItem of reportRequest.items) {
    if (requestedItem.origin === "role_profile") {
      const roleItem = worldQuantRoleQuestionForEvaluation(
        requestedItem.questionId,
      );
      if (
        !roleItem ||
        roleItem.question.version !== requestedItem.version ||
        roleItem.question.contentRevision !== requestedItem.contentRevision
      ) {
        return Response.json(
          {
            error:
              "Vị trí mục tiêu WorldQuant đã thay đổi. Hãy tạo buổi phỏng vấn mới để chấm theo đúng tiêu chí.",
            code: "content_changed",
          },
          { status: 409 },
        );
      }
      const candidateAnswer = candidateAnswerForReport({
        responseMode: roleItem.question.responseMode,
        language: roleItem.question.language,
        response: requestedItem.response,
        explanation: requestedItem.explanation,
      });
      const executionSpec = mockExecutionSpecForQuestion(
        roleItem.question,
      );
      if (executionSpec && requestedItem.response.trim()) {
        if (!isSourceWithinByteLimit(requestedItem.response)) {
          return Response.json(
            {
              error:
                "Mã nguồn vượt giới hạn 8 KiB của môi trường kiểm thử ẩn.",
              code: "source_too_large",
            },
            { status: 413 },
          );
        }
        executionTargets.push({
          questionId: roleItem.question.id,
          source: requestedItem.response,
          spec: executionSpec,
        });
      }
      evaluationItems.push({
        questionId: roleItem.question.id,
        competency: requestedItem.readinessCompetency
          ? legacyMockCompetencyForReadiness(
              requestedItem.readinessCompetency,
            )
          : roleItem.question.competency,
        prompt: roleItem.question.prompt,
        code: roleItem.question.code,
        candidateAnswer,
        elapsedSeconds: requestedItem.elapsedSeconds,
        required: roleItem.evaluation.required,
        bonus: roleItem.evaluation.bonus,
        misconceptions: roleItem.evaluation.misconceptions,
        evaluationGuide: roleItem.evaluation.evaluationGuide,
        origin: "role_profile",
      });
      continue;
    }

    const question = manifest.questions.find(
      (item) =>
        item.id === requestedItem.questionId &&
        item.status !== "archived" &&
        (item.status === "verified" || isQuestionApproved(item, approvals)),
    );
    if (!question) {
      return Response.json(
        {
          error:
            "Một câu trong buổi phỏng vấn không còn nằm trong ngân hàng đã duyệt.",
          code: "question_not_found",
        },
        { status: 404 },
      );
    }
    if (
      question.version !== requestedItem.version ||
      question.sourceHash !== requestedItem.contentRevision
    ) {
      return Response.json(
        {
          error:
            "Nguồn tri thức đã thay đổi trong lúc phỏng vấn. Hãy tạo buổi mới để tránh chấm nhầm phiên bản.",
          code: "content_changed",
        },
        { status: 409 },
      );
    }
    const lesson = manifest.lessons.find(
      (item) => item.id === question.lessonId,
    );
    if (!lesson) {
      return Response.json(
        { error: "Bài học nguồn đang thiếu.", code: "lesson_not_found" },
        { status: 500 },
      );
    }
    evaluationItems.push({
      questionId: question.id,
      competency: requestedItem.readinessCompetency
        ? legacyMockCompetencyForReadiness(
            requestedItem.readinessCompetency,
          )
        : inferMockCompetency({
            language: lesson.language,
            topics: question.taxonomy.topics,
          }),
      prompt: question.prompt,
      code: question.code,
      candidateAnswer: candidateAnswerForReport({
        responseMode: question.taxonomy.responseMode,
        language: lesson.language,
        response: requestedItem.response,
        explanation: requestedItem.explanation,
      }),
      elapsedSeconds: requestedItem.elapsedSeconds,
      required: question.rubric.required,
      bonus: question.rubric.bonus,
      misconceptions: question.rubric.misconceptions,
      canonicalAnswer: question.answer.detailed,
      evaluationGuide:
        "Chấm đúng tiêu chí và đáp án chuẩn. Không đòi hỏi chi tiết ngoài phạm vi ghi chú nguồn.",
      sourceNotes: sourceNotesForQuestion(question, lesson),
      origin: "question_bank",
    });
  }

  let history:
    | {
        client: ReturnType<typeof createMockHistoryAdminClient>;
        reservation: MockHistoryAttempt;
      }
    | null = null;
  {
    const blueprintFingerprint = sha256Json(reportRequest.plan);
    const requestFingerprint = sha256Json(reportRequest.raw);
    try {
      const client = createMockHistoryAdminClient();
      const reservation = await reserveMockInterviewAttempt(client, {
        userId: authResult.data.user.id,
        sessionId: reportRequest.sessionId,
        idempotencyKey: reportRequest.idempotencyKey,
        requestFingerprint,
        profileId: "worldquant-interview-loop",
        profileVersion: 4,
        roleProfileId: reportRequest.profileId,
        roleProfileVersion: reportRequest.profileVersion,
        blueprintId: [
          "worldquant",
          reportRequest.profileId,
          reportRequest.plan.mode,
          reportRequest.plan.durationMinutes,
          reportRequest.plan.variant,
        ].join("-"),
        blueprintVersion: reportRequest.plan.version,
        blueprintFingerprint,
        durationMinutes: reportRequest.durationMinutes,
        publicAttempt: {
          schemaVersion: 4,
          sessionId: reportRequest.sessionId,
          sourceRevision: reportRequest.sourceRevision,
          startedAt: reportRequest.startedAt,
          submittedAt: reportRequest.submittedAt,
          elapsedSeconds: reportRequest.elapsedSeconds,
          plan: reportRequest.plan,
          questions: resolvedV4Questions!.map((question) => ({
            id: question.id,
            origin: question.origin,
            version: question.version,
            contentRevision: question.contentRevision,
            prompt: question.prompt,
            code: question.code ?? null,
            language: question.language,
            track: question.track,
            responseMode: question.responseMode,
            readinessCompetency: question.readinessCompetency,
          })),
        },
      });
      if (reservation.status === "completed") {
        const cached =
          mockInterviewCompletedArtifactV4Schema.safeParse(
            reservation.report,
          );
        if (!cached.success) {
          return Response.json(
            {
              error:
            "Báo cáo lưu tạm đã tồn tại nhưng không còn đúng với cấu trúc dữ liệu hiện tại.",
              code: "history_cache_invalid",
            },
            { status: 503 },
          );
        }
        const mistakes = await capturePersistedMockMistakes({
          supabase,
          userId: authResult.data.user.id,
          attemptId: reservation.attemptId,
          artifact: cached.data,
          manifest,
        });
        return Response.json({
          ...cached.data,
          cached: true,
          historyPersisted: true,
          historyAttemptId: reservation.attemptId,
          ...mistakes,
        });
      }
      if (reservation.status === "failed") {
        return Response.json(
          {
            error:
              "Lượt chấm này đã kết thúc do lỗi. Hãy tạo buổi phỏng vấn mới.",
            code: reservation.failure?.code ?? "attempt_failed",
          },
          { status: 409 },
        );
      }
      history = { client, reservation };
    } catch (error) {
      if (error instanceof MockHistoryConfigurationError) {
        return Response.json(
          {
            error:
              "Lịch sử trực tuyến chưa sẵn sàng nên báo cáo bị khóa để tránh chấm trùng và tốn hạn mức.",
            code: "history_not_configured",
          },
          { status: 503 },
        );
      } else if (error instanceof MockHistoryBusyError) {
        return Response.json(
          {
            error:
              "Báo cáo này vẫn đang được chấm. Vui lòng chờ một chút rồi thử lại.",
            code: "report_in_progress",
          },
          { status: 409, headers: { "Retry-After": "10" } },
        );
      } else if (
        error instanceof MockHistoryIdempotencyConflictError ||
        error instanceof MockHistorySessionConflictError
      ) {
        return Response.json(
          {
            error:
              "Phiên làm việc hoặc khóa chống gửi trùng không còn khớp với bài nộp.",
            code: "history_conflict",
          },
          { status: 409 },
        );
      } else {
        throw error;
      }
    }
  }

  const markReportProviderDispatched = async () => {
    if (!history?.reservation.leaseToken) return;
    try {
      await markMockInterviewAttemptDispatched(history.client, {
        userId: authResult.data.user.id,
        attemptId: history.reservation.attemptId,
        leaseToken: history.reservation.leaseToken,
      });
    } catch {
      throw new AiOperationNotStartedError(
        "Mock report dispatch could not be confirmed",
      );
    }
  };

  let hiddenExecutionResults: CodeExecutionResult[] = [];
  if (executionTargets.length) {
    try {
      hiddenExecutionResults = await runHiddenExecutionBatch({
        userId: authResult.data.user.id,
        idempotencyKey: reportRequest.idempotencyKey,
        targets: executionTargets,
      });
    } catch (error) {
      if (history?.reservation.leaseToken) {
        try {
          if (hiddenExecutionRequiresFreshKey(error)) {
            await abortMockInterviewAttempt(history.client, {
              userId: authResult.data.user.id,
              attemptId: history.reservation.attemptId,
              leaseToken: history.reservation.leaseToken,
            });
          } else {
            await releaseMockInterviewAttempt(history.client, {
              userId: authResult.data.user.id,
              attemptId: history.reservation.attemptId,
              leaseToken: history.reservation.leaseToken,
            });
          }
        } catch {
          return historyTransitionErrorResponse();
        }
      }
      return hiddenExecutionErrorResponse(error);
    }
  }
  const executionByQuestionId = new Map(
    hiddenExecutionResults.map((result, index) => [
      executionTargets[index]?.questionId,
      result,
    ]),
  );
  for (const item of evaluationItems) {
    const evidence = executionByQuestionId.get(item.questionId);
    if (!evidence) continue;
    item.executionEvidence = {
      status: evidence.status,
      passedTests: evidence.passedTests,
      totalTests: evidence.totalTests,
      durationMs: evidence.durationMs,
      toolchain: evidence.toolchain,
    };
  }

  const questionCompetencies = Object.fromEntries(
    evaluationItems.map((item) => [item.questionId, item.competency]),
  );
  const evidenceCatalog = buildMockReportEvidenceCatalog({
    items: reportRequest.items.map((item) => {
      const evaluation = evaluationItems.find(
        (candidate) => candidate.questionId === item.questionId,
      );
      const execution = executionByQuestionId.get(item.questionId);
      return {
        questionId: item.questionId,
        responseMode:
          reportRequest.plan.questions.find(
            (candidate) => candidate.question.id === item.questionId,
          )?.question.responseMode ?? "text",
        response: item.response,
        explanation: item.explanation,
        questionCode: evaluation?.code,
        execution: execution
          ? {
              status: execution.status,
              passedTests: execution.passedTests,
              totalTests: execution.totalTests,
              durationMs: execution.durationMs,
            }
          : undefined,
      };
    }),
  });
  const role = worldQuantRoleProfileById(reportRequest.profileId);
  const instructions = buildMockInterviewSystemInstruction(role?.label);
  const prompt = buildMockInterviewReportPrompt({
    durationMinutes: reportRequest.durationMinutes,
    elapsedSeconds: reportRequest.elapsedSeconds,
    items: evaluationItems,
    roleLabel: role?.label,
    evidenceScope: reportRequest.plan.mode,
    evidenceCatalog,
  });

  let providerCompleted = false;
  try {
    let provider: "openai" | "gemini" = "openai";
    let dailyBudget = null;
    let result;
    try {
      const openAiResult = await withAiBudget(
        supabase,
        COACH_RESERVATION_USD_MICROS.terra,
        {
          beforeProviderDispatch: markReportProviderDispatched,
          invokeProvider: () =>
            evaluateMockInterviewWithOpenAI({
              instructions,
              prompt,
              safetyIdentifier: safetyIdentifier(
                authResult?.data.user?.id || clientKey,
              ),
            }),
        },
      );
      result = openAiResult.result;
      dailyBudget = openAiResult.dailyBudget;
    } catch (error) {
      result = await runGeminiBudgetFallback(error, supabase, async () => {
        await markReportProviderDispatched();
        return evaluateMockInterviewWithGemini({ instructions, prompt });
      });
      provider = "gemini";
    }
    providerCompleted = true;

    const report = normalizeMockInterviewReport({
      rawReport: result.data,
      questionCompetencies,
      executionByQuestionId: Object.fromEntries(
        hiddenExecutionResults.map((execution, index) => [
          executionTargets[index]?.questionId,
          execution.status,
        ]),
      ),
      evidenceCatalog,
    });
    const modelLabel =
      provider === "gemini"
        ? `Gemini dự phòng · ${result.model}`
        : result.model;
    const executionResults = hiddenExecutionResults.flatMap(
      (execution, index) => {
        const questionId = executionTargets[index]?.questionId;
        return questionId
          ? [
              {
                questionId,
                submittedCodeHash: execution.codeHash,
                result: publicHiddenExecutionResult(execution),
              },
            ]
          : [];
      },
    );

    {
      const debrief = buildWorldQuantMockDebrief({
        profileId: reportRequest.profileId,
        plan: {
          mode: reportRequest.plan.mode,
          questionMappings: reportRequest.items.map((item) => ({
            questionId: item.questionId,
            competency: item.readinessCompetency!,
          })),
        },
        scores: report.questionAssessments.map((assessment) => ({
          questionId: assessment.questionId,
          score: assessment.score,
        })),
      });
      const scopedReport =
        mockInterviewScopedReportV4Schema.parse({
          evidenceScope: debrief.scope,
          summary: report.summary,
          competencies: report.competencies,
          questionAssessments: report.questionAssessments,
          strengths: report.strengths,
          priorityGaps: report.priorityGaps,
          studyPlan: report.studyPlan,
        });
      const artifact =
        mockInterviewCompletedArtifactV4Schema.parse({
          schemaVersion: 4,
          sessionId: reportRequest.sessionId,
          profileId: reportRequest.profileId,
          profileVersion: reportRequest.profileVersion,
          plan: reportRequest.plan,
          startedAt: reportRequest.startedAt,
          completedAt: new Date().toISOString(),
          report: scopedReport,
          debrief,
          model: modelLabel,
          provider,
          executionResults,
        });
      let historyPersisted = false;
      let historyAttemptId: string | null = null;
      let historyWarning: string | null = null;
      if (history?.reservation.leaseToken) {
        const completionInput = {
          userId: authResult.data.user.id,
          attemptId: history.reservation.attemptId,
          leaseToken: history.reservation.leaseToken,
          report: JSON.parse(JSON.stringify(artifact)) as Record<
            string,
            unknown
          >,
        };
        for (let completionTry = 0; completionTry < 2; completionTry += 1) {
          try {
            const completedAttempt =
              await completeMockInterviewAttempt(
                history.client,
                completionInput,
              );
            const persistedArtifact =
              mockInterviewCompletedArtifactV4Schema.safeParse(
                completedAttempt.report,
              );
            historyPersisted =
              completedAttempt.status === "completed" &&
              persistedArtifact.success &&
              JSON.stringify(persistedArtifact.data) ===
                JSON.stringify(artifact);
            historyAttemptId = historyPersisted
              ? completedAttempt.attemptId
              : null;
            break;
          } catch (error) {
            if (completionTry === 1) {
              console.error("Mock history completion failed", {
                name:
                  error instanceof Error
                    ? error.name
                    : "UnknownError",
              });
            }
          }
        }
        if (!historyPersisted) {
          try {
            const storedAttempt = await readMockInterviewAttempt(
              history.client,
              {
                userId: authResult.data.user.id,
                attemptId: history.reservation.attemptId,
              },
            );
            if (storedAttempt?.status === "completed") {
              const storedArtifact =
                mockInterviewCompletedArtifactV4Schema.safeParse(
                  storedAttempt.report,
                );
              historyPersisted =
                storedArtifact.success &&
                JSON.stringify(storedArtifact.data) ===
                  JSON.stringify(artifact);
              historyAttemptId = historyPersisted
                ? storedAttempt.attemptId
                : null;
            } else if (
              storedAttempt?.status === "reserved" &&
              history.reservation.leaseToken
            ) {
              await failMockInterviewAttempt(history.client, {
                userId: authResult.data.user.id,
                attemptId: history.reservation.attemptId,
                leaseToken: history.reservation.leaseToken,
                failure: {
                  code: "history_completion_unconfirmed",
                  retryable: false,
                },
              });
            }
          } catch {
            // The normalized artifact is still returned locally. Retrying
            // paid AI would be worse than an explicit history warning.
          }
        }
        if (!historyPersisted) {
          historyWarning =
            "Báo cáo đã được lưu trên trình duyệt nhưng lịch sử trực tuyến chưa xác nhận được; hệ thống không gọi lại AI để tránh tốn hạn mức lần hai.";
        }
      }
      const mistakes =
        historyPersisted && historyAttemptId
          ? await capturePersistedMockMistakes({
              supabase,
              userId: authResult.data.user.id,
              attemptId: historyAttemptId,
              artifact,
              manifest,
            })
          : { mistakeCapture: null, mistakeQueueAvailable: true };
      return Response.json({
        ...artifact,
        historyPersisted,
        historyAttemptId,
        historyWarning,
        aiDailyBudget: dailyBudget,
        aiUsageRecorded: provider === "gemini" || dailyBudget !== null,
        ...mistakes,
      });
    }

  } catch (error) {
    if (error instanceof AiOperationOutcomeUnknownError) {
      console.error("Mock report provider outcome could not be confirmed", {
        name:
          error.cause instanceof Error
            ? error.cause.name
            : "UnknownError",
      });
      let terminalized = false;
      if (history?.reservation.leaseToken) {
        try {
          const failed = await failMockInterviewAttempt(history.client, {
            userId: authResult.data.user.id,
            attemptId: history.reservation.attemptId,
            leaseToken: history.reservation.leaseToken,
            failure: {
              code: "provider_outcome_unknown",
              retryable: false,
            },
          });
          terminalized = failed.status === "failed";
        } catch (transitionError) {
          console.error("Mock report unknown-outcome transition failed", {
            name:
              transitionError instanceof Error
                ? transitionError.name
                : "UnknownError",
          });
        }
      }
      return Response.json(
        {
          error:
            terminalized
              ? "Nhà cung cấp AI không xác nhận được kết quả chấm. Để tránh tính phí hai lần, hệ thống sẽ không tự chấm lại buổi này; hãy tạo buổi phỏng vấn mới nếu muốn thử lại."
              : "Nhà cung cấp AI chưa xác nhận được kết quả chấm. Hệ thống đang khóa báo cáo để tránh tính phí hai lần.",
          code: "report_outcome_unconfirmed",
        },
        terminalized
          ? { status: 409 }
          : {
              status: 503,
              headers: { "Retry-After": "10" },
        },
      );
    }
    if (providerCompleted) {
      console.error("Mock report post-provider processing failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      let terminalized = false;
      if (history?.reservation.leaseToken) {
        try {
          const failed = await failMockInterviewAttempt(history.client, {
            userId: authResult.data.user.id,
            attemptId: history.reservation.attemptId,
            leaseToken: history.reservation.leaseToken,
            failure: {
              code: "report_processing_failed",
              retryable: false,
            },
          });
          terminalized = failed.status === "failed";
        } catch (transitionError) {
          console.error("Mock report processing transition failed", {
            name:
              transitionError instanceof Error
                ? transitionError.name
                : "UnknownError",
          });
        }
      }
      return Response.json(
        {
          error:
            terminalized
              ? "AI đã trả kết quả nhưng báo cáo không qua được bước kiểm tra an toàn. Hệ thống sẽ không tự gọi lại AI cho buổi này để tránh tính phí hai lần."
              : "AI đã trả kết quả nhưng báo cáo chưa qua được bước kiểm tra an toàn. Buổi này đang được khóa để tránh gọi AI lần hai.",
          code: "report_processing_failed",
        },
        terminalized
          ? { status: 409 }
          : {
              status: 503,
              headers: { "Retry-After": "10" },
            },
      );
    }
    if (history?.reservation.leaseToken) {
      try {
        await releaseMockInterviewAttempt(history.client, {
          userId: authResult.data.user.id,
          attemptId: history.reservation.attemptId,
          leaseToken: history.reservation.leaseToken,
        });
      } catch {
        return historyTransitionErrorResponse();
      }
    }
    if (error instanceof AllAiQuotasExceededError) {
      return Response.json(
        {
          error:
            "OpenAI đã hết hạn mức và Gemini miễn phí cũng đang bận hoặc hết hạn mức. Buổi phỏng vấn vẫn được lưu để chấm lại sau.",
          code: "all_ai_quotas_exceeded",
        },
        { status: 429 },
      );
    }
    if (error instanceof GeminiFallbackProviderError) {
      return Response.json(
        {
          error:
            "Gemini dự phòng chưa tạo được báo cáo. Buổi phỏng vấn vẫn được lưu để thử lại.",
          code: "fallback_provider_error",
        },
        { status: 502 },
      );
    }
    if (error instanceof CoachConfigurationError) {
      return Response.json(
        {
          error: "Trợ lý AI chưa được cấu hình khóa truy cập.",
          code: "not_configured",
        },
        { status: 503 },
      );
    }
    if (error instanceof AiMonthlyBudgetExceededError) {
      return Response.json(
        {
          error: "Đã chạm ngân sách AI tháng này.",
          code: "monthly_budget_exceeded",
        },
        { status: 429 },
      );
    }
    if (error instanceof AiDailyBudgetExceededError) {
      return Response.json(
        {
          error:
            "Đã dùng hết hạn mức OpenAI hôm nay và Gemini dự phòng đang tắt. Buổi phỏng vấn vẫn được giữ để chấm sau.",
          code: "daily_budget_exceeded",
        },
        { status: 429 },
      );
    }
    if (error instanceof AiBudgetConfigurationError) {
      return Response.json(
        {
          error:
            "Cơ chế giới hạn chi phí AI chưa được cài đặt trong Supabase.",
          code: "budget_not_configured",
        },
        { status: 503 },
      );
    }

    const status = providerStatus(error);
    const code = providerCode(error);
    console.error("Mock interview report failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status,
    });
    if (code === "insufficient_quota" || status === 429) {
      return Response.json(
        {
          error:
            "OpenAI đang giới hạn tạm thời hoặc dự án đã hết tín dụng. Buổi phỏng vấn vẫn được lưu để thử lại.",
          code:
            code === "insufficient_quota"
              ? "provider_quota_exceeded"
              : "provider_rate_limited",
        },
        { status: 429 },
      );
    }
    return Response.json(
      {
        error:
          "AI chưa tạo được báo cáo. Buổi phỏng vấn vẫn được lưu để bạn thử chấm lại.",
        code: "provider_error",
      },
      { status: 502 },
    );
  }
}

async function capturePersistedMockMistakes({
  supabase,
  userId,
  attemptId,
  artifact,
  manifest,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  attemptId: string;
  artifact: Parameters<typeof captureMockMistakes>[0]["artifact"];
  manifest: Parameters<typeof captureMockMistakes>[0]["manifest"];
}) {
  try {
    return {
      mistakeCapture: await captureMockMistakes({
        supabase,
        userId,
        attemptId,
        artifact,
        manifest,
      }),
      mistakeQueueAvailable: true,
    };
  } catch (error) {
    if (error instanceof MistakeQueueConfigurationError) {
      return { mistakeCapture: null, mistakeQueueAvailable: false };
    }
    console.error("Mock mistake capture failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { mistakeCapture: null, mistakeQueueAvailable: true };
  }
}

type NormalizedReportItem = {
  questionId: string;
  origin: "question_bank" | "role_profile";
  version: number;
  contentRevision: string;
  response: string;
  explanation: string;
  elapsedSeconds: number;
  readinessCompetency?: WorldQuantCompetencyKey;
};

type NormalizedV4ReportRequest = {
  idempotencyKey: string;
  sessionId: string;
  profileId: WorldQuantRoleProfileId;
  profileVersion: 1;
  sourceRevision: string;
  durationMinutes: 30 | 45 | 60;
  elapsedSeconds: number;
  startedAt: string;
  submittedAt: string;
  plan: TargetedMockPlan;
  items: NormalizedReportItem[];
  raw: MockInterviewReportRequestV4;
};

function normalizeV4ReportRequest(
  request: MockInterviewReportRequestV4,
): NormalizedV4ReportRequest {
  return {
    idempotencyKey: request.idempotencyKey,
    sessionId: request.sessionId,
    profileId: request.profileId,
    profileVersion: request.profileVersion,
    sourceRevision: request.sourceRevision,
    durationMinutes: request.plan.durationMinutes,
    elapsedSeconds: request.elapsedSeconds,
    startedAt: request.startedAt,
    submittedAt: request.submittedAt,
    plan: request.plan,
    items: request.items.map((item) => ({
      questionId: item.question.question.id,
      origin: item.question.question.origin,
      version: item.question.question.version,
      contentRevision: item.question.question.contentRevision,
      response: item.response,
      explanation: item.explanation,
      elapsedSeconds: item.elapsedSeconds,
      readinessCompetency: item.question.readinessCompetency,
    })),
    raw: request,
  };
}

function sha256Json(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function publicHiddenExecutionResult(
  result: CodeExecutionResult,
): Omit<
  CodeExecutionResult,
  "diagnostics" | "output" | "cases"
> {
  return {
    suite: result.suite,
    codeHash: result.codeHash,
    specRevision: result.specRevision,
    language: result.language,
    status: result.status,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    durationMs: result.durationMs,
    toolchain: result.toolchain,
    completedAt: result.completedAt,
  };
}

async function runHiddenExecutionBatch({
  userId,
  idempotencyKey,
  targets,
}: {
  userId: string;
  idempotencyKey: string;
  targets: Array<{
    questionId: string;
    source: string;
    spec: MockExecutionSpec;
  }>;
}) {
  const admissionClient = createCodeExecutionAdminClient();
  const runnerConfig = getCodeRunnerConfig();
  const requestFingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        targets.map((target) => ({
          codeHash: createHash("sha256")
            .update(target.source)
            .digest("hex"),
          language: target.spec.language,
          questionId: target.questionId,
          questionVersion: target.spec.questionVersion,
          specRevision: target.spec.revision,
          toolchainSnapshotHash: createHash("sha256")
            .update(runnerConfig.snapshotId)
            .digest("hex"),
        })),
      ),
    )
    .digest("hex");
  const reservation = await reserveCodeExecution(admissionClient, {
    userId,
    idempotencyKey,
    purpose: "mock_report",
    jobCount: targets.length,
    requestFingerprint,
  });
  if (reservation.status !== "running") {
    const cached = parseCachedHiddenResults(reservation.cachedResult);
    if (cached && hiddenResultsMatchTargets(cached, targets)) {
      return cached;
    }
    if (cached) throw new CodeExecutionIdempotencyConflictError();
    throw new CodeExecutionConfigurationError(
      "Previous hidden execution did not complete",
    );
  }
  if (!reservation.isNew) {
    throw new CodeExecutionBusyError(reservation.reservationId);
  }

  const results: CodeExecutionResult[] = [];
  try {
    for (const target of targets) {
      results.push(
        await executeMockCode({
          spec: target.spec,
          source: target.source,
          suite: "hidden",
        }),
      );
    }
  } catch (error) {
    await finishCodeExecution(admissionClient, {
      userId,
      reservationId: reservation.reservationId,
      status: "failed",
      cachedResult: {
        ok: false,
        code: "hidden_execution_failed",
      },
    }).catch(() => undefined);
    throw error;
  }

  try {
    const finalized = await finishCodeExecution(admissionClient, {
      userId,
      reservationId: reservation.reservationId,
      status: "completed",
      cachedResult: {
        ok: true,
        results: results.map(publicHiddenExecutionResult),
      },
    });
    if (finalized.status !== "completed") {
      throw new CodeExecutionFinalizationIndeterminateError();
    }
    return results;
  } catch {
    try {
      const recovered = await reserveCodeExecution(admissionClient, {
        userId,
        idempotencyKey,
        purpose: "mock_report",
        jobCount: targets.length,
        requestFingerprint,
      });
      const cached = parseCachedHiddenResults(recovered.cachedResult);
      if (
        recovered.status === "completed" &&
        cached &&
        hiddenResultsMatchTargets(cached, targets)
      ) {
        return cached;
      }
    } catch {
      // Keep the same key. A later retry can still recover the terminal cache.
    }
    throw new CodeExecutionFinalizationIndeterminateError();
  }
}

function parseCachedHiddenResults(
  value: Record<string, unknown> | null,
) {
  if (!value || value.ok !== true) return null;
  const parsed =
    publicHiddenExecutionResultSchema.array().safeParse(value.results);
  return parsed.success
    ? parsed.data.map((result) => ({
        ...result,
        diagnostics: "",
        output: "",
        cases: [],
      }))
    : null;
}

function hiddenResultsMatchTargets(
  results: CodeExecutionResult[],
  targets: Array<{ source: string; spec: MockExecutionSpec }>,
) {
  return (
    results.length === targets.length &&
    results.every((result, index) => {
      const target = targets[index];
      return Boolean(
        target &&
          result.suite === "hidden" &&
          result.specRevision === target.spec.revision &&
          result.language === target.spec.language &&
          result.codeHash ===
            createHash("sha256")
              .update(target.source)
              .digest("hex"),
      );
    })
  );
}

function hiddenExecutionErrorResponse(error: unknown) {
  if (error instanceof CodeExecutionQuotaExceededError) {
    return Response.json(
      {
        error:
          "Đã hết hạn mức kiểm thử ẩn hôm nay. Hạn mức được đặt lại lúc 00:00 giờ Việt Nam.",
        code: "code_execution_daily_quota",
      },
      { status: 429 },
    );
  }
  if (error instanceof CodeExecutionBusyError) {
    return Response.json(
      {
        error:
          "Một lượt chạy mã khác đang xử lý. Hãy chờ lượt đó kết thúc rồi tạo lại báo cáo.",
        code: "code_execution_busy",
      },
      { status: 409 },
    );
  }
  if (error instanceof CodeExecutionFinalizationIndeterminateError) {
    return Response.json(
      {
        error:
          "Kiểm thử ẩn đã chạy nhưng trạng thái lưu tạm chưa được xác nhận. Hãy giữ nguyên bài nộp và thử lại.",
        code: "code_execution_finalization_indeterminate",
      },
      { status: 503 },
    );
  }
  if (error instanceof CodeExecutionIdempotencyConflictError) {
    return Response.json(
      {
        error:
          "Khóa chạy mã không còn khớp. Hãy nhấn tạo lại báo cáo để bắt đầu lượt mới.",
        code: "code_execution_retry_required",
      },
      { status: 409 },
    );
  }
  if (
    error instanceof CodeExecutionConfigurationError ||
    error instanceof CodeRunnerConfigurationError
  ) {
    return Response.json(
      {
        error:
          "Quyền chạy hoặc hạn mức của trình chạy mã chưa sẵn sàng, hoặc lượt trước đã gặp lỗi.",
        code: "code_execution_retry_required",
      },
      { status: 503 },
    );
  }
  console.error("Hidden mock execution failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      error:
        "Kiểm thử ẩn chưa chạy xong. Câu trả lời vẫn được giữ để thử lại.",
      code: "code_execution_retry_required",
    },
    { status: 502 },
  );
}

function hiddenExecutionRequiresFreshKey(error: unknown) {
  return !(
    error instanceof CodeExecutionQuotaExceededError ||
    error instanceof CodeExecutionBusyError ||
    error instanceof CodeExecutionFinalizationIndeterminateError
  );
}

function historyTransitionErrorResponse() {
  return Response.json(
    {
      error:
        "Không thể mở lại lượt đã giữ chỗ một cách an toàn. Hãy giữ nguyên bài nộp và thử lại sau.",
      code: "history_transition_failed",
    },
    { status: 503 },
  );
}

function candidateAnswerForReport({
  responseMode,
  language,
  response,
  explanation,
}: {
  responseMode: "text" | "code";
  language: "cpp";
  response: string;
  explanation: string;
}) {
  if (responseMode === "text") return response.trim();
  const source = response.trim();
  const reasoning = explanation.trim();
  if (!source && !reasoning) return "";
  return `\`\`\`${language}\n${source}\n\`\`\`${
    reasoning
      ? `\n\nGiải thích của ứng viên:\n${reasoning}`
      : ""
  }`;
}

function sourceNotesForQuestion(
  question: {
    sources: Array<{ sectionId: string }>;
  },
  lesson: {
    sections: Array<{ id: string; heading: string; bodyText: string }>;
  },
) {
  let remaining = 3_000;
  const notes: string[] = [];
  for (const source of question.sources) {
    const section = lesson.sections.find(
      (item) => item.id === source.sectionId,
    );
    if (!section || remaining <= 0) continue;
    const body = section.bodyText.slice(0, Math.min(1_400, remaining));
    remaining -= body.length;
    notes.push(
      `<source id="${section.id}" heading="${section.heading}">\n${body}\n</source>`,
    );
  }
  return notes.join("\n\n");
}

function providerStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

function providerCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
