import "server-only";

import {
  loadPublishedQuestionBank,
  type PublishedQuestionBank,
} from "@/lib/content/published-question-bank.server";
import type { Locale } from "@/i18n/routing";

import {
  buildGeneralCppInterviewCatalog,
  type GeneralCppInterviewQuestion,
} from "./general-catalog";

export type GeneralCppPublishedBank = {
  manifest: PublishedQuestionBank["manifest"];
  catalog: GeneralCppInterviewQuestion[];
  approvals: PublishedQuestionBank["approvals"];
  translations: PublishedQuestionBank["translations"];
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
  const bank = await loadPublishedQuestionBank(locale);
  return {
    ...bank,
    catalog: buildGeneralCppInterviewCatalog({
      manifest: bank.manifest,
      approvals: bank.approvals,
    }),
  };
}
