import type { ContentLanguage } from "../content/schema";

const CPLUSPLUS_DESIGN_TEMPLATE_VI = `#include <utility>

class Solution {
public:
    // Thiết kế public API ở đây.

private:
    // Khai báo state và ownership ở đây.
};`;

const CPLUSPLUS_DESIGN_TEMPLATE_EN = `#include <utility>

class Solution {
public:
    // Design the public API here.

private:
    // Declare state and ownership here.
};`;

export function scenarioEditorConfig(
  language: ContentLanguage,
  locale: "en" | "vi",
) {
  const isEnglish = locale === "en";

  return {
    fileName: "main.cpp",
    languageLabel: "C++",
    template: isEnglish
      ? CPLUSPLUS_DESIGN_TEMPLATE_EN
      : CPLUSPLUS_DESIGN_TEMPLATE_VI,
    placeholder: isEnglish
      ? "// Design your class/API here…\n\nclass Solution {\npublic:\n    // ...\n};"
      : "// Thiết kế class/API của bạn ở đây…\n\nclass Solution {\npublic:\n    // ...\n};",
  };
}
