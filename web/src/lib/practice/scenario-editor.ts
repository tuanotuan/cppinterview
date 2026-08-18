import type { ContentLanguage } from "../content/schema";

const CPLUSPLUS_DESIGN_TEMPLATE = `#include <utility>

class Solution {
public:
    // Thiết kế public API ở đây.

private:
    // Khai báo state và ownership ở đây.
};`;

export function scenarioEditorConfig(_language: ContentLanguage) {
  void _language;
  return {
    fileName: "main.cpp",
    languageLabel: "C++",
    template: CPLUSPLUS_DESIGN_TEMPLATE,
    placeholder: "// Thiết kế class/API của bạn ở đây…\n\nclass Solution {\npublic:\n    // ...\n};",
  };
}
