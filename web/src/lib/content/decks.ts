import type { ContentLanguage, PracticeDeckId } from "./schema";

export const PRACTICE_DECKS = {
  "cpp-interview": {
    id: "cpp-interview",
    language: "cpp",
    badge: "C++",
    label: "Phỏng vấn C++",
    enabled: true,
  },
} as const satisfies Record<
  PracticeDeckId,
  {
    id: PracticeDeckId;
    language: ContentLanguage;
    badge: string;
    label: string;
    enabled: boolean;
  }
>;

export const ENABLED_PRACTICE_DECK_IDS = (
  Object.keys(PRACTICE_DECKS) as PracticeDeckId[]
).filter((deckId) => PRACTICE_DECKS[deckId].enabled);

export function parsePracticeDeck(_value: string | undefined): PracticeDeckId {
  void _value;
  return "cpp-interview";
}

export function deckForLanguage(_language: ContentLanguage): PracticeDeckId {
  void _language;
  return "cpp-interview";
}
