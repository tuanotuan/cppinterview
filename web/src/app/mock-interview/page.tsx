import type { Metadata } from "next";
import Link from "next/link";

import { isCodeRunnerConfigured } from "@/lib/code-runner/config.server";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import {
  buildWorldQuantBankCatalog,
} from "@/lib/mock-interview/catalog";
import { mockInterviewCompletedArtifactV4Schema } from "@/lib/mock-interview/contracts-v4";
import { parseMockInterviewDuration } from "@/lib/mock-interview/profile";
import {
  createMockHistoryAdminClient,
  listMockInterviewAttempts,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import {
  classifyWorldQuantCompetency,
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfileIds,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";
import { parseWorldQuantMissionReturn } from "@/lib/worldquant/guided-mode";

import { MockInterviewApp } from "./mock-interview-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phỏng vấn thử WorldQuant — cppinterview",
  description:
    "Phỏng vấn thử cho vị trí Kỹ sư nền tảng dữ liệu tick bằng C++ hiện đại.",
};

export default async function MockInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string | string[];
    mode?: string | string[];
    focus?: string | string[];
    duration?: string | string[];
    returnTo?: string | string[];
    returnRole?: string | string[];
    returnMinutes?: string | string[];
  }>;
}) {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  if (!cloud.enabled) return <MockInterviewGate mode="not-configured" />;
  if (!cloud.account) return <MockInterviewGate mode="login" />;

  const bankQuestions = buildWorldQuantBankCatalog({
    manifest: cloud.manifest,
    approvals: cloud.approvals,
  });
  const readinessQuestions: ReadinessQuestionSummary[] =
    cloud.manifest.questions
      .filter(
        (question) =>
          question.status !== "archived" &&
          (question.status === "verified" ||
            isQuestionApproved(question, cloud.approvals)),
      )
      .map((question) => ({
        id: question.id,
        version: question.version,
        sourceHash: question.sourceHash,
        deckId: question.taxonomy.deckId,
        lessonId: question.lessonId,
        estimatedMinutes: question.estimatedMinutes,
        competency: classifyWorldQuantCompetency({
          deckId: question.taxonomy.deckId,
          language: question.taxonomy.language,
          lessonId: question.lessonId,
          topics: question.taxonomy.topics,
          tags: question.taxonomy.tags,
        }),
      validation:
        cloud.mistakeQuestionIds.includes(question.id)
          ? "personal_remediation"
          : question.status === "verified"
          ? "repository_verified"
          : "owner_approved",
      }));
  const query = await searchParams;
  const initialRoleProfileId = parseRoleProfileId(single(query.role));
  const requestedFocus = parseCompetency(single(query.focus));
  const requestedMode = single(query.mode);
  const initialDuration = parseMockInterviewDuration(
    single(query.duration),
  );
  const missionReturnHref = parseWorldQuantMissionReturn({
    returnTo: single(query.returnTo),
    role: single(query.returnRole),
    minutes: single(query.returnMinutes),
  });
  const role = worldQuantRoleProfileById(initialRoleProfileId);
  const initialMode =
    requestedMode === "targeted" &&
    requestedFocus &&
    role.weights[requestedFocus] > 0
      ? "targeted"
      : "balanced";
  const initialTargetCompetency =
    initialMode === "targeted" ? requestedFocus : null;
  let historyAvailable = false;
  let initialHistory: Array<{
    attemptId: string;
    artifact: ReturnType<
      typeof mockInterviewCompletedArtifactV4Schema.parse
    >;
  }> = [];
  try {
    const historyClient = createMockHistoryAdminClient();
    const history = await listMockInterviewAttempts(historyClient, {
      userId: cloud.account.id,
      limit: 20,
    });
    historyAvailable = true;
    initialHistory = history.items.flatMap((attempt) => {
      if (attempt.status !== "completed") return [];
      const artifact =
        mockInterviewCompletedArtifactV4Schema.safeParse(attempt.report);
      return artifact.success
        ? [{ attemptId: attempt.attemptId, artifact: artifact.data }]
        : [];
    });
  } catch (error) {
    if (!(error instanceof MockHistoryConfigurationError)) {
      console.error("Mock history load failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return (
    <MockInterviewApp
      account={{
        id: cloud.account.id,
        displayName: cloud.account.displayName,
        login: cloud.account.login,
      }}
      sourceRevision={cloud.manifest.sourceRevision}
      bankQuestions={bankQuestions}
      readinessQuestions={readinessQuestions}
      initialCloudProgress={cloud.progress}
      initialQuestionStates={cloud.questionStates}
      today={vietnamDateKey()}
      initialRoleProfileId={initialRoleProfileId}
      initialDuration={initialDuration}
      initialMode={initialMode}
      initialTargetCompetency={initialTargetCompetency}
      missionReturnHref={missionReturnHref}
      initialHistory={initialHistory}
      historyAvailable={historyAvailable}
      codeRunnerAvailable={isCodeRunnerConfigured()}
    />
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRoleProfileId(value: string | undefined): WorldQuantRoleProfileId {
  return worldQuantRoleProfileIds.includes(
    value as WorldQuantRoleProfileId,
  )
    ? (value as WorldQuantRoleProfileId)
    : "tick-data-platform";
}

function parseCompetency(
  value: string | undefined,
): WorldQuantCompetencyKey | null {
  return worldQuantCompetencyKeys.includes(
    value as WorldQuantCompetencyKey,
  )
    ? (value as WorldQuantCompetencyKey)
    : null;
}

function vietnamDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function MockInterviewGate({
  mode,
}: {
  mode: "login" | "not-configured";
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#173f35]/15 bg-white/70 p-8 shadow-[0_24px_80px_rgb(23_63_53_/_10%)] sm:p-10">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#173f35] font-mono font-bold text-[#d7ff91]">
          WQ
        </div>
        <p className="mt-8 font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
          Phỏng vấn thử
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Phòng phỏng vấn riêng
        </h1>
        <p className="mt-4 leading-7 text-[#64736c]">
          {mode === "login"
            ? "Đăng nhập để dùng ngân hàng câu hỏi riêng và nhận báo cáo do AI tạo vào cuối buổi."
            : "Supabase chưa được cấu hình nên chưa thể xác thực và chấm buổi phỏng vấn thử."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {mode === "login" ? (
            <Link
              href="/auth?next=%2Fmock-interview"
              className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white"
            >
              Đăng nhập
            </Link>
          ) : null}
          <Link
            href="/practice"
            className="rounded-2xl border border-[#173f35]/15 bg-white px-5 py-3 text-sm font-bold"
          >
            Về trang luyện tập
          </Link>
        </div>
      </section>
    </main>
  );
}
