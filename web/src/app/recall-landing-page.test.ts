import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";

describe("landing page messaging", () => {
  it("names spaced repetition as the card-learning method in both locales", () => {
    expect(vietnameseMessages.Landing.description).toContain(
      "thẻ theo phương pháp lặp lại ngắt quãng",
    );
    expect(vietnameseMessages.Landing.capabilities[1].title).toBe(
      "Ôn thẻ bằng lặp lại ngắt quãng",
    );

    expect(englishMessages.Landing.description).toContain(
      "spaced-repetition cards",
    );
    expect(englishMessages.Landing.capabilities[1].title).toBe(
      "Spaced-repetition cards",
    );
  });

  it("keeps the homepage footer positioning aligned with the learning method", () => {
    expect(vietnameseMessages.Common.footer.slogan).toContain(
      "Lặp lại ngắt quãng",
    );
    expect(englishMessages.Common.footer.slogan).toContain(
      "Spaced repetition",
    );
  });
});
