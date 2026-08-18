import "server-only";

import type { ContentLanguage } from "@/lib/content/schema";
import {
  WORLDQUANT_ROLE_QUESTIONS,
  type MockInterviewQuestion,
} from "@/lib/mock-interview/profile";

export type ExecutionSuite = "sample" | "hidden";

export type SandboxPlanFile = {
  path: string;
  content: string;
  mode?: number;
};

export type SandboxPlanCommand = {
  phase: "compile" | "configure" | "build" | "test";
  cmd: string;
  args: string[];
  cwd?: string;
  timeoutMs: number;
  memoryBytes: number;
};

export type SandboxTestCase = {
  name: string;
  files?: SandboxPlanFile[];
  command: SandboxPlanCommand;
  validate: (result: {
    exitCode: number;
    stdout: string;
    stderr: string;
  }) => {
    passed: boolean;
    message?: string;
  };
};

export type SandboxExecutionPlan = {
  files: SandboxPlanFile[];
  build: SandboxPlanCommand[];
  tests: SandboxTestCase[];
};

export type MockExecutionSpec = {
  questionId: string;
  questionVersion: number;
  contentRevision: string;
  revision: number;
  language: Extract<ContentLanguage, "cpp">;
  toolchain: string;
  createPlan: (
    source: string,
    suite: ExecutionSuite,
  ) => SandboxExecutionPlan;
};

const MIB = 1024 * 1024;
const COMPILE_MEMORY = 1024 * MIB;
const RUNTIME_MEMORY = 256 * MIB;
const TOOLCHAIN = "recall-sandbox-v1";

const intervalDriver = String.raw`#include <fstream>
#include <iomanip>
#include <iostream>
#include <optional>

#include "candidate.cpp"

namespace {
void print_optional(const std::optional<double>& value) {
    if (value) {
        std::cout << std::setprecision(20) << *value;
    } else {
        std::cout << "null";
    }
}
}

int main(int argc, char** argv) {
    if (argc != 2) {
        return 2;
    }
    std::ifstream input(argv[1]);
    std::size_t count = 0;
    if (!(input >> count)) {
        return 3;
    }

    IntervalStats stats;
    for (std::size_t index = 0; index < count; ++index) {
        Tick tick{};
        if (!(input >> tick.timestamp_ns >> tick.price >> tick.quantity)) {
            return 4;
        }
        stats.on_tick(tick);
    }

    std::cout << stats.tick_count << ' '
              << stats.volume << ' '
              << std::setprecision(24) << stats.turnover << ' ';
    print_optional(stats.open);
    std::cout << ' ';
    print_optional(stats.high);
    std::cout << ' ';
    print_optional(stats.low);
    std::cout << ' ';
    print_optional(stats.close);
    std::cout << ' ';
    print_optional(stats.vwap());
    std::cout << '\n';
}
`;

const orderBookDriver = String.raw`#include <cstdint>
#include <fstream>
#include <functional>
#include <iostream>
#include <map>

#define private public
#include "candidate.cpp"
#undef private

int main(int argc, char** argv) {
    if (argc != 2) {
        return 2;
    }
    std::ifstream input(argv[1]);
    std::size_t count = 0;
    if (!(input >> count)) {
        return 3;
    }

    OrderBook book;
    for (std::size_t index = 0; index < count; ++index) {
        unsigned side = 0;
        LevelUpdate update{};
        if (!(input >> update.sequence >> side
              >> update.price_ticks >> update.quantity)) {
            return 4;
        }
        update.side = side == 0 ? Side::bid : Side::ask;
        std::cout << (book.apply(update) ? 1 : 0) << ' ';
    }

    std::cout << book.last_sequence_ << ' ';
    std::cout << book.bids_.size() << ' ';
    for (const auto& [price, quantity] : book.bids_) {
        std::cout << price << ' ' << quantity << ' ';
    }
    std::cout << book.asks_.size() << ' ';
    for (const auto& [price, quantity] : book.asks_) {
        std::cout << price << ' ' << quantity << ' ';
    }
    std::cout << '\n';
}
`;

const pythonDriver = String.raw`import importlib.util
import json
import pathlib
import sys


def load_candidate():
    path = pathlib.Path(__file__).with_name("candidate.py")
    spec = importlib.util.spec_from_file_location("candidate", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load candidate module")
    module = importlib.util.module_from_spec(spec)
    sys.modules["candidate"] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    if len(sys.argv) != 2:
        return 2
    module = load_candidate()
    payload = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    events = [module.Event(**item) for item in payload]
    issues = []
    for issue in module.audit_sequences(iter(events)):
        issues.append(
            {
                "kind": issue.kind,
                "feed": issue.event.feed,
                "instrument": issue.event.instrument,
                "sequence": issue.event.sequence,
                "expected_sequence": issue.expected_sequence,
            }
        )
    print(json.dumps(issues, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

const cmakeHeader = String.raw`#pragma once

namespace feed {
int normalize_quantity(int quantity) noexcept;
}
`;

const cmakeSource = String.raw`#include "feed/decoder.hpp"

namespace feed {
int normalize_quantity(int quantity) noexcept {
    return quantity < 0 ? 0 : quantity;
}
}
`;

const cmakeSampleTest = String.raw`#include "feed/decoder.hpp"

#include <cassert>

int main() {
    assert(feed::normalize_quantity(12) == 12);
    assert(feed::normalize_quantity(-4) == 0);
}
`;

const cmakeHiddenTest = String.raw`#include "feed/decoder.hpp"

#include <cassert>
#include <type_traits>

int main() {
    static_assert(
        std::is_same_v<
            decltype(feed::normalize_quantity(1)),
            int
        >
    );
    assert(feed::normalize_quantity(0) == 0);
    assert(feed::normalize_quantity(7) == 7);
    assert(feed::normalize_quantity(-1) == 0);
}
`;

const specs = [
  makeIntervalSpec(),
  makeOrderBookSpec(),
] satisfies MockExecutionSpec[];

const specByQuestionId = new Map(
  specs.map((spec) => [spec.questionId, spec]),
);

export function mockExecutionSpecForQuestion(
  question: Pick<
    MockInterviewQuestion,
    "id" | "version" | "contentRevision" | "execution"
  >,
) {
  const spec = specByQuestionId.get(question.id);
  if (
    !spec ||
    !question.execution ||
    spec.questionVersion !== question.version ||
    spec.contentRevision !== question.contentRevision ||
    spec.revision !== question.execution.specRevision
  ) {
    return null;
  }
  return spec;
}

export function mockExecutionSpecByQuestionId(questionId: string) {
  const question = WORLDQUANT_ROLE_QUESTIONS.find(
    (item) => item.id === questionId,
  );
  return question ? mockExecutionSpecForQuestion(question) : null;
}

export function allMockExecutionSpecs() {
  return [...specs];
}

function makeIntervalSpec(): MockExecutionSpec {
  const question = requiredQuestion("worldquant-interval-stats-cpp");
  return {
    ...identity(question),
    language: "cpp",
    toolchain: TOOLCHAIN,
    createPlan(source: string, suite: ExecutionSuite) {
      const cases =
        suite === "sample"
          ? [
              intervalCase("Khoảng không có giao dịch", "0\n", [
                0,
                0,
                0,
                null,
                null,
                null,
                null,
                null,
              ]),
              intervalCase(
                "Chỉ số OHLC và VWAP",
                [
                  "3",
                  "1000000000 100.5 2",
                  "1000000001 99 3",
                  "1000000002 102 5",
                  "",
                ].join("\n"),
                [3, 10, 1008, 100.5, 102, 99, 102, 100.8],
              ),
            ]
          : [
              intervalCase(
                "mixed prices",
                [
                  "4",
                  "1 10.25 4",
                  "2 11.5 2",
                  "3 9.75 6",
                  "4 10 8",
                  "",
                ].join("\n"),
                [4, 20, 202.5, 10.25, 11.5, 9.75, 10, 10.125],
              ),
              intervalCase(
                "single tick",
                ["1", "42 7.125 16", ""].join("\n"),
                [1, 16, 114, 7.125, 7.125, 7.125, 7.125, 7.125],
              ),
            ];
      return {
        files: [
          { path: "work/candidate.cpp", content: source },
          { path: "work/driver.cpp", content: intervalDriver },
        ],
        build: [cppCompileCommand()],
        tests: cases,
      };
    },
  };
}

function makeOrderBookSpec(): MockExecutionSpec {
  const question = requiredQuestion("worldquant-order-book-update-cpp");
  return {
    ...identity(question),
    language: "cpp",
    toolchain: TOOLCHAIN,
    createPlan(source: string, suite: ExecutionSuite) {
      const cases =
        suite === "sample"
          ? [
              exactCase(
                "Thêm lệnh mua và lệnh bán",
                ["2", "1 0 100 10", "2 1 101 20", ""].join("\n"),
                "1 1 2 1 100 10 1 101 20",
              ),
              exactCase(
                "Số thứ tự trùng, bị đứt quãng và thao tác xóa",
                [
                  "4",
                  "1 0 100 10",
                  "1 0 100 99",
                  "3 1 101 20",
                  "2 0 100 0",
                  "",
                ].join("\n"),
                "1 0 0 1 2 0 0",
              ),
            ]
          : [
              exactCase(
                "ordered levels",
                [
                  "4",
                  "1 1 105 20",
                  "2 0 100 30",
                  "3 0 101 40",
                  "4 1 105 0",
                  "",
                ].join("\n"),
                "1 1 1 1 4 2 101 40 100 30 0",
              ),
              exactCase(
                "gap leaves state unchanged",
                [
                  "3",
                  "2 0 100 10",
                  "1 1 110 15",
                  "2 0 109 25",
                  "",
                ].join("\n"),
                "0 1 1 2 1 109 25 1 110 15",
              ),
            ];
      return {
        files: [
          { path: "work/candidate.cpp", content: source },
          { path: "work/driver.cpp", content: orderBookDriver },
        ],
        build: [cppCompileCommand()],
        tests: cases,
      };
    },
  };
}

function makePythonAuditSpec(): unknown {
  const question = requiredQuestion("worldquant-python-gap-audit");
  return {
    ...identity(question),
    language: "python",
    toolchain: TOOLCHAIN,
    createPlan(source: string, suite: ExecutionSuite) {
      const cases =
        suite === "sample"
          ? [
              pythonCase("Thứ tự riêng cho từng luồng", [
                event("A", "ES", 10),
                event("A", "ES", 11),
                event("B", "ES", 5),
                event("A", "ES", 11),
                event("A", "ES", 14),
                event("B", "ES", 7),
                event("A", "ES", 13),
              ], [
                issue("duplicate", "A", "ES", 11, 12),
                issue("gap", "A", "ES", 14, 12),
                issue("gap", "B", "ES", 7, 6),
                issue("out_of_order", "A", "ES", 13, 15),
              ]),
              pythonCase("Các mã giao dịch độc lập", [
                event("X", "AAPL", 1),
                event("X", "MSFT", 50),
                event("X", "AAPL", 2),
                event("X", "MSFT", 51),
              ], []),
            ]
          : [
              pythonCase("interleaved feeds", [
                event("X", "BTC", 100),
                event("Y", "BTC", 7),
                event("X", "BTC", 102),
                event("Y", "BTC", 6),
                event("X", "BTC", 102),
                event("X", "ETH", 1),
                event("X", "ETH", 3),
              ], [
                issue("gap", "X", "BTC", 102, 101),
                issue("out_of_order", "Y", "BTC", 6, 8),
                issue("duplicate", "X", "BTC", 102, 103),
                issue("gap", "X", "ETH", 3, 2),
              ]),
            ];
      return {
        files: [
          { path: "work/candidate.py", content: source },
          { path: "work/driver.py", content: pythonDriver },
        ],
        build: [
          {
            phase: "compile",
            cmd: "python3",
            args: ["-I", "-B", "-m", "py_compile", "candidate.py"],
            timeoutMs: 5_000,
            memoryBytes: RUNTIME_MEMORY,
          },
        ],
        tests: cases,
      };
    },
  };
}

function makeCmakeSpec(): unknown {
  const question = requiredQuestion("worldquant-cmake-delivery");
  return {
    ...identity(question),
    language: "cmake",
    toolchain: TOOLCHAIN,
    createPlan(source: string, suite: ExecutionSuite) {
      return {
        files: [
          { path: "work/CMakeLists.txt", content: source },
          {
            path: "work/include/feed/decoder.hpp",
            content: cmakeHeader,
          },
          { path: "work/src/feed_decoder.cpp", content: cmakeSource },
          {
            path: "work/tests/feed_decoder_test.cpp",
            content:
              suite === "sample" ? cmakeSampleTest : cmakeHiddenTest,
          },
        ],
        build: [
          {
            phase: "configure",
            cmd: "touch",
            args: [
              "-t",
              "200001010000",
              "CMakeLists.txt",
              "include/feed/decoder.hpp",
              "src/feed_decoder.cpp",
              "tests/feed_decoder_test.cpp",
            ],
            timeoutMs: 2_000,
            memoryBytes: RUNTIME_MEMORY,
          },
          {
            phase: "configure",
            cmd: "cmake",
            args: [
              "-S",
              ".",
              "-B",
              "build",
              "-G",
              "Ninja",
              "-DCMAKE_BUILD_TYPE=Release",
            ],
            timeoutMs: 10_000,
            memoryBytes: COMPILE_MEMORY,
          },
          {
            phase: "build",
            cmd: "cmake",
            args: [
              "--build",
              "build",
              "--target",
              "feed_decoder_tests",
              "--parallel",
              "1",
            ],
            timeoutMs: 15_000,
            memoryBytes: COMPILE_MEMORY,
          },
        ],
        tests: [
          {
            name: "Đăng ký bài kiểm thử với CTest",
            command: {
              phase: "test",
              cmd: "ctest",
              args: ["--test-dir", "build", "-N"],
              timeoutMs: 3_000,
              memoryBytes: RUNTIME_MEMORY,
            },
            validate({ exitCode, stdout }: { exitCode: number; stdout: string }) {
              const match = stdout.match(/Total Tests:\s*(\d+)/);
              const count = match ? Number(match[1]) : 0;
              return {
                passed: exitCode === 0 && count > 0,
                message:
                  exitCode === 0 && count > 0
                    ? undefined
                    : "CTest chưa tìm thấy bài kiểm thử đã đăng ký.",
              };
            },
          },
          {
            name: "Bài kiểm thử do máy chủ cung cấp",
            command: {
              phase: "test",
              cmd: "./build/feed_decoder_tests",
              args: [],
              timeoutMs: 5_000,
              memoryBytes: RUNTIME_MEMORY,
            },
            validate({ exitCode }: { exitCode: number }) {
              return {
                passed: exitCode === 0,
                message:
                  exitCode === 0
                    ? undefined
                    : "Chương trình feed_decoder_tests báo bài kiểm thử thất bại.",
              };
            },
          },
        ],
      };
    },
  };
}

// Legacy execution specifications are retained only to read historical attempts;
// the C++-only catalog never selects them for a new run.
void makePythonAuditSpec;
void makeCmakeSpec;

function cppCompileCommand(): SandboxPlanCommand {
  return {
    phase: "compile",
    cmd: "g++",
    args: [
      "-std=c++20",
      "-O2",
      "-Wall",
      "-Wextra",
      "-Wpedantic",
      "-Werror=return-type",
      "driver.cpp",
      "-o",
      "candidate_app",
    ],
    timeoutMs: 10_000,
    memoryBytes: COMPILE_MEMORY,
  };
}

function intervalCase(
  name: string,
  input: string,
  expected: Array<number | null>,
): SandboxTestCase {
  return {
    name,
    files: [{ path: "work/input.txt", content: input }],
    command: executableCommand(),
    validate({ exitCode, stdout }) {
      if (exitCode !== 0) {
        return { passed: false, message: "Chương trình thoát khác 0." };
      }
      const tokens = stdout.trim().split(/\s+/);
      if (tokens.length !== expected.length) {
        return {
          passed: false,
          message: "Đầu ra không đúng quy ước của chương trình kiểm thử.",
        };
      }
      const passed = expected.every((value, index) => {
        if (value === null) return tokens[index] === "null";
        const actual = Number(tokens[index]);
        return (
          Number.isFinite(actual) &&
          Math.abs(actual - value) <=
            1e-9 * Math.max(1, Math.abs(value))
        );
      });
      return {
        passed,
        message: passed ? undefined : "Giá trị thống kê chưa khớp.",
      };
    },
  };
}

function exactCase(
  name: string,
  input: string,
  expected: string,
): SandboxTestCase {
  return {
    name,
    files: [{ path: "work/input.txt", content: input }],
    command: executableCommand(),
    validate({ exitCode, stdout }) {
      const passed =
        exitCode === 0 &&
        normalizeWhitespace(stdout) === normalizeWhitespace(expected);
      return {
        passed,
        message: passed
          ? undefined
          : exitCode === 0
            ? "Trạng thái cuối hoặc kết quả từ apply chưa đúng."
            : "Chương trình thoát khác 0.",
      };
    },
  };
}

function executableCommand(): SandboxPlanCommand {
  return {
    phase: "test",
    cmd: "./candidate_app",
    args: ["input.txt"],
    timeoutMs: 2_000,
    memoryBytes: RUNTIME_MEMORY,
  };
}

function pythonCase(
  name: string,
  input: unknown[],
  expected: unknown[],
): SandboxTestCase {
  return {
    name,
    files: [
      {
        path: "work/input.json",
        content: JSON.stringify(input),
      },
    ],
    command: {
      phase: "test",
      cmd: "python3",
      args: ["-I", "-B", "driver.py", "input.json"],
      timeoutMs: 2_000,
      memoryBytes: RUNTIME_MEMORY,
    },
    validate({ exitCode, stdout }) {
      if (exitCode !== 0) {
        return {
          passed: false,
          message: "Tiến trình Python kết thúc với mã lỗi.",
        };
      }
      try {
        const actual = JSON.parse(stdout);
        const passed = jsonValuesEqual(actual, expected);
        return {
          passed,
          message: passed
            ? undefined
            : "Danh sách lỗi hoặc số thứ tự mong đợi chưa đúng.",
        };
      } catch {
        return {
          passed: false,
          message: "Đầu ra từ chương trình kiểm thử không phải JSON hợp lệ.",
        };
      }
    },
  };
}

function event(feed: string, instrument: string, sequence: number) {
  return { feed, instrument, sequence };
}

function issue(
  kind: "duplicate" | "gap" | "out_of_order",
  feed: string,
  instrument: string,
  sequence: number,
  expectedSequence: number,
) {
  return {
    kind,
    feed,
    instrument,
    sequence,
    expected_sequence: expectedSequence,
  };
}

function identity(question: MockInterviewQuestion) {
  if (!question.execution) {
    throw new Error(`Question ${question.id} is missing public execution metadata`);
  }
  return {
    questionId: question.id,
    questionVersion: question.version,
    contentRevision: question.contentRevision,
    revision: question.execution.specRevision,
  };
}

function requiredQuestion(questionId: string) {
  const question = WORLDQUANT_ROLE_QUESTIONS.find(
    (item) => item.id === questionId,
  );
  if (!question) throw new Error(`Unknown mock question: ${questionId}`);
  return question;
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    return Object.is(left, right);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) =>
        jsonValuesEqual(value, right[index]),
      )
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        jsonValuesEqual(leftRecord[key], rightRecord[key]),
    )
  );
}
