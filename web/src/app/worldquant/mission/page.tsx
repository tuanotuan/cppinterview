import type { Metadata } from "next";

import { mockInterviewCompletedArtifactV4Schema } from "@/lib/mock-interview/contracts-v4";
import {
  createMockHistoryAdminClient,
  listMockInterviewAttempts,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import {
  classifyWorldQuantCompetency,
  parseWorldQuantRoleProfile,
  type ReadinessQuestionSummary,
} from "@/lib/worldquant/readiness";

import { WorldQuantMissionApp } from "./worldquant-mission-app";
import type { MissionMockCompletion } from "./worldquant-mission-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today’s WorldQuant Mission — Recall",
  description:
    "Daily adaptive mission kết hợp due cards, repairs, scenario drill và mock checkpoint.",
};

export default async function WorldQuantMissionPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string | string[];
    minutes?: string | string[];
  }>;
}) {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const params = await searchParams;
  const roleParam = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const minutesParam = Array.isArray(params.minutes)
    ? params.minutes[0]
    : params.minutes;
  const mistakeIds = new Set(cloud.mistakeQuestionIds);
  let initialMockCompletions: MissionMockCompletion[] = [];
  if (cloud.account) {
    try {
      const history = await listMockInterviewAttempts(
        createMockHistoryAdminClient(),
        {
          userId: cloud.account.id,
          limit: 50,
        },
      );
      initialMockCompletions = history.items.flatMap((attempt) => {
        if (attempt.status !== "completed" || !attempt.completedAt) {
          return [];
        }
        const artifact =
          mockInterviewCompletedArtifactV4Schema.safeParse(
            attempt.report,
          );
        if (!artifact.success) return [];
        return [
          {
            roleProfileId: attempt.roleProfileId,
            roleProfileVersion: attempt.roleProfileVersion,
            durationMinutes: attempt.durationMinutes,
            mode: artifact.data.plan.mode,
            targetCompetency:
              artifact.data.plan.mode === "targeted"
                ? artifact.data.plan.targetCompetency
                : null,
            completedAt: attempt.completedAt,
            completedOn: vietnamDateKey(
              new Date(attempt.completedAt),
            ),
          },
        ];
      });
    } catch (error) {
      if (!(error instanceof MockHistoryConfigurationError)) {
        console.error("WorldQuant mission mock history load failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }
  const questions: ReadinessQuestionSummary[] =
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
        validation: mistakeIds.has(question.id)
          ? "personal_remediation"
          : question.status === "verified"
            ? "repository_verified"
            : "owner_approved",
      }));

  return (
    <WorldQuantMissionApp
      accountId={cloud.account?.id ?? null}
      initialRoleId={parseWorldQuantRoleProfile(roleParam)}
      initialMinutes={parseMissionMinutes(minutesParam)}
      questions={questions}
      initialCloudProgress={cloud.progress}
      initialQuestionStates={cloud.questionStates}
      today={vietnamDateKey()}
      initialMockCompletions={initialMockCompletions}
    />
  );
}

function vietnamDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseMissionMinutes(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 45;
  return Math.min(120, Math.max(15, Math.round(parsed / 15) * 15));
}
