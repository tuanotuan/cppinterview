import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  questionTranslationPublicationSelect,
  rowsToQuestionTranslationPublications,
  type QuestionTranslationPublication,
} from "./translations";

export type QuestionTranslationPublicationRead = {
  publications: QuestionTranslationPublication[];
  error: boolean;
};

export async function loadQuestionTranslationPublications(
  supabase: SupabaseClient,
): Promise<QuestionTranslationPublicationRead> {
  const { data, error } = await supabase
    .from("content_current_question_translations")
    .select(questionTranslationPublicationSelect);

  if (error) {
    return { publications: [], error: true };
  }

  try {
    return {
      publications: rowsToQuestionTranslationPublications(data ?? []),
      error: false,
    };
  } catch {
    return { publications: [], error: true };
  }
}
