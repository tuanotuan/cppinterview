export const CMAKE_GUIDE_CHAPTERS = [
  {
    id: "configure-generate-build",
    number: "01",
    title: "Mental model: configure, generate, build",
    shortTitle: "CMake đang làm gì?",
  },
  {
    id: "language-cache-scope",
    number: "02",
    title: "Language, list, scope và cache",
    shortTitle: "Ngôn ngữ CMake",
  },
  {
    id: "targets-graph",
    number: "03",
    title: "Targets là đơn vị thiết kế",
    shortTitle: "Target graph",
  },
  {
    id: "usage-requirements",
    number: "04",
    title: "PUBLIC, PRIVATE, INTERFACE",
    shortTitle: "Usage requirements",
  },
  {
    id: "project-architecture",
    number: "05",
    title: "Kiến trúc project nhiều module",
    shortTitle: "Project architecture",
  },
  {
    id: "generators-configurations",
    number: "06",
    title: "Generators, configurations và compiler",
    shortTitle: "Ninja / Visual Studio",
  },
  {
    id: "generator-expressions",
    number: "07",
    title: "Generator expressions không phải if()",
    shortTitle: "Điều kiện lúc generate",
  },
  {
    id: "dependency-management",
    number: "08",
    title: "Dependencies có ownership",
    shortTitle: "find_package & FetchContent",
  },
  {
    id: "generated-sources",
    number: "09",
    title: "Generated source và incremental build",
    shortTitle: "Code generation",
  },
  {
    id: "presets-toolchains",
    number: "10",
    title: "Presets, generators và toolchains",
    shortTitle: "Build reproducible",
  },
  {
    id: "testing-quality",
    number: "11",
    title: "CTest và test architecture",
    shortTitle: "Testing đúng tầng",
  },
  {
    id: "quality-performance",
    number: "12",
    title: "Warnings, sanitizer và build performance",
    shortTitle: "Quality & speed",
  },
  {
    id: "install-export-package",
    number: "13",
    title: "Install, export và package config",
    shortTitle: "Consumer-ready package",
  },
  {
    id: "diagnostics-performance",
    number: "14",
    title: "Diagnose build system có evidence",
    shortTitle: "Diagnose build system",
  },
  {
    id: "legacy-migration-ci",
    number: "15",
    title: "Migrate legacy mà không big bang",
    shortTitle: "Legacy → modern + CI",
  },
  {
    id: "worldquant-capstone",
    number: "16",
    title: "Capstone theo JD WorldQuant",
    shortTitle: "Interview & delivery",
  },
] as const;

export const CMAKE_GUIDE_SOURCES = [
  {
    label: "CMake Tutorial",
    description:
      "Luồng học chính thức từ project cơ bản tới target commands, testing và installation.",
    href: "https://cmake.org/cmake/help/latest/guide/tutorial/index.html",
  },
  {
    label: "User Interaction Guide",
    description:
      "Source/build tree, configure, build, install và cách người dùng gọi CMake/CTest.",
    href: "https://cmake.org/cmake/help/latest/guide/user-interaction/index.html",
  },
  {
    label: "cmake-language(7)",
    description:
      "Syntax, arguments, list, variable, cache, function, macro và scope.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-language.7.html",
  },
  {
    label: "cmake-buildsystem(7)",
    description:
      "Target properties, usage requirements và transitive build specification.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html",
  },
  {
    label: "Using Dependencies Guide",
    description:
      "find_package, imported targets, FetchContent và dependency providers.",
    href: "https://cmake.org/cmake/help/latest/guide/using-dependencies/index.html",
  },
  {
    label: "FetchContent",
    description:
      "Populate dependency ở configure time, pin revision và đưa target vào graph.",
    href: "https://cmake.org/cmake/help/latest/module/FetchContent.html",
  },
  {
    label: "add_custom_command",
    description:
      "OUTPUT, DEPENDS, BYPRODUCTS, DEPFILE và rule incremental đúng.",
    href: "https://cmake.org/cmake/help/latest/command/add_custom_command.html",
  },
  {
    label: "Generator Expressions",
    description:
      "Điều kiện theo config/compiler và BUILD_INTERFACE/INSTALL_INTERFACE.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html",
  },
  {
    label: "cmake-presets(7)",
    description:
      "Configure/build/test/workflow presets, inheritance và file dành cho user.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html",
  },
  {
    label: "cmake-toolchains(7)",
    description:
      "Compiler detection, toolchain file và cross-compiling.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html",
  },
  {
    label: "Testing and CTest",
    description:
      "enable_testing, add_test, multi-config và command chạy test.",
    href: "https://cmake.org/cmake/help/latest/guide/tutorial/Testing%20and%20CTest.html",
  },
  {
    label: "Importing and Exporting Guide",
    description:
      "Imported targets, install(EXPORT), namespace và downstream consumption.",
    href: "https://cmake.org/cmake/help/latest/guide/importing-exporting/index.html",
  },
  {
    label: "cmake-packages(7)",
    description:
      "Config packages, version files, find_dependency và relocatable packages.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-packages.7.html",
  },
  {
    label: "cmake-policies(7)",
    description:
      "Policy lifecycle, version range và chiến lược nâng project legacy.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html",
  },
  {
    label: "cmake(1)",
    description:
      "CLI chính thức: --fresh, --trace-expand, --debug-find, --graphviz và build.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake.1.html",
  },
] as const;

export const CMAKE_WORLDQUANT_OUTCOMES = [
  {
    label: "Legacy ownership",
    outcome:
      "Đọc global flags/cache cũ, khoanh behavior và migrate từng target có parity gate.",
  },
  {
    label: "Modern C++ platform",
    outcome:
      "Mô hình decoder, order book, statistics và tool bằng target graph rõ ownership.",
  },
  {
    label: "New feed onboarding",
    outcome:
      "Thêm generated protocol code và feed adapter mà incremental build vẫn đúng.",
  },
  {
    label: "Research consumers",
    outcome:
      "Xuất package relocatable để Python/research tooling và downstream C++ dùng ổn định.",
  },
  {
    label: "Software standards",
    outcome:
      "CTest, sanitizer, warnings, install smoke test và compiler matrix chạy trong CI.",
  },
  {
    label: "Interview signal",
    outcome:
      "Giải thích được vì sao target-based design đúng, không chỉ nhớ command.",
  },
] as const;
