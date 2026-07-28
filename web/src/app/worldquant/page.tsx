import type { Metadata } from "next";

import { mockInterviewCompletedArtifactV4Schema } from "@/lib/mock-interview/contracts-v4";
import {
  createMockHistoryAdminClient,
  listMockInterviewAttempts,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import type { MockInterviewHistoryEntry } from "@/lib/mock-interview/trends";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import {
  classifyWorldQuantCompetency,
  parseWorldQuantRoleProfile,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

import { WorldQuantReadinessApp } from "./worldquant-readiness-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WorldQuant Readiness Hub — Recall",
  description:
    "Theo dõi bằng chứng học tập và khoảng trống năng lực cho các vị trí C++ tại WorldQuant.",
};

export default async function WorldQuantPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const [cloud, params] = await Promise.all([
    loadCloudContext({
      includeAiUsage: false,
      includeDailyAiBudget: false,
      includeGeminiUsage: false,
      includeProviderSettings: false,
    }),
    searchParams,
  ]);
  const roleParam = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const initialRoleId: WorldQuantRoleProfileId | null =
    roleParam === undefined
      ? null
      : parseWorldQuantRoleProfile(roleParam);
  const questions: ReadinessQuestionSummary[] = cloud.manifest.questions
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
  const pendingReviewCounts = cloud.manifest.questions
    .filter(
      (question) =>
        !cloud.mistakeQuestionIds.includes(question.id) &&
        question.status !== "archived" &&
        (question.status === "draft" ||
          question.status === "needs_review") &&
        !isQuestionApproved(question, cloud.approvals),
    )
    .reduce<Partial<Record<WorldQuantCompetencyKey, number>>>(
      (counts, question) => {
        const competency = classifyWorldQuantCompetency({
          deckId: question.taxonomy.deckId,
          language: question.taxonomy.language,
          lessonId: question.lessonId,
          topics: question.taxonomy.topics,
          tags: question.taxonomy.tags,
        });
        counts[competency] = (counts[competency] ?? 0) + 1;
        return counts;
      },
      {},
    );
  let mockHistoryAvailable = false;
  let initialMockHistory: MockInterviewHistoryEntry[] = [];
  if (cloud.account) {
    try {
      const history = await listMockInterviewAttempts(
        createMockHistoryAdminClient(),
        {
          userId: cloud.account.id,
          limit: 50,
        },
      );
      mockHistoryAvailable = true;
      initialMockHistory = history.items.flatMap((attempt) => {
        if (attempt.status !== "completed") return [];
        const artifact =
          mockInterviewCompletedArtifactV4Schema.safeParse(attempt.report);
        return artifact.success
          ? [
              {
                attemptId: attempt.attemptId,
                status: attempt.status,
                roleProfileId: attempt.roleProfileId,
                roleProfileVersion: attempt.roleProfileVersion,
                durationMinutes: attempt.durationMinutes,
                completedAt: attempt.completedAt,
                report: artifact.data,
              },
            ]
          : [];
      });
    } catch (error) {
      if (!(error instanceof MockHistoryConfigurationError)) {
        console.error("WorldQuant mock history load failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  return (
    <WorldQuantReadinessApp
      questions={questions}
      pendingReviewCounts={pendingReviewCounts}
      initialCloudProgress={cloud.progress}
      initialQuestionStates={cloud.questionStates}
      account={cloud.account}
      cloudEnabled={cloud.enabled}
      cloudError={cloud.error}
      today={vietnamDateKey()}
      initialMockHistory={initialMockHistory}
      mockHistoryAvailable={mockHistoryAvailable}
      initialRoleId={initialRoleId}
    />
  );
}

function vietnamDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
