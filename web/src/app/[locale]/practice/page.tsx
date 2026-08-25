import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { readPublicAiAdmissionStatus } from "@/lib/ai/public-ai-admission.server";
import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudAccount, loadCloudContext } from "@/lib/practice/cloud-server";
import { parsePracticeDeck } from "@/lib/content/decks";
import { parseCustomStudyLaunch } from "@/lib/practice/custom-study";
import { parseFocusSessionId } from "@/lib/practice/focus-session";
import { parseWorldQuantMissionReturn } from "@/lib/worldquant/guided-mode";
import {
  hasExactLessonTranslation,
  hasExactQuestionTranslation,
  localizeContentManifest,
} from "@/lib/content/translations";
import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";

import { PracticeApp, type PracticeQuestion } from "../../practice-app";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Practice" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates("/practice", locale),
  };
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    auth?: string | string[];
    deck?: string | string[];
    focus?: string | string[];
    guest?: string | string[];
    limit?: string | string[];
    lesson?: string | string[];
    returnTo?: string | string[];
    returnRole?: string | string[];
    returnMinutes?: string | string[];
    study?: string | string[];
    topic?: string | string[];
  }>;
}) {
  const accountPromise = loadCloudAccount();
  const cloudPromise = loadCloudContext({
    includeAiUsage: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const initialPublicAiQuotaPromise = accountPromise.then(({ account, canManageQuestionBank }) =>
    canManageQuestionBank ? null : loadInitialPublicAiQuota(account?.id ?? null),
  );
  const [cloud, initialPublicAiQuota, query, { locale }, t] = await Promise.all([
    cloudPromise,
    initialPublicAiQuotaPromise,
    searchParams,
    params,
    getTranslations("Practice"),
  ]);
  const manifest = localizeContentManifest(cloud.manifest, locale);
  const authCode = single(query.auth);
  const guestMode = single(query.guest) === "1";
  const deckParam = single(query.deck);
  const focusParam = single(query.focus);
  const requestedFocusId = parseFocusSessionId(focusParam);
  const invalidFocusRequest =
    focusParam !== undefined && requestedFocusId === null;
  const initialCustomStudyFilters = parseCustomStudyLaunch({
    study: single(query.study),
    topic: single(query.topic),
    lesson: single(query.lesson),
    limit: single(query.limit),
  });
  const customStudyLaunchKey = initialCustomStudyFilters
    ? [
        initialCustomStudyFilters.learningState,
        initialCustomStudyFilters.standard,
        initialCustomStudyFilters.skill,
        initialCustomStudyFilters.topic,
        initialCustomStudyFilters.lessonId,
        initialCustomStudyFilters.limit,
      ].join(":")
    : "daily";
  const focusReturnHref = parseWorldQuantMissionReturn({
    returnTo: single(query.returnTo),
    role: single(query.returnRole),
    minutes: single(query.returnMinutes),
  });
  const lessons = new Map(manifest.lessons.map((lesson) => [lesson.id, lesson]));

  const mappedQuestions: PracticeQuestion[] = manifest.questions
    .filter(
      (question) =>
        locale === "vi" || hasExactQuestionTranslation(question, locale),
    )
    .filter((question) => question.status !== "archived")
    .map((question) => {
      const lesson = lessons.get(question.lessonId);
      if (!lesson) {
        throw new Error("Missing lesson " + question.lessonId);
      }

      const lessonIsLocalized =
        locale === "vi" || hasExactLessonTranslation(lesson, locale);

      return {
        ...question,
        lessonTitle: lessonIsLocalized ? lesson.title : t("contentTopic"),
        language: lesson.language,
        track: lesson.track,
        standard: lesson.standard,
        sourcePath: lesson.knowledgePath,
        sourceSections: lessonIsLocalized ? question.sources.map(({ sectionId }) => {
          const section = lesson.sections.find((item) => item.id === sectionId);
          if (!section) {
            throw new Error("Missing section " + question.lessonId + "#" + sectionId);
          }
          return {
            id: section.id,
            heading: section.heading,
            excerpt: section.bodyText.slice(0, 900),
          };
        }) : [],
      };
    });
  const questions = mappedQuestions.filter(
    (question) =>
      question.status === "verified" ||
      isQuestionApproved(question, cloud.approvals),
  );
  const reviewQueue = cloud.account
    ? mappedQuestions.filter(
        (question) =>
          new Set(["draft", "needs_review"]).has(question.status) &&
          !isQuestionApproved(question, cloud.approvals),
      )
    : [];
  const practiceKey = [
    cloud.account?.id ?? "local",
    requestedFocusId ?? (invalidFocusRequest ? "invalid-focus" : "normal-practice"),
    customStudyLaunchKey,
  ].join(":");

  return (
    <PracticeApp
      key={practiceKey}
      questions={questions}
      reviewQueue={reviewQueue}
      sourceRevision={manifest.sourceRevision}
      cloudEnabled={cloud.enabled}
      account={cloud.account}
      guestMode={guestMode}
      canManageQuestionBank={cloud.canManageQuestionBank}
      initialCloudProgress={cloud.progress}
      initialQuestionStates={cloud.questionStates}
      cloudSetupError={cloud.error}
      initialAiDailyBudget={cloud.aiDailyBudget}
      initialPublicAiQuota={initialPublicAiQuota}
      authNotice={authNotice(authCode, t)}
      initialDeck={parsePracticeDeck(deckParam)}
      requestedFocusId={requestedFocusId}
      invalidFocusRequest={invalidFocusRequest}
      initialCustomStudyFilters={initialCustomStudyFilters}
      focusReturnHref={focusReturnHref}
      mistakeQuestionIds={cloud.mistakeQuestionIds}
      locale={locale}
    />
  );
}

async function loadInitialPublicAiQuota(accountId: string | null) {
  try {
    const requestHeaders = await headers();
    return await readPublicAiAdmissionStatus({
      request: new Request("https://recall.internal/practice", {
        headers: requestHeaders,
      }),
      accountId,
    });
  } catch (error) {
    console.error("Public AI quota status read failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function authNotice(
  code: string | undefined,
  t: (key: "authNotConfigured" | "authError") => string,
): string | null {
  if (code === "not-configured") return t("authNotConfigured");
  if (code === "login-error" || code === "callback-error") {
    return t("authError");
  }
  return null;
}
