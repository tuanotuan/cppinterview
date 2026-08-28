import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/app/brand-mark";
import { isCodeRunnerConfigured } from "@/lib/code-runner/config.server";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudAccount, loadCloudContext } from "@/lib/practice/cloud-server";
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

import { MockInterviewApp } from "../../mock-interview/mock-interview-app";
import {
  hasExactQuestionTranslation,
  localizeContentManifest,
} from "@/lib/content/translations";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/i18n/metadata";
import { LanguageSwitcher } from "@/app/language-switcher";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Mock" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates("/mock-interview", locale),
  };
}

export default async function MockInterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
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
  const accountPromise = loadCloudAccount();
  const cloudPromise = loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const initialHistoryPromise = accountPromise.then(({ account }) =>
    loadInitialMockHistory(account?.id ?? null),
  );
  const [cloud, query, { locale }, { historyAvailable, initialHistory }] = await Promise.all([
    cloudPromise,
    searchParams,
    params,
    initialHistoryPromise,
  ]);
  if (!cloud.enabled) return <MockInterviewGate mode="not-configured" />;
  if (!cloud.account) return <MockInterviewGate mode="login" />;

  const localeManifest = locale === "en"
    ? {
        ...cloud.manifest,
        questions: cloud.manifest.questions.filter((question) =>
          hasExactQuestionTranslation(
            question,
            locale,
            cloud.questionTranslations,
          )
        ),
      }
    : cloud.manifest;
  const manifest = localizeContentManifest(
    localeManifest,
    locale,
    cloud.questionTranslations,
  );
  const bankQuestions = buildWorldQuantBankCatalog({
    manifest,
    approvals: cloud.approvals,
  });
  const readinessQuestions: ReadinessQuestionSummary[] =
    manifest.questions
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
  return (
    <MockInterviewApp
      account={{
        id: cloud.account.id,
        displayName: cloud.account.displayName,
        login: cloud.account.login,
      }}
      sourceRevision={manifest.sourceRevision}
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
      locale={locale}
    />
  );
}

async function loadInitialMockHistory(accountId: string | null) {
  if (!accountId) {
    return {
      historyAvailable: false,
      initialHistory: [] as Array<{
        attemptId: string;
        artifact: ReturnType<typeof mockInterviewCompletedArtifactV4Schema.parse>;
      }>,
    };
  }

  try {
    const historyClient = createMockHistoryAdminClient();
    const history = await listMockInterviewAttempts(historyClient, {
      userId: accountId,
      limit: 20,
    });
    return {
      historyAvailable: true,
      initialHistory: history.items.flatMap((attempt) => {
        if (attempt.status !== "completed") return [];
        const artifact =
          mockInterviewCompletedArtifactV4Schema.safeParse(attempt.report);
        if (!artifact.success) return [];

        // The landing screen only renders these fields. Sending full reports,
        // answers and execution records for every past attempt makes the RSC
        // response substantially larger without adding usable UI data.
        return [
          {
            attemptId: attempt.attemptId,
            artifact: {
              sessionId: artifact.data.sessionId,
              profileId: artifact.data.profileId,
              profileVersion: artifact.data.profileVersion,
              completedAt: artifact.data.completedAt,
              plan: {
                durationMinutes: artifact.data.plan.durationMinutes,
                mode: artifact.data.plan.mode,
                targetCompetency: artifact.data.plan.targetCompetency,
                variant: artifact.data.plan.variant,
                blueprintId: artifact.data.plan.blueprintId,
              },
              debrief: {
                assessedWeightPercent:
                  artifact.data.debrief.assessedWeightPercent,
                roleInterviewScore: artifact.data.debrief.roleInterviewScore,
                competencies: artifact.data.debrief.competencies,
              },
            },
          },
        ];
      }),
    };
  } catch (error) {
    if (!(error instanceof MockHistoryConfigurationError)) {
      console.error("Mock history load failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
    return { historyAvailable: false, initialHistory: [] };
  }
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

async function MockInterviewGate({
  mode,
}: {
  mode: "login" | "not-configured";
}) {
  const t = await getTranslations("Mock");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/70 p-8 shadow-[0_24px_80px_rgb(15_58_105_/_10%)] sm:p-10">
        <BrandMark size="lg" />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
            {t("eyebrow")}
          </p>
          <LanguageSwitcher compact hideOnMock={false} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {t("gateTitle")}
        </h1>
        <p className="mt-4 leading-7 text-[#526276]">
          {mode === "login"
            ? t("loginDescription")
            : t("notConfiguredDescription")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {mode === "login" ? (
            <Link
              href="/auth?next=%2Fmock-interview"
              className="rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white"
            >
              {t("signIn")}
            </Link>
          ) : null}
          <Link
            href="/practice"
            className="rounded-2xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-sm font-bold"
          >
            {t("backToPractice")}
          </Link>
        </div>
      </section>
    </main>
  );
}
