import { describe, expect, it } from "vitest";

import {
  languageMenuTargetIndex,
  localeSwitchHref,
} from "./language-switcher-logic";

describe("language switcher", () => {
  it("preserves pathname, query and hash during a locale transition", () => {
    expect(localeSwitchHref("/practice", "?guest=1", "#answer")).toBe(
      "/practice?guest=1#answer",
    );
    expect(localeSwitchHref("/learn", "topic=memory", "section-2")).toBe(
      "/learn?topic=memory#section-2",
    );
    expect(localeSwitchHref("/profile", "", "")).toBe("/profile");
  });

  it("wraps arrow navigation and supports Home and End", () => {
    expect(languageMenuTargetIndex("ArrowDown", 0, 2)).toBe(1);
    expect(languageMenuTargetIndex("ArrowDown", 1, 2)).toBe(0);
    expect(languageMenuTargetIndex("ArrowUp", 0, 2)).toBe(1);
    expect(languageMenuTargetIndex("Home", 1, 2)).toBe(0);
    expect(languageMenuTargetIndex("End", 0, 2)).toBe(1);
    expect(languageMenuTargetIndex("Escape", 0, 2)).toBeNull();
  });
});
