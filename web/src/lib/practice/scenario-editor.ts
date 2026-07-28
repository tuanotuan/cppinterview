import type { ContentLanguage } from "../content/schema";

const CPLUSPLUS_DESIGN_TEMPLATE = `#include <utility>

class Solution {
public:
    // Thiết kế public API ở đây.

private:
    // Khai báo state và ownership ở đây.
};`;

const PYTHON_DESIGN_TEMPLATE = `class Solution:
    """Thiết kế API công khai và trạng thái ở đây."""

    def __init__(self) -> None:
        pass`;

const CMAKE_DESIGN_TEMPLATE = `cmake_minimum_required(VERSION 3.25)
project(TradingSystem LANGUAGES CXX)

# Khai báo các target và yêu cầu sử dụng ở đây.
add_executable(trading_app main.cpp)`;

export function scenarioEditorConfig(language: ContentLanguage) {
  if (language === "python") {
    return {
      fileName: "main.py",
      languageLabel: "Python",
      template: PYTHON_DESIGN_TEMPLATE,
      placeholder: "# Thiết kế class/API của bạn ở đây…\n\nclass Solution:\n    pass",
    };
  }
  if (language === "cmake") {
    return {
      fileName: "CMakeLists.txt",
      languageLabel: "CMake",
      template: CMAKE_DESIGN_TEMPLATE,
      placeholder: "# Viết đồ thị target và yêu cầu sử dụng ở đây…\n\nadd_library(core ...)",
    };
  }
  return {
    fileName: "main.cpp",
    languageLabel: "C++",
    template: CPLUSPLUS_DESIGN_TEMPLATE,
    placeholder: "// Thiết kế class/API của bạn ở đây…\n\nclass Solution {\npublic:\n    // ...\n};",
  };
}
