import { describe, expect, it } from "vitest";

import { formatActiveDuration } from "./mobile-usage";

describe("formatActiveDuration", () => {
  it("keeps short active time readable", () => {
    expect(formatActiveDuration(0)).toBe("Dưới 1 phút");
    expect(formatActiveDuration(59)).toBe("Dưới 1 phút");
    expect(formatActiveDuration(60)).toBe("1 phút");
  });

  it("formats longer active time in Vietnamese", () => {
    expect(formatActiveDuration(90 * 60)).toBe("1 giờ 30 phút");
    expect(formatActiveDuration(2 * 3600)).toBe("2 giờ 0 phút");
  });
});
