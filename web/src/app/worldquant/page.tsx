import type { Metadata } from "next";

import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import {
  classifyWorldQuantCompetency,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
} from "@/lib/worldquant/readiness";

import { WorldQuantReadinessApp } from "./worldquant-readiness-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WorldQuant Readiness Hub — Recall",
  description:
    "Theo dõi bằng chứng học tập và khoảng trống năng lực cho các vị trí C++ tại WorldQuant.",
};

export default async function WorldQuantPage() {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
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
        question.status === "verified"
          ? "repository_verified"
          : "owner_approved",
    }));
  const pendingReviewCounts = cloud.manifest.questions
    .filter(
      (question) =>
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
