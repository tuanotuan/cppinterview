import { isQuestionApproved } from "@/lib/practice/approvals";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import { parsePracticeDeck } from "@/lib/content/decks";
import { parseCustomStudyLaunch } from "@/lib/practice/custom-study";
import { parseFocusSessionId } from "@/lib/practice/focus-session";
import { parseWorldQuantMissionReturn } from "@/lib/worldquant/guided-mode";

import { PracticeApp, type PracticeQuestion } from "../practice-app";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
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
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const manifest = cloud.manifest;
  const params = await searchParams;
  const authCode = single(params.auth);
  const guestMode = single(params.guest) === "1";
  const deckParam = single(params.deck);
  const focusParam = single(params.focus);
  const requestedFocusId = parseFocusSessionId(focusParam);
  const invalidFocusRequest =
    focusParam !== undefined && requestedFocusId === null;
  const initialCustomStudyFilters = parseCustomStudyLaunch({
    study: single(params.study),
    topic: single(params.topic),
    lesson: single(params.lesson),
    limit: single(params.limit),
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
    returnTo: single(params.returnTo),
    role: single(params.returnRole),
    minutes: single(params.returnMinutes),
  });
  const lessons = new Map(manifest.lessons.map((lesson) => [lesson.id, lesson]));

  const mappedQuestions: PracticeQuestion[] = manifest.questions
    .filter((question) => question.status !== "archived")
    .map((question) => {
      const lesson = lessons.get(question.lessonId);
      if (!lesson) {
        throw new Error("Missing lesson " + question.lessonId);
      }

      return {
        ...question,
        lessonTitle: lesson.title,
        language: lesson.language,
        track: lesson.track,
        standard: lesson.standard,
        sourcePath: lesson.knowledgePath,
        sourceSections: question.sources.map(({ sectionId }) => {
          const section = lesson.sections.find((item) => item.id === sectionId);
          if (!section) {
            throw new Error("Missing section " + question.lessonId + "#" + sectionId);
          }
          return {
            id: section.id,
            heading: section.heading,
            excerpt: section.bodyText.slice(0, 900),
          };
        }),
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
      authNotice={authNotice(authCode)}
      initialDeck={parsePracticeDeck(deckParam)}
      requestedFocusId={requestedFocusId}
      invalidFocusRequest={invalidFocusRequest}
      initialCustomStudyFilters={initialCustomStudyFilters}
      focusReturnHref={focusReturnHref}
      mistakeQuestionIds={cloud.mistakeQuestionIds}
    />
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function authNotice(code?: string): string | null {
  if (code === "unauthorized") {
    return "Tài khoản GitHub này không được phép dùng ứng dụng riêng tư.";
  }
  if (code === "not-configured") return "Supabase chưa được cấu hình.";
  if (code === "login-error" || code === "callback-error") {
    return "Đăng nhập GitHub chưa thành công. Hãy kiểm tra cấu hình đăng nhập rồi thử lại.";
  }
  return null;
}
