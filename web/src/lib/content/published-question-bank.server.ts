import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Locale } from "@/i18n/routing";
import {
  createMockHistoryAdminClient,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import {
  rowsToApprovals,
  type QuestionApproval,
  type QuestionApprovalRow,
} from "@/lib/practice/approvals";

import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
} from "./question-store-server";
import { loadQuestionTranslationPublications } from "./question-translations.server";
import {
  hasExactQuestionTranslation,
  localizeContentManifest,
  type QuestionTranslationPublication,
} from "./translations";

export type PublishedQuestionBank = {
  manifest: ReturnType<typeof getRepoContentManifest>;
  approvals: QuestionApproval[];
  translations: QuestionTranslationPublication[];
  publicationAvailable: boolean;
};

/**
 * Loads the globally published question bank through a server-only privileged
 * client. The browser receives lesson/question content and exact-revision
 * publication tuples only; the credential never crosses this boundary.
 */
export async function loadPublishedQuestionBank(
  locale: Locale,
): Promise<PublishedQuestionBank> {
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
      approvals,
      translations,
      publicationAvailable: true,
    };
  } catch (error) {
    console.error("Published C++ question-bank load failed", {
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

function fallbackBank(locale: Locale): PublishedQuestionBank {
  return {
    manifest: localizeContentManifest(
      getRepoContentManifest(),
      locale,
      [],
    ),
    approvals: [],
    translations: [],
    publicationAvailable: false,
  };
}
