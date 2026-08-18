import type { Metadata } from "next";
import Link from "next/link";

import {
  TICK_DATA_GUIDE_CHAPTERS,
  TICK_DATA_GUIDE_SOURCES,
} from "@/lib/learn/tick-data-guide";

export const metadata: Metadata = {
  title: "Dữ liệu tick và sổ lệnh từ số 0 — cppinterview",
  description:
    "Bài nhập môn có hệ thống về sự kiện dữ liệu thị trường, MBO/MBP, thứ tự sự kiện, khôi phục dữ liệu và thống kê giao dịch cho phỏng vấn C++.",
};

const codeClass =
  "overflow-x-auto rounded-2xl border border-white/10 bg-[#0b241d] p-5 font-mono text-[13px] leading-7 text-[#dcebe3] shadow-[0_18px_50px_rgba(11,36,29,0.16)]";

export default function TickDataOrderBookGuide() {
  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <GuideHeader />

        <section className="relative mt-7 min-w-0 overflow-hidden rounded-[2.25rem] border border-[#173f35]/15 bg-[#173f35] px-6 py-8 text-white shadow-[0_24px_90px_rgba(23,63,53,0.16)] sm:px-10 sm:py-11 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-12">
          <div className="relative z-10 min-w-0">
            <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d7ff91] uppercase">
              Nền tảng dữ liệu thị trường
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              Dữ liệu tick và
              <span className="block sm:inline"> Sổ lệnh</span>
              <span className="block text-[#d7ff91]">từ số 0.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Bài này dành cho người đã biết C++ nhưng chưa biết về giao dịch.
              Mục tiêu là giúp bạn hiểu dữ liệu thị trường đang mô tả điều gì,
              cần giữ trạng thái nào và vì sao một bộ xử lý luồng dữ liệu đúng
              khó hơn việc đọc vài cấu trúc dữ liệu.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase">
              <HeroChip>35–45 phút</HeroChip>
              <HeroChip>7 chương</HeroChip>
              <HeroChip>Ví dụ C++20</HeroChip>
              <HeroChip>Không cần kiến thức giao dịch</HeroChip>
            </div>

            <div className="mt-8 flex min-w-0 flex-wrap gap-3">
              <a
                href="#market-first-principles"
                className="w-full rounded-2xl bg-[#d7ff91] px-5 py-3 text-center text-sm font-bold text-[#173f35] transition hover:bg-white sm:w-auto"
              >
                Bắt đầu từ giá mua / giá bán ↓
              </a>
              <Link
                href="/worldquant/tick-replay-lab"
                className="w-full rounded-2xl border border-[#d7ff91]/35 bg-[#d7ff91]/10 px-5 py-3 text-center text-sm font-bold text-[#d7ff91] transition hover:bg-[#d7ff91]/18 sm:w-auto"
              >
                Mở Tick Replay Lab
              </Link>
              <Link
                href="/worldquant"
                className="w-full rounded-2xl border border-white/20 bg-white/8 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/14 sm:w-auto"
              >
                Về Trung tâm chuẩn bị
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-10 min-w-0 max-w-full lg:mt-3">
            <OrderBookPreview />
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
                Đọc đặc tả của sở giao dịch trước khi tổng quát hóa
              </h2>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-[#71574a]">
                Mã ký tự, ý nghĩa của khối lượng, đơn vị đánh số thứ tự và quy
                trình khôi phục đều phụ thuộc từng luồng dữ liệu. Ví dụ Nasdaq
                và CME trong bài giúp minh họa cách suy nghĩ, không phải giao
                thức chung của toàn bộ thị trường.
              </p>
            </div>
          </div>
        </section>

        <MobileTableOfContents />

        <div className="mt-10 grid items-start gap-10 xl:grid-cols-[250px_minmax(0,1fr)]">
          <GuideSidebar />

          <article className="min-w-0 max-w-[980px]">
            <GuideSection
              id="market-first-principles"
              number="01"
              eyebrow="Nguyên lý nền tảng"
              title="Sổ lệnh (order book) đang lưu điều gì?"
              lead="Trước khi nói về tick hay gói tin, cần hiểu trạng thái mà hệ thống đang cố dựng lại."
            >
              <p>
                Một <strong>lệnh giới hạn (limit order)</strong> cho biết có
                người muốn mua hoặc bán một khối lượng tại mức giá giới hạn.
                Các lệnh mua đang chờ tạo thành phía <Term>bid (mua)</Term>; các
                lệnh bán đang chờ tạo thành phía <Term>ask (bán)</Term>. Mức mua
                cao nhất là <Term>best bid (giá mua tốt nhất)</Term>, mức bán
                thấp nhất là <Term>best ask (giá bán tốt nhất)</Term>.
              </p>

              <div className="my-7 grid gap-4 md:grid-cols-2">
                <ConceptCard
                  label="BID · người đang muốn mua"
                  tone="green"
                  rows={[
                    ["100.00", "50", "giá mua tốt nhất"],
                    ["99.99", "70", ""],
                  ]}
                />
                <ConceptCard
                  label="ASK · người đang muốn bán"
                  tone="red"
                  rows={[
                    ["100.01", "30", "giá bán tốt nhất"],
                    ["100.02", "40", ""],
                  ]}
                />
              </div>

              <Formula>
                spread (chênh lệch giá) = giá bán tốt nhất − giá mua tốt nhất =
                100.01 − 100.00 = 0.01
              </Formula>

              <p>
                Sổ lệnh là <strong>trạng thái hiện tại</strong> của các lệnh còn
                hiệu lực; dòng lịch sử giao dịch là{" "}
                <strong>những giao dịch đã xảy ra</strong>. Hai phần này có liên
                quan nhưng không giống nhau.
              </p>

              <div className="my-7 overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
                <div className="grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#173f35]/10 bg-[#edf0e8] px-4 py-3 font-mono text-[10px] font-bold tracking-wide uppercase">
                  <span>Sự kiện</span>
                  <span>Sổ lệnh sau sự kiện</span>
                  <span>Lịch sử giao dịch</span>
                </div>
                <TimelineRow
                  event="Thêm lệnh mua"
                  book="100.00 × 50 xuất hiện"
                  tape="Không có giao dịch"
                />
                <TimelineRow
                  event="Thêm lệnh bán"
                  book="100.01 × 30 xuất hiện"
                  tape="Không có giao dịch"
                />
                <TimelineRow
                  event="Khớp 10"
                  book="Lệnh mua còn 100.00 × 40"
                  tape="Có thể ghi nhận 100.00 × 10"
                  last
                />
              </div>

              <Checkpoint
                question="Lệnh còn hiệu lực khác giao dịch đã xảy ra như thế nào?"
                answer="Lệnh còn hiệu lực là ý định mua hoặc bán vẫn nằm trong sổ lệnh với một khối lượng còn lại. Giao dịch là lần khớp lệnh đã xảy ra trong quá khứ. Một lần khớp có thể làm giảm khối lượng của lệnh, nhưng bản ghi giao dịch không phải chính lệnh đó."
              />
            </GuideSection>

            <GuideSection
              id="tick-event-pipeline"
              number="02"
              eyebrow="Mô hình tư duy"
              title="Tick không đồng nghĩa với giao dịch"
              lead="Trong hệ thống dữ liệu thị trường, “tick” nên được hiểu rộng là một sự kiện mới từ luồng dữ liệu."
            >
              <p>
                Sự kiện có thể là thêm, hủy hoặc khớp lệnh; bản ghi giao dịch;
                trạng thái phiên; tín hiệu duy trì kết nối (heartbeat) hoặc dữ
                liệu khôi phục. Vì mỗi loại phục vụ một thành phần khác nhau,
                đừng thiết kế một hàm{" "}
                <InlineCode>book.apply(any_tick)</InlineCode> rồi hy vọng mọi
                thứ tự đúng.
              </p>

              <PipelineDiagram />

              <div className="my-7 overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] tracking-wide uppercase">
                    <tr>
                      <th className="px-4 py-3">Sự kiện</th>
                      <th className="px-4 py-3">Sổ lệnh</th>
                      <th className="px-4 py-3">Giao dịch / thống kê</th>
                      <th className="px-4 py-3">Phiên / khôi phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    <RoutingRow values={["Thêm lệnh", "✓", "—", "—"]} />
                    <RoutingRow values={["Khớp lệnh", "✓", "có thể ✓", "—"]} />
                    <RoutingRow
                      values={["Giao dịch không hiển thị", "—", "✓", "—"]}
                    />
                    <RoutingRow values={["Dừng / mở lại", "—", "—", "✓"]} />
                    <RoutingRow
                      values={["Tín hiệu duy trì kết nối", "—", "—", "✓"]}
                      last
                    />
                  </tbody>
                </table>
              </div>

              <pre className={codeClass}>
                <code>{`using MarketEvent = std::variant<
    AddOrder,
    ReduceOrder,
    DeleteOrder,
    TradePrint,
    TradingStatus
>;

std::visit(EventRouter{book, tape, session}, event);`}</code>
              </pre>

              <KeyPoint>
                Một sự kiện có thể đi tới nhiều nhánh. Lần khớp lệnh có thể vừa
                giảm khối lượng lệnh đang hiển thị, vừa đóng góp vào thống kê
                giao dịch; nhưng một thông điệp giao dịch riêng có thể chỉ phục
                vụ lịch sử giao dịch và không thay đổi sổ lệnh đang hiển thị.
              </KeyPoint>

              <Checkpoint
                question="Vì sao trường khối lượng không có một ý nghĩa chung cho mọi thông điệp?"
                answer="Tùy thông điệp và luồng dữ liệu, khối lượng có thể là tổng tuyệt đối tại một mức giá, phần bị giảm, phần đã khớp hoặc tổng khối lượng mới. Cần đọc đặc tả trước khi quyết định dùng phép gán hay phép cộng hoặc trừ."
              />
            </GuideSection>

            <GuideSection
              id="safe-binary-parsing"
              number="03"
              eyebrow="Dữ liệu mạng → đối tượng giá trị"
              title="Từ byte thành sự kiện an toàn"
              lead="Dữ liệu mạng không phải đối tượng C++. Bộ phân tích là ranh giới kiểm tra đầu tiên của hệ thống."
            >
              <p>
                Luồng dữ liệu nhị phân quy định chính xác thứ tự byte, độ rộng
                trường, hệ số, phần đệm và độ dài thông điệp. Nasdaq ITCH chẳng
                hạn dùng thứ tự byte lớn trước (big-endian), số nguyên có độ
                rộng cố định, trường ASCII và giá biểu diễn bằng số nguyên có hệ
                số (fixed-point). Ánh xạ
                thẳng vùng đệm bằng <InlineCode>reinterpret_cast</InlineCode> có
                thể sai do căn chỉnh, phần đệm, thứ tự byte hoặc dữ liệu đầu vào
                bị cắt ngắn.
              </p>

              <ByteLayout />

              <pre className={codeClass}>
                <code>{`std::uint64_t read_be(std::span<const std::byte> bytes) {
    if (bytes.empty() || bytes.size() > 8) {
        throw ParseError{"invalid integer width"};
    }

    std::uint64_t value = 0;
    for (std::byte byte : bytes) {
        value = (value << 8)
              | std::to_integer<unsigned char>(byte);
    }
    return value;
}`}</code>
              </pre>

              <div className="my-7 grid gap-4 sm:grid-cols-2">
                <SmallRule
                  label="Giá"
                  title="Giữ giá ở dạng số nguyên có hệ số"
                  body="Giá trị thô 1.234.500 với hệ số 4 nghĩa là 123,4500. Giữ số nguyên làm giá trị chuẩn để việc làm tròn và phát lại luôn cho cùng kết quả."
                />
                <SmallRule
                  label="Giới hạn"
                  title="Kiểm tra trước khi lấy vùng con"
                  body="Bản ghi thiếu một byte phải trả lỗi phân tích và không chuyển một sự kiện chưa đầy đủ xuống bộ dựng sổ lệnh."
                />
                <SmallRule
                  label="Vòng đời"
                  title="Đừng giữ khung nhìn quá hạn"
                  body="string_view/span trỏ vào vùng đệm nhận chỉ hợp lệ khi quyền sở hữu bảo đảm vùng đệm tồn tại đủ lâu."
                />
                <SmallRule
                  label="Định danh"
                  title="ID luôn có phạm vi"
                  body="Khóa thường cần sở giao dịch, ngày giao dịch, kênh hoặc phân vùng và công cụ tài chính; một ID dạng số không phải định danh duy nhất toàn hệ thống."
                />
              </div>

              <div className="rounded-2xl border border-[#173f35]/12 bg-[#edf0e8] p-5">
                <p className="font-mono text-[10px] font-bold tracking-wide text-[#356b58] uppercase">
                  Danh sách kiểm tra bộ phân tích
                </p>
                <ol className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
                  {[
                    "Độ dài gói tin và bản ghi đã đủ chưa?",
                    "Loại thông điệp có được hỗ trợ không?",
                    "Thứ tự byte và hệ số đã được giải mã đúng chưa?",
                    "Kiểu liệt kê (enum), phía mua/bán và cờ có hợp lệ không?",
                    "Ngữ cảnh công cụ tài chính và phiên có đúng phạm vi không?",
                    "Số thứ tự và dấu thời gian đã được gắn chưa?",
                  ].map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="font-mono text-xs font-bold text-[#ba4b2f]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Checkpoint
                question="Dấu thời gian có thể thay số thứ tự để sắp xếp sự kiện không?"
                answer="Không. Số thứ tự thể hiện tính liên tục và thứ tự theo giao thức; dấu thời gian thể hiện ý nghĩa của một đồng hồ. Nhiều sự kiện có thể cùng dấu thời gian, đồng hồ có thể lệch và việc sắp theo thời gian có thể làm đổi thứ tự của giao thức."
              />
            </GuideSection>

            <GuideSection
              id="mbo-mbp"
              number="04"
              eyebrow="Trạng thái dẫn xuất"
              title="MBO, MBP và vòng đời lệnh"
              lead="Phần này biến luồng sự kiện đã sắp thứ tự thành trạng thái mà nhà nghiên cứu hoặc chiến lược có thể đọc."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="MBO · theo từng lệnh (Market-by-Order)"
                  title="Giữ từng lệnh"
                  bullets={[
                    "ID lệnh và khối lượng còn lại",
                    "Phía mua/bán, giá và công cụ tài chính",
                    "Độ ưu tiên tại từng mức giá",
                    "Có thể tổng hợp thành MBP",
                  ]}
                />
                <CompareCard
                  label="MBP · theo mức giá (Market-by-Price)"
                  title="Giữ mức giá tổng hợp"
                  bullets={[
                    "Giá → tổng khối lượng / số lệnh",
                    "Không biết đầy đủ định danh lệnh",
                    "Không suy ngược đầy đủ thứ tự ưu tiên",
                    "Nhẹ hơn cho nhiều thành phần sử dụng",
                  ]}
                />
              </div>

              <pre className={`${codeClass} my-7`}>
                <code>{`Chỉ mục ID lệnh
42 → bid, 100.00, qty 50 ─┐
77 → bid, 100.00, qty 20 ─┼─→ level 100.00 = 70
91 → ask, 100.01, qty 30 ─┘

Độ ưu tiên theo giá
100.00 bid: [42, 77]`}</code>
              </pre>

              <h3>Vòng đời phải bám đúng quy tắc của sở giao dịch</h3>
              <div className="my-5 space-y-2">
                <LifecycleRow
                  action="ADD"
                  description="Tạo định danh lệnh mới và thêm khối lượng vào mức giá."
                />
                <LifecycleRow
                  action="EXECUTE / REDUCE"
                  description="Giảm khối lượng còn lại; khi về không thì lệnh hết hiệu lực."
                />
                <LifecycleRow
                  action="DELETE"
                  description="Xóa toàn bộ phần còn lại của lệnh khỏi mọi chỉ mục."
                />
                <LifecycleRow
                  action="REPLACE"
                  description="Loại ID cũ, tạo ID mới và áp dụng quy tắc ưu tiên của sở giao dịch."
                />
              </div>

              <p>
                Với Nasdaq ITCH, <InlineCode>Executed With Price</InlineCode> vẫn
                giảm khối lượng tại <strong>giá hiển thị ban đầu</strong>; giá
                khớp lệnh phục vụ lịch sử và thống kê giao dịch. Thông điệp thay
                thế không gửi lại toàn bộ phía mua/bán, mã và thuộc tính, nên
                phải kế thừa chúng từ lệnh cũ.
              </p>

              <h3>Những điều bất biến cần bảo vệ</h3>
              <div className="my-5 grid gap-3 sm:grid-cols-2">
                {[
                  "Mọi lệnh còn hiệu lực đều có khối lượng còn lại lớn hơn 0.",
                  "Khối lượng tổng tại một mức giá bằng tổng các lệnh thuộc mức đó.",
                  "Mức giá có khối lượng bằng 0 phải bị xóa.",
                  "Một lệnh nằm đúng chỉ mục phía mua/bán, giá và công cụ tài chính.",
                  "Thao tác thay thế không để ID cũ và ID mới cùng tồn tại.",
                  "Sự kiện không hợp lệ không được làm trạng thái thay đổi dang dở.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-[#173f35]/10 bg-white/60 p-4 text-sm leading-6"
                  >
                    <span className="text-[#65a30d]">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <h3>Ảnh chụp trạng thái và cập nhật tăng dần</h3>
              <p>
                Luồng MBP thường cần ảnh chụp trạng thái để khởi tạo, rồi nối với
                các cập nhật trực tiếp tăng dần. Ảnh chụp không tự chứng minh nó
                còn mới; cần ID cập nhật hoặc dữ liệu điểm chuyển để tạo một
                chuỗi liên tục.
              </p>

              <SnapshotDiagram />

              <KeyPoint>
                Cập nhật khối lượng có thể là giá trị tuyệt đối hoặc phần chênh
                lệch. Số 0 có thể có nghĩa là xóa trong một luồng dữ liệu, nhưng
                đó không phải quy tắc chung. Độ sâu cũng có thể là dữ liệu của
                từng công cụ tài chính, không nên viết cố định cho toàn kênh.
              </KeyPoint>

              <div className="my-7 rounded-2xl border border-[#ba4b2f]/18 bg-[#fff4df] p-5 text-sm leading-7 text-[#71574a]">
                <strong className="text-[#8e3825]">
                  Ngoại lệ đáng biết:
                </strong>{" "}
                Sổ lệnh thông thường lấy giá mua cao nhất và giá bán thấp nhất,
                nhưng CME có các công cụ lợi suất, lãi suất hoặc repo dùng quy
                ước đảo ngược và đảo cả độ ưu tiên theo mức giá. Bộ so sánh cùng
                phép kiểm tra sổ lệnh bị chéo phải đọc dữ liệu của công cụ tài
                chính, không được viết cố định cho toàn hệ thống.
              </div>

              <Checkpoint
                question="Có MBP rồi có dựng lại chính xác từng lệnh và thứ tự ưu tiên không?"
                answer="Không. MBP chỉ giữ tổng tại từng mức giá. Nhiều tập lệnh khác nhau có thể tạo cùng một tổng, nên định danh và vị trí trong hàng đợi đã mất không thể được suy ngược duy nhất."
              />
            </GuideSection>

            <GuideSection
              id="sequencing-recovery"
              number="05"
              eyebrow="Tính đúng đắn khi mất gói tin"
              title="Khoảng trống số thứ tự và khôi phục"
              lead="UDP có thể làm mất, lặp hoặc đảo thứ tự gói tin. Sổ lệnh chỉ đáng tin khi tính liên tục đã được chứng minh."
            >
              <p>
                Luồng A/B là hai đường truyền của cùng một luồng dữ liệu logic. Mục
                tiêu là nhận gói tin nhanh nhất nhưng{" "}
                <strong>chỉ áp dụng đúng một lần</strong>, không phải áp dụng cả
                hai “cho chắc”.
              </p>

              <FeedTimeline />

              <div className="my-7 grid gap-4 md:grid-cols-3">
                <SequenceCase
                  expression="seq < expected"
                  title="Bị lặp / đến muộn"
                  body="Không áp dụng lại; có thể đối chiếu dấu vân tay để phát hiện dữ liệu khác nhau."
                />
                <SequenceCase
                  expression="seq == expected"
                  title="Liên tục"
                  body="Áp dụng toàn bộ như một giao dịch duy nhất, rồi cập nhật số thứ tự mong đợi theo giao thức."
                />
                <SequenceCase
                  expression="seq > expected"
                  title="Có khoảng trống"
                  body="Giữ tạm trong vùng đệm có giới hạn, đánh dấu kênh là đáng ngờ và bắt đầu khôi phục."
                />
              </div>

              <p>
                Cách tăng số thứ tự cũng không giống nhau ở mọi nơi: MoldUDP64
                đánh số thông điệp nên số tiếp theo = số đầu + số thông điệp;
                CME MDP đánh số gói tin nên số tiếp theo = số gói tin + 1. Đừng
                đặt tên quá chung rồi vô tình dùng sai đơn vị.
              </p>

              <RecoveryStateMachine />

              <h3>Khôi phục từ ảnh chụp trạng thái theo đúng thứ tự</h3>
              <ol className="my-5 space-y-3">
                {[
                  "Dừng xem trạng thái hiện tại là mới và giữ cập nhật trực tiếp trong hàng đợi có giới hạn.",
                  "Dựng ảnh chụp trong trạng thái tạm, không ghi đè sổ lệnh mà bên đọc đang dùng.",
                  "Đọc dữ liệu điểm chuyển để biết ảnh chụp đã chứa trạng thái đến số thứ tự nào.",
                  "Bỏ cập nhật tạm cũ, rồi áp dụng liên tục phần còn lại theo số thứ tự.",
                  "Kiểm tra các điều bất biến rồi công bố thế hệ trạng thái mới bằng thao tác nguyên tử.",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-4 rounded-2xl border border-[#173f35]/10 bg-white/60 p-4 text-sm leading-6"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#173f35] font-mono text-[10px] font-bold text-[#d7ff91]">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>

              <KeyPoint>
                Khi mất một gói tin, bạn chưa biết gói đó chứa công cụ tài chính
                nào. Mặc định nên xem toàn kênh là đáng ngờ; chỉ thu hẹp phạm vi
                khi số thứ tự theo từng công cụ hoặc bằng chứng khôi phục thực sự
                chứng minh được điều đó.
              </KeyPoint>

              <Checkpoint
                question="Vùng đệm chờ đầy trước khi gói tin thiếu quay lại thì làm gì?"
                answer="Không bỏ ngẫu nhiên một gói tin rồi tiếp tục. Chuyển trạng thái sang dựng lại đầy đủ từ ảnh chụp, giữ bằng chứng và chỉ công bố lại sau khi tính liên tục cùng các điều bất biến đã được chứng minh."
              />
            </GuideSection>

            <GuideSection
              id="trade-statistics"
              number="06"
              eyebrow="Lịch sử giao dịch và đặc trưng theo khoảng"
              title="Lịch sử giao dịch, OHLCV và hiệu chỉnh"
              lead="Thay đổi sổ lệnh và thống kê giao dịch là hai máy trạng thái có liên quan nhưng cần tách riêng."
            >
              <TradeForkDiagram />

              <p>
                Cờ cho phép công bố giúp tránh đếm hai lần một số khối lượng đấu
                giá hoặc giao dịch chéo, nhưng không phải mọi giao dịch có thể
                công bố đều được đưa vào mọi bộ dữ liệu. Điều kiện sử dụng còn
                phụ thuộc loại giao dịch, phiên, đấu giá và chính sách với dữ
                liệu không đúng thứ tự.
              </p>

              <div className="my-7 overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
                <div className="grid grid-cols-[90px_110px_90px_minmax(0,1fr)] border-b border-[#173f35]/10 bg-[#edf0e8] px-4 py-3 font-mono text-[10px] font-bold tracking-wide uppercase">
                  <span>Thời gian</span>
                  <span>Giá × lượng</span>
                  <span>Được tính?</span>
                  <span>Ảnh hưởng</span>
                </div>
                <TradeRow
                  time="10:00:10"
                  trade="100.00 × 5"
                  eligible="Có"
                  effect="Mở khoảng"
                />
                <TradeRow
                  time="10:00:20"
                  trade="100.02 × 3"
                  eligible="Có"
                  effect="Đỉnh/giá đóng mới"
                />
                <TradeRow
                  time="10:00:30"
                  trade="100.01 × 7"
                  eligible="Không"
                  effect="Không cộng vào khoảng"
                />
                <TradeRow
                  time="10:01:00"
                  trade="100.03 × 2"
                  eligible="Có"
                  effect="Thuộc khoảng sau"
                  last
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormulaCard
                  label="Khoảng trước khi hiệu chỉnh"
                  lines={[
                    "O = 100.00 · H = 100.02",
                    "L = 100.00 · C = 100.02",
                    "V = 5 + 3 = 8",
                    "VWAP = (100×5 + 100.02×3) / 8",
                    "VWAP = 100.0075",
                  ]}
                />
                <FormulaCard
                  label="Sau khi hủy giao dịch 100.02 × 3"
                  lines={[
                    "O = H = L = C = 100.00",
                    "V = 5",
                    "VWAP = 100.00",
                    "revision = revision + 1",
                    "reason = trade_break",
                  ]}
                />
              </div>

              <p>
                Để hoàn tác một giao dịch, bộ tổng hợp cần định danh có đúng phạm
                vi và giữ phần đóng góp cũ. Giá trị giao dịch chuẩn nên dùng phép
                tính trên số nguyên có hệ số và kiểm tra tràn. Khoảng thời gian cần có quy
                ước rõ như <InlineCode>[bắt đầu, kết thúc)</InlineCode>; sự kiện
                đúng 10:01:00 thuộc khoảng sau.
              </p>

              <h3>Đừng nén mọi đồng hồ thành một dấu thời gian</h3>
              <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ClockCard label="Thời gian nguồn" body="Sự kiện tại bộ khớp lệnh" />
                <ClockCard label="Thời gian gửi" body="Nhà phát hành đưa dữ liệu lên mạng" />
                <ClockCard label="Thời gian nhận" body="NIC/tiến trình nhận gói tin" />
                <ClockCard label="Thời gian xử lý" body="Thành phần phía sau nhận kết quả" />
              </div>

              <Checkpoint
                question="Việc hủy giao dịch có nên hoàn tác sổ lệnh hiện tại không?"
                answer="Mặc định là không. Trong các luồng như Nasdaq ITCH, Broken Trade sửa lịch sử và thống kê giao dịch nhưng không thay đổi sổ lệnh đang hiển thị. Sổ lệnh đã tiến theo vòng đời lệnh riêng."
              />
            </GuideSection>

            <GuideSection
              id="interview-framework"
              number="07"
              eyebrow="Từ học đến trả lời"
              title="Khung trả lời phỏng vấn"
              lead="Tình huống giao dịch thường rộng. Một thứ tự trả lời ổn định giúp bạn không nhảy thẳng vào cấu trúc lưu trữ hoặc kỹ thuật không khóa quá sớm."
            >
              <div className="my-7 grid gap-3">
                {[
                  ["01", "Đặc tả đầu vào", "Luồng dữ liệu, ý nghĩa thông điệp và mô hình lỗi là gì?"],
                  ["02", "Thứ tự và định danh", "Đơn vị đánh số và khóa theo phạm vi nào quyết định trạng thái?"],
                  ["03", "Trạng thái", "Nhật ký thô, sự kiện chuẩn hóa và trạng thái dẫn xuất cần giữ gì?"],
                  ["04", "Điều bất biến", "Điều gì luôn phải đúng sau mỗi lần chuyển trạng thái?"],
                  ["05", "Cấu trúc dữ liệu", "Tra cứu, cập nhật và công bố cần độ phức tạp cùng bộ nhớ thế nào?"],
                  ["06", "Lỗi và khôi phục", "Khoảng trống, dữ liệu lặp, sự kiện sai, tràn số hoặc tràn bộ đệm được xử lý ra sao?"],
                  ["07", "Kiểm thử và bằng chứng", "Phát lại, tổng kiểm, số đo và bản chụp gói tin nào chứng minh tính đúng đắn?"],
                  ["08", "Hiệu năng", "Chỉ sau khi đúng mới đo cấp phát, bộ nhớ đệm và độ trễ đuôi."],
                ].map(([number, title, body]) => (
                  <div
                    key={number}
                    className="grid gap-2 rounded-2xl border border-[#173f35]/10 bg-white/65 p-4 sm:grid-cols-[44px_170px_minmax(0,1fr)] sm:items-center"
                  >
                    <span className="font-mono text-xs font-bold text-[#ba4b2f]">
                      {number}
                    </span>
                    <strong>{title}</strong>
                    <span className="text-sm leading-6 text-[#64736c]">
                      {body}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl bg-[#173f35] p-6 text-white sm:p-8">
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
                  Dự án tổng kết đề xuất
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Bộ xử lý luồng dữ liệu mô phỏng, cho kết quả xác định
                </h3>
                <pre className="mt-5 overflow-x-auto rounded-2xl bg-black/18 p-5 font-mono text-xs leading-7 text-white/80">
                  <code>{`bộ phân tích → bộ xếp thứ tự → bộ định tuyến sự kiện
       → trạng thái MBO → khung nhìn MBP
       → trạng thái giao dịch/khoảng → công bố bất biến`}</code>
                </pre>
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/72 sm:grid-cols-2">
                  <li>✓ Bản ghi không hợp lệ không đổi mã băm trạng thái.</li>
                  <li>✓ Dữ liệu lặp không được áp dụng hai lần.</li>
                  <li>
                    ✓ Khoảng trống khiến kết quả bị đánh dấu là không còn đáng
                    tin cậy.
                  </li>
                  <li>✓ Khôi phục lấp khoảng trống trước khi công bố.</li>
                  <li>✓ Hủy giao dịch làm tăng phiên bản của khoảng.</li>
                  <li>✓ Phát lại luôn cho cùng một tổng kiểm.</li>
                </ul>
              </div>

              <div className="mt-7 rounded-3xl border border-[#79b82a]/35 bg-[#e8facb] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-wide text-[#526d1f] uppercase">
                    Bước tiếp theo
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    Giờ bạn đã có nền tảng để đọc 10 câu mới.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#52645c]">
                    Mở từng câu, thử trả lời trước rồi mới xem đáp án và tiêu chí
                    chấm.
                  </p>
                </div>
                <Link
                  href="/admin#review-queue"
                  className="mt-5 inline-flex shrink-0 rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white sm:mt-0"
                >
                  Tới danh sách chờ duyệt →
                </Link>
              </div>
            </GuideSection>

            <section className="scroll-mt-8 border-t border-[#173f35]/15 py-12">
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
                Nguồn tham khảo chính
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Nguồn dùng để kiểm chứng bài
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#64736c]">
                Bài viết diễn giải lại cho người mới; khi triển khai luồng dữ
                liệu thật, đặc tả của sở giao dịch và phiên bản đang dùng mới là
                nguồn đáng tin cậy nhất.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {TICK_DATA_GUIDE_SOURCES.map((source) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-[#173f35]/12 bg-white/65 p-5 transition hover:-translate-y-0.5 hover:border-[#356b58]/35 hover:bg-white"
                  >
                    <span className="flex items-center justify-between gap-4 font-bold">
                      {source.label}
                      <span className="text-[#356b58] transition group-hover:translate-x-0.5">
                        ↗
                      </span>
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
      <Link
        href="/"
        aria-label="Về trang chủ cppinterview"
        title="Về trang chủ cppinterview"
        className="flex items-center gap-3"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
          C++
        </span>
        <span>
          <span className="block font-semibold tracking-[-0.02em]">cppinterview</span>
          <span className="block text-xs text-[#64736c]">Hướng dẫn học</span>
        </span>
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Điều hướng">
        <Link
          href="/worldquant"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          Trung tâm chuẩn bị
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

function OrderBookPreview() {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/14 bg-[#0d2d25] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#ef6f56]" />
          <span className="size-2.5 rounded-full bg-[#e9bb4f]" />
          <span className="size-2.5 rounded-full bg-[#8dbf58]" />
        </div>
        <span className="font-mono text-[10px] font-bold tracking-wide text-white/45 uppercase">
          Sổ lệnh mô phỏng
        </span>
      </div>
      <div className="p-5 font-mono text-xs">
        <div className="grid grid-cols-3 px-3 pb-3 text-[9px] tracking-[0.16em] text-white/35 uppercase">
          <span>Giá</span>
          <span className="text-right">Khối lượng</span>
          <span className="text-right">Phía</span>
        </div>
        <PreviewRow price="100.02" quantity="40" side="ASK" tone="ask" />
        <PreviewRow price="100.01" quantity="30" side="BEST ASK" tone="ask" />
        <div className="my-3 flex items-center gap-3 text-[9px] text-[#d7ff91]/70">
          <span className="h-px flex-1 bg-[#d7ff91]/20" />
          CHÊNH LỆCH 0.01
          <span className="h-px flex-1 bg-[#d7ff91]/20" />
        </div>
        <PreviewRow price="100.00" quantity="50" side="BEST BID" tone="bid" />
        <PreviewRow price="99.99" quantity="70" side="BID" tone="bid" />
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-white/10 bg-black/10 px-5 py-4 text-center sm:grid-cols-3 sm:gap-0">
        <PreviewMetric label="Sự kiện" value="đúng thứ tự" />
        <PreviewMetric label="Trạng thái" value="dẫn xuất" />
        <PreviewMetric label="Phát lại" value="xác định" />
      </div>
    </div>
  );
}

function PreviewRow({
  price,
  quantity,
  side,
  tone,
}: {
  price: string;
  quantity: string;
  side: string;
  tone: "bid" | "ask";
}) {
  return (
    <div
      className={`grid grid-cols-3 rounded-xl px-3 py-2.5 ${
        tone === "ask" ? "text-[#ffb4a2]" : "text-[#d7ff91]"
      }`}
    >
      <span>{price}</span>
      <span className="text-right text-white/75">{quantity}</span>
      <span className="text-right text-[9px] tracking-wide">{side}</span>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[8px] tracking-wide text-white/30 uppercase">
        {label}
      </span>
      <span className="mt-1 block break-words font-mono text-[10px] font-bold text-white/65">
        {value}
      </span>
    </div>
  );
}

function MobileTableOfContents() {
  return (
    <details className="group mt-7 overflow-hidden rounded-2xl border border-[#173f35]/15 bg-white/60 xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold">
        <span>Mục lục bài học</span>
        <span className="text-xs text-[#356b58] group-open:hidden">Mở ↓</span>
        <span className="hidden text-xs text-[#356b58] group-open:inline">
          Thu gọn ↑
        </span>
      </summary>
      <nav className="grid gap-1 border-t border-[#173f35]/10 p-3 sm:grid-cols-2">
        {TICK_DATA_GUIDE_CHAPTERS.map((chapter) => (
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
    <aside className="sticky top-6 hidden rounded-3xl border border-[#173f35]/12 bg-white/55 p-4 xl:block">
      <p className="px-3 pt-2 font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
        Lộ trình đọc
      </p>
      <nav className="mt-3 space-y-1" aria-label="Mục lục bài học">
        {TICK_DATA_GUIDE_CHAPTERS.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className="group flex gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white"
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
          Đặc tả → trạng thái → điều bất biến → khôi phục → hiệu năng.
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

function ConceptCard({
  label,
  tone,
  rows,
}: {
  label: string;
  tone: "green" | "red";
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
      <p
        className={`px-5 py-3 font-mono text-[10px] font-bold tracking-wide uppercase ${
          tone === "green"
            ? "bg-[#e8facb] text-[#526d1f]"
            : "bg-[#f8e8df] text-[#8e3825]"
        }`}
      >
        {label}
      </p>
      <div className="p-3 font-mono text-xs">
        {rows.map(([price, quantity, note]) => (
          <div
            key={price}
            className="grid grid-cols-[1fr_1fr_90px] rounded-xl px-3 py-2"
          >
            <span>{price}</span>
            <span className="text-right">{quantity}</span>
            <span className="text-right text-[9px] text-[#64736c]">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-2xl border border-[#79b82a]/30 bg-[#e8facb] px-5 py-4 font-mono text-sm font-bold text-[#356b58]">
      {children}
    </div>
  );
}

function TimelineRow({
  event,
  book,
  tape,
  last = false,
}: {
  event: string;
  book: string;
  tape: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)] px-4 py-3 text-sm ${
        last ? "" : "border-b border-[#173f35]/8"
      }`}
    >
      <strong>{event}</strong>
      <span className="text-[#52645c]">{book}</span>
      <span className="text-[#52645c]">{tape}</span>
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
    <details className="group my-8 overflow-hidden rounded-2xl border border-[#ba4b2f]/20 bg-[#fff4df]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <span>
          <span className="mr-2 font-mono text-[9px] font-bold tracking-wide text-[#ba4b2f] uppercase">
            Bài kiểm tra xác nhận
          </span>
          <strong>{question}</strong>
        </span>
        <span className="shrink-0 text-xs font-bold text-[#8e3825] group-open:hidden">
          Xem đáp án ↓
        </span>
        <span className="hidden shrink-0 text-xs font-bold text-[#8e3825] group-open:inline">
          Đóng ↑
        </span>
      </summary>
      <p className="border-t border-[#ba4b2f]/15 px-5 py-4 text-sm leading-7 text-[#71574a]">
        {answer}
      </p>
    </details>
  );
}

function PipelineDiagram() {
  const consumers = [
    ["Bộ dựng sổ lệnh", "trạng thái MBO / MBP"],
    ["Lịch sử giao dịch", "OHLCV / VWAP"],
    ["Trạng thái phiên", "dừng / mở lại"],
    ["Khôi phục", "khoảng trống / tín hiệu duy trì kết nối"],
  ];
  return (
    <div className="my-7 rounded-3xl border border-[#173f35]/12 bg-white/55 p-5 sm:p-6">
      <div className="grid gap-3 text-center sm:grid-cols-[1fr_40px_1fr_40px_1fr] sm:items-center">
        <DiagramNode label="Gói tin mạng" detail="byte thô" />
        <DiagramArrow />
        <DiagramNode label="Thông điệp đã kiểm tra" detail="đặc tả sở giao dịch" />
        <DiagramArrow />
        <DiagramNode label="Sự kiện đã chuẩn hóa" detail="giá trị có sở hữu" accent />
      </div>
      <div className="mx-auto my-3 h-8 w-px bg-[#173f35]/20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {consumers.map(([label, detail]) => (
          <DiagramNode key={label} label={label} detail={detail} compact />
        ))}
      </div>
    </div>
  );
}

function DiagramNode({
  label,
  detail,
  accent = false,
  compact = false,
}: {
  label: string;
  detail: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 ${compact ? "py-3" : "py-4"} ${
        accent
          ? "border-[#79b82a]/40 bg-[#e8facb]"
          : "border-[#173f35]/12 bg-white/75"
      }`}
    >
      <strong className="block text-sm">{label}</strong>
      <span className="mt-1 block font-mono text-[9px] tracking-wide text-[#64736c] uppercase">
        {detail}
      </span>
    </div>
  );
}

function DiagramArrow() {
  return (
    <span className="rotate-90 text-center text-[#79b82a] sm:rotate-0">→</span>
  );
}

function RoutingRow({
  values,
  last = false,
}: {
  values: [string, string, string, string];
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-[#173f35]/8"}>
      {values.map((value, index) => (
        <td
          key={`${value}-${index}`}
          className={`px-4 py-3 ${
            index === 0 ? "font-semibold" : "text-[#52645c]"
          }`}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}

function KeyPoint({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-7 border-l-4 border-[#79b82a] bg-[#edf0e8] px-5 py-4 text-sm leading-7 text-[#52645c]">
      <strong className="mr-2 text-[#245748]">Điểm cần nhớ.</strong>
      {children}
    </div>
  );
}

function ByteLayout() {
  return (
    <div className="my-7 overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <p className="font-mono text-[10px] font-bold tracking-wide text-[#64736c] uppercase">
        Bản ghi thêm lệnh (Add) mô phỏng · 17 byte
      </p>
      <div className="mt-4 flex min-w-[650px] font-mono text-xs text-center">
        <ByteField width="w-[280px]" label="order_id : 8" range="0..7" />
        <ByteField width="w-[160px]" label="price4 : 4" range="8..11" />
        <ByteField width="w-[160px]" label="quantity : 4" range="12..15" />
        <ByteField width="w-[70px]" label="side" range="16" />
      </div>
      <p className="mt-3 font-mono text-[10px] text-[#64736c]">
        big-endian · độ rộng cố định · đã kiểm tra giới hạn
      </p>
    </div>
  );
}

function ByteField({
  width,
  label,
  range,
}: {
  width: string;
  label: string;
  range: string;
}) {
  return (
    <div
      className={`${width} border-y border-l border-[#173f35]/20 bg-[#edf0e8] px-2 py-4 last:border-r`}
    >
      <strong className="block">{label}</strong>
      <span className="mt-1 block text-[9px] text-[#64736c]">{range}</span>
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
    <div className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <span className="font-mono text-[9px] font-bold tracking-wide text-[#ba4b2f] uppercase">
        {label}
      </span>
      <strong className="mt-2 block">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-[#64736c]">{body}</p>
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
    <div className="rounded-3xl border border-[#173f35]/12 bg-white/65 p-6">
      <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-[#ba4b2f] uppercase">
        {label}
      </p>
      <h3 className="mt-2! text-2xl!">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[#52645c]">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="text-[#79b82a]">◆</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LifecycleRow({
  action,
  description,
}: {
  action: string;
  description: string;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[#173f35]/10 bg-white/60 p-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <span className="font-mono text-[10px] font-bold tracking-wide text-[#ba4b2f]">
        {action}
      </span>
      <span className="text-sm text-[#52645c]">{description}</span>
    </div>
  );
}

function SnapshotDiagram() {
  const steps = [
    ["Vùng đệm trực tiếp", "98, 99, 101, 102, 103"],
    ["Ảnh chụp", "trạng thái đến cập nhật 100"],
    ["Điểm chuyển", "bỏ ≤ 100"],
    ["Phát lại", "101 → 102 → 103"],
    ["Công bố", "công bố thế hệ mới bằng thao tác nguyên tử"],
  ];
  return (
    <div className="my-7 grid gap-2 rounded-3xl border border-[#173f35]/12 bg-white/55 p-5 md:grid-cols-5 md:items-stretch">
      {steps.map(([label, detail], index) => (
        <div key={label} className="flex min-w-0 items-center gap-2 md:block">
          <div className="flex-1 rounded-2xl bg-white/75 p-4 text-center">
            <strong className="block text-sm">{label}</strong>
            <span className="mt-2 block font-mono text-[9px] leading-5 text-[#64736c]">
              {detail}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <span className="text-[#79b82a] md:my-2 md:block md:text-center">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FeedTimeline() {
  return (
    <div className="my-7 overflow-x-auto rounded-3xl border border-[#173f35]/12 bg-[#173f35] p-6 text-white">
      <div className="min-w-[620px] space-y-4 font-mono text-xs">
        <TimelineTrack
          label="Luồng A"
          points={["100", "101", "thiếu", "103"]}
          mutedIndex={2}
        />
        <TimelineTrack
          label="Luồng B"
          points={["100", "101", "102", "103"]}
        />
        <div className="h-px bg-white/10" />
        <TimelineTrack
          label="Kết quả"
          points={["100", "101", "102", "103"]}
          accent
        />
      </div>
      <p className="mt-5 text-center text-xs text-white/55">
        Gói tin 102 từ B lấp khoảng trống; 100/101/103 chỉ được áp dụng một lần.
      </p>
    </div>
  );
}

function TimelineTrack({
  label,
  points,
  mutedIndex,
  accent = false,
}: {
  label: string;
  points: string[];
  mutedIndex?: number;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[70px_repeat(4,1fr)] items-center gap-3">
      <span className={accent ? "text-[#d7ff91]" : "text-white/45"}>
        {label}
      </span>
      {points.map((point, index) => (
        <span
          key={`${label}-${index}`}
          className={`rounded-xl border px-3 py-2 text-center ${
            index === mutedIndex
              ? "border-dashed border-[#ef6f56]/50 text-[#ffb4a2]"
              : accent
                ? "border-[#d7ff91]/30 bg-[#d7ff91]/10 text-[#d7ff91]"
                : "border-white/12 bg-white/5 text-white/75"
          }`}
        >
          {point}
        </span>
      ))}
    </div>
  );
}

function SequenceCase({
  expression,
  title,
  body,
}: {
  expression: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <code className="font-mono text-xs font-bold text-[#ba4b2f]">
        {expression}
      </code>
      <strong className="mt-3 block">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-[#64736c]">{body}</p>
    </div>
  );
}

function RecoveryStateMachine() {
  return (
    <div className="my-7 rounded-3xl border border-[#173f35]/12 bg-white/55 p-6">
      <div className="grid gap-3 text-center md:grid-cols-[1fr_50px_1fr] md:items-center">
        <StateNode label="ĐÃ ĐỒNG BỘ" detail="có thể công bố trạng thái" tone="green" />
        <span className="rotate-90 text-[#ba4b2f] md:rotate-0">thiếu dữ liệu →</span>
        <StateNode
          label="ĐANG KHÔI PHỤC"
          detail="giữ tạm + phát lại"
          tone="orange"
        />
      </div>
      <div className="mx-auto my-3 h-8 w-px bg-[#173f35]/20 md:ml-[75%]" />
      <div className="ml-auto max-w-md">
        <StateNode
          label="DỰNG LẠI TỪ ẢNH CHỤP"
          detail="quá thời gian / tràn bộ đệm → dựng tạm → chuyển trạng thái bằng thao tác nguyên tử"
          tone="dark"
        />
      </div>
    </div>
  );
}

function StateNode({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: "green" | "orange" | "dark";
}) {
  const toneClass = {
    green: "border-[#79b82a]/35 bg-[#e8facb] text-[#356b58]",
    orange: "border-[#ba4b2f]/25 bg-[#fff4df] text-[#8e3825]",
    dark: "border-[#173f35] bg-[#173f35] text-white",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <strong className="block font-mono text-xs">{label}</strong>
      <span
        className={`mt-1 block text-xs ${
          tone === "dark" ? "text-white/60" : "opacity-70"
        }`}
      >
        {detail}
      </span>
    </div>
  );
}

function TradeForkDiagram() {
  return (
    <div className="my-7 rounded-3xl border border-[#173f35]/12 bg-white/55 p-6">
      <DiagramNode
        label="Lần khớp tại sở giao dịch"
        detail="một sự kiện nguồn"
        accent
      />
      <div className="mx-auto h-8 w-px bg-[#173f35]/20" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#173f35]/12 bg-white/75 p-5 text-center">
          <strong className="block">Thay đổi sổ lệnh</strong>
          <span className="mt-2 block text-sm text-[#64736c]">
            Giảm khối lượng còn lại đang hiển thị
          </span>
        </div>
        <div className="rounded-2xl border border-[#79b82a]/35 bg-[#e8facb] p-5 text-center">
          <strong className="block">Quy tắc được tính → lịch sử giao dịch</strong>
          <span className="mt-2 block text-sm text-[#64736c]">
            OHLCV / VWAP / đặc trưng theo khoảng
          </span>
        </div>
      </div>
    </div>
  );
}

function TradeRow({
  time,
  trade,
  eligible,
  effect,
  last = false,
}: {
  time: string;
  trade: string;
  eligible: string;
  effect: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[90px_110px_90px_minmax(0,1fr)] px-4 py-3 text-sm ${
        last ? "" : "border-b border-[#173f35]/8"
      }`}
    >
      <span className="font-mono text-xs">{time}</span>
      <strong>{trade}</strong>
      <span className={eligible === "Có" ? "text-[#65a30d]" : "text-[#ba4b2f]"}>
        {eligible}
      </span>
      <span className="text-[#64736c]">{effect}</span>
    </div>
  );
}

function FormulaCard({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-5">
      <p className="font-mono text-[9px] font-bold tracking-wide text-[#ba4b2f] uppercase">
        {label}
      </p>
      <div className="mt-4 space-y-1 font-mono text-xs leading-6 text-[#356b58]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function ClockCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-4">
      <strong className="block text-sm">{label}</strong>
      <span className="mt-2 block text-xs leading-5 text-[#64736c]">{body}</span>
    </div>
  );
}
