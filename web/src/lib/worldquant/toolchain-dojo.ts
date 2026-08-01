export const TOOLCHAIN_DOJO_VERSION = 1 as const;

export type ToolchainCheck = {
  id: string;
  prompt: string;
  options: readonly { id: string; label: string }[];
  expectedOptionId: string;
  explanation: string;
};

export type ToolchainProject = {
  id: string;
  version: typeof TOOLCHAIN_DOJO_VERSION;
  title: string;
  summary: string;
  checks: readonly ToolchainCheck[];
};

export type ToolchainGrade = {
  passed: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    message: string;
  }>;
};

export const toolchainProjects: readonly ToolchainProject[] = [
  project("toolchain-target-scope", "Target, standard và warning", "Dựng một thư viện decoder C++20 mà không làm bẩn target khác.", [
    check("standard", "Đặt yêu cầu C++20 ở đâu?", [
      ["target", "target_compile_features(feed_decoder PUBLIC cxx_std_20)"],
      ["global", "set(CMAKE_CXX_STANDARD 20) cho toàn bộ dự án"],
      ["flags", "set(CMAKE_CXX_FLAGS \"-std=c++20 -Wall\")"],
    ], "target", "Yêu cầu ngôn ngữ là thuộc tính của target; consumer nhận đúng yêu cầu qua target graph."),
    check("warnings", "Warning nghiêm khắc nên được gắn thế nào?", [
      ["private", "target_compile_options(feed_decoder PRIVATE -Wall -Wextra -Wpedantic)"],
      ["public", "target_compile_options(feed_decoder PUBLIC -Wall -Wextra)"],
      ["directory", "add_compile_options(-Wall -Wextra -Wpedantic)"],
    ], "private", "Warning của implementation không phải một yêu cầu sử dụng của consumer."),
  ]),
  project("toolchain-public-private", "PUBLIC, PRIVATE và INTERFACE", "Giữ include path và dependency đúng phạm vi khi tách feed library khỏi ứng dụng replay.", [
    check("headers", "Header công khai nằm ở include/feed. Khai báo include directory nào đúng?", [
      ["public-build-install", "PUBLIC $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include> $<INSTALL_INTERFACE:include>"],
      ["private-only", "PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include"],
      ["global", "include_directories(include)"],
    ], "public-build-install", "Header xuất hiện trong API phải truyền được cho consumer ở cả build tree và install tree."),
    check("dependency", "feed_decoder dùng fmt chỉ trong .cpp, header không lộ fmt. Link scope?", [
      ["private", "target_link_libraries(feed_decoder PRIVATE fmt::fmt)"],
      ["public", "target_link_libraries(feed_decoder PUBLIC fmt::fmt)"],
      ["link-directories", "link_directories(/opt/fmt/lib)"],
    ], "private", "Dependency implementation không nên bị ép lên consumer nếu API không cần nó."),
  ]),
  project("toolchain-ctest", "CTest là một gate thật", "Bảo đảm CI thất bại nếu test không được đăng ký hoặc nếu không có test nào chạy.", [
    check("registration", "Cách đúng để bật và đăng ký kiểm thử?", [
      ["ctest", "include(CTest) rồi add_test(NAME feed_decoder_tests COMMAND feed_decoder_tests)"],
      ["binary", "Chỉ add_executable(feed_decoder_tests ...)"],
      ["custom", "add_custom_target(test COMMAND feed_decoder_tests)"],
    ], "ctest", "Một executable không tự trở thành CTest. add_test tạo contract cho ctest và CI."),
    check("zero-tests", "CI nên làm gì khi ctest báo 0 tests?", [
      ["fail", "Fail job: đó là lỗi wiring, không phải build xanh"],
      ["pass", "Pass vì compile đã thành công"],
      ["skip", "Bỏ qua trên Release"],
    ], "fail", "Không có test được chạy không phải bằng chứng về correctness."),
  ]),
  project("toolchain-sanitizers", "Sanitizer theo cấu hình", "Bật ASan/UBSan cho Debug mà không làm release binary hoặc dependency bị áp cờ toàn cục.", [
    check("scope", "Cờ sanitizer cần đi qua cả compile và link như thế nào?", [
      ["target-debug", "target_compile_options/apply link options trên target với generator expression Debug"],
      ["global", "set(CMAKE_CXX_FLAGS \"${CMAKE_CXX_FLAGS} -fsanitize=address\")"],
      ["release", "Chỉ thêm vào target Release để đo nhanh"],
    ], "target-debug", "Sanitizer là capability của executable/test target và thường chỉ bật ở cấu hình kiểm tra."),
    check("coverage", "Test nào nên chạy với sanitizer trước?", [
      ["decoder-tests", "Các test decoder/replay có dữ liệu biên và lỗi feed"],
      ["none", "Không cần test vì compiler đã thêm instrumentation"],
      ["headers", "Chỉ compile public headers"],
    ], "decoder-tests", "Instrumentation chỉ hữu ích khi code thực sự chạy qua đường dữ liệu rủi ro."),
  ]),
  project("toolchain-ci-matrix", "Ma trận compiler và cấu hình", "Phát hiện assumption vô tình chỉ đúng với một compiler hoặc một cấu hình build.", [
    check("matrix", "Ma trận tối thiểu có tín hiệu tốt cho thư viện C++?", [
      ["four", "GCC và Clang, mỗi compiler chạy Debug và Release"],
      ["one", "Một compiler Debug là đủ"],
      ["release-only", "Chỉ GCC Release để nhanh"],
    ], "four", "Hai compiler và hai cấu hình bắt được nhiều warning, UB và macro/configuration drift hơn."),
    check("order", "Trong mỗi job CI, thứ tự nào đúng?", [
      ["configure-build-test", "configure → build → ctest --output-on-failure"],
      ["test-build", "ctest trước rồi mới build"],
      ["compile-only", "configure → build, không cần test"],
    ], "configure-build-test", "CTest chạy artifact đã được build từ đúng build directory."),
  ]),
];

export function gradeToolchainProject(
  projectId: string,
  selections: Readonly<Record<string, string>>,
): ToolchainGrade {
  const activity = toolchainProjects.find((item) => item.id === projectId);
  if (!activity) throw new Error(`Unknown toolchain project ${projectId}`);
  const checks = activity.checks.map((item) => ({
    id: item.id,
    label: item.prompt,
    passed: selections[item.id] === item.expectedOptionId,
    message: item.explanation,
  }));
  return { passed: checks.every((item) => item.passed), checks };
}

function project(
  id: string,
  title: string,
  summary: string,
  checks: readonly ToolchainCheck[],
): ToolchainProject {
  return { id, version: TOOLCHAIN_DOJO_VERSION, title, summary, checks };
}

function check(
  id: string,
  prompt: string,
  options: readonly [string, string][],
  expectedOptionId: string,
  explanation: string,
): ToolchainCheck {
  return {
    id,
    prompt,
    options: options.map(([optionId, label]) => ({ id: optionId, label })),
    expectedOptionId,
    explanation,
  };
}
