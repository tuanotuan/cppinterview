import type { Metadata } from "next";

import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import { classifyQuestionConcepts } from "@/lib/worldquant/curriculum";
import { worldQuantDrillById } from "@/lib/worldquant/drills";
import { parseWorldQuantMissionReturn } from "@/lib/worldquant/guided-mode";
import {
  classifyWorldQuantCompetency,
  parseWorldQuantRoleProfile,
  worldQuantCompetencyKeys,
  type WorldQuantCompetencyKey,
} from "@/lib/worldquant/readiness";

import {
  WorldQuantDrillApp,
  type DrillWarmupCard,
} from "./worldquant-drill-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phòng luyện tình huống WorldQuant — cppinterview",
  description:
    "Luyện thẻ ghi nhớ → tình huống → câu hỏi tiếp nối của người phỏng vấn → bài kiểm tra xác nhận bằng đề mới cho C++ WorldQuant.",
};

export default async function WorldQuantDrillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string | string[];
    competency?: string | string[];
    drill?: string | string[];
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
  const params = await searchParams;
  const roleParam = first(params.role);
  const competencyParam = first(params.competency);
  const drillParam = first(params.drill);
  const requestedDrill = drillParam
    ? worldQuantDrillById(drillParam)
    : null;
  const missionReturnHref = parseWorldQuantMissionReturn({
    returnTo: first(params.returnTo),
    role: first(params.returnRole),
    minutes: first(params.returnMinutes),
  });
  const competency = requestedDrill?.competency ??
    (worldQuantCompetencyKeys.includes(
      competencyParam as WorldQuantCompetencyKey,
    )
      ? (competencyParam as WorldQuantCompetencyKey)
      : "modern_cpp");
  const mistakeIds = new Set(cloud.mistakeQuestionIds);
  const warmupCards: DrillWarmupCard[] =
    cloud.manifest.questions.flatMap((question) => {
      if (
        question.status === "archived" ||
        (question.status !== "verified" &&
          !isQuestionApproved(question, cloud.approvals))
      ) {
        return [];
      }
      const canonicalCompetency = classifyWorldQuantCompetency({
        deckId: question.taxonomy.deckId,
        language: question.taxonomy.language,
        lessonId: question.lessonId,
        topics: question.taxonomy.topics,
        tags: question.taxonomy.tags,
      });
      const conceptIds = classifyQuestionConcepts({
        id: question.id,
        competency: canonicalCompetency,
        lessonId: question.lessonId,
        topics: question.taxonomy.topics,
        tags: question.taxonomy.tags,
        evidenceKind: mistakeIds.has(question.id)
          ? "personal_remediation"
          : question.status === "verified"
            ? "repository_verified"
            : "owner_approved",
      });
      return [
        {
          id: question.id,
          version: question.version,
          sourceHash: question.sourceHash,
          competency: canonicalCompetency,
          conceptIds,
          prompt: displayQuestionPrompt(question),
          hint: question.hint,
          answer: question.answer.short,
          personalRemediation: mistakeIds.has(question.id),
        },
      ];
    });

  return (
    <WorldQuantDrillApp
      accountId={cloud.account?.id ?? null}
      initialRoleId={parseWorldQuantRoleProfile(roleParam)}
      initialCompetency={competency}
      initialDrillId={requestedDrill?.id ?? null}
      missionReturnHref={missionReturnHref}
      warmupCards={warmupCards}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
