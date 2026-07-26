import type { Metadata } from "next";
import Link from "next/link";

import {
  CMAKE_GUIDE_CHAPTERS,
  CMAKE_GUIDE_SOURCES,
  CMAKE_WORLDQUANT_OUTCOMES,
} from "@/lib/learn/cmake-guide";

export const metadata: Metadata = {
  title: "CMake cho Modern C++ — Recall",
  description:
    "Guide CMake chi tiết từ target graph, usage requirements và code generation tới CTest, packaging, CI và migration legacy cho vai trò WorldQuant.",
};

const codeClass =
  "overflow-x-auto rounded-2xl border border-white/10 bg-[#0b241d] p-5 font-mono text-[13px] leading-7 text-[#dcebe3] shadow-[0_18px_50px_rgba(11,36,29,0.16)]";

export default function CMakeLearningGuide() {
  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <GuideHeader />

        <section className="relative mt-7 min-w-0 overflow-hidden rounded-[2.25rem] border border-[#173f35]/15 bg-[#173f35] px-6 py-8 text-white shadow-[0_24px_90px_rgba(23,63,53,0.16)] sm:px-10 sm:py-11 lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] lg:gap-12">
          <div className="relative z-10 min-w-0">
            <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d7ff91] uppercase">
              Build systems for production C++
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              CMake cho
              <span className="block sm:inline"> Modern C++.</span>
              <span className="block text-[#d7ff91]">
                Từ target graph đến production.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Không học CMake như một danh sách command. Mày sẽ dùng một project
              tick-data xuyên suốt để hiểu dependency graph, incremental build,
              test, install, CI và cách nâng legacy platform mà vẫn giữ đường
              rollback.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase">
              <HeroChip>2–3 giờ</HeroChip>
              <HeroChip>16 chương</HeroChip>
              <HeroChip>Baseline CMake 3.25</HeroChip>
              <HeroChip>WorldQuant-focused</HeroChip>
            </div>

            <div className="mt-8 flex min-w-0 flex-wrap gap-3">
              <a
                href="#configure-generate-build"
                className="w-full rounded-2xl bg-[#d7ff91] px-5 py-3 text-center text-sm font-bold text-[#173f35] transition hover:bg-white sm:w-auto"
              >
                Bắt đầu từ mental model ↓
              </a>
              <Link
                href="/mock-interview"
                className="w-full rounded-2xl border border-white/20 bg-white/8 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/14 sm:w-auto"
              >
                Làm mock WorldQuant
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-10 min-w-0 max-w-full lg:mt-3">
            <TargetGraphPreview />
          </div>

          <div
            aria-hidden="true"
            className="absolute -right-24 -bottom-32 size-96 rounded-full bg-[#d7ff91]/10 blur-3xl"
          />
        </section>

        <section className="mt-5 rounded-3xl border border-[#ba4b2f]/20 bg-[#fff4df] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#ba4b2f] font-mono text-sm font-bold text-white">
              !
            </span>
            <div>
              <h2 className="font-bold text-[#8e3825]">
                Baseline thực hành là 3.25, manual chính thức có thể mới hơn
              </h2>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-[#71574a]">
                Mọi ví dụ chính trong bài chạy với CMake 3.25. C++ modules cần
                3.28+, target <InlineCode>codegen</InlineCode> cần 3.31, còn
                instrumentation/compile tracing 4.x chỉ là phần mở rộng. Luôn
                đọc nhãn “Added in version” trước khi đưa feature mới vào
                platform cũ.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#173f35]/12 bg-white/55 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
                JD → learning outcomes
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Học để vận hành platform, không chỉ để configure được.
              </h2>
            </div>
            <span className="rounded-full bg-[#e8efe2] px-3 py-1.5 font-mono text-[10px] font-bold text-[#356b58] uppercase">
              6 signals phỏng vấn
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CMAKE_WORLDQUANT_OUTCOMES.map((item, index) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf5] p-4"
              >
                <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64736c]">
                  {item.outcome}
                </p>
              </div>
            ))}
          </div>
        </section>

        <MobileTableOfContents />

        <div className="mt-10 grid items-start gap-10 xl:grid-cols-[270px_minmax(0,1fr)]">
          <GuideSidebar />

          <article className="min-w-0 max-w-[980px]">
            <GuideSection
              id="configure-generate-build"
              number="01"
              eyebrow="First principles"
              title="CMake không phải compiler"
              lead="CMake đọc model của project rồi sinh buildsystem cho Ninja, Make hoặc IDE. Tách đúng các phase là bước đầu để debug có căn cứ."
            >
              <p>
                Hãy giữ mental model này: <Term>configure</Term> phát hiện
                toolchain, đọc <InlineCode>CMakeLists.txt</InlineCode> và tạo
                cache; <Term>generate</Term> viết native build files;{" "}
                <Term>build</Term> mới gọi compiler/linker; sau đó{" "}
                <Term>CTest</Term> chạy test và <Term>install</Term> tạo layout
                cho consumer.
              </p>

              <Flow
                items={[
                  ["1", "Configure", "CMake code + toolchain → cache"],
                  ["2", "Generate", "Target graph → Ninja/VS files"],
                  ["3", "Build", "Compiler + linker tạo artifacts"],
                  ["4", "Test", "CTest chạy executable đã build"],
                  ["5", "Install", "Copy/export public product"],
                ]}
              />

              <CodeBlock label="Một workflow không phụ thuộc working directory">
                {`cmake -S . -B build/dev -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build/dev --parallel
ctest --test-dir build/dev --output-on-failure --no-tests=error
cmake --install build/dev --prefix stage/dev`}
              </CodeBlock>

              <h3>Ba tree, ba trách nhiệm</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <CompareCard
                  label="Source tree"
                  title="Input được Git quản lý"
                  bullets={[
                    "CMakeLists.txt, .cmake",
                    "C++ source/header",
                    "Schema, fixtures, scripts",
                  ]}
                />
                <CompareCard
                  label="Build tree"
                  title="Disposable output"
                  bullets={[
                    "CMakeCache.txt",
                    "Generated source",
                    "Object, library, executable",
                  ]}
                />
                <CompareCard
                  label="Install tree"
                  title="Public product"
                  bullets={[
                    "bin/lib/include",
                    "Package config",
                    "Không phụ thuộc source tree",
                  ]}
                />
              </div>

              <Callout tone="red" title="Anti-pattern: in-source build">
                Build trong source tree trộn cache, generated files và artifacts
                vào Git input. Dùng <InlineCode>-S</InlineCode> và{" "}
                <InlineCode>-B</InlineCode>; mỗi generator/toolchain/config
                family có build directory riêng.
              </Callout>

              <Lab>
                Tạo <InlineCode>build/gcc-debug</InlineCode>, configure bằng
                Ninja, build, chạy CTest và install vào{" "}
                <InlineCode>stage/gcc-debug</InlineCode>. Sau đó xóa toàn bộ
                build tree và chứng minh source tree không thay đổi.
              </Lab>

              <Checkpoint
                question="Đổi compiler trong CMakeCache.txt rồi build tiếp có an toàn không?"
                answer="Không. Compiler được chọn trong lần configure đầu và ảnh hưởng ABI, feature detection, try_compile, flags và dependency discovery. Tạo build tree mới hoặc dùng preset/toolchain có binaryDir riêng."
              />
            </GuideSection>

            <GuideSection
              id="language-cache-scope"
              number="02"
              eyebrow="CMake language"
              title="Variable không phải target property"
              lead="CMake là một language có list, quoting, scope và cache riêng. Nhiều legacy bug bắt đầu từ việc dùng cache như global mutable state."
            >
              <p>
                Normal variable sống theo directory/function scope. Cache entry
                là user-facing configuration được giữ qua các lần configure.
                Environment variable thuộc process. Còn requirement của C++
                target phải nằm trên <strong>target property</strong>, không nên
                được truyền bằng một chuỗi biến global.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Loại state</th>
                      <th scope="col" className="px-4 py-3">Lifetime/scope</th>
                      <th scope="col" className="px-4 py-3">Dùng cho</th>
                      <th scope="col" className="px-4 py-3">Không dùng cho</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Normal variable",
                        "Directory / function",
                        "Logic configure cục bộ",
                        "Public compile contract",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Cache variable",
                        "Build tree",
                        "User option/path",
                        "Ép user bằng FORCE",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Environment",
                        "CMake process",
                        "Toolchain/CI input",
                        "Dependency graph ẩn",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Target property",
                        "Target graph",
                        "Include/feature/link requirement",
                        "Toggle toàn project",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Option và function có scope rõ">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_BUILD_TESTING "Build TickPlatform tests" ON)
set(TICK_SCHEMA_DIR
    "\${PROJECT_SOURCE_DIR}/schemas"
    CACHE PATH "Directory containing feed schemas")

function(tick_enable_strict_warnings target)
  if(MSVC)
    target_compile_options("\${target}" PRIVATE /W4)
  elseif(CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
    target_compile_options("\${target}" PRIVATE
      -Wall -Wextra -Wpedantic
    )
  endif()
endfunction()`}
              </CodeBlock>

              <h3>List và quoting là nguồn bug âm thầm</h3>
              <p>
                CMake list là chuỗi phân cách bằng dấu chấm phẩy. Unquoted
                expansion có thể biến một argument thành nhiều argument. Với
                path hoặc generator expression có list, quote toàn expression
                hoặc dùng API target-aware thay vì tự nối command string.
              </p>

              <Callout tone="amber" title="Cache là API của user">
                Đừng <InlineCode>set(... CACHE ... FORCE)</InlineCode> chỉ để CI
                “chắc chắn đúng”; nó ghi đè lựa chọn của developer. Default nằm
                trong project/preset, override thuộc command line hoặc user
                preset.
              </Callout>

              <p>
                <InlineCode>cmake_minimum_required</InlineCode> đồng thời đặt
                policy version. Policy là cơ chế migrate behavior, không phải
                feature toggle. Gần như không bao giờ giải quyết warning bằng
                cách set hàng loạt policy về <InlineCode>OLD</InlineCode>.
              </p>

              <Lab>
                Viết option bật feed equities và cache path tới schema. In giá
                trị trong configure, override bằng <InlineCode>-D</InlineCode>,
                rồi giải thích state nào còn lại khi chạy configure lần hai.
              </Lab>

              <Checkpoint
                question="Function và macro khác nhau ở điểm nguy hiểm nào?"
                answer="Function tạo variable scope mới và truyền argument như value thông thường; macro thay thế gần giống textual invocation, không có scope riêng nên dễ sửa variable của caller. Ưu tiên function trừ khi thực sự cần semantics của macro."
              />
            </GuideSection>

            <GuideSection
              id="targets-graph"
              number="03"
              eyebrow="Core design unit"
              title="Target graph mới là kiến trúc build"
              lead="File chỉ là input. Target mới sở hữu source, requirements, output và dependency edge."
            >
              <p>
                Một platform tick-data nên được nhìn như graph: adapter feed phụ
                thuộc protocol model, decoder phụ thuộc generated schema, order
                book phụ thuộc event model, executable phụ thuộc các library.
                Edge phải được biểu diễn bằng{" "}
                <InlineCode>target_link_libraries</InlineCode>, không bằng include
                path hoặc link directory toàn cục.
              </p>

              <CodeBlock label="Target graph tối thiểu">
                {`add_library(tick_model INTERFACE)
add_library(Tick::model ALIAS tick_model)
set_target_properties(tick_model PROPERTIES EXPORT_NAME model)
target_sources(tick_model INTERFACE
  FILE_SET api TYPE HEADERS
  BASE_DIRS include
  FILES include/tick/event.hpp
)
target_compile_features(tick_model INTERFACE cxx_std_20)

add_library(feed_decoder STATIC
  src/feed_decoder.cpp
)
add_library(Tick::feed_decoder ALIAS feed_decoder)
target_link_libraries(feed_decoder PUBLIC tick_model)

add_library(order_book STATIC src/order_book.cpp)
target_link_libraries(order_book PUBLIC tick_model)

add_executable(tick_replay tools/tick_replay.cpp)
target_link_libraries(tick_replay
  PRIVATE Tick::feed_decoder order_book
)`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="Build targets"
                  title="Tạo artifact hoặc object"
                  bullets={[
                    "EXECUTABLE",
                    "STATIC / SHARED / MODULE",
                    "OBJECT library",
                  ]}
                />
                <CompareCard
                  label="Graph targets"
                  title="Mô tả contract/đồ có sẵn"
                  bullets={[
                    "INTERFACE library",
                    "IMPORTED target",
                    "ALIAS namespace",
                  ]}
                />
              </div>

              <Callout tone="green" title="Tên có namespace bắt typo sớm">
                Alias <InlineCode>Tick::feed_decoder</InlineCode> khiến CMake báo
                lỗi ngay nếu consumer link nhầm target. Raw string không có{" "}
                <InlineCode>::</InlineCode> có thể bị hiểu như tên library cho
                linker và chỉ fail rất muộn.
              </Callout>

              <h3>Chọn loại library theo product semantics</h3>
              <p>
                <InlineCode>INTERFACE</InlineCode> dành cho header-only contract;
                <InlineCode>OBJECT</InlineCode> tái dùng object nhưng không phải
                package boundary; <InlineCode>MODULE</InlineCode> hợp với plugin
                không link trực tiếp; <InlineCode>STATIC</InlineCode> và{" "}
                <InlineCode>SHARED</InlineCode> cần quyết định ABI/deployment rõ.
                Không để <InlineCode>BUILD_SHARED_LIBS</InlineCode> vô tình đổi
                product type nếu platform yêu cầu cụ thể.
              </p>

              <Lab>
                Vẽ graph cho <InlineCode>feed_codec</InlineCode>,{" "}
                <InlineCode>order_book</InlineCode>,{" "}
                <InlineCode>interval_features</InlineCode> và{" "}
                <InlineCode>tick_replay</InlineCode>. Mỗi edge phải trả lời được:
                compile requirement nào đi qua edge này?
              </Lab>

              <Checkpoint
                question="Khi nào dùng IMPORTED target thay vì link một absolute .so/.lib?"
                answer="Khi binary/dependency được build hoặc cung cấp ngoài project. Imported target có thể mang location theo config, include dirs, transitive dependencies và platform metadata; raw path chỉ cho linker một file và làm mất contract."
              />
            </GuideSection>

            <GuideSection
              id="usage-requirements"
              number="04"
              eyebrow="Transitive contracts"
              title="PUBLIC, PRIVATE, INTERFACE phải đọc từ consumer"
              lead="Scope không mô tả mức độ quan trọng. Nó mô tả requirement dùng để build target hiện tại, consumer, hay cả hai."
            >
              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Scope</th>
                      <th scope="col" className="px-4 py-3">Build target</th>
                      <th scope="col" className="px-4 py-3">Build consumer</th>
                      <th scope="col" className="px-4 py-3">Câu hỏi quyết định</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "PRIVATE",
                        "✓",
                        "Không nhận usage req.*",
                        "Chỉ .cpp implementation cần?",
                      ]}
                    />
                    <TableRow
                      values={[
                        "PUBLIC",
                        "✓",
                        "✓",
                        "Target và public header cùng cần?",
                      ]}
                    />
                    <TableRow
                      values={[
                        "INTERFACE",
                        "—",
                        "✓",
                        "Header-only/consumer contract?",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Usage requirements không rò implementation">
                {`add_library(feed_decoder src/feed_decoder.cpp)

target_sources(feed_decoder
  PUBLIC
    FILE_SET api TYPE HEADERS
    BASE_DIRS include
    FILES include/feed/decoder.hpp
)

target_compile_features(feed_decoder PUBLIC cxx_std_20)

target_include_directories(feed_decoder PUBLIC
  "$<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>"
  "$<INSTALL_INTERFACE:include>"
)

find_package(Threads REQUIRED)
target_link_libraries(feed_decoder
  PUBLIC tick_model
  PRIVATE Threads::Threads
)`}
              </CodeBlock>

              <h3>Đọc public header để chọn scope</h3>
              <p>
                Nếu <InlineCode>decoder.hpp</InlineCode> nhắc type của{" "}
                <InlineCode>tick_model</InlineCode>, consumer cần model để compile:
                edge đó là <InlineCode>PUBLIC</InlineCode>. Nếu thread chỉ nằm
                trong <InlineCode>decoder.cpp</InlineCode>, nó là{" "}
                <InlineCode>PRIVATE</InlineCode>. Nếu target chỉ gom header,
                requirement thường là <InlineCode>INTERFACE</InlineCode>.
              </p>

              <p>
                Dấu <strong>*</strong>: <InlineCode>PRIVATE</InlineCode> không
                truyền usage requirements để compile consumer. Nhưng static
                library chưa link dependency thành binary hoàn chỉnh; khi export,
                CMake có thể giữ dependency implementation dưới{" "}
                <InlineCode>$&lt;LINK_ONLY:...&gt;</InlineCode> để executable cuối
                resolve symbol. Vì vậy package config vẫn có thể phải{" "}
                <InlineCode>find_dependency(Threads)</InlineCode>.
              </p>

              <Callout tone="red" title="Global commands phá ownership">
                <InlineCode>include_directories</InlineCode>,{" "}
                <InlineCode>add_definitions</InlineCode>,{" "}
                <InlineCode>link_directories</InlineCode> và sửa{" "}
                <InlineCode>CMAKE_CXX_FLAGS</InlineCode> làm target không còn tự
                mô tả. Chúng cũng khiến test “tình cờ” compile vì thừa include/
                define từ sibling directory.
              </Callout>

              <Lab>
                Với một public header dùng <InlineCode>std::span</InlineCode> và
                type <InlineCode>SchemaView</InlineCode> từ target khác, khai báo
                compile feature và link scope đúng. Sau đó tạo consumer nhỏ chỉ
                include public header để kiểm chứng.
              </Lab>

              <Checkpoint
                question="Warning flags có nên PUBLIC vì mọi code phải sạch không?"
                answer="Thường không. Warning policy là policy build của target/project, không phải requirement để consumer compile đúng. Propagate warning (đặc biệt -Werror) có thể phá downstream và third-party; link một interface warnings target vào từng first-party target bằng PRIVATE."
              />
            </GuideSection>

            <GuideSection
              id="project-architecture"
              number="05"
              eyebrow="Scale the graph"
              title="Mỗi directory tạo target, không sửa target hàng xóm"
              lead="Project lớn dễ hiểu khi root chọn feature và ghép subdirectory, còn leaf directory sở hữu source/requirements của chính nó."
            >
              <FileTree
                lines={[
                  "TickPlatform/",
                  "├── CMakeLists.txt",
                  "├── cmake/TickWarnings.cmake",
                  "├── model/{include,src,CMakeLists.txt}",
                  "├── codecs/{equities,futures}/CMakeLists.txt",
                  "├── book/{include,src,CMakeLists.txt}",
                  "├── features/{include,src,CMakeLists.txt}",
                  "├── tools/replay/CMakeLists.txt",
                  "└── tests/{unit,golden,integration}/CMakeLists.txt",
                ]}
              />

              <CodeBlock label="Root orchestration nhỏ">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_BUILD_TOOLS "Build replay and diagnostics tools" ON)

add_subdirectory(model)
add_subdirectory(codecs)
add_subdirectory(book)
add_subdirectory(features)

if(TICK_BUILD_TOOLS)
  add_subdirectory(tools)
endif()

if(PROJECT_IS_TOP_LEVEL)
  include(CTest)
  if(BUILD_TESTING)
    add_subdirectory(tests)
  endif()
endif()`}
              </CodeBlock>

              <CodeBlock label="Leaf target sở hữu public API">
                {`add_library(order_book)
add_library(Tick::order_book ALIAS order_book)

target_sources(order_book
  PRIVATE src/order_book.cpp
  PUBLIC
    FILE_SET api TYPE HEADERS
    BASE_DIRS include
    FILES include/tick/order_book.hpp
)

target_link_libraries(order_book PUBLIC Tick::model)
target_compile_features(order_book PUBLIC cxx_std_20)`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="Explicit input"
                  title="Liệt kê source có review"
                  body="file(GLOB) làm source membership ẩn; CONFIGURE_DEPENDS cải thiện reconfigure nhưng vẫn phụ thuộc generator và khó review."
                />
                <SmallRule
                  label="Top-level friendly"
                  title="Library dùng được khi embedded"
                  body="Chỉ bật test/tool/install mặc định khi PROJECT_IS_TOP_LEVEL; đừng áp option của root lên parent consumer."
                />
                <SmallRule
                  label="Public headers"
                  title="FILE_SET giữ ownership"
                  body="Header file set (3.23+) kết nối IDE, install và export với cùng một danh sách API."
                />
                <SmallRule
                  label="Direction"
                  title="Dependency đi một chiều"
                  body="Leaf không gọi target_* lên target tạo ở directory xa; tạo API helper function nếu policy cần tái dùng."
                />
              </div>

              <Lab>
                Tách một CMakeLists legacy 200 dòng thành root orchestration và
                bốn leaf targets. Không đổi artifact name hoặc behavior ở bước
                đầu; chỉ làm ownership hiện rõ.
              </Lab>

              <Checkpoint
                question="Vì sao add_subdirectory không đồng nghĩa target phải thấy mọi include của parent?"
                answer="Directory scope có thể kế thừa một số variable/property legacy, nhưng target usage requirements chỉ truyền qua dependency edges. Modern design cố tình không dựa vào ambient directory state để target có thể build/consume độc lập."
              />
            </GuideSection>

            <GuideSection
              id="generators-configurations"
              number="06"
              eyebrow="Native build systems"
              title="Debug/Release không có một model duy nhất"
              lead="Ninja/Unix Makefiles thường single-config; Visual Studio, Xcode và Ninja Multi-Config chọn config ở lúc build."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="Single-config"
                  title="Config chọn lúc configure"
                  bullets={[
                    "-DCMAKE_BUILD_TYPE=Debug",
                    "Một build tree cho một config",
                    "Ninja / Unix Makefiles phổ biến",
                  ]}
                />
                <CompareCard
                  label="Multi-config"
                  title="Config chọn lúc build"
                  bullets={[
                    "cmake --build ... --config Release",
                    "Một tree chứa nhiều config",
                    "Visual Studio / Xcode / Ninja Multi-Config",
                  ]}
                />
              </div>

              <CodeBlock label="Hai workflow tương đương">
                {`# Ninja, single-config
cmake -S . -B build/ninja-debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug
cmake --build build/ninja-debug

# Visual Studio, multi-config
cmake -S . -B build/vs -G "Visual Studio 17 2022" -A x64
cmake --build build/vs --config Debug
ctest --test-dir build/vs -C Debug --output-on-failure`}
              </CodeBlock>

              <Callout tone="red" title="Build type rỗng không phải Debug">
                Với single-config, nếu user không đặt{" "}
                <InlineCode>CMAKE_BUILD_TYPE</InlineCode>, nó thường rỗng. Đừng
                giả định rỗng là Debug. Với multi-config, kiểm tra biến này để
                điều khiển flags gần như luôn sai.
              </Callout>

              <p>
                Generator và compiler là identity của build tree. Đừng tái dùng
                cùng directory cho GCC, Clang, MSVC hoặc toolchain khác.{" "}
                <InlineCode>CMAKE_EXPORT_COMPILE_COMMANDS</InlineCode> hữu ích
                cho clangd/analysis với Make/Ninja, nhưng không phải contract
                portable cho mọi generator.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Câu hỏi</th>
                      <th scope="col" className="px-4 py-3">Single-config</th>
                      <th scope="col" className="px-4 py-3">Multi-config</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Chọn config",
                        "Configure -D...",
                        "Build/test --config/-C",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Output config",
                        "Một config/tree",
                        "Debug, Release... cùng tree",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Điều kiện portable",
                        "$<CONFIG:...>",
                        "$<CONFIG:...>",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <Lab>
                Chạy cùng project bằng Ninja Debug và Visual Studio Release.
                Ghi lại compiler command, artifact path và command CTest; không
                sửa CMakeLists giữa hai build.
              </Lab>

              <Checkpoint
                question="Tại sao if(CMAKE_BUILD_TYPE STREQUAL Debug) làm MSVC bị thiếu flag?"
                answer="Visual Studio là multi-config; CMAKE_BUILD_TYPE không chọn config hiện tại. Config chỉ biết ở generate/build time, nên dùng generator expression $<CONFIG:Debug> hoặc config-specific target property."
              />
            </GuideSection>

            <GuideSection
              id="generator-expressions"
              number="07"
              eyebrow="Generate-time logic"
              title="Generator expression không chạy lúc configure"
              lead="Biểu thức $&lt;...&gt; được giữ lại để CMake evaluate theo target, compiler và config khi sinh native buildsystem."
            >
              <p>
                Dùng <InlineCode>if()</InlineCode> khi quyết định graph ở
                configure time. Dùng generator expression khi một target cần
                value khác nhau theo config/compiler hoặc khi public interface
                khác giữa build tree và install tree.
              </p>

              <CodeBlock label="Frontend lúc configure, config lúc generate">
                {`if(MSVC) # gồm cả compiler dùng command-line frontend kiểu cl
  target_compile_options(feed_decoder PRIVATE /W4 /permissive-)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
  target_compile_options(feed_decoder PRIVATE
    -Wall -Wextra -Wpedantic
  )
endif()

target_compile_definitions(feed_decoder PRIVATE
  "$<$<CONFIG:Debug>:TICK_EXPENSIVE_ASSERTS=1>"
)

add_custom_command(
  TARGET tick_replay POST_BUILD
  COMMAND \${CMAKE_COMMAND} -E echo
          "built $<TARGET_FILE:tick_replay>"
  VERBATIM
)`}
              </CodeBlock>

              <p>
                Chọn syntax flag theo compiler <em>frontend</em>, không chỉ vendor:
                <InlineCode>clang-cl</InlineCode> có ID Clang nhưng dùng command
                line kiểu MSVC; biến <InlineCode>MSVC</InlineCode> của CMake bao
                phủ trường hợp đó. AppleClang cũng cần nằm trong nhánh GNU-like.
              </p>

              <CodeBlock label="Một API, hai location">
                {`target_include_directories(feed_decoder PUBLIC
  "$<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>"
  "$<INSTALL_INTERFACE:include>"
)`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="$<CONFIG:...>"
                  title="Portable qua generator"
                  body="Không phụ thuộc CMAKE_BUILD_TYPE; hoạt động khi một project sinh nhiều config."
                />
                <SmallRule
                  label="$<TARGET_FILE:...>"
                  title="Không đoán output path"
                  body="CMake resolve executable/library path đúng config, suffix và platform."
                />
                <SmallRule
                  label="BUILD_INTERFACE"
                  title="Dùng trong build tree"
                  body="Source/binary include path chỉ tồn tại khi target được dùng ngay trong project."
                />
                <SmallRule
                  label="INSTALL_INTERFACE"
                  title="Dùng sau install"
                  body="Phải relocatable; thường là path tương đối tính từ install prefix."
                />
              </div>

              <Callout tone="amber" title="Quote expression có list">
                Generator expression có dấu chấm phẩy hoặc khoảng trắng có thể
                bị split trước khi evaluate. Quote toàn expression và dùng{" "}
                <InlineCode>COMMAND_EXPAND_LISTS</InlineCode> khi command thực sự
                cần expand list.
              </Callout>

              <Lab>
                Thêm expensive invariant chỉ ở Debug, warnings theo MSVC/GCC/
                Clang và một post-build smoke command dùng{" "}
                <InlineCode>$&lt;TARGET_FILE:...&gt;</InlineCode>. Kiểm tra trên
                single- và multi-config.
              </Lab>

              <Checkpoint
                question="Có đọc kết quả generator expression bằng message() ở configure time được không?"
                answer="Không theo cách trực tiếp. Ở configure time nó vẫn là chuỗi $<...>; kết quả phụ thuộc generate context/target/config. Muốn inspect, xem generated compile commands/build verbose hoặc dùng file(GENERATE) phù hợp."
              />
            </GuideSection>

            <GuideSection
              id="dependency-management"
              number="08"
              eyebrow="External ownership"
              title="Dependency phải trở thành target"
              lead="Mục tiêu không phải “tìm ra một .so”. Mục tiêu là nhận target mang đủ include, definitions, link items và config mapping."
            >
              <Flow
                items={[
                  ["A", "Installed package", "find_package → imported target"],
                  ["B", "Vendored source", "add_subdirectory có boundary"],
                  ["C", "Fetched source", "FetchContent pin immutable revision"],
                  ["D", "External build", "ExternalProject/process boundary"],
                ]}
              />

              <CodeBlock label="Ưu tiên package-provided target">
                {`find_package(Threads REQUIRED)
find_package(ZLIB 1.2.13 REQUIRED)
find_package(fmt 10 CONFIG REQUIRED)

target_link_libraries(feed_decoder
  PRIVATE
    Threads::Threads
    ZLIB::ZLIB
    fmt::fmt
)`}
              </CodeBlock>

              <p>
                <Term>Module mode</Term> đọc{" "}
                <InlineCode>FindPackage.cmake</InlineCode> do CMake/project cung
                cấp và thường phải heuristic search. <Term>Config mode</Term> đọc
                package config do dependency cài cùng artifacts, nên thường biết
                chính xác imported targets/version/components hơn.
              </p>

              <CodeBlock label="FetchContent có revision cố định">
                {`include(FetchContent)

FetchContent_Declare(
  tl_expected
  GIT_REPOSITORY https://github.com/TartanLlama/expected.git
  GIT_TAG        292eff8bd8ee230a7df1d6a1c00c4ea0eb2f0362
)

FetchContent_MakeAvailable(tl_expected)
target_link_libraries(tick_model INTERFACE tl::expected)`}
              </CodeBlock>

              <Callout tone="red" title="Không fetch nhánh mutable trong CI">
                <InlineCode>main</InlineCode>, tag có thể bị di chuyển và URL
                không hash làm build hôm nay khác ngày mai. Pin full commit hoặc
                archive + <InlineCode>URL_HASH</InlineCode>; chuẩn bị mirror/cache
                cho CI không được phép ra mạng.
              </Callout>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="Config first"
                  title="Consume target, không consume biến"
                  body="Foo::Foo giữ usage requirements theo version/config; FOO_LIBRARIES/FOO_INCLUDE_DIRS dễ thiếu metadata."
                />
                <SmallRule
                  label="One owner"
                  title="Root quyết dependency policy"
                  body="Leaf target chỉ yêu cầu target dependency; root/preset/provider quyết system, vendored hay fetched."
                />
                <SmallRule
                  label="Offline"
                  title="CI phải tái lập"
                  body="Dependency lock/mirror/cache key cần gắn revision, toolchain và platform."
                />
                <SmallRule
                  label="No link_directories"
                  title="Link target có location"
                  body="Search path global có thể chọn nhầm ABI/version và thay đổi theo link order."
                />
              </div>

              <Lab>
                Thay một đoạn dùng <InlineCode>FOO_INCLUDE_DIRS</InlineCode>,{" "}
                <InlineCode>FOO_LIBRARIES</InlineCode> và{" "}
                <InlineCode>link_directories</InlineCode> bằng imported target.
                Ghi rõ ai chịu trách nhiệm cung cấp package trong local/CI.
              </Lab>

              <Checkpoint
                question="FetchContent khác ExternalProject ở thời điểm dependency tham gia graph thế nào?"
                answer="FetchContent populate dependency ở configure time rồi thường add_subdirectory, nên targets của dependency nằm trong cùng build graph. ExternalProject điều phối một build riêng ở build time; phù hợp process/toolchain boundary nhưng không tự tạo normal targets để link."
              />
            </GuideSection>

            <GuideSection
              id="generated-sources"
              number="09"
              eyebrow="Incremental correctness"
              title="Generated file cần một producer và dependency đầy đủ"
              lead="Feed onboarding thường sinh decoder từ schema. Nếu rule thiếu OUTPUT/DEPENDS, clean build có thể pass nhưng incremental build dùng code stale."
            >
              <CodeBlock label="Schema → generated C++ trong binary tree">
                {`find_package(Python3 REQUIRED COMPONENTS Interpreter)

set(generated_dir
    "\${CMAKE_CURRENT_BINARY_DIR}/generated")
set(generated_header
    "\${generated_dir}/feed_schema.hpp")
set(generated_source
    "\${generated_dir}/feed_schema.cpp")

add_custom_command(
  OUTPUT
    "\${generated_header}"
    "\${generated_source}"
  COMMAND \${CMAKE_COMMAND} -E make_directory "\${generated_dir}"
  COMMAND Python3::Interpreter
          "\${CMAKE_CURRENT_SOURCE_DIR}/tools/gen_feed.py"
          --schema "\${CMAKE_CURRENT_SOURCE_DIR}/schemas/feed.json"
          --header "\${generated_header}"
          --source "\${generated_source}"
  DEPENDS
    tools/gen_feed.py
    schemas/feed.json
  COMMENT "Generating feed decoder"
  VERBATIM
)

add_library(feed_codec
  src/codec.cpp
  "\${generated_source}"
  "\${generated_header}"
)
target_include_directories(feed_codec
  PRIVATE "\${generated_dir}"
)`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="OUTPUT"
                  title="Build tool biết file được tạo"
                  body="Rule chạy khi output thiếu/outdated và consumer có file-level dependency."
                />
                <SmallRule
                  label="DEPENDS"
                  title="Mọi input đổi đều rebuild"
                  body="Generator script, schema và imported host tool phải nằm trong dependency model."
                />
                <SmallRule
                  label="BYPRODUCTS"
                  title="Khai báo output phụ"
                  body="Ninja cần biết file nào có producer; thiếu byproduct dễ tạo race hoặc 'no rule to make target'."
                />
                <SmallRule
                  label="VERBATIM"
                  title="Argument escaping portable"
                  body="CMake chuyển argument đúng cho native build tool; đừng tự ghép shell string."
                />
              </div>

              <Callout tone="red" title="Không generate vào source tree">
                Output trong source tree làm Git dirty, gây race giữa build
                configs và che dependency bug vì file cũ còn sót. Generate vào{" "}
                <InlineCode>CMAKE_CURRENT_BINARY_DIR</InlineCode>; test từ clean
                tree và incremental tree.
              </Callout>

              <p>
                Một output chỉ có một producer. Nếu generator biết include
                dependency động, cân nhắc <InlineCode>DEPFILE</InlineCode>. CMake
                3.31 thêm target <InlineCode>codegen</InlineCode> cho một số
                generators; đó là optimization mới, không phải baseline 3.25.
              </p>

              <Lab>
                Chạy build, sửa schema và xác nhận chỉ generator + target phụ
                thuộc rebuild. Sau đó sửa generator script và lặp lại. Cuối cùng
                clean build trên directory mới để bắt output bị bỏ sót.
              </Lab>

              <Checkpoint
                question="Tại sao add_custom_target(generate ALL ...) thường kém hơn add_custom_command(OUTPUT ...)?"
                answer="Custom target thường luôn out-of-date và chỉ tạo target-level ordering; build tool không có file-level model chính xác. OUTPUT rule mô tả producer/input/output nên incremental scheduling đúng và tránh chạy thừa."
              />
            </GuideSection>

            <GuideSection
              id="presets-toolchains"
              number="10"
              eyebrow="Reproducible entry points"
              title="Preset là workflow được version-control"
              lead="Developer và CI nên gọi cùng named configuration thay vì copy một chuỗi -D flags trong README, shell script và pipeline."
            >
              <CodeBlock label="CMakePresets.json · schema 6 / CMake 3.25">
                {`{
  "version": 6,
  "cmakeMinimumRequired": {
    "major": 3,
    "minor": 25,
    "patch": 0
  },
  "configurePresets": [
    {
      "name": "ninja-base",
      "hidden": true,
      "generator": "Ninja",
      "binaryDir": "\${sourceDir}/build/\${presetName}",
      "cacheVariables": {
        "CMAKE_EXPORT_COMPILE_COMMANDS": true
      }
    },
    {
      "name": "clang-asan",
      "inherits": "ninja-base",
      "toolchainFile": "\${sourceDir}/cmake/toolchains/native-clang.cmake",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "TICK_ENABLE_ASAN": true
      }
    },
    {
      "name": "release",
      "inherits": "ninja-base",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    }
  ],
  "buildPresets": [
    { "name": "clang-asan", "configurePreset": "clang-asan" },
    { "name": "release", "configurePreset": "release" }
  ],
  "testPresets": [
    {
      "name": "clang-asan",
      "configurePreset": "clang-asan",
      "output": { "outputOnFailure": true },
      "execution": { "noTestsAction": "error" }
    }
  ]
}`}
              </CodeBlock>

              <CodeBlock label="Commands trở thành contract ngắn">
                {`cmake --preset clang-asan
cmake --build --preset clang-asan
ctest --preset clang-asan`}
              </CodeBlock>

              <p>
                <InlineCode>CMakePresets.json</InlineCode> thuộc project và nên
                commit. <InlineCode>CMakeUserPresets.json</InlineCode> chứa path/
                environment cá nhân, không commit. Hidden preset là base để kế
                thừa; mỗi toolchain/config family dùng binary directory riêng.
              </p>

              <CodeBlock label="Native toolchain được đọc trước project()">
                {`# cmake/toolchains/native-clang.cmake
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

# Chỉ đặt các field sau trong một cross toolchain riêng:
# set(CMAKE_SYSTEM_NAME Linux)
# set(CMAKE_SYSROOT "/opt/sysroots/target")
# set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
# set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
# set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)`}
              </CodeBlock>

              <p>
                Native toolchain chỉ chọn compiler/flags cần thiết. Tự đặt{" "}
                <InlineCode>CMAKE_SYSTEM_NAME</InlineCode> làm CMake coi đây là
                cross-compile, thay đổi package discovery và{" "}
                <InlineCode>try_run()</InlineCode>; chỉ làm vậy khi host và target
                thực sự khác nhau.
              </p>

              <Callout tone="amber" title="Host tool khác target tool">
                Khi cross-compile, schema generator chạy trên host nhưng library
                build cho target. Dùng imported executable/host tool rõ ràng;
                đừng vô tình cố chạy executable vừa cross-compile trong custom
                command.
              </Callout>

              <p>
                Workflow preset (CMake 3.25) có thể nối configure → build → test
                → package. Toolchain path cũng có thể nằm trong configure preset
                để local và CI chọn cùng compiler/sysroot.
              </p>

              <Lab>
                Tạo preset <InlineCode>clang-asan</InlineCode>,{" "}
                <InlineCode>gcc-release</InlineCode> và một test preset. Chứng
                minh hai preset không dùng chung cache, sau đó gọi đúng ba command
                trong CI.
              </Lab>

              <Checkpoint
                question="Vì sao CMakeUserPresets.json không nên commit?"
                answer="Nó dành cho override theo máy/user: local SDK path, IDE hoặc environment riêng. Commit file này làm path/secret/máy của một người trở thành contract project và gây xung đột với CMakePresets.json dùng chung."
              />
            </GuideSection>

            <GuideSection
              id="testing-quality"
              number="11"
              eyebrow="CTest architecture"
              title="Test graph cũng cần ownership"
              lead="Một platform dữ liệu cần unit, golden replay và integration test tách nhãn; CI phải fail nếu vô tình không discover test nào."
            >
              <CodeBlock label="CTest target-aware">
                {`include(CTest)

if(BUILD_TESTING)
  add_executable(order_book_tests
    unit/order_book_tests.cpp
  )
  target_link_libraries(order_book_tests
    PRIVATE Tick::order_book
  )

  add_test(
    NAME order_book.unit
    COMMAND order_book_tests
  )

  add_test(
    NAME replay.equities.golden
    COMMAND tick_replay
      --input "\${CMAKE_CURRENT_SOURCE_DIR}/fixtures/equities.bin"
      --expect "\${CMAKE_CURRENT_SOURCE_DIR}/fixtures/equities.expected"
  )

  set_tests_properties(order_book.unit PROPERTIES
    LABELS unit
    TIMEOUT 10
  )
  set_tests_properties(replay.equities.golden PROPERTIES
    LABELS "integration;replay"
    TIMEOUT 60
    RESOURCE_LOCK replay_port
  )
endif()`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="Fast feedback"
                  title="Unit / invariant"
                  bullets={[
                    "Parser bounds/endian",
                    "Order-book invariants",
                    "Interval statistic edge cases",
                  ]}
                />
                <CompareCard
                  label="System confidence"
                  title="Golden / integration"
                  bullets={[
                    "Deterministic replay",
                    "Generated schema compatibility",
                    "Install + downstream consumer",
                  ]}
                />
              </div>

              <CodeBlock label="CI commands không che empty suite">
                {`ctest --test-dir build/clang-asan \
  --output-on-failure \
  --no-tests=error \
  --parallel 8

ctest --test-dir build/release \
  -L replay \
  --output-junit test-results/replay.xml`}
              </CodeBlock>

              <p>
                Test không được phụ thuộc thứ tự mặc định. Dùng fixture khi có
                setup/cleanup lifecycle; dùng <InlineCode>RESOURCE_LOCK</InlineCode>
                khi nhiều test tranh một resource named; dùng timeout và label để
                CI phân tầng. Với cross-compile, test executable có thể cần
                emulator hoặc chạy ở target environment.
              </p>

              <Callout tone="red" title="CTest có thể thành công dù không chạy test">
                CLI CTest bình thường có thể không coi “0 tests” là lỗi. CI phải
                dùng <InlineCode>--no-tests=error</InlineCode> hoặc test preset{" "}
                <InlineCode>noTestsAction: error</InlineCode>.
              </Callout>

              <Lab>
                Tạo ba labels <InlineCode>unit</InlineCode>,{" "}
                <InlineCode>replay</InlineCode>,{" "}
                <InlineCode>integration</InlineCode>. Chạy riêng từng tầng,
                parallel toàn suite và sinh JUnit artifact.
              </Lab>

              <Checkpoint
                question="Tại sao link test trực tiếp target trong build tree chưa chứng minh package dùng được?"
                answer="Test đó dùng graph nội bộ và source/build paths. Nó không kiểm install layout, exported targets, dependency forwarding hoặc relocatability. Cần install rồi configure một consumer project độc lập bằng find_package."
              />
            </GuideSection>

            <GuideSection
              id="quality-performance"
              number="12"
              eyebrow="Engineering quality"
              title="Quality flags là opt-in target policy"
              lead="Warnings, sanitizer, clang-tidy, PCH, unity và LTO có trade-off khác nhau; đừng đổ tất cả vào global CMAKE_CXX_FLAGS."
            >
              <CodeBlock label="Reusable policy targets, link PRIVATE">
                {`add_library(tick_warnings INTERFACE)
if(MSVC)
  target_compile_options(tick_warnings INTERFACE /W4 /permissive-)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
  target_compile_options(tick_warnings INTERFACE
    -Wall -Wextra -Wpedantic
  )
endif()

add_library(tick_asan INTERFACE)
if(NOT MSVC AND
   CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
  target_compile_options(tick_asan INTERFACE -fsanitize=address)
  target_link_options(tick_asan INTERFACE -fsanitize=address)
elseif(TICK_ENABLE_ASAN)
  message(FATAL_ERROR
    "TICK_ENABLE_ASAN is unsupported by this compiler frontend")
endif()

target_link_libraries(feed_decoder
  PRIVATE tick_warnings
)

if(TICK_ENABLE_ASAN)
  target_link_libraries(feed_decoder PRIVATE tick_asan)
endif()`}
              </CodeBlock>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Tool/feature</th>
                      <th scope="col" className="px-4 py-3">Scope khuyên dùng</th>
                      <th scope="col" className="px-4 py-3">Rủi ro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Warnings / -Werror",
                        "First-party target PRIVATE",
                        "Phá third-party/downstream",
                      ]}
                    />
                    <TableRow
                      values={[
                        "ASan/UBSan",
                        "Compile + link cùng target graph",
                        "Trộn runtime/config",
                      ]}
                    />
                    <TableRow
                      values={[
                        "PCH",
                        "Thường PRIVATE",
                        "Ép consumer include policy",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Unity build",
                        "Opt-in sau khi đo",
                        "ODR/name collision",
                      ]}
                    />
                    <TableRow
                      values={[
                        "IPO/LTO",
                        "CheckIPOSupported + Release",
                        "Toolchain/linker support",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <p>
                Build nhanh bắt đầu từ graph đúng: Ninja/parallelism, dependency
                chính xác và codegen không chạy thừa. Sau đó mới đo PCH, unity,
                compiler launcher/cache và IPO. CMake 4.x instrumentation có thể
                đo pipeline sâu hơn nhưng không nên trở thành requirement cho
                baseline 3.25.
              </p>

              <Callout tone="amber" title="Sanitizer phải đi qua compile và link">
                Chỉ thêm <InlineCode>-fsanitize</InlineCode> lúc compile có thể
                tạo undefined runtime symbols ở link. Chỉ thêm lúc link thì
                instrumentation không được emit. Policy target giúp hai nửa đi
                cùng nhau.
              </Callout>

              <Lab>
                Tạo Debug ASan preset và Release preset. Chạy cùng unit/replay
                suite, đo thời gian clean/incremental build, rồi chỉ bật PCH hoặc
                unity khi có baseline để so sánh.
              </Lab>

              <Checkpoint
                question="Tại sao target_precompile_headers(... PUBLIC ...) thường là mùi thiết kế?"
                answer="PCH thường là optimization implementation của target. PUBLIC biến header order/content thành requirement của consumer, tăng coupling và dễ gây mismatch. Chỉ PUBLIC khi đó thực sự là contract cần để consumer compile đúng."
              />
            </GuideSection>

            <GuideSection
              id="install-export-package"
              number="13"
              eyebrow="Downstream contract"
              title="Build tree pass chưa phải product pass"
              lead="Production library phải install được, export target có namespace và được một consumer sạch tìm thấy ở prefix khác."
            >
              <CodeBlock label="Install target + public header set">
                {`include(GNUInstallDirs)

# Both public libraries registered a FILE_SET named api.
install(
  TARGETS tick_model feed_decoder
  EXPORT TickPlatformTargets
  FILE_SET api
    DESTINATION "\${CMAKE_INSTALL_INCLUDEDIR}"
  ARCHIVE
    DESTINATION "\${CMAKE_INSTALL_LIBDIR}"
  LIBRARY
    DESTINATION "\${CMAKE_INSTALL_LIBDIR}"
  RUNTIME
    DESTINATION "\${CMAKE_INSTALL_BINDIR}"
)

install(
  EXPORT TickPlatformTargets
  FILE TickPlatformTargets.cmake
  NAMESPACE Tick::
  DESTINATION
    "\${CMAKE_INSTALL_LIBDIR}/cmake/TickPlatform"
)`}
              </CodeBlock>

              <CodeBlock label="Package config + version">
                {`include(CMakePackageConfigHelpers)

configure_package_config_file(
  cmake/TickPlatformConfig.cmake.in
  "\${CMAKE_CURRENT_BINARY_DIR}/TickPlatformConfig.cmake"
  INSTALL_DESTINATION
    "\${CMAKE_INSTALL_LIBDIR}/cmake/TickPlatform"
)

write_basic_package_version_file(
  "\${CMAKE_CURRENT_BINARY_DIR}/TickPlatformConfigVersion.cmake"
  VERSION "\${PROJECT_VERSION}"
  COMPATIBILITY SameMajorVersion
)

install(
  FILES
    "\${CMAKE_CURRENT_BINARY_DIR}/TickPlatformConfig.cmake"
    "\${CMAKE_CURRENT_BINARY_DIR}/TickPlatformConfigVersion.cmake"
  DESTINATION
    "\${CMAKE_INSTALL_LIBDIR}/cmake/TickPlatform"
)`}
              </CodeBlock>

              <CodeBlock label="cmake/TickPlatformConfig.cmake.in">
                {`@PACKAGE_INIT@

include(CMakeFindDependencyMacro)
find_dependency(Threads)
find_dependency(tl-expected CONFIG)

include(
  "\${CMAKE_CURRENT_LIST_DIR}/TickPlatformTargets.cmake"
)
check_required_components(TickPlatform)`}
              </CodeBlock>

              <CodeBlock label="Downstream consumer không biết source tree">
                {`find_package(TickPlatform 1 CONFIG REQUIRED)

add_executable(research_replay main.cpp)
target_link_libraries(research_replay
  PRIVATE Tick::feed_decoder
)`}
              </CodeBlock>

              <p>
                Template config dùng <InlineCode>@PACKAGE_INIT@</InlineCode> và{" "}
                <InlineCode>find_dependency()</InlineCode> cho mọi dependency còn
                được exported interface nhắc tới, kể cả{" "}
                <InlineCode>LINK_ONLY</InlineCode> của static library. Interface
                không được chứa absolute include path tới máy build/dependency;
                dependency nên được diễn tả bằng imported target và tìm lại trong
                consumer environment.
              </p>

              <Flow
                items={[
                  ["1", "Build", "Tạo first-party artifacts"],
                  ["2", "Install", "Stage vào prefix tạm"],
                  ["3", "Relocate", "Move/copy prefix sang path khác"],
                  ["4", "Consume", "find_package từ project sạch"],
                  ["5", "Run", "Smoke test runtime dependencies"],
                ]}
              />

              <Callout tone="red" title="Absolute INSTALL_INTERFACE phá relocatability">
                Đừng export <InlineCode>/home/me/deps/include</InlineCode> hoặc
                source path vào package. Consumer khác máy/container sẽ nhận
                target trỏ về path không tồn tại.
              </Callout>

              <Lab>
                Install TickPlatform vào prefix tạm, chuyển prefix sang directory
                khác, rồi configure/build một consumer độc lập chỉ với{" "}
                <InlineCode>CMAKE_PREFIX_PATH</InlineCode>. Không cho consumer
                nhìn source/build tree gốc.
              </Lab>

              <Checkpoint
                question="install(TARGETS) và install(EXPORT) giải quyết hai việc khác nhau thế nào?"
                answer="install(TARGETS) đặt artifacts/header vào install tree và gắn targets vào export set. install(EXPORT) sinh file CMake mô tả imported targets để downstream load lại graph với namespace."
              />
            </GuideSection>

            <GuideSection
              id="diagnostics-performance"
              number="14"
              eyebrow="Evidence first"
              title="Phân loại lỗi trước khi xóa build"
              lead="Configure, compile, link, test, install và runtime là sáu lớp khác nhau. Mỗi lớp có evidence và tool riêng."
            >
              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Phase</th>
                      <th scope="col" className="px-4 py-3">Symptom</th>
                      <th scope="col" className="px-4 py-3">Evidence đầu tiên</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Configure",
                        "Package/compiler không tìm thấy",
                        "--debug-find, cache, toolchain",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Compile",
                        "Header/define/standard sai",
                        "build --verbose, compile_commands",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Link",
                        "Undefined/duplicate symbol",
                        "Link line, target edges, ABI/config",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Test",
                        "Không discover/flaky/timeout",
                        "ctest -N/-V, labels/properties",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Install",
                        "Thiếu header/config",
                        "install_manifest + staged tree",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Runtime",
                        "Loader/plugin không thấy",
                        "RPATH/runtime dependency inspection",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Diagnostic toolbox">
                {`# Configure trace theo file/module cần soi
cmake -S . -B build/trace \
  --trace-expand \
  --trace-source=cmake/FindFeedSDK.cmake

# Package search
cmake -S . -B build/find --debug-find

# Graph và native commands
cmake --graphviz=build/graph.dot build/dev
cmake --build build/dev --verbose

# Cache sạch có chủ đích (CMake 3.24+)
cmake --fresh -S . -B build/dev -G Ninja

# Test discovery/verbose
ctest --test-dir build/dev -N
ctest --test-dir build/dev -V -R replay`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="Wrong include"
                  title="Trace dependency edge"
                  body="Xem compile command rồi truy target nào đưa include path vào transitive closure."
                />
                <SmallRule
                  label="Undefined symbol"
                  title="Không thêm library mò"
                  body="Xác minh symbol owner, link order/visibility, ABI, config mapping và PUBLIC/PRIVATE edge."
                />
                <SmallRule
                  label="Stale cache"
                  title="Hiểu key trước khi fresh"
                  body="Compiler, generator, prefix và option cũ có thể nằm trong CMakeCache; --fresh là reset có chủ đích."
                />
                <SmallRule
                  label="Slow build"
                  title="Đo configure/compile/link"
                  body="Graphviz/verbose/compile database cho structure; instrumentation/tool timing cho bottleneck."
                />
              </div>

              <Callout tone="amber" title="Xóa build là phép thử, không phải root cause">
                Clean build pass chứng minh stale state có vai trò, nhưng chưa nói
                cache key/rule nào sai. Phải tái hiện incremental failure và sửa
                dependency model để lỗi không quay lại.
              </Callout>

              <Lab>
                Cố ý tạo năm lỗi: thiếu package, thiếu include, undefined symbol,
                zero tests và thiếu installed header. Với mỗi lỗi, ghi phase,
                command evidence và target/property cần sửa.
              </Lab>

              <Checkpoint
                question="Compile command có -I đúng nhưng header vẫn sai version thì kiểm tra gì?"
                answer="Kiểm tra thứ tự include paths, duplicate install/source copies, generator output stale và target nào inject path. Sau đó kiểm imported target/config package được chọn bằng --debug-find; đừng chỉ thêm một -I khác lên đầu."
              />
            </GuideSection>

            <GuideSection
              id="legacy-migration-ci"
              number="15"
              eyebrow="Ownership under change"
              title="Migrate legacy theo boundary, không rewrite toàn bộ"
              lead="Mục tiêu đầu tiên là tái hiện build cũ và khóa behavior. Sau đó mới chuyển global state thành target contract từng module."
            >
              <MigrationSteps />

              <CodeBlock label="Trước: ambient global state">
                {`include_directories(
  "\${PROJECT_SOURCE_DIR}/include"
  "/opt/feed-sdk/include"
)
link_directories("/opt/feed-sdk/lib")
add_definitions(-DLEGACY_MODE)
set(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} -Wall -O2")

add_library(decoder src/decoder.cpp)
target_link_libraries(decoder feed_sdk pthread)`}
              </CodeBlock>

              <CodeBlock label="Sau: explicit boundary, artifact name giữ nguyên">
                {`add_library(FeedSDK::FeedSDK UNKNOWN IMPORTED)
set_target_properties(FeedSDK::FeedSDK PROPERTIES
  IMPORTED_LOCATION "/opt/feed-sdk/lib/libfeed_sdk.so"
  INTERFACE_INCLUDE_DIRECTORIES "/opt/feed-sdk/include"
)

add_library(decoder src/decoder.cpp)
target_include_directories(decoder
  PUBLIC
    "$<BUILD_INTERFACE:\${PROJECT_SOURCE_DIR}/include>"
    "$<INSTALL_INTERFACE:include>"
)
target_compile_definitions(decoder PRIVATE LEGACY_MODE)
set_target_properties(decoder PROPERTIES
  CXX_STANDARD 11
  CXX_STANDARD_REQUIRED YES
  CXX_EXTENSIONS NO
)
target_link_libraries(decoder
  PRIVATE FeedSDK::FeedSDK Threads::Threads
)`}
              </CodeBlock>

              <p>
                <InlineCode>cxx_std_11</InlineCode> nghĩa là “ít nhất C++11” và
                compiler có thể dùng standard mới hơn. Boundary thực sự phải
                compile đúng C++11 nên đặt <InlineCode>CXX_STANDARD</InlineCode>,
                required/no extensions như trên và giữ một CI lane kiểm chứng.
                Core mới vẫn dùng <InlineCode>cxx_std_20</InlineCode>; đừng hạ
                standard toàn platform. Policy upgrade cũng làm từng đợt với
                warning inventory, không set tất cả về{" "}
                <InlineCode>OLD</InlineCode>.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">CI lane</th>
                      <th scope="col" className="px-4 py-3">Evidence</th>
                      <th scope="col" className="px-4 py-3">Bắt regression</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "GCC Debug + ASan/UBSan",
                        "Unit + replay",
                        "Memory/UB/invariant",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Clang Debug + analysis",
                        "Warnings/clang-tidy",
                        "Portability/API misuse",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Release",
                        "Full test + benchmark trend",
                        "Optimization-only issue",
                      ]}
                    />
                    <TableRow
                      values={[
                        "MSVC / Windows",
                        "Multi-config build/test",
                        "Generator/compiler assumptions",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Install consumer",
                        "find_package smoke",
                        "Export/relocatability",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <Callout tone="green" title="Mỗi migration step có rollback">
                Giữ dual build/parity gate cho tới khi artifact, tests và
                consumers khớp. Một commit chỉ chuyển một boundary giúp bisect và
                rollback; xóa compatibility shim sau khi consumer cuối đã migrate.
              </Callout>

              <Lab>
                Chọn một legacy feed adapter. Chụp configure/build/test commands,
                compile/link lines và artifact checksum/behavior. Bọc dependency
                prebuilt thành imported target, rồi thay global include/define/
                flags từng nhóm mà output vẫn giữ.
              </Lab>

              <Checkpoint
                question="Thứ tự migrate global CMake an toàn là gì?"
                answer="Baseline + presets trước; vẽ graph; bọc external/prebuilt targets; chuyển từng module sang target sources/includes/defines/features/link; sửa codegen; thêm install-consumer; nâng policies; cuối cùng xóa global shims khi parity và consumers đều xanh."
              />
            </GuideSection>

            <GuideSection
              id="worldquant-capstone"
              number="16"
              eyebrow="WorldQuant capstone"
              title="Ship một TickPlatform có evidence"
              lead="Capstone gom toàn bộ bài: C++11 legacy boundary, C++20 core, generated feed code, deterministic replay, package consumer và CI matrix."
            >
              <FileTree
                lines={[
                  "TickPlatform/",
                  "├── model/                 # event/value types",
                  "├── legacy_adapter/        # C++11 boundary",
                  "├── feed_codegen/          # schema → C++",
                  "├── codecs/{equities,futures}/",
                  "├── order_book/            # invariants/state",
                  "├── interval_features/     # OHLCV/statistics",
                  "├── tools/tick_replay/",
                  "├── tests/{unit,golden,integration}/",
                  "├── cmake/{toolchains,packages}/",
                  "└── CMakePresets.json",
                ]}
              />

              <CodeBlock label="Top-level capstone skeleton">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_ENABLE_EQUITIES "Build equities feed adapter" ON)
option(TICK_ENABLE_FUTURES "Build futures feed adapter" ON)
option(TICK_ENABLE_ASAN "Enable AddressSanitizer" OFF)

find_package(Threads REQUIRED)
find_package(Python3 REQUIRED COMPONENTS Interpreter)

add_subdirectory(model)
add_subdirectory(feed_codegen)
add_subdirectory(legacy_adapter)
add_subdirectory(order_book)
add_subdirectory(interval_features)

if(TICK_ENABLE_EQUITIES)
  add_subdirectory(codecs/equities)
endif()
if(TICK_ENABLE_FUTURES)
  add_subdirectory(codecs/futures)
endif()

add_subdirectory(tools/tick_replay)

include(CTest)
if(BUILD_TESTING)
  add_subdirectory(tests)
endif()

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)
add_subdirectory(cmake/packages)`}
              </CodeBlock>

              <h3>Definition of done</h3>
              <Checklist
                items={[
                  "Không dùng include_directories, link_directories hoặc CMAKE_CXX_FLAGS toàn cục.",
                  "Mỗi target khai báo source, standard và usage requirements đúng ownership.",
                  "Sửa schema hoặc generator script rebuild đúng generated decoder, không chạm source tree.",
                  "CTest có unit, replay, integration labels; CI fail nếu zero tests.",
                  "C++11 legacy adapter không hạ standard của C++20 core.",
                  "Debug sanitizer và Release dùng preset/binary tree riêng.",
                  "Install/export tạo Tick:: targets và consumer relocatable find_package được.",
                  "CI matrix ghi source SHA, compiler/CMake version, preset và fixture/schema revision.",
                  "Thêm feed mới chỉ thêm adapter/edge cần thiết, không sửa mọi target.",
                  "Có migration rollback và parity evidence cho platform legacy.",
                ]}
              />

              <h3>Khung trả lời phỏng vấn 5 bước</h3>
              <Flow
                items={[
                  ["1", "State constraint", "Legacy ABI, feed mới, OS/compiler, CI"],
                  ["2", "Draw targets", "Ownership + public dependency edges"],
                  ["3", "Protect incrementality", "Generated outputs + exact inputs"],
                  ["4", "Prove delivery", "CTest + install consumer + matrix"],
                  ["5", "Plan migration", "Parity, rollout, rollback, observability"],
                ]}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <InterviewCard
                  question="PUBLIC hay PRIVATE cho tick_model?"
                  signal="Đọc public header của decoder. Nếu API expose event/model type, consumer cần edge PUBLIC; nếu chỉ .cpp dùng thì PRIVATE."
                />
                <InterviewCard
                  question="Onboard feed mới thế nào?"
                  signal="Schema codegen có OUTPUT/DEPENDS, adapter target riêng, golden replay fixtures versioned và graph không làm unrelated target rebuild."
                />
                <InterviewCard
                  question="CI nào đủ tin?"
                  signal="Compiler/config matrix, sanitizer, no-tests-error, Release replay, install-consumer và artifact lineage; không chỉ 'cmake --build pass'."
                />
                <InterviewCard
                  question="Migrate legacy ra sao?"
                  signal="Baseline → imported boundary → target-by-target → dual parity → consumer cutover → xóa shim, mỗi bước rollback được."
                />
              </div>

              <Callout tone="green" title="Bài runnable đã có trong Recall">
                Mock set WorldQuant có scenario tạo{" "}
                <InlineCode>feed_decoder</InlineCode>, executable test, C++20,
                usage requirements và CTest. Học xong guide này, làm lại scenario
                mà không nhìn đáp án rồi giải thích sanitizer/CI/install extension.
              </Callout>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/mock-interview"
                  className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
                >
                  Vào mock interview →
                </Link>
                <Link
                  href="/?deck=cmake-build-systems"
                  className="rounded-2xl border border-[#173f35]/15 bg-white/70 px-5 py-3 text-sm font-bold text-[#356b58] transition hover:bg-white"
                >
                  Mở deck CMake →
                </Link>
              </div>

              <Checkpoint
                question="Một lời giải CMake tốt cho JD này phải chứng minh điều gì ngoài việc build pass?"
                answer="Target ownership/transitive contract đúng; incremental codegen đúng; tests có tầng và không rỗng; package install/consume được; compiler/config matrix tái lập; legacy migration có parity/rollback. Build pass chỉ là một evidence nhỏ."
              />
            </GuideSection>

            <section
              id="official-sources"
              className="scroll-mt-6 border-t border-[#173f35]/15 py-12"
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.17em] text-[#ba4b2f] uppercase">
                Primary references
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Đọc manual theo câu hỏi, không đọc thuộc lòng.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64736c]">
                Toàn bộ nguồn ngoài trong guide là tài liệu chính thức của CMake.
                Trang “latest” có thể mô tả feature mới hơn baseline 3.25, nên
                luôn kiểm version note của command/property.
              </p>
              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {CMAKE_GUIDE_SOURCES.map((source) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-4 transition hover:-translate-y-0.5 hover:border-[#356b58]/30 hover:bg-white"
                  >
                    <span className="font-semibold text-[#245748]">
                      {source.label} ↗
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-[#64736c]">
                      {source.description}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}

function GuideHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-xs font-bold text-[#d7ff91]">
          CMake
        </span>
        <span>
          <span className="block font-semibold tracking-[-0.02em]">Recall</span>
          <span className="block text-xs text-[#64736c]">Build systems guide</span>
        </span>
      </Link>
      <nav
        className="flex flex-wrap items-center gap-2 text-sm"
        aria-label="Điều hướng"
      >
        <Link
          href="/learn/tick-data-order-book"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Học Tick
        </Link>
        <Link
          href="/"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Luyện tập
        </Link>
        <Link
          href="/mock-interview"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Mock interview
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 font-bold transition hover:border-[#356b58]/35"
        >
          Admin
        </Link>
      </nav>
    </header>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-white/72">
      {children}
    </span>
  );
}

function TargetGraphPreview() {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/14 bg-[#0d2d25] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#ef6f56]" />
          <span className="size-2.5 rounded-full bg-[#e9bb4f]" />
          <span className="size-2.5 rounded-full bg-[#8dbf58]" />
        </div>
        <span className="font-mono text-[11px] font-bold tracking-wide text-white/70 uppercase">
          TickPlatform target graph
        </span>
      </div>
      <div className="space-y-3 p-5 font-mono text-xs">
        <GraphNode
          name="tick_replay"
          kind="EXECUTABLE"
          tone="lime"
          indent={0}
        />
        <GraphEdge label="PRIVATE" indent={1} />
        <GraphNode
          name="feed_decoder"
          kind="STATIC"
          tone="green"
          indent={1}
        />
        <GraphEdge label="PUBLIC" indent={2} />
        <GraphNode
          name="tick_model"
          kind="INTERFACE"
          tone="blue"
          indent={2}
        />
        <GraphNode
          name="order_book"
          kind="STATIC"
          tone="amber"
          indent={1}
        />
        <GraphNode
          name="interval_features"
          kind="STATIC"
          tone="rose"
          indent={1}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-white/10 bg-black/10 px-5 py-4 text-center sm:grid-cols-3 sm:gap-0">
        <PreviewMetric label="Unit" value="target" />
        <PreviewMetric label="Contract" value="usage reqs" />
        <PreviewMetric label="Evidence" value="test/install" />
      </div>
    </div>
  );
}

function GraphNode({
  name,
  kind,
  tone,
  indent,
}: {
  name: string;
  kind: string;
  tone: "lime" | "green" | "blue" | "amber" | "rose";
  indent: number;
}) {
  const tones = {
    lime: "border-[#d7ff91]/30 bg-[#d7ff91]/10 text-[#d7ff91]",
    green: "border-[#8dd3b4]/25 bg-[#8dd3b4]/8 text-[#a9e5ca]",
    blue: "border-[#9cc6ff]/25 bg-[#9cc6ff]/8 text-[#b9d8ff]",
    amber: "border-[#f2c66d]/25 bg-[#f2c66d]/8 text-[#f5d890]",
    rose: "border-[#ffad9c]/25 bg-[#ffad9c]/8 text-[#ffc2b5]",
  };
  const margins = ["ml-0", "ml-5", "ml-10"];

  return (
    <div
      className={`${margins[indent]} flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${tones[tone]}`}
    >
      <span className="font-bold">{name}</span>
      <span className="text-[10px] tracking-wide opacity-80">{kind}</span>
    </div>
  );
}

function GraphEdge({ label, indent }: { label: string; indent: number }) {
  const margins = ["ml-0", "ml-5", "ml-10"];
  return (
    <div className={`${margins[indent]} flex items-center gap-2 text-[10px] text-white/65`}>
      <span>└─</span>
      <span>{label}</span>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[10px] tracking-wide text-white/60 uppercase">
        {label}
      </span>
      <span className="mt-1 block break-words font-mono text-[11px] font-bold text-white/80">
        {value}
      </span>
    </div>
  );
}

function MobileTableOfContents() {
  return (
    <details className="group mt-7 overflow-hidden rounded-2xl border border-[#173f35]/15 bg-white/60 xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold">
        <span>Mục lục 16 chương</span>
        <span className="text-xs text-[#356b58] group-open:hidden">Mở ↓</span>
        <span className="hidden text-xs text-[#356b58] group-open:inline">
          Thu gọn ↑
        </span>
      </summary>
      <nav
        aria-label="Mục lục CMake trên mobile"
        className="grid gap-1 border-t border-[#173f35]/10 p-3 sm:grid-cols-2"
      >
        {CMAKE_GUIDE_CHAPTERS.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className="rounded-xl px-3 py-2.5 text-sm transition hover:bg-[#edf0e8]"
          >
            <span className="mr-2 font-mono text-[10px] font-bold text-[#ba4b2f]">
              {chapter.number}
            </span>
            {chapter.shortTitle}
          </a>
        ))}
      </nav>
    </details>
  );
}

function GuideSidebar() {
  return (
    <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-[#173f35]/12 bg-white/55 p-4 xl:block">
      <p className="px-3 pt-2 font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
        Reading map
      </p>
      <nav className="mt-3 space-y-1" aria-label="Mục lục bài học">
        {CMAKE_GUIDE_CHAPTERS.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className="group flex gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white"
          >
            <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
              {chapter.number}
            </span>
            <span className="leading-5 text-[#52645c] group-hover:text-[#17221d]">
              {chapter.shortTitle}
            </span>
          </a>
        ))}
      </nav>
      <div className="mt-4 rounded-2xl bg-[#173f35] p-4 text-white">
        <p className="font-mono text-[9px] font-bold tracking-wide text-[#d7ff91] uppercase">
          Nguyên tắc vàng
        </p>
        <p className="mt-2 text-xs leading-6 text-white/70">
          Target graph → usage requirements → deterministic build → test/install
          evidence → CI.
        </p>
      </div>
    </aside>
  );
}

function GuideSection({
  id,
  number,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 border-t border-[#173f35]/15 py-12 first:border-t-0 first:pt-0"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#173f35] font-mono text-[10px] font-bold text-[#d7ff91]">
          {number}
        </span>
        <p className="font-mono text-[10px] font-bold tracking-[0.17em] text-[#ba4b2f] uppercase">
          {eyebrow}
        </p>
      </div>
      <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64736c]">{lead}</p>
      <div className="mt-7 space-y-6 leading-8 [&_h3]:mt-9 [&_h3]:text-xl [&_h3]:font-semibold [&_strong]:font-semibold [&_strong]:text-[#173f35]">
        {children}
      </div>
    </section>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[#e4ebe6] px-1.5 py-0.5 font-semibold text-[#245748]">
      {children}
    </span>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-[#e4ebe6] px-1.5 py-1 font-mono text-[0.88em] text-[#245748]">
      {children}
    </code>
  );
}

function CodeBlock({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <div className="my-7 min-w-0">
      <div className="mb-2 flex items-center gap-2 px-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#356b58] uppercase">
        <span className="size-2 rounded-full bg-[#79b82a]" />
        {label}
      </div>
      <pre className={codeClass}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Flow({ items }: { items: ReadonlyArray<readonly [string, string, string]> }) {
  return (
    <div className="my-7 grid gap-3">
      {items.map(([number, title, body], index) => (
        <div
          key={`${number}-${title}`}
          className="relative rounded-2xl border border-[#173f35]/10 bg-white/65 p-4"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#173f35] font-mono text-[10px] font-bold text-[#d7ff91]">
              {number}
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-[#64736c]">{body}</p>
            </div>
          </div>
          {index < items.length - 1 ? (
            <span aria-hidden="true" className="absolute -bottom-3 left-8 z-10 text-xs text-[#79b82a]">
              ↓
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CompareCard({
  label,
  title,
  bullets,
}: {
  label: string;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <p className="font-mono text-[10px] font-bold tracking-wide text-[#ba4b2f] uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#173f35]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#52645c]">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="text-[#79b82a]">✓</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmallRule({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf5] p-4">
      <p className="font-mono text-[9px] font-bold tracking-wide text-[#ba4b2f] uppercase">
        {label}
      </p>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#64736c]">{body}</p>
    </div>
  );
}

function TableRow({
  values,
  last = false,
}: {
  values: string[];
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-[#173f35]/8"}>
      {values.map((value, index) =>
        index === 0 ? (
          <th
            key={`${value}-${index}`}
            scope="row"
            className="px-4 py-3 leading-6 font-semibold text-[#245748]"
          >
            {value}
          </th>
        ) : (
          <td
            key={`${value}-${index}`}
            className="px-4 py-3 leading-6 text-[#52645c]"
          >
            {value}
          </td>
        ),
      )}
    </tr>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "green" | "amber" | "red";
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    green: "border-[#79b82a]/25 bg-[#eff7df] text-[#29493d]",
    amber: "border-[#d99b2b]/25 bg-[#fff4df] text-[#71574a]",
    red: "border-[#ba4b2f]/20 bg-[#f8e8df] text-[#713929]",
  };
  const badges = {
    green: "bg-[#79b82a]",
    amber: "bg-[#d99b2b]",
    red: "bg-[#ba4b2f]",
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-full ${badges[tone]}`}
        />
        <div>
          <p className="font-semibold">{title}</p>
          <div className="mt-2 text-sm leading-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#6c63a8]/20 bg-[#f0edff] p-5 text-[#4c4772]">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#62589a] uppercase">
        Lab nối tiếp
      </p>
      <div className="mt-2 text-sm leading-7">{children}</div>
    </div>
  );
}

function Checkpoint({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <div>
          <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-[#ba4b2f] uppercase">
            Checkpoint
          </p>
          <p className="mt-2 font-semibold leading-7">{question}</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-[#356b58] group-open:hidden">
          Xem đáp án ↓
        </span>
        <span className="hidden shrink-0 text-xs font-bold text-[#356b58] group-open:inline">
          Đóng ↑
        </span>
      </summary>
      <div className="border-t border-[#173f35]/10 bg-[#edf0e8]/70 px-5 py-4 text-sm leading-7 text-[#465c52]">
        {answer}
      </div>
    </details>
  );
}

function FileTree({ lines }: { lines: string[] }) {
  return (
    <pre className={`${codeClass} my-7`}>
      <code>{lines.join("\n")}</code>
    </pre>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex gap-3 rounded-2xl border border-[#173f35]/10 bg-white/60 p-4 text-sm leading-6"
        >
          <span className="text-[#65a30d]">✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function MigrationSteps() {
  const steps = [
    ["01", "Freeze baseline", "Preset + clean build/test/artifact evidence."],
    ["02", "Map ambient state", "Global includes, defines, flags, link paths."],
    ["03", "Draw target graph", "Module ownership và public API edges."],
    ["04", "Wrap externals", "IMPORTED targets cho SDK/prebuilt legacy."],
    ["05", "Migrate leaf target", "target_sources/includes/features/link."],
    ["06", "Fix codegen", "OUTPUT/DEPENDS và binary-tree outputs."],
    ["07", "Dual parity", "Build cũ/mới chạy cùng fixtures."],
    ["08", "Install consumer", "Package boundary trước cutover."],
    ["09", "Raise policies", "Xử lý warning theo đợt, không blanket OLD."],
    ["10", "Remove shim", "Sau khi consumer cuối và rollback window kết thúc."],
  ];

  return (
    <div className="my-7 grid gap-3 md:grid-cols-2">
      {steps.map(([number, title, body]) => (
        <div
          key={number}
          className="flex gap-3 rounded-2xl border border-[#173f35]/10 bg-white/65 p-4"
        >
          <span className="font-mono text-[10px] font-bold text-[#ba4b2f]">
            {number}
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-[#64736c]">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InterviewCard({
  question,
  signal,
}: {
  question: string;
  signal: string;
}) {
  return (
    <div className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <p className="font-mono text-[9px] font-bold tracking-wide text-[#ba4b2f] uppercase">
        Interview probe
      </p>
      <p className="mt-2 font-semibold leading-7">{question}</p>
      <p className="mt-3 text-sm leading-6 text-[#64736c]">{signal}</p>
    </div>
  );
}
