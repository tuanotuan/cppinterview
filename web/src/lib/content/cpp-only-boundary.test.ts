import { describe, expect, it } from "vitest";

import { deckForLanguage, parsePracticeDeck } from "./decks";
import {
  contentLanguageSchema,
  contentTrackSchema,
  practiceDeckSchema,
} from "./schema";

describe("C++-only product boundary", () => {
  it("accepts only C++ content metadata", () => {
    expect(contentLanguageSchema.safeParse("cpp").success).toBe(true);
    expect(contentLanguageSchema.safeParse("python").success).toBe(false);
    expect(contentLanguageSchema.safeParse("cmake").success).toBe(false);
    expect(contentTrackSchema.options).toEqual([
      "cpp98",
      "cpp11",
      "cpp14",
      "cpp20",
    ]);
  });

  it("always selects the single C++ practice deck", () => {
    expect(practiceDeckSchema.safeParse("cpp-interview").success).toBe(true);
    expect(parsePracticeDeck("python-interview")).toBe("cpp-interview");
    expect(deckForLanguage("cpp")).toBe("cpp-interview");
  });
});
