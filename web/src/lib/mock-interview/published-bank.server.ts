import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getRepoContentManifest, loadQuestionStoreManifest } from "@/lib/content/question-store-server";
import { loadQuestionTranslationPublications } from "@/lib/content/question-translations.server";
import {
  hasExactQuestionTranslation,
  localizeContentManifest,
  type QuestionTranslationPublication,
} from "@/lib/content/translations";
import type { Locale } from "@/i18n/routing";
import {
  rowsToApprovals,
  type QuestionApproval,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";

import {
  buildGeneralCppInterviewCatalog,
  type GeneralCppInterviewQuestion,
} from "./general-catalog";
import {
  createMockHistoryAdminClient,
  MockHistoryConfigurationError,
} from "./history.server";

export type GeneralCppPublishedBank = {
  manifest: ReturnType<typeof getRepoContentManifest>;
  catalog: GeneralCppInterviewQuestion[];
  approvals: QuestionApproval[];
  translations: QuestionTranslationPublication[];
  publicationAvailable: boolean;
};

/**
 * Loads the globally published interview bank through a server-only service
 * client. Only the browser-safe catalog is passed to Client Components; model
 * answers, hints and rubrics remain on the server for report evaluation.
 */
export async function loadGeneralCppPublishedBank(
  locale: Locale,
): Promise<GeneralCppPublishedBank> {
  let client: SupabaseClient;
  try {
    client = createMockHistoryAdminClient();
  } catch (error) {
    if (!(error instanceof MockHistoryConfigurationError)) throw error;
    return fallbackBank(locale);
  }

  try {
    const [manifest, approvals, translationRead] = await Promise.all([
      loadQuestionStoreManifest({ supabase: client }),
      loadContentAdminApprovals(client),
      loadQuestionTranslationPublications(client),
    ]);
    const translations = translationRead.error
      ? []
      : translationRead.publications;
    const localized = localizeContentManifest(
      locale === "en"
        ? {
            ...manifest,
            questions: manifest.questions.filter((question) =>
              hasExactQuestionTranslation(question, "en", translations),
            ),
          }
        : manifest,
      locale,
      translations,
    );
    return {
      manifest: localized,
      catalog: buildGeneralCppInterviewCatalog({
        manifest: localized,
        approvals,
      }),
      approvals,
      translations,
      publicationAvailable: true,
    };
  } catch (error) {
    console.error("General C++ interview publication load failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return fallbackBank(locale);
  }
}

async function loadContentAdminApprovals(client: SupabaseClient) {
  const admins = await client.from("content_admins").select("user_id");
  if (admins.error) throw admins.error;
  const adminIds = (admins.data ?? []).flatMap((row) =>
    typeof row.user_id === "string" ? [row.user_id] : [],
  );
  if (!adminIds.length) return [];

  const approvals = await client
    .from("question_approvals")
    .select("question_id, question_version, source_hash")
    .in("user_id", adminIds);
  if (approvals.error) throw approvals.error;
  return dedupeApprovals(
    rowsToApprovals((approvals.data ?? []) as QuestionApprovalRow[]),
  );
}

function dedupeApprovals(approvals: readonly QuestionApproval[]) {
  return [
    ...new Map(
      approvals.map((approval) => [
        `${approval.questionId}:${approval.questionVersion}:${approval.sourceHash}`,
        approval,
      ]),
    ).values(),
  ];
}

function fallbackBank(locale: Locale): GeneralCppPublishedBank {
  const manifest = localizeContentManifest(
    getRepoContentManifest(),
    locale,
    [],
  );
  return {
    manifest,
    catalog: buildGeneralCppInterviewCatalog({
      manifest,
      approvals: [],
    }),
    approvals: [],
    translations: [],
    publicationAvailable: false,
  };
}
