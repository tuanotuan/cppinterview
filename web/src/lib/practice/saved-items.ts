import { z } from "zod";

export const MAX_SAVED_ITEMS = 100;

export function savedItemsStorageKey(accountId: string | null) {
  const scope = accountId ? z.string().uuid().parse(accountId) : "local";
  return `cpp-recall:saved-items:${scope}:v2`;
}

const savedItemSchema = z.object({
  id: z.string().min(1).max(240),
  kind: z.enum(["question", "ai_answer"]),
  questionId: z.string().min(1).max(120),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(8000),
  context: z.string().max(2000).optional(),
  savedAt: z.string().datetime(),
});

const savedItemsSchema = z.array(savedItemSchema).max(MAX_SAVED_ITEMS);

export type SavedItem = z.infer<typeof savedItemSchema>;

export function parseSavedItems(raw: string | null): SavedItem[] {
  if (!raw) return [];
  try {
    const parsed = savedItemsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function upsertSavedItem(items: SavedItem[], item: SavedItem): SavedItem[] {
  return [item, ...items.filter((current) => current.id !== item.id)].slice(
    0,
    MAX_SAVED_ITEMS,
  );
}

export function removeSavedItem(items: SavedItem[], id: string): SavedItem[] {
  return items.filter((item) => item.id !== id);
}
