import type { Metadata } from "next";
import Link from "next/link";

import {
  CMAKE_GUIDE_CHAPTERS,
  CMAKE_GUIDE_SOURCES,
  CMAKE_WORLDQUANT_OUTCOMES,
} from "@/lib/learn/cmake-guide";

export const metadata: Metadata = {
  title: "CMake cho C++ hiện đại — Recall",
  description:
    "Hướng dẫn CMake chi tiết từ đồ thị target, yêu cầu sử dụng và sinh mã tới CTest, đóng gói, CI và chuyển đổi hệ thống cũ cho vai trò WorldQuant.",
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
              Hệ thống dựng cho C++ trong môi trường thực tế
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              CMake cho
              <span className="block sm:inline"> C++ hiện đại.</span>
              <span className="block text-[#d7ff91]">
                Từ đồ thị target đến vận hành thực tế.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Không học CMake như một danh sách lệnh. Bạn sẽ dùng một dự án dữ
              liệu tick xuyên suốt để hiểu đồ thị phụ thuộc, cách dựng tăng
              dần, kiểm thử, cài đặt, CI và cách nâng cấp nền tảng cũ mà vẫn có
              đường quay lại an toàn.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase">
              <HeroChip>2–3 giờ</HeroChip>
              <HeroChip>16 chương</HeroChip>
              <HeroChip>Mốc CMake 3.25</HeroChip>
              <HeroChip>Hướng đến WorldQuant</HeroChip>
            </div>

            <div className="mt-8 flex min-w-0 flex-wrap gap-3">
              <a
                href="#configure-generate-build"
                className="w-full rounded-2xl bg-[#d7ff91] px-5 py-3 text-center text-sm font-bold text-[#173f35] transition hover:bg-white sm:w-auto"
              >
                Bắt đầu từ mô hình tư duy ↓
              </a>
              <Link
                href="/mock-interview"
                className="w-full rounded-2xl border border-white/20 bg-white/8 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/14 sm:w-auto"
              >
                Phỏng vấn thử WorldQuant
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
                Mốc thực hành là 3.25, tài liệu chính thức có thể mới hơn
              </h2>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-[#71574a]">
                Mọi ví dụ chính trong bài chạy với CMake 3.25. Mô-đun C++ cần
                3.28+, target <InlineCode>codegen</InlineCode> cần 3.31, còn
                công cụ đo và theo dõi quá trình biên dịch của bản 4.x chỉ là
                phần mở rộng. Luôn đọc nhãn “Added in version” (được thêm từ
                phiên bản) trước khi đưa tính năng mới vào nền tảng cũ.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#173f35]/12 bg-white/55 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
                Mô tả công việc → kết quả học tập
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Học để vận hành nền tảng, không chỉ để chạy cấu hình thành công.
              </h2>
            </div>
            <span className="rounded-full bg-[#e8efe2] px-3 py-1.5 font-mono text-[10px] font-bold text-[#356b58] uppercase">
              6 năng lực cần thể hiện
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
              eyebrow="Nguyên lý nền tảng"
              title="CMake không phải trình biên dịch"
              lead="CMake đọc mô hình của dự án rồi sinh hệ thống dựng cho Ninja, Make hoặc IDE. Tách đúng từng giai đoạn là bước đầu để tìm lỗi có căn cứ."
            >
              <p>
                Hãy giữ mô hình tư duy này: <Term>configure (cấu hình)</Term>{" "}
                phát hiện bộ công cụ, đọc{" "}
                <InlineCode>CMakeLists.txt</InlineCode> và tạo bộ nhớ đệm;{" "}
                <Term>generate (sinh tệp)</Term> viết tệp cho Ninja, Make hoặc
                IDE;{" "}
                <Term>build (dựng)</Term> mới gọi trình biên dịch và trình liên
                kết; sau đó <Term>CTest</Term> chạy kiểm thử và{" "}
                <Term>install (cài đặt)</Term> tạo cấu trúc cho bên sử dụng.
              </p>

              <Flow
                items={[
                  ["1", "Cấu hình", "Mã CMake + bộ công cụ → bộ nhớ đệm"],
                  ["2", "Sinh tệp", "Đồ thị target → tệp Ninja/VS"],
                  ["3", "Dựng", "Trình biên dịch + liên kết tạo sản phẩm"],
                  ["4", "Kiểm thử", "CTest chạy chương trình đã dựng"],
                  ["5", "Cài đặt", "Sao chép/xuất sản phẩm công khai"],
                ]}
              />

              <CodeBlock label="Một quy trình không phụ thuộc thư mục làm việc">
                {`cmake -S . -B build/dev -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build/dev --parallel
ctest --test-dir build/dev --output-on-failure --no-tests=error
cmake --install build/dev --prefix stage/dev`}
              </CodeBlock>

              <h3>Ba cây thư mục, ba trách nhiệm</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <CompareCard
                  label="Cây mã nguồn"
                  title="Đầu vào được Git quản lý"
                  bullets={[
                    "CMakeLists.txt, .cmake",
                    "Mã nguồn/tệp tiêu đề C++",
                    "Lược đồ, dữ liệu kiểm thử, tập lệnh",
                  ]}
                />
                <CompareCard
                  label="Cây dựng"
                  title="Kết quả có thể tạo lại"
                  bullets={[
                    "CMakeCache.txt",
                    "Mã nguồn được sinh",
                    "Tệp đối tượng, thư viện, chương trình",
                  ]}
                />
                <CompareCard
                  label="Cây cài đặt"
                  title="Sản phẩm công khai"
                  bullets={[
                    "bin/lib/include",
                    "Cấu hình gói",
                    "Không phụ thuộc cây mã nguồn",
                  ]}
                />
              </div>

              <Callout tone="red" title="Cách làm nên tránh: dựng trong cây mã nguồn">
                Dựng trong cây mã nguồn trộn bộ nhớ đệm, tệp được sinh và sản
                phẩm được tạo khi dựng vào đầu vào của Git. Dùng{" "}
                <InlineCode>-S</InlineCode>{" "}
                và <InlineCode>-B</InlineCode>; mỗi nhóm trình sinh, bộ công cụ
                và cấu hình có thư mục dựng riêng.
              </Callout>

              <Lab>
                Tạo <InlineCode>build/gcc-debug</InlineCode>, cấu hình bằng
                Ninja, dựng, chạy CTest và cài vào{" "}
                <InlineCode>stage/gcc-debug</InlineCode>. Sau đó xóa toàn bộ
                cây dựng và chứng minh cây mã nguồn không thay đổi.
              </Lab>

              <Checkpoint
                question="Đổi trình biên dịch trong CMakeCache.txt rồi dựng tiếp có an toàn không?"
                answer="Không. Trình biên dịch được chọn trong lần cấu hình đầu và ảnh hưởng ABI, việc phát hiện tính năng, try_compile, cờ cùng việc tìm phụ thuộc. Hãy tạo cây dựng mới hoặc dùng cấu hình đặt sẵn/bộ công cụ có binaryDir riêng."
              />
            </GuideSection>

            <GuideSection
              id="language-cache-scope"
              number="02"
              eyebrow="Ngôn ngữ CMake"
              title="Biến không phải thuộc tính của target"
              lead="CMake là một ngôn ngữ có danh sách, quy tắc trích dẫn, phạm vi và bộ nhớ đệm riêng. Nhiều lỗi trong hệ thống cũ bắt đầu từ việc dùng bộ nhớ đệm như trạng thái toàn cục có thể thay đổi."
            >
              <p>
                Biến thường sống theo phạm vi thư mục hoặc hàm. Mục trong bộ nhớ
                đệm là cấu hình dành cho người dùng và được giữ qua các lần cấu
                hình. Biến môi trường thuộc tiến trình. Yêu cầu của target C++
                phải nằm trong <strong>thuộc tính target</strong>, không nên
                truyền qua một chuỗi biến toàn cục.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Loại trạng thái</th>
                      <th scope="col" className="px-4 py-3">Vòng đời/phạm vi</th>
                      <th scope="col" className="px-4 py-3">Dùng cho</th>
                      <th scope="col" className="px-4 py-3">Không dùng cho</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Biến thường",
                        "Thư mục / hàm",
                        "Logic cấu hình cục bộ",
                        "Quy ước biên dịch công khai",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Biến bộ nhớ đệm",
                        "Cây dựng",
                        "Tùy chọn/đường dẫn của người dùng",
                        "Ép người dùng bằng FORCE",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Môi trường",
                        "Tiến trình CMake",
                        "Đầu vào bộ công cụ/CI",
                        "Đồ thị phụ thuộc ẩn",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Thuộc tính target",
                        "Đồ thị target",
                        "Yêu cầu include/tính năng/liên kết",
                        "Bật tắt toàn dự án",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Tùy chọn và hàm có phạm vi rõ">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_BUILD_TESTING "Dựng các bài kiểm thử TickPlatform" ON)
set(TICK_SCHEMA_DIR
    "\${PROJECT_SOURCE_DIR}/schemas"
    CACHE PATH "Thư mục chứa các lược đồ luồng dữ liệu")

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

              <h3>Danh sách và trích dẫn là nguồn lỗi âm thầm</h3>
              <p>
                Danh sách CMake là chuỗi phân cách bằng dấu chấm phẩy. Việc mở
                rộng không có dấu nháy có thể biến một đối số thành nhiều đối
                số. Với đường dẫn hoặc biểu thức sinh có danh sách, hãy trích
                dẫn toàn biểu thức hoặc dùng API hiểu target thay vì tự nối
                chuỗi lệnh.
              </p>

              <Callout tone="amber" title="Bộ nhớ đệm là API dành cho người dùng">
                Đừng <InlineCode>set(... CACHE ... FORCE)</InlineCode> chỉ để CI
                “chắc chắn đúng”; nó ghi đè lựa chọn của lập trình viên. Giá trị
                mặc định nằm trong dự án hoặc cấu hình đặt sẵn; giá trị thay thế
                thuộc dòng lệnh hoặc cấu hình riêng của người dùng.
              </Callout>

              <p>
                <InlineCode>cmake_minimum_required</InlineCode> đồng thời đặt
                phiên bản chính sách. Chính sách là cơ chế chuyển đổi hành vi,
                không phải nút bật tắt tính năng. Gần như không bao giờ nên xử
                lý cảnh báo bằng cách đặt hàng loạt chính sách về{" "}
                <InlineCode>OLD</InlineCode>.
              </p>

              <Lab>
                Viết tùy chọn bật luồng dữ liệu cổ phiếu và lưu đường dẫn tới
                lược đồ trong bộ nhớ đệm. In giá trị khi cấu hình, thay bằng{" "}
                <InlineCode>-D</InlineCode>, rồi giải thích trạng thái nào còn
                lại khi cấu hình lần hai.
              </Lab>

              <Checkpoint
                question="Hàm và macro khác nhau ở điểm nguy hiểm nào?"
                answer="Hàm tạo phạm vi biến mới và truyền đối số như giá trị thông thường; macro thay thế gần giống việc chèn văn bản, không có phạm vi riêng nên dễ sửa biến của bên gọi. Ưu tiên hàm trừ khi thực sự cần ngữ nghĩa của macro."
              />
            </GuideSection>

            <GuideSection
              id="targets-graph"
              number="03"
              eyebrow="Đơn vị thiết kế cốt lõi"
              title="Đồ thị target mới là kiến trúc dựng"
              lead="Tệp chỉ là đầu vào. Target mới sở hữu mã nguồn, yêu cầu, kết quả và cạnh phụ thuộc."
            >
              <p>
                Một nền tảng dữ liệu tick nên được nhìn như một đồ thị: bộ chuyển
                đổi luồng dữ liệu phụ thuộc mô hình giao thức, bộ giải mã phụ
                thuộc lược đồ được sinh, sổ lệnh phụ thuộc mô hình sự kiện,
                chương trình phụ thuộc các thư viện. Cạnh phải được biểu diễn bằng{" "}
                <InlineCode>target_link_libraries</InlineCode>, không bằng include
                path hoặc thư mục liên kết toàn cục.
              </p>

              <CodeBlock label="Đồ thị target tối thiểu">
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
                  label="Target tạo sản phẩm"
                  title="Tạo sản phẩm hoặc tệp đối tượng"
                  bullets={[
                    "EXECUTABLE",
                    "STATIC / SHARED / MODULE",
                    "Thư viện OBJECT",
                  ]}
                />
                <CompareCard
                  label="Target mô tả quan hệ"
                  title="Mô tả quy ước hoặc thành phần có sẵn"
                  bullets={[
                    "Thư viện INTERFACE",
                    "Target IMPORTED",
                    "ALIAS có không gian tên",
                  ]}
                />
              </div>

              <Callout tone="green" title="Tên có không gian tên bắt lỗi gõ sớm">
                Tên thay thế <InlineCode>Tick::feed_decoder</InlineCode> khiến
                CMake báo lỗi ngay nếu bên sử dụng liên kết nhầm target. Chuỗi
                thô không có <InlineCode>::</InlineCode> có thể bị hiểu như tên
                thư viện cho trình liên kết và chỉ báo lỗi rất muộn.
              </Callout>

              <h3>Chọn loại thư viện theo ý nghĩa sản phẩm</h3>
              <p>
                <InlineCode>INTERFACE</InlineCode> dành cho quy ước chỉ có tệp
                tiêu đề; <InlineCode>OBJECT</InlineCode> tái dùng tệp đối tượng
                nhưng không phải ranh giới gói; <InlineCode>MODULE</InlineCode>{" "}
                hợp với phần bổ trợ không liên kết trực tiếp;{" "}
                <InlineCode>STATIC</InlineCode> và{" "}
                <InlineCode>SHARED</InlineCode> cần quyết định rõ ABI và cách
                triển khai. Không để <InlineCode>BUILD_SHARED_LIBS</InlineCode>{" "}
                vô tình đổi loại sản phẩm nếu nền tảng có yêu cầu cụ thể.
              </p>

              <Lab>
                Vẽ đồ thị cho <InlineCode>feed_codec</InlineCode>,{" "}
                <InlineCode>order_book</InlineCode>,{" "}
                <InlineCode>interval_features</InlineCode> và{" "}
                <InlineCode>tick_replay</InlineCode>. Mỗi cạnh phụ thuộc phải trả
                lời được: yêu cầu biên dịch nào đi qua cạnh này?
              </Lab>

              <Checkpoint
                question="Khi nào dùng target IMPORTED thay vì liên kết trực tiếp một đường dẫn .so/.lib tuyệt đối?"
                answer="Khi tệp nhị phân hoặc phụ thuộc được dựng hay cung cấp ngoài dự án. Target được nhập có thể mang vị trí theo cấu hình, thư mục include, phụ thuộc truyền tiếp và dữ liệu nền tảng; đường dẫn thô chỉ đưa cho trình liên kết một tệp và làm mất quy ước."
              />
            </GuideSection>

            <GuideSection
              id="usage-requirements"
              number="04"
              eyebrow="Quy ước truyền tiếp"
              title="PUBLIC, PRIVATE, INTERFACE phải được nhìn từ bên sử dụng"
              lead="Phạm vi không mô tả mức độ quan trọng. Nó cho biết yêu cầu dùng để dựng target hiện tại, bên sử dụng hay cả hai."
            >
              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Phạm vi</th>
                      <th scope="col" className="px-4 py-3">Dựng target</th>
                      <th scope="col" className="px-4 py-3">Dựng bên sử dụng</th>
                      <th scope="col" className="px-4 py-3">Câu hỏi quyết định</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "PRIVATE",
                        "✓",
                        "Không nhận yêu cầu sử dụng*",
                        "Chỉ phần triển khai .cpp cần?",
                      ]}
                    />
                    <TableRow
                      values={[
                        "PUBLIC",
                        "✓",
                        "✓",
                        "Target và tệp tiêu đề công khai cùng cần?",
                      ]}
                    />
                    <TableRow
                      values={[
                        "INTERFACE",
                        "—",
                        "✓",
                        "Quy ước chỉ có tệp tiêu đề/dành cho bên sử dụng?",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Yêu cầu sử dụng không làm lộ phần triển khai">
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

              <h3>Đọc tệp tiêu đề công khai để chọn phạm vi</h3>
              <p>
                Nếu <InlineCode>decoder.hpp</InlineCode> nhắc kiểu của{" "}
                <InlineCode>tick_model</InlineCode>, bên sử dụng cần mô hình để
                biên dịch: cạnh đó là <InlineCode>PUBLIC</InlineCode>. Nếu luồng
                chỉ nằm
                trong <InlineCode>decoder.cpp</InlineCode>, nó là{" "}
                <InlineCode>PRIVATE</InlineCode>. Nếu target chỉ gom tệp tiêu
                đề, yêu cầu thường là <InlineCode>INTERFACE</InlineCode>.
              </p>

              <p>
                Dấu <strong>*</strong>: <InlineCode>PRIVATE</InlineCode> không
                truyền yêu cầu sử dụng để biên dịch bên dùng. Nhưng thư viện
                tĩnh chưa liên kết phụ thuộc thành tệp nhị phân hoàn chỉnh; khi
                xuất, CMake có thể giữ phụ thuộc triển khai dưới{" "}
                <InlineCode>$&lt;LINK_ONLY:...&gt;</InlineCode> để executable cuối
                tìm được ký hiệu. Vì vậy cấu hình gói vẫn có thể phải{" "}
                <InlineCode>find_dependency(Threads)</InlineCode>.
              </p>

              <Callout tone="red" title="Lệnh toàn cục phá vỡ quyền sở hữu">
                <InlineCode>include_directories</InlineCode>,{" "}
                <InlineCode>add_definitions</InlineCode>,{" "}
                <InlineCode>link_directories</InlineCode> và sửa{" "}
                <InlineCode>CMAKE_CXX_FLAGS</InlineCode> làm target không còn tự
                mô tả. Chúng cũng khiến bài kiểm thử “tình cờ” biên dịch được vì
                thừa include hoặc định nghĩa từ thư mục cùng cấp.
              </Callout>

              <Lab>
                Với một tệp tiêu đề công khai dùng{" "}
                <InlineCode>std::span</InlineCode> và kiểu{" "}
                <InlineCode>SchemaView</InlineCode> từ target khác, hãy khai báo
                đúng tính năng biên dịch và phạm vi liên kết. Sau đó tạo một
                chương trình sử dụng nhỏ chỉ include tệp tiêu đề công khai để
                kiểm chứng.
              </Lab>

              <Checkpoint
                question="Cờ cảnh báo có nên là PUBLIC vì mọi mã nguồn phải sạch không?"
                answer="Thường không. Chính sách cảnh báo là chính sách dựng của target hoặc dự án, không phải yêu cầu để bên sử dụng biên dịch đúng. Việc truyền cảnh báo tiếp (đặc biệt -Werror) có thể phá phần phụ thuộc phía sau và thư viện bên thứ ba; hãy liên kết một target cảnh báo dạng INTERFACE vào từng target nội bộ bằng PRIVATE."
              />
            </GuideSection>

            <GuideSection
              id="project-architecture"
              number="05"
              eyebrow="Mở rộng đồ thị"
              title="Mỗi thư mục tạo target, không sửa target hàng xóm"
              lead="Dự án lớn dễ hiểu khi thư mục gốc chọn tính năng và ghép thư mục con, còn thư mục lá sở hữu mã nguồn cùng yêu cầu của chính nó."
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

              <CodeBlock label="Điều phối gọn ở thư mục gốc">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_BUILD_TOOLS "Dựng công cụ phát lại và chẩn đoán" ON)

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

              <CodeBlock label="Target lá sở hữu API công khai">
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
                  label="Đầu vào tường minh"
                  title="Liệt kê mã nguồn để dễ xem xét"
                  body="file(GLOB) làm danh sách mã nguồn bị ẩn; CONFIGURE_DEPENDS cải thiện việc cấu hình lại nhưng vẫn phụ thuộc trình sinh và khó xem xét thay đổi."
                />
                <SmallRule
                  label="Thân thiện khi dùng làm dự án con"
                  title="Thư viện dùng được khi được nhúng"
                  body="Chỉ bật kiểm thử, công cụ và cài đặt mặc định khi PROJECT_IS_TOP_LEVEL; đừng áp tùy chọn của dự án gốc lên dự án cha."
                />
                <SmallRule
                  label="Tệp tiêu đề công khai"
                  title="FILE_SET giữ quyền sở hữu"
                  body="Tập tệp tiêu đề (3.23+) kết nối IDE, cài đặt và xuất với cùng một danh sách API."
                />
                <SmallRule
                  label="Hướng phụ thuộc"
                  title="Phụ thuộc đi một chiều"
                  body="Thư mục lá không gọi target_* lên target được tạo ở thư mục xa; tạo hàm hỗ trợ nếu cần tái sử dụng chính sách."
                />
              </div>

              <Lab>
                Tách một CMakeLists cũ 200 dòng thành phần điều phối gốc và bốn
                target lá. Không đổi tên sản phẩm hoặc hành vi ở bước đầu; chỉ
                làm rõ quyền sở hữu.
              </Lab>

              <Checkpoint
                question="Vì sao add_subdirectory không đồng nghĩa target phải thấy mọi thư mục include của thư mục cha?"
                answer="Phạm vi thư mục có thể kế thừa một số biến hoặc thuộc tính cũ, nhưng yêu cầu sử dụng của target chỉ truyền qua các cạnh phụ thuộc. Thiết kế hiện đại không dựa vào trạng thái thư mục xung quanh để target có thể được dựng và sử dụng độc lập."
              />
            </GuideSection>

            <GuideSection
              id="generators-configurations"
              number="06"
              eyebrow="Hệ thống dựng gốc"
              title="Debug/Release không có một mô hình duy nhất"
              lead="Ninja/Unix Makefiles thường dùng một cấu hình; Visual Studio, Xcode và Ninja Multi-Config chọn cấu hình lúc dựng."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="Một cấu hình"
                  title="Chọn cấu hình lúc cấu hình dự án"
                  bullets={[
                    "-DCMAKE_BUILD_TYPE=Debug",
                    "Một cây dựng cho một cấu hình",
                    "Ninja / Unix Makefiles phổ biến",
                  ]}
                />
                <CompareCard
                  label="Nhiều cấu hình"
                  title="Chọn cấu hình lúc dựng"
                  bullets={[
                    "cmake --build ... --config Release",
                    "Một cây chứa nhiều cấu hình",
                    "Visual Studio / Xcode / Ninja Multi-Config",
                  ]}
                />
              </div>

              <CodeBlock label="Hai quy trình tương đương">
                {`# Ninja, một cấu hình
cmake -S . -B build/ninja-debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug
cmake --build build/ninja-debug

# Visual Studio, nhiều cấu hình
cmake -S . -B build/vs -G "Visual Studio 17 2022" -A x64
cmake --build build/vs --config Debug
ctest --test-dir build/vs -C Debug --output-on-failure`}
              </CodeBlock>

              <Callout tone="red" title="Loại dựng rỗng không có nghĩa là Debug">
                Với trình sinh một cấu hình, nếu người dùng không đặt{" "}
                <InlineCode>CMAKE_BUILD_TYPE</InlineCode>, nó thường rỗng. Đừng
                giả định rỗng là Debug. Với trình sinh nhiều cấu hình, kiểm tra
                biến này để điều khiển cờ gần như luôn sai.
              </Callout>

              <p>
                Trình sinh và trình biên dịch xác định danh tính của cây dựng.
                Đừng tái dùng cùng thư mục cho GCC, Clang, MSVC hoặc bộ công cụ
                khác.{" "}
                <InlineCode>CMAKE_EXPORT_COMPILE_COMMANDS</InlineCode> hữu ích
                cho clangd và phân tích với Make/Ninja, nhưng không phải quy ước
                dùng được với mọi trình sinh.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Câu hỏi</th>
                      <th scope="col" className="px-4 py-3">Một cấu hình</th>
                      <th scope="col" className="px-4 py-3">Nhiều cấu hình</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Chọn cấu hình",
                        "Cấu hình bằng -D...",
                        "Dựng/kiểm thử bằng --config/-C",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Kết quả theo cấu hình",
                        "Một cấu hình/cây",
                        "Debug, Release... cùng một cây",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Điều kiện dùng được đa nền tảng",
                        "$<CONFIG:...>",
                        "$<CONFIG:...>",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <Lab>
                Chạy cùng dự án bằng Ninja Debug và Visual Studio Release. Ghi
                lại lệnh biên dịch, đường dẫn sản phẩm và lệnh CTest; không sửa
                CMakeLists giữa hai lần dựng.
              </Lab>

              <Checkpoint
                question="Tại sao if(CMAKE_BUILD_TYPE STREQUAL Debug) làm MSVC bị thiếu cờ?"
                answer="Visual Studio hỗ trợ nhiều cấu hình; CMAKE_BUILD_TYPE không chọn cấu hình hiện tại. Cấu hình chỉ được biết lúc sinh tệp hoặc dựng, nên dùng biểu thức sinh $<CONFIG:Debug> hoặc thuộc tính target theo cấu hình."
              />
            </GuideSection>

            <GuideSection
              id="generator-expressions"
              number="07"
              eyebrow="Logic lúc sinh tệp"
              title="Biểu thức sinh không chạy lúc cấu hình"
              lead="Biểu thức $&lt;...&gt; được giữ lại để CMake tính theo target, trình biên dịch và cấu hình khi sinh hệ thống dựng gốc."
            >
              <p>
                Dùng <InlineCode>if()</InlineCode> khi quyết định đồ thị lúc cấu
                hình. Dùng biểu thức sinh khi một target cần giá trị khác nhau
                theo cấu hình hoặc trình biên dịch, hay khi giao diện công khai
                khác giữa cây dựng và cây cài đặt.
              </p>

              <CodeBlock label="Giao diện trình biên dịch lúc cấu hình, cấu hình dựng lúc sinh tệp">
                {`if(MSVC) # gồm cả trình biên dịch có giao diện dòng lệnh kiểu cl
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
                Chọn cú pháp cờ theo <em>giao diện dòng lệnh</em> của trình biên
                dịch, không chỉ theo nhà cung cấp:{" "}
                <InlineCode>clang-cl</InlineCode> có ID Clang nhưng dùng dòng
                lệnh kiểu MSVC; biến <InlineCode>MSVC</InlineCode> của CMake bao
                phủ trường hợp đó. AppleClang cũng cần nằm trong nhánh kiểu GNU.
              </p>

              <CodeBlock label="Một API, hai vị trí">
                {`target_include_directories(feed_decoder PUBLIC
  "$<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>"
  "$<INSTALL_INTERFACE:include>"
)`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="$<CONFIG:...>"
                  title="Dùng được qua nhiều trình sinh"
                  body="Không phụ thuộc CMAKE_BUILD_TYPE; hoạt động khi một dự án sinh nhiều cấu hình."
                />
                <SmallRule
                  label="$<TARGET_FILE:...>"
                  title="Không đoán đường dẫn kết quả"
                  body="CMake tìm đúng đường dẫn chương trình hoặc thư viện theo cấu hình, hậu tố và nền tảng."
                />
                <SmallRule
                  label="BUILD_INTERFACE"
                  title="Dùng trong cây dựng"
                  body="Đường dẫn include của mã nguồn/tệp nhị phân chỉ tồn tại khi target được dùng ngay trong dự án."
                />
                <SmallRule
                  label="INSTALL_INTERFACE"
                  title="Dùng sau khi cài đặt"
                  body="Phải có thể di chuyển; thường là đường dẫn tương đối tính từ tiền tố cài đặt."
                />
              </div>

              <Callout tone="amber" title="Trích dẫn biểu thức có danh sách">
                Biểu thức sinh có dấu chấm phẩy hoặc khoảng trắng có thể
                bị tách trước khi tính. Hãy trích dẫn toàn biểu thức và dùng{" "}
                <InlineCode>COMMAND_EXPAND_LISTS</InlineCode> khi lệnh thực sự
                cần mở rộng danh sách.
              </Callout>

              <Lab>
                Thêm phép kiểm tra bất biến tốn kém chỉ ở Debug, cảnh báo theo
                MSVC/GCC/Clang và một lệnh kiểm tra nhanh sau khi dựng dùng{" "}
                <InlineCode>$&lt;TARGET_FILE:...&gt;</InlineCode>. Kiểm tra trên
                trình sinh một và nhiều cấu hình.
              </Lab>

              <Checkpoint
                question="Có đọc kết quả biểu thức sinh bằng message() lúc cấu hình được không?"
                answer="Không theo cách trực tiếp. Lúc cấu hình, nó vẫn là chuỗi $<...>; kết quả phụ thuộc ngữ cảnh sinh tệp, target và cấu hình. Muốn kiểm tra, hãy xem lệnh biên dịch được sinh, kết quả dựng chi tiết hoặc dùng file(GENERATE) phù hợp."
              />
            </GuideSection>

            <GuideSection
              id="dependency-management"
              number="08"
              eyebrow="Quyền sở hữu phụ thuộc ngoài"
              title="Phụ thuộc phải trở thành target"
              lead="Mục tiêu không phải “tìm ra một tệp .so”. Mục tiêu là nhận target mang đủ đường dẫn include, định nghĩa, thành phần liên kết và ánh xạ cấu hình."
            >
              <Flow
                items={[
                  ["A", "Gói đã cài", "find_package → target được nhập"],
                  ["B", "Mã nguồn đi kèm", "add_subdirectory có ranh giới"],
                  ["C", "Mã nguồn được tải", "FetchContent khóa phiên bản bất biến"],
                  ["D", "Lần dựng bên ngoài", "Ranh giới ExternalProject/tiến trình"],
                ]}
              />

              <CodeBlock label="Ưu tiên target do gói cung cấp">
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
                <Term>Chế độ mô-đun</Term> đọc{" "}
                <InlineCode>FindPackage.cmake</InlineCode> do CMake hoặc dự án cung
                cấp và thường phải tìm kiếm theo quy tắc suy đoán.{" "}
                <Term>Chế độ cấu hình</Term> đọc cấu hình gói do phụ thuộc cài
                cùng sản phẩm, nên thường biết chính xác hơn các target được nhập,
                phiên bản và thành phần.
              </p>

              <CodeBlock label="FetchContent có phiên bản cố định">
                {`include(FetchContent)

FetchContent_Declare(
  tl_expected
  GIT_REPOSITORY https://github.com/TartanLlama/expected.git
  GIT_TAG        292eff8bd8ee230a7df1d6a1c00c4ea0eb2f0362
)

FetchContent_MakeAvailable(tl_expected)
target_link_libraries(tick_model INTERFACE tl::expected)`}
              </CodeBlock>

              <Callout tone="red" title="Không tải nhánh có thể thay đổi trong CI">
                <InlineCode>main</InlineCode>, tag có thể bị di chuyển và URL
                không có mã băm làm lần dựng hôm nay khác ngày mai. Khóa theo mã
                commit đầy đủ hoặc tệp nén kèm{" "}
                <InlineCode>URL_HASH</InlineCode>; chuẩn bị máy chủ bản sao hoặc
                bộ nhớ đệm cho CI không được phép ra mạng.
              </Callout>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="Ưu tiên cấu hình"
                  title="Dùng target, không dùng biến"
                  body="Foo::Foo giữ yêu cầu sử dụng theo phiên bản/cấu hình; FOO_LIBRARIES/FOO_INCLUDE_DIRS dễ thiếu dữ liệu."
                />
                <SmallRule
                  label="Một nơi sở hữu"
                  title="Thư mục gốc quyết định chính sách phụ thuộc"
                  body="Target lá chỉ yêu cầu target phụ thuộc; thư mục gốc, cấu hình đặt sẵn hoặc nhà cung cấp quyết định dùng bản hệ thống, đi kèm hay được tải."
                />
                <SmallRule
                  label="Không cần mạng"
                  title="CI phải tái lập được"
                  body="Khóa phụ thuộc, máy chủ bản sao và khóa bộ nhớ đệm cần gắn với phiên bản, bộ công cụ và nền tảng."
                />
                <SmallRule
                  label="Không dùng link_directories"
                  title="Liên kết target có vị trí rõ"
                  body="Đường dẫn tìm kiếm toàn cục có thể chọn nhầm ABI/phiên bản và thay đổi theo thứ tự liên kết."
                />
              </div>

              <Lab>
                Thay một đoạn dùng <InlineCode>FOO_INCLUDE_DIRS</InlineCode>,{" "}
                <InlineCode>FOO_LIBRARIES</InlineCode> và{" "}
                <InlineCode>link_directories</InlineCode> bằng target được nhập.
                Ghi rõ ai chịu trách nhiệm cung cấp gói trên thiết bị và trong CI.
              </Lab>

              <Checkpoint
                question="FetchContent khác ExternalProject ở thời điểm phụ thuộc tham gia đồ thị thế nào?"
                answer="FetchContent nạp phụ thuộc lúc cấu hình rồi thường gọi add_subdirectory, nên các target của phụ thuộc nằm trong cùng đồ thị dựng. ExternalProject điều phối một lần dựng riêng lúc dựng; phù hợp với ranh giới tiến trình hoặc bộ công cụ nhưng không tự tạo target thường để liên kết."
              />
            </GuideSection>

            <GuideSection
              id="generated-sources"
              number="09"
              eyebrow="Tính đúng đắn của cách dựng tăng dần"
              title="Tệp được sinh cần một nơi tạo và đầy đủ phụ thuộc"
              lead="Khi thêm luồng dữ liệu, hệ thống thường sinh bộ giải mã từ lược đồ. Nếu quy tắc thiếu OUTPUT/DEPENDS, lần dựng sạch có thể thành công nhưng lần dựng tăng dần lại dùng mã cũ."
            >
              <CodeBlock label="Lược đồ → mã C++ được sinh trong cây dựng">
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
  COMMENT "Đang sinh bộ giải mã luồng dữ liệu"
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
                  title="Công cụ dựng biết tệp được tạo"
                  body="Quy tắc chạy khi kết quả thiếu hoặc cũ và bên sử dụng có phụ thuộc ở mức tệp."
                />
                <SmallRule
                  label="DEPENDS"
                  title="Mọi đầu vào đổi đều được dựng lại"
                  body="Tập lệnh sinh, lược đồ và target công cụ chạy trên máy dựng (host) phải nằm trong mô hình phụ thuộc."
                />
                <SmallRule
                  label="BYPRODUCTS"
                  title="Khai báo kết quả phụ"
                  body="Ninja cần biết tệp nào có nơi tạo; thiếu sản phẩm phụ dễ tạo tranh chấp hoặc lỗi 'no rule to make target'."
                />
                <SmallRule
                  label="VERBATIM"
                  title="Thoát ký tự đối số đa nền tảng"
                  body="CMake chuyển đối số đúng cho công cụ dựng gốc; đừng tự ghép chuỗi lệnh shell."
                />
              </div>

              <Callout tone="red" title="Không sinh tệp vào cây mã nguồn">
                Kết quả trong cây mã nguồn làm Git có thay đổi, gây tranh chấp
                giữa các cấu hình dựng và che lỗi phụ thuộc vì tệp cũ còn sót.
                Hãy sinh vào <InlineCode>CMAKE_CURRENT_BINARY_DIR</InlineCode>;
                kiểm thử từ cây sạch và cây dựng tăng dần.
              </Callout>

              <p>
                Một kết quả chỉ có một nơi tạo. Nếu trình sinh biết phụ thuộc
                include động, cân nhắc <InlineCode>DEPFILE</InlineCode>. CMake
                3.31 thêm target <InlineCode>codegen</InlineCode> cho một số
                trình sinh; đó là tối ưu mới, không phải mốc 3.25.
              </p>

              <Lab>
                Chạy dựng, sửa lược đồ và xác nhận chỉ trình sinh cùng target phụ
                thuộc được dựng lại. Sau đó sửa tập lệnh sinh và lặp lại. Cuối
                cùng dựng sạch trong thư mục mới để bắt kết quả bị bỏ sót.
              </Lab>

              <Checkpoint
                question="Tại sao add_custom_target(generate ALL ...) thường kém hơn add_custom_command(OUTPUT ...)?"
                answer="Target tùy chỉnh thường luôn bị xem là cũ và chỉ tạo thứ tự ở mức target; công cụ dựng không có mô hình chính xác ở mức tệp. Quy tắc OUTPUT mô tả nơi tạo, đầu vào và kết quả nên việc lên lịch dựng tăng dần đúng và tránh chạy thừa."
              />
            </GuideSection>

            <GuideSection
              id="presets-toolchains"
              number="10"
              eyebrow="Điểm bắt đầu có thể tái lập"
              title="Cấu hình đặt sẵn là quy trình được quản lý phiên bản"
              lead="Lập trình viên và CI nên gọi cùng một cấu hình có tên thay vì sao chép chuỗi cờ -D trong README, tập lệnh shell và quy trình CI."
            >
              <CodeBlock label="CMakePresets.json · lược đồ 6 / CMake 3.25">
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

              <CodeBlock label="Các lệnh trở thành quy ước ngắn gọn">
                {`cmake --preset clang-asan
cmake --build --preset clang-asan
ctest --preset clang-asan`}
              </CodeBlock>

              <p>
                <InlineCode>CMakePresets.json</InlineCode> thuộc dự án và nên
                commit. <InlineCode>CMakeUserPresets.json</InlineCode> chứa
                đường dẫn hoặc môi trường cá nhân nên không commit. Cấu hình ẩn
                là nền để kế thừa; mỗi nhóm bộ công cụ và cấu hình dùng thư mục
                tệp nhị phân riêng.
              </p>

              <CodeBlock label="Bộ công cụ gốc được đọc trước project()">
                {`# cmake/toolchains/native-clang.cmake
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

# Chỉ đặt các trường sau trong một bộ công cụ biên dịch chéo riêng:
# set(CMAKE_SYSTEM_NAME Linux)
# set(CMAKE_SYSROOT "/opt/sysroots/target")
# set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
# set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
# set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)`}
              </CodeBlock>

              <p>
                Bộ công cụ gốc chỉ chọn trình biên dịch và cờ cần thiết. Tự đặt{" "}
                <InlineCode>CMAKE_SYSTEM_NAME</InlineCode> làm CMake coi đây là
                biên dịch chéo, thay đổi cách tìm gói và{" "}
                <InlineCode>try_run()</InlineCode>; chỉ làm vậy khi máy chạy công
                cụ và nền tảng đích thực sự khác nhau.
              </p>

              <Callout tone="amber" title="Công cụ chạy trên máy dựng khác công cụ cho nền tảng đích">
                Khi biên dịch chéo, trình sinh lược đồ chạy trên máy dựng (host)
                nhưng thư viện được dựng cho nền tảng đích. Hãy dùng target
                chương trình <InlineCode>IMPORTED</InlineCode> hoặc công cụ host
                được khai báo rõ; đừng vô tình chạy chương trình vừa được biên
                dịch chéo trong lệnh tùy chỉnh.
              </Callout>

              <p>
                Cấu hình quy trình (CMake 3.25) có thể nối cấu hình → dựng → kiểm
                thử → đóng gói. Đường dẫn bộ công cụ cũng có thể nằm trong cấu
                hình đặt sẵn để thiết bị và CI chọn cùng trình biên dịch/sysroot.
              </p>

              <Lab>
                Tạo cấu hình đặt sẵn <InlineCode>clang-asan</InlineCode>,{" "}
                <InlineCode>gcc-release</InlineCode> và một cấu hình đặt sẵn cho kiểm thử. Chứng
                minh hai cấu hình không dùng chung bộ nhớ đệm, sau đó gọi đúng
                ba lệnh trong CI.
              </Lab>

              <Checkpoint
                question="Vì sao CMakeUserPresets.json không nên commit?"
                answer="Tệp này dành cho giá trị thay thế theo máy hoặc người dùng: đường dẫn SDK trên thiết bị, IDE hoặc môi trường riêng. Commit tệp này biến đường dẫn, bí mật và cấu hình máy của một người thành quy ước của dự án, đồng thời gây xung đột với CMakePresets.json dùng chung."
              />
            </GuideSection>

            <GuideSection
              id="testing-quality"
              number="11"
              eyebrow="Kiến trúc CTest"
              title="Đồ thị kiểm thử cũng cần quyền sở hữu"
              lead="Một nền tảng dữ liệu cần tách nhãn cho kiểm thử đơn vị, phát lại kết quả chuẩn và kiểm thử tích hợp; CI phải báo lỗi nếu vô tình không tìm thấy bài kiểm thử nào."
            >
              <CodeBlock label="CTest hiểu target">
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
                  label="Phản hồi nhanh"
                  title="Đơn vị / điều bất biến"
                  bullets={[
                    "Giới hạn/thứ tự byte của bộ phân tích",
                    "Điều bất biến của sổ lệnh",
                    "Trường hợp biên của thống kê theo khoảng",
                  ]}
                />
                <CompareCard
                  label="Độ tin cậy hệ thống"
                  title="Kết quả chuẩn / tích hợp"
                  bullets={[
                    "Phát lại cho kết quả xác định",
                    "Tính tương thích của lược đồ được sinh",
                    "Cài đặt + dự án sử dụng phía sau",
                  ]}
                />
              </div>

              <CodeBlock label="Lệnh CI không che bộ kiểm thử rỗng">
                {`ctest --test-dir build/clang-asan \
  --output-on-failure \
  --no-tests=error \
  --parallel 8

ctest --test-dir build/release \
  -L replay \
  --output-junit test-results/replay.xml`}
              </CodeBlock>

              <p>
                Bài kiểm thử không được phụ thuộc thứ tự mặc định. Dùng dữ liệu
                chuẩn bị khi có vòng đời thiết lập/dọn dẹp; dùng{" "}
                <InlineCode>RESOURCE_LOCK</InlineCode> khi nhiều bài kiểm thử
                tranh cùng một tài nguyên có tên; dùng giới hạn thời gian và
                nhãn để CI phân tầng. Khi biên dịch chéo, chương trình kiểm thử
                có thể cần trình giả lập hoặc chạy trong môi trường đích.
              </p>

              <Callout tone="red" title="CTest có thể thành công dù không chạy bài kiểm thử">
                CLI CTest bình thường có thể không coi “0 tests” là lỗi. CI phải
                dùng <InlineCode>--no-tests=error</InlineCode> hoặc cấu hình kiểm thử{" "}
                <InlineCode>noTestsAction: error</InlineCode>.
              </Callout>

              <Lab>
                Tạo ba nhãn <InlineCode>unit</InlineCode>,{" "}
                <InlineCode>replay</InlineCode>,{" "}
                <InlineCode>integration</InlineCode>. Chạy riêng từng tầng,
                chạy song song toàn bộ kiểm thử và sinh báo cáo JUnit.
              </Lab>

              <Checkpoint
                question="Tại sao liên kết bài kiểm thử trực tiếp với target trong cây dựng chưa chứng minh gói có thể sử dụng được?"
                answer="Bài kiểm thử đó dùng đồ thị nội bộ cùng đường dẫn mã nguồn/cây dựng. Nó không kiểm tra cấu trúc cài đặt, target đã xuất, việc chuyển tiếp phụ thuộc hoặc khả năng di chuyển. Cần cài đặt rồi cấu hình một dự án sử dụng độc lập bằng find_package."
              />
            </GuideSection>

            <GuideSection
              id="quality-performance"
              number="12"
              eyebrow="Chất lượng kỹ thuật"
              title="Cờ chất lượng là chính sách target được bật có chủ đích"
              lead="Cảnh báo, sanitizer, clang-tidy, PCH, unity và LTO có những đánh đổi khác nhau; đừng dồn tất cả vào CMAKE_CXX_FLAGS toàn cục."
            >
              <CodeBlock label="Target chính sách tái sử dụng, liên kết PRIVATE">
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
    "Giao diện trình biên dịch này không hỗ trợ TICK_ENABLE_ASAN")
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
                      <th scope="col" className="px-4 py-3">Công cụ/tính năng</th>
                      <th scope="col" className="px-4 py-3">Phạm vi nên dùng</th>
                      <th scope="col" className="px-4 py-3">Rủi ro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Warnings / -Werror",
                        "Target nội bộ PRIVATE",
                        "Phá thư viện bên thứ ba/phần phía sau",
                      ]}
                    />
                    <TableRow
                      values={[
                        "ASan/UBSan",
                        "Biên dịch + liên kết cùng đồ thị target",
                        "Trộn thư viện chạy/cấu hình",
                      ]}
                    />
                    <TableRow
                      values={[
                        "PCH",
                        "Thường PRIVATE",
                        "Ép chính sách include lên bên sử dụng",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Dựng hợp nhất (unity build)",
                        "Chỉ bật sau khi đo",
                        "Vi phạm ODR/trùng tên",
                      ]}
                    />
                    <TableRow
                      values={[
                        "IPO/LTO",
                        "CheckIPOSupported + Release",
                        "Mức hỗ trợ của bộ công cụ/trình liên kết",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <p>
                Dựng nhanh bắt đầu từ đồ thị đúng: Ninja/chạy song song, phụ
                thuộc chính xác và bước sinh mã không chạy thừa. Sau đó mới đo
                PCH, unity, trình khởi chạy/bộ nhớ đệm trình biên dịch và IPO.
                Công cụ đo của CMake 4.x có thể đo quy trình sâu hơn nhưng không
                nên trở thành yêu cầu cho mốc 3.25.
              </p>

              <Callout tone="amber" title="Sanitizer phải đi qua cả biên dịch và liên kết">
                Chỉ thêm <InlineCode>-fsanitize</InlineCode> lúc biên dịch có
                thể tạo ký hiệu thư viện chạy chưa được định nghĩa khi liên kết.
                Chỉ thêm lúc liên kết thì mã kiểm tra không được sinh. Target
                chính sách giúp hai phần đi cùng nhau.
              </Callout>

              <Lab>
                Tạo cấu hình đặt sẵn Debug ASan và Release. Chạy cùng bộ kiểm
                thử đơn vị/phát lại, đo thời gian dựng sạch và dựng tăng dần,
                rồi chỉ bật PCH hoặc unity khi có mốc để so sánh.
              </Lab>

              <Checkpoint
                question="Tại sao target_precompile_headers(... PUBLIC ...) thường là mùi thiết kế?"
                answer="PCH thường là tối ưu cho phần triển khai của target. PUBLIC biến thứ tự/nội dung tệp tiêu đề thành yêu cầu của bên sử dụng, tăng liên kết phụ thuộc và dễ gây không khớp. Chỉ dùng PUBLIC khi đó thực sự là quy ước cần để bên sử dụng biên dịch đúng."
              />
            </GuideSection>

            <GuideSection
              id="install-export-package"
              number="13"
              eyebrow="Quy ước với bên sử dụng"
              title="Cây dựng thành công chưa có nghĩa là sản phẩm đạt"
              lead="Thư viện dùng trong thực tế phải cài được, xuất target có không gian tên và được một dự án sử dụng độc lập tìm thấy ở tiền tố khác."
            >
              <CodeBlock label="Cài target + tập tệp tiêu đề công khai">
                {`include(GNUInstallDirs)

# Cả hai thư viện công khai đều đăng ký FILE_SET tên api.
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

              <CodeBlock label="Cấu hình gói + phiên bản">
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

              <CodeBlock label="Dự án sử dụng không biết cây mã nguồn">
                {`find_package(TickPlatform 1 CONFIG REQUIRED)

add_executable(research_replay main.cpp)
target_link_libraries(research_replay
  PRIVATE Tick::feed_decoder
)`}
              </CodeBlock>

              <p>
                Mẫu cấu hình dùng <InlineCode>@PACKAGE_INIT@</InlineCode> và{" "}
                <InlineCode>find_dependency()</InlineCode> cho mọi phụ thuộc còn
                được giao diện xuất nhắc tới, kể cả{" "}
                <InlineCode>LINK_ONLY</InlineCode> của thư viện tĩnh. Giao diện
                không được chứa đường dẫn include tuyệt đối tới máy dựng hoặc
                phụ thuộc; phụ thuộc nên được diễn tả bằng target được nhập và được
                tìm lại trong môi trường của bên sử dụng.
              </p>

              <Flow
                items={[
                  ["1", "Dựng", "Tạo sản phẩm nội bộ"],
                  ["2", "Cài đặt", "Đưa vào tiền tố tạm"],
                  ["3", "Di chuyển", "Chuyển/sao chép tiền tố sang đường dẫn khác"],
                  ["4", "Sử dụng", "find_package từ dự án sạch"],
                  ["5", "Chạy", "Kiểm tra nhanh các phụ thuộc khi chạy"],
                ]}
              />

              <Callout tone="red" title="INSTALL_INTERFACE tuyệt đối phá khả năng di chuyển">
                Đừng xuất <InlineCode>/home/me/deps/include</InlineCode> hoặc
                đường dẫn mã nguồn vào gói. Bên sử dụng trên máy hoặc vùng chứa
                khác sẽ nhận target trỏ về đường dẫn không tồn tại.
              </Callout>

              <Lab>
                Cài TickPlatform vào tiền tố tạm, chuyển tiền tố sang thư mục
                khác, rồi cấu hình và dựng một dự án sử dụng độc lập chỉ với{" "}
                <InlineCode>CMAKE_PREFIX_PATH</InlineCode>. Không cho dự án đó
                nhìn cây mã nguồn hoặc cây dựng gốc.
              </Lab>

              <Checkpoint
                question="install(TARGETS) và install(EXPORT) giải quyết hai việc khác nhau thế nào?"
                answer="install(TARGETS) đặt sản phẩm/tệp tiêu đề vào cây cài đặt và gắn target vào tập xuất. install(EXPORT) sinh tệp CMake mô tả các target được nhập để bên sử dụng tải lại đồ thị với không gian tên."
              />
            </GuideSection>

            <GuideSection
              id="diagnostics-performance"
              number="14"
              eyebrow="Ưu tiên bằng chứng"
              title="Phân loại lỗi trước khi xóa cây dựng"
              lead="Cấu hình, biên dịch, liên kết, kiểm thử, cài đặt và lúc chạy là sáu lớp khác nhau. Mỗi lớp có bằng chứng và công cụ riêng."
            >
              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Giai đoạn</th>
                      <th scope="col" className="px-4 py-3">Biểu hiện</th>
                      <th scope="col" className="px-4 py-3">Bằng chứng đầu tiên</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "Cấu hình",
                        "Không tìm thấy gói/trình biên dịch",
                        "--debug-find, bộ nhớ đệm, bộ công cụ",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Biên dịch",
                        "Tệp tiêu đề/định nghĩa/chuẩn sai",
                        "dựng --verbose, compile_commands",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Liên kết",
                        "Ký hiệu chưa được định nghĩa hoặc bị trùng (undefined/duplicate symbol)",
                        "Lệnh liên kết, cạnh target, ABI/cấu hình",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Kiểm thử",
                        "Không tìm thấy/chập chờn/hết thời gian",
                        "ctest -N/-V, nhãn/thuộc tính",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Cài đặt",
                        "Thiếu tệp tiêu đề/cấu hình",
                        "install_manifest + cây tạm",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Lúc chạy",
                        "Trình nạp/phần bổ trợ không tìm thấy",
                        "RPATH/kiểm tra phụ thuộc lúc chạy",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <CodeBlock label="Bộ công cụ chẩn đoán">
                {`# Theo dõi bước cấu hình theo tệp/mô-đun cần xem
cmake -S . -B build/trace \
  --trace-expand \
  --trace-source=cmake/FindFeedSDK.cmake

# Tìm kiếm gói
cmake -S . -B build/find --debug-find

# Đồ thị và các lệnh dựng gốc
cmake --graphviz=build/graph.dot build/dev
cmake --build build/dev --verbose

# Làm sạch bộ nhớ đệm có chủ đích (CMake 3.24+)
cmake --fresh -S . -B build/dev -G Ninja

# Tìm bài kiểm thử/xem kết quả chi tiết
ctest --test-dir build/dev -N
ctest --test-dir build/dev -V -R replay`}
              </CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <SmallRule
                  label="Include sai"
                  title="Lần theo cạnh phụ thuộc"
                  body="Xem lệnh biên dịch rồi tìm target nào đưa đường dẫn include vào chuỗi phụ thuộc."
                />
                <SmallRule
                  label="Ký hiệu chưa được định nghĩa"
                  title="Không thêm thư viện theo phỏng đoán"
                  body="Xác minh nơi sở hữu ký hiệu, thứ tự/khả năng hiển thị khi liên kết, ABI, ánh xạ cấu hình và cạnh PUBLIC/PRIVATE."
                />
                <SmallRule
                  label="Bộ nhớ đệm cũ"
                  title="Hiểu khóa trước khi làm mới"
                  body="Trình biên dịch, trình sinh, tiền tố và tùy chọn cũ có thể nằm trong CMakeCache; --fresh là thao tác đặt lại có chủ đích."
                />
                <SmallRule
                  label="Dựng chậm"
                  title="Đo cấu hình/biên dịch/liên kết"
                  body="Graphviz, kết quả chi tiết và cơ sở dữ liệu biên dịch cho biết cấu trúc; công cụ đo thời gian giúp tìm nút thắt."
                />
              </div>

              <Callout tone="amber" title="Xóa cây dựng là phép thử, không phải nguyên nhân gốc">
                Lần dựng sạch thành công chứng minh trạng thái cũ có vai trò,
                nhưng chưa cho biết khóa bộ nhớ đệm hay quy tắc nào sai. Phải tái
                hiện lỗi dựng tăng dần và sửa mô hình phụ thuộc để lỗi không quay
                lại.
              </Callout>

              <Lab>
                Cố ý tạo năm lỗi: thiếu gói, thiếu include, ký hiệu chưa định
                nghĩa, không có bài kiểm thử và thiếu tệp tiêu đề đã cài. Với
                mỗi lỗi, ghi giai đoạn, bằng chứng từ lệnh và target/thuộc tính
                cần sửa.
              </Lab>

              <Checkpoint
                question="Lệnh biên dịch có -I đúng nhưng tệp tiêu đề vẫn sai phiên bản thì kiểm tra gì?"
                answer="Kiểm tra thứ tự đường dẫn include, các bản sao cài đặt/mã nguồn bị trùng, kết quả cũ của trình sinh và target nào thêm đường dẫn. Sau đó dùng --debug-find để kiểm tra target được nhập hoặc cấu hình gói đã được chọn; đừng chỉ thêm một -I khác lên đầu."
              />
            </GuideSection>

            <GuideSection
              id="legacy-migration-ci"
              number="15"
              eyebrow="Quyền sở hữu khi thay đổi"
              title="Chuyển đổi hệ thống cũ theo ranh giới, không viết lại toàn bộ"
              lead="Mục tiêu đầu tiên là tái hiện cách dựng cũ và khóa hành vi. Sau đó mới chuyển trạng thái toàn cục thành quy ước target của từng mô-đun."
            >
              <MigrationSteps />

              <CodeBlock label="Trước: trạng thái toàn cục xung quanh">
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

              <CodeBlock label="Sau: ranh giới tường minh, giữ nguyên tên sản phẩm">
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
                trình biên dịch có thể dùng chuẩn mới hơn. Ranh giới thực sự
                phải biên dịch đúng C++11 nên đặt{" "}
                <InlineCode>CXX_STANDARD</InlineCode>, yêu cầu bắt buộc/không
                phần mở rộng như trên và giữ một nhánh CI kiểm chứng. Phần lõi
                mới vẫn dùng <InlineCode>cxx_std_20</InlineCode>; đừng hạ chuẩn
                toàn nền tảng. Việc nâng chính sách cũng làm từng đợt với danh
                sách cảnh báo, không đặt tất cả về{" "}
                <InlineCode>OLD</InlineCode>.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Nhánh CI</th>
                      <th scope="col" className="px-4 py-3">Bằng chứng</th>
                      <th scope="col" className="px-4 py-3">Bắt lỗi tái diễn</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow
                      values={[
                        "GCC Debug + ASan/UBSan",
                        "Đơn vị + phát lại",
                        "Bộ nhớ/UB/điều bất biến",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Clang Debug + phân tích",
                        "Warnings/clang-tidy",
                        "Tính đa nền tảng/dùng sai API",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Release",
                        "Đầy đủ kiểm thử + xu hướng đo hiệu năng",
                        "Lỗi chỉ xuất hiện khi tối ưu",
                      ]}
                    />
                    <TableRow
                      values={[
                        "MSVC / Windows",
                        "Dựng/kiểm thử nhiều cấu hình",
                        "Giả định về trình sinh/trình biên dịch",
                      ]}
                    />
                    <TableRow
                      values={[
                        "Dự án sử dụng sau cài đặt",
                        "Kiểm tra nhanh find_package",
                        "Xuất/khả năng di chuyển",
                      ]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <Callout tone="green" title="Mỗi bước chuyển đổi đều có đường quay lại">
                Giữ hai cách dựng và cổng kiểm tra tương đương cho tới khi sản
                phẩm, kiểm thử và các bên sử dụng khớp nhau. Một commit chỉ
                chuyển một ranh giới giúp tìm commit gây lỗi và quay lại; xóa
                lớp tương thích sau khi bên sử dụng cuối cùng đã chuyển đổi.
              </Callout>

              <Lab>
                Chọn một bộ chuyển đổi luồng dữ liệu cũ. Ghi lại các lệnh cấu
                hình/dựng/kiểm thử, dòng biên dịch/liên kết và tổng kiểm/hành vi
                của sản phẩm. Bọc phụ thuộc dựng sẵn thành target được nhập, rồi thay
                từng nhóm include, định nghĩa và cờ toàn cục mà vẫn giữ kết quả.
              </Lab>

              <Checkpoint
                question="Thứ tự chuyển đổi CMake toàn cục an toàn là gì?"
                answer="Chốt mốc và cấu hình đặt sẵn trước; vẽ đồ thị; bọc target bên ngoài/dựng sẵn; chuyển từng mô-đun sang mã nguồn, include, định nghĩa, tính năng và liên kết theo target; sửa bước sinh mã; thêm kiểm thử dự án sử dụng sau cài đặt; nâng chính sách; cuối cùng xóa lớp tương thích toàn cục khi kết quả tương đương và các bên sử dụng đều hoạt động."
              />
            </GuideSection>

            <GuideSection
              id="worldquant-capstone"
              number="16"
              eyebrow="Dự án tổng kết WorldQuant"
              title="Hoàn thiện TickPlatform với đầy đủ bằng chứng"
              lead="Dự án tổng kết gom toàn bộ bài: ranh giới C++11 cũ, lõi C++20, mã luồng dữ liệu được sinh, phát lại xác định, dự án sử dụng gói và ma trận CI."
            >
              <FileTree
                lines={[
                  "TickPlatform/",
                  "├── model/                 # kiểu sự kiện/giá trị",
                  "├── legacy_adapter/        # ranh giới C++11",
                  "├── feed_codegen/          # lược đồ → C++",
                  "├── codecs/{equities,futures}/",
                  "├── order_book/            # điều bất biến/trạng thái",
                  "├── interval_features/     # OHLCV/thống kê",
                  "├── tools/tick_replay/",
                  "├── tests/{unit,golden,integration}/",
                  "├── cmake/{toolchains,packages}/",
                  "└── CMakePresets.json",
                ]}
              />

              <CodeBlock label="Khung dự án tổng kết ở cấp cao nhất">
                {`cmake_minimum_required(VERSION 3.25)
project(TickPlatform VERSION 1.0.0 LANGUAGES CXX)

option(TICK_ENABLE_EQUITIES "Dựng bộ chuyển đổi luồng cổ phiếu" ON)
option(TICK_ENABLE_FUTURES "Dựng bộ chuyển đổi luồng hợp đồng tương lai" ON)
option(TICK_ENABLE_ASAN "Bật AddressSanitizer" OFF)

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

              <h3>Điều kiện hoàn thành</h3>
              <Checklist
                items={[
                  "Không dùng include_directories, link_directories hoặc CMAKE_CXX_FLAGS toàn cục.",
                  "Mỗi target khai báo mã nguồn, chuẩn và yêu cầu sử dụng đúng quyền sở hữu.",
                  "Sửa lược đồ hoặc tập lệnh sinh sẽ dựng lại đúng bộ giải mã được sinh, không chạm cây mã nguồn.",
                  "CTest có nhãn đơn vị, phát lại và tích hợp; CI báo lỗi nếu không có bài kiểm thử.",
                  "Bộ chuyển đổi C++11 cũ không hạ chuẩn của lõi C++20.",
                  "Cấu hình Debug có sanitizer và cấu hình Release dùng cây dựng riêng.",
                  "Cài đặt/xuất tạo target Tick:: và dự án sử dụng có thể di chuyển, tìm được bằng find_package.",
                  "Ma trận CI ghi SHA mã nguồn, phiên bản trình biên dịch/CMake, cấu hình đặt sẵn và phiên bản dữ liệu kiểm thử/lược đồ.",
                  "Thêm luồng dữ liệu mới chỉ thêm bộ chuyển đổi/cạnh cần thiết, không sửa mọi target.",
                  "Có đường quay lại và bằng chứng tương đương khi chuyển đổi nền tảng cũ.",
                ]}
              />

              <h3>Khung trả lời phỏng vấn 5 bước</h3>
              <Flow
                items={[
                  ["1", "Nêu ràng buộc", "ABI cũ, luồng mới, hệ điều hành/trình biên dịch, CI"],
                  ["2", "Vẽ các target", "Quyền sở hữu + cạnh phụ thuộc công khai"],
                  ["3", "Bảo vệ cách dựng tăng dần", "Kết quả được sinh + đầu vào chính xác"],
                  ["4", "Chứng minh khả năng bàn giao", "CTest + dự án dùng sau cài đặt + ma trận"],
                  ["5", "Lập kế hoạch chuyển đổi", "Tương đương, triển khai, quay lại, khả năng quan sát"],
                ]}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <InterviewCard
                  question="PUBLIC hay PRIVATE cho tick_model?"
                  signal="Đọc tệp tiêu đề công khai của bộ giải mã. Nếu API để lộ kiểu sự kiện/mô hình, bên sử dụng cần cạnh PUBLIC; nếu chỉ .cpp dùng thì PRIVATE."
                />
                <InterviewCard
                  question="Thêm luồng dữ liệu mới thế nào?"
                  signal="Bước sinh mã từ lược đồ có OUTPUT/DEPENDS, target bộ chuyển đổi riêng, dữ liệu phát lại chuẩn có phiên bản và đồ thị không làm target không liên quan dựng lại."
                />
                <InterviewCard
                  question="CI nào đủ tin?"
                  signal="Ma trận trình biên dịch/cấu hình, sanitizer, --no-tests=error, phát lại Release, dự án dùng sau cài đặt và nguồn gốc sản phẩm; không chỉ 'cmake --build thành công'."
                />
                <InterviewCard
                  question="Chuyển đổi hệ thống cũ ra sao?"
                  signal="Chốt mốc → ranh giới nhập → chuyển từng target → đối chiếu hai cách → chuyển bên sử dụng → xóa lớp tương thích; mỗi bước đều quay lại được."
                />
              </div>

              <Callout tone="green" title="Bài thực hành đã có trong Recall">
                Bộ phỏng vấn thử WorldQuant có tình huống tạo{" "}
                <InlineCode>feed_decoder</InlineCode>, chương trình kiểm thử, C++20,
                yêu cầu sử dụng và CTest. Học xong hướng dẫn này, hãy làm lại
                tình huống mà không nhìn đáp án rồi giải thích phần mở rộng về
                sanitizer, CI và cài đặt.
              </Callout>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/mock-interview"
                  className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245748]"
                >
                  Vào phỏng vấn thử →
                </Link>
                <Link
                  href="/?deck=cmake-build-systems"
                  className="rounded-2xl border border-[#173f35]/15 bg-white/70 px-5 py-3 text-sm font-bold text-[#356b58] transition hover:bg-white"
                >
                  Mở bộ thẻ CMake →
                </Link>
              </div>

              <Checkpoint
                question="Một lời giải CMake tốt cho mô tả công việc này phải chứng minh điều gì ngoài việc dựng thành công?"
                answer="Quyền sở hữu target và quy ước truyền tiếp đúng; bước sinh mã tăng dần đúng; kiểm thử có tầng và không rỗng; gói cài đặt và sử dụng được; ma trận trình biên dịch/cấu hình có thể tái lập; việc chuyển đổi hệ thống cũ có đối chiếu tương đương và đường quay lại. Dựng thành công chỉ là một bằng chứng nhỏ."
              />
            </GuideSection>

            <section
              id="official-sources"
              className="scroll-mt-6 border-t border-[#173f35]/15 py-12"
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.17em] text-[#ba4b2f] uppercase">
                Nguồn tham khảo chính
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Đọc tài liệu theo câu hỏi, không học thuộc lòng.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64736c]">
                Toàn bộ nguồn ngoài trong hướng dẫn là tài liệu chính thức của
                CMake. Trang “mới nhất” có thể mô tả tính năng mới hơn mốc 3.25,
                nên luôn kiểm tra ghi chú phiên bản của lệnh hoặc thuộc tính.
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
          <span className="block text-xs text-[#64736c]">
            Hướng dẫn hệ thống dựng
          </span>
        </span>
      </Link>
      <nav
        className="flex flex-wrap items-center gap-2 text-sm"
        aria-label="Điều hướng"
      >
        <Link
          href="/worldquant"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Trung tâm chuẩn bị
        </Link>
        <Link
          href="/learn/tick-data-order-book"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Học dữ liệu tick
        </Link>
        <Link
          href="/"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Luyện thẻ
        </Link>
        <Link
          href="/mock-interview"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Phỏng vấn thử
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 font-bold transition hover:border-[#356b58]/35"
        >
          Quản trị
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
          Đồ thị target TickPlatform
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
        <PreviewMetric label="Đơn vị" value="target" />
        <PreviewMetric label="Quy ước" value="yêu cầu sử dụng" />
        <PreviewMetric label="Bằng chứng" value="kiểm thử/cài đặt" />
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
        aria-label="Mục lục CMake trên thiết bị di động"
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
        Lộ trình đọc
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
          Đồ thị target → yêu cầu sử dụng → dựng xác định → bằng chứng kiểm
          thử/cài đặt → CI.
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
        Bài thực hành nối tiếp
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
            Bài kiểm tra xác nhận
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
    ["01", "Chốt mốc", "Cấu hình đặt sẵn + bằng chứng dựng sạch/kiểm thử/sản phẩm."],
    ["02", "Lập bản đồ trạng thái xung quanh", "Thư mục include, định nghĩa, cờ và đường dẫn liên kết toàn cục."],
    ["03", "Vẽ đồ thị target", "Quyền sở hữu mô-đun và các cạnh API công khai."],
    ["04", "Bọc phụ thuộc ngoài", "Target IMPORTED cho SDK/thành phần cũ dựng sẵn."],
    ["05", "Chuyển target lá", "Khai báo mã nguồn, thư mục include, chuẩn C++ và liên kết."],
    ["06", "Sửa bước sinh mã", "OUTPUT/DEPENDS và kết quả trong cây dựng."],
    ["07", "Đối chiếu hai cách", "Cách dựng cũ/mới chạy cùng dữ liệu kiểm thử."],
    ["08", "Kiểm tra dự án sử dụng sau cài đặt", "Ranh giới gói trước khi chuyển."],
    ["09", "Nâng chính sách", "Xử lý cảnh báo theo đợt, không đặt OLD hàng loạt."],
    ["10", "Gỡ lớp tương thích", "Sau khi bên sử dụng cuối cùng chuyển xong và hết thời gian quay lại."],
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
        Câu hỏi đào sâu khi phỏng vấn
      </p>
      <p className="mt-2 font-semibold leading-7">{question}</p>
      <p className="mt-3 text-sm leading-6 text-[#64736c]">{signal}</p>
    </div>
  );
}
