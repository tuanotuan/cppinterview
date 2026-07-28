import { describe, expect, it } from "vitest";

import {
  CMAKE_GUIDE_CHAPTERS,
  CMAKE_GUIDE_SOURCES,
  CMAKE_WORLDQUANT_OUTCOMES,
} from "./cmake-guide";

describe("CMake learning guide", () => {
  it("keeps a detailed, stable table of contents", () => {
    const ids = CMAKE_GUIDE_CHAPTERS.map((chapter) => chapter.id);

    expect(CMAKE_GUIDE_CHAPTERS).toHaveLength(16);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);
    expect(
      CMAKE_GUIDE_CHAPTERS.map((chapter) => chapter.number),
    ).toEqual(
      Array.from({ length: CMAKE_GUIDE_CHAPTERS.length }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ),
    );
  });

  it("uses only official CMake documentation as external grounding", () => {
    expect(CMAKE_GUIDE_SOURCES.length).toBeGreaterThanOrEqual(12);
    expect(
      CMAKE_GUIDE_SOURCES.every((source) =>
        source.href.startsWith("https://cmake.org/cmake/help/"),
      ),
    ).toBe(true);
  });

  it("maps the guide to the WorldQuant role outcomes", () => {
    expect(CMAKE_WORLDQUANT_OUTCOMES).toHaveLength(6);
    expect(
      CMAKE_WORLDQUANT_OUTCOMES.map((item) => item.label),
    ).toEqual(
      expect.arrayContaining([
        "Làm chủ hệ thống cũ",
        "Nền tảng C++ hiện đại",
        "Thêm nguồn dữ liệu mới",
        "Tiêu chuẩn phần mềm",
      ]),
    );
  });
});
