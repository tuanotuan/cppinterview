import type { Metadata } from "next";
import Link from "next/link";

import {
  TICK_DATA_GUIDE_CHAPTERS,
  TICK_DATA_GUIDE_SOURCES,
  TICK_DATA_REPO_LESSONS,
} from "@/lib/learn/tick-data-guide";

export const metadata: Metadata = {
  title: "Tick Data & Order Book từ số 0 — Recall",
  description:
    "Bài nhập môn có hệ thống về market-data events, MBO/MBP, sequencing, recovery và trade statistics cho phỏng vấn C++ trading.",
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
              Market data foundations
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              Tick Data &amp;
              <span className="block sm:inline"> Order Book</span>
              <span className="block text-[#d7ff91]">từ số 0.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Bài này dành cho người đã biết C++ nhưng chưa biết trading. Mục tiêu
              là giúp mày hiểu dữ liệu thị trường đang mô tả cái gì, state nào cần
              giữ và vì sao một feed handler đúng khó hơn việc parse vài struct.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase">
              <HeroChip>35–45 phút</HeroChip>
              <HeroChip>7 chương</HeroChip>
              <HeroChip>C++20 examples</HeroChip>
              <HeroChip>Không cần kiến thức trading</HeroChip>
            </div>

            <div className="mt-8 flex min-w-0 flex-wrap gap-3">
              <a
                href="#market-first-principles"
                className="w-full rounded-2xl bg-[#d7ff91] px-5 py-3 text-center text-sm font-bold text-[#173f35] transition hover:bg-white sm:w-auto"
              >
                Bắt đầu từ bid / ask ↓
              </a>
              <Link
                href="/admin#review-queue"
                className="w-full rounded-2xl border border-white/20 bg-white/8 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/14 sm:w-auto"
              >
                Xem 10 câu chờ duyệt
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
                Đọc venue contract trước khi tổng quát hóa
              </h2>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-[#71574a]">
                Letter code, quantity semantics, sequence unit và recovery
                procedure đều phụ thuộc feed. Ví dụ Nasdaq và CME trong bài dùng
                để học cách suy nghĩ, không phải giao thức chung của toàn bộ thị
                trường.
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
              eyebrow="First principles"
              title="Order book đang lưu cái gì?"
              lead="Trước khi nói về tick hay packet, phải hiểu trạng thái mà hệ thống đang cố dựng lại."
            >
              <p>
                Một <strong>limit order</strong> nói rằng ai đó muốn mua hoặc bán
                một quantity tại một mức giá giới hạn. Các buy order đang chờ tạo
                thành phía <Term>bid</Term>; sell order đang chờ tạo thành phía{" "}
                <Term>ask</Term>. Mức mua cao nhất là <Term>best bid</Term>, mức
                bán thấp nhất là <Term>best ask</Term>.
              </p>

              <div className="my-7 grid gap-4 md:grid-cols-2">
                <ConceptCard
                  label="BID · người đang muốn mua"
                  tone="green"
                  rows={[
                    ["100.00", "50", "best bid"],
                    ["99.99", "70", ""],
                  ]}
                />
                <ConceptCard
                  label="ASK · người đang muốn bán"
                  tone="red"
                  rows={[
                    ["100.01", "30", "best ask"],
                    ["100.02", "40", ""],
                  ]}
                />
              </div>

              <Formula>
                spread = best ask − best bid = 100.01 − 100.00 = 0.01
              </Formula>

              <p>
                Book là <strong>state hiện tại</strong> của các order còn sống;
                trade tape là <strong>lịch sử những giao dịch đã xảy ra</strong>.
                Hai thứ liên quan nhưng không giống nhau.
              </p>

              <div className="my-7 overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
                <div className="grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#173f35]/10 bg-[#edf0e8] px-4 py-3 font-mono text-[10px] font-bold tracking-wide uppercase">
                  <span>Event</span>
                  <span>Book sau event</span>
                  <span>Tape</span>
                </div>
                <TimelineRow
                  event="Add bid"
                  book="100.00 × 50 xuất hiện"
                  tape="Không có trade"
                />
                <TimelineRow
                  event="Add ask"
                  book="100.01 × 30 xuất hiện"
                  tape="Không có trade"
                />
                <TimelineRow
                  event="Execute 10"
                  book="Bid còn 100.00 × 40"
                  tape="Có thể có print 100.00 × 10"
                  last
                />
              </div>

              <Checkpoint
                question="Order còn sống khác trade đã xảy ra như thế nào?"
                answer="Order còn sống là ý định mua/bán vẫn đang nằm trong book với remaining quantity. Trade là một execution đã xảy ra trong quá khứ. Execution có thể làm giảm order, nhưng trade record không phải chính order đó."
              />
            </GuideSection>

            <GuideSection
              id="tick-event-pipeline"
              number="02"
              eyebrow="Mental model"
              title="Tick không đồng nghĩa với trade"
              lead="Trong hệ thống market data, “tick” nên được hiểu rộng là một event mới từ feed."
            >
              <p>
                Event có thể là add/cancel/execute order, trade print, trading
                status, heartbeat hoặc recovery metadata. Vì mỗi loại phục vụ
                consumer khác nhau, đừng thiết kế một hàm{" "}
                <InlineCode>book.apply(any_tick)</InlineCode> rồi hy vọng mọi
                thứ tự đúng.
              </p>

              <PipelineDiagram />

              <div className="my-7 overflow-x-auto rounded-2xl border border-[#173f35]/12 bg-white/65">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-[#edf0e8] font-mono text-[10px] tracking-wide uppercase">
                    <tr>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Tape / stats</th>
                      <th className="px-4 py-3">Session / recovery</th>
                    </tr>
                  </thead>
                  <tbody>
                    <RoutingRow values={["Add Order", "✓", "—", "—"]} />
                    <RoutingRow values={["Execution", "✓", "có thể ✓", "—"]} />
                    <RoutingRow
                      values={["Non-displayed Trade", "—", "✓", "—"]}
                    />
                    <RoutingRow values={["Halt / Resume", "—", "—", "✓"]} />
                    <RoutingRow values={["Heartbeat", "—", "—", "✓"]} last />
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
                Một event có thể đi tới nhiều nhánh. Execution có thể vừa giảm
                displayed order vừa tạo trade contribution; nhưng một Trade
                Message riêng có thể chỉ phục vụ tape và không mutate displayed
                book.
              </KeyPoint>

              <Checkpoint
                question="Vì sao field quantity không có một ý nghĩa chung cho mọi message?"
                answer="Tùy message/feed, quantity có thể là absolute level quantity, phần bị giảm, executed quantity hoặc total quantity mới. Phải đọc contract trước khi quyết định dùng phép gán hay phép cộng/trừ."
              />
            </GuideSection>

            <GuideSection
              id="safe-binary-parsing"
              number="03"
              eyebrow="Wire → value object"
              title="Từ bytes thành event an toàn"
              lead="Network bytes không phải C++ object. Parser là trust boundary đầu tiên của hệ thống."
            >
              <p>
                Binary feed quy định chính xác byte order, field width, scale,
                padding và message length. Nasdaq ITCH chẳng hạn dùng big-endian,
                fixed-width integers, ASCII fields và fixed-point prices. Mapping
                thẳng buffer bằng <InlineCode>reinterpret_cast</InlineCode> có thể
                sai vì alignment, padding, endian và truncated input.
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
                  label="Price"
                  title="Giữ fixed-point"
                  body="raw 1,234,500 với scale 4 nghĩa là 123.4500. Giữ integer làm canonical value để rounding và replay deterministic."
                />
                <SmallRule
                  label="Bounds"
                  title="Validate trước subspan"
                  body="Record thiếu một byte phải trả parse error và không publish event nửa đúng xuống book builder."
                />
                <SmallRule
                  label="Lifetime"
                  title="Đừng giữ view quá hạn"
                  body="string_view/span trỏ vào receive buffer chỉ hợp lệ khi ownership bảo đảm buffer sống đủ lâu."
                />
                <SmallRule
                  label="Identity"
                  title="ID luôn có scope"
                  body="Key thường cần venue, trading date, channel/partition và instrument; numeric ID đơn lẻ không phải global identity."
                />
              </div>

              <div className="rounded-2xl border border-[#173f35]/12 bg-[#edf0e8] p-5">
                <p className="font-mono text-[10px] font-bold tracking-wide text-[#356b58] uppercase">
                  Parser checklist
                </p>
                <ol className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
                  {[
                    "Đủ packet/record length?",
                    "Message type có được hỗ trợ?",
                    "Endian và scale đã decode đúng?",
                    "Enum, side, flag có hợp lệ?",
                    "Instrument/session context có đúng scope?",
                    "Sequence và timestamps đã được gắn?",
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
                question="Timestamp có thể thay sequence để sắp xếp event không?"
                answer="Không. Sequence diễn tả continuity/order theo protocol; timestamp diễn tả một clock semantics. Nhiều event có thể cùng timestamp, clock có thể skew và sort theo timestamp có thể đổi protocol order."
              />
            </GuideSection>

            <GuideSection
              id="mbo-mbp"
              number="04"
              eyebrow="Derived state"
              title="MBO, MBP và order lifecycle"
              lead="Đây là phần biến ordered event stream thành trạng thái mà researcher hoặc strategy có thể đọc."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CompareCard
                  label="MBO · Market-by-Order"
                  title="Giữ từng order"
                  bullets={[
                    "Order ID và remaining quantity",
                    "Side, price, instrument",
                    "Priority trong từng price level",
                    "Có thể derive aggregate MBP",
                  ]}
                />
                <CompareCard
                  label="MBP · Market-by-Price"
                  title="Giữ aggregate level"
                  bullets={[
                    "Price → total quantity / order count",
                    "Không biết full order identity",
                    "Không suy ngược đầy đủ queue priority",
                    "Nhẹ hơn cho nhiều consumer",
                  ]}
                />
              </div>

              <pre className={`${codeClass} my-7`}>
                <code>{`Order ID index
42 → bid, 100.00, qty 50 ─┐
77 → bid, 100.00, qty 20 ─┼─→ level 100.00 = 70
91 → ask, 100.01, qty 30 ─┘

Per-price priority
100.00 bid: [42, 77]`}</code>
              </pre>

              <h3>Lifecycle phải bám đúng venue</h3>
              <div className="my-5 space-y-2">
                <LifecycleRow
                  action="ADD"
                  description="Tạo order identity mới và thêm quantity vào level."
                />
                <LifecycleRow
                  action="EXECUTE / REDUCE"
                  description="Giảm remaining quantity; về zero thì order chết."
                />
                <LifecycleRow
                  action="DELETE"
                  description="Xóa toàn bộ remaining order khỏi mọi index."
                />
                <LifecycleRow
                  action="REPLACE"
                  description="Loại old ID, tạo new ID và áp priority rule của venue."
                />
              </div>

              <p>
                Với Nasdaq ITCH, <InlineCode>Executed With Price</InlineCode> vẫn
                giảm quantity tại <strong>display price gốc</strong>; execution
                price phục vụ trade/statistics. Replace không gửi lại toàn bộ
                side/symbol/attribution nên phải kế thừa chúng từ old order.
              </p>

              <h3>Những invariant đáng bảo vệ</h3>
              <div className="my-5 grid gap-3 sm:grid-cols-2">
                {[
                  "Mọi live order có remaining > 0.",
                  "Level aggregate bằng tổng các order thuộc level.",
                  "Zero-quantity level phải bị xóa.",
                  "Một order nằm đúng side, price và instrument index.",
                  "Replace không để old ID và new ID cùng sống.",
                  "Invalid event không làm state mutate một nửa.",
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

              <h3>Snapshot + incremental</h3>
              <p>
                MBP feed thường cần snapshot để bootstrap rồi nối với live
                incremental updates. Snapshot không tự chứng minh nó mới; phải có
                update ID hoặc cutover metadata để tạo bridge liên tục.
              </p>

              <SnapshotDiagram />

              <KeyPoint>
                Quantity update có thể là absolute set hoặc delta. Zero có thể
                nghĩa delete ở một feed nhưng không phải universal rule. Depth
                cũng có thể là instrument metadata, không nên hard-code toàn
                channel.
              </KeyPoint>

              <div className="my-7 rounded-2xl border border-[#ba4b2f]/18 bg-[#fff4df] p-5 text-sm leading-7 text-[#71574a]">
                <strong className="text-[#8e3825]">
                  Ngoại lệ đáng biết:
                </strong>{" "}
                normal book thường lấy bid cao nhất và ask thấp nhất, nhưng CME
                có instrument yield/rate/repo dùng inverted convention và đảo cả
                price-level priority. Comparator cùng crossed-book check phải đọc
                instrument metadata, không hard-code toàn hệ thống.
              </div>

              <Checkpoint
                question="Có MBP rồi có dựng lại chính xác từng order và queue priority được không?"
                answer="Không. MBP chỉ giữ aggregate tại price level. Nhiều tập order khác nhau có thể tạo cùng aggregate, nên identity và queue position đã mất không thể suy ngược duy nhất."
              />
            </GuideSection>

            <GuideSection
              id="sequencing-recovery"
              number="05"
              eyebrow="Correctness under packet loss"
              title="Sequence gap và recovery"
              lead="UDP có thể mất, duplicate hoặc reorder packet. Book chỉ đáng tin khi continuity được chứng minh."
            >
              <p>
                Feed A/B là hai đường truyền của cùng logical data. Mục tiêu là
                nhận packet nhanh nhất nhưng <strong>apply đúng một lần</strong>,
                không phải apply cả hai “cho chắc”.
              </p>

              <FeedTimeline />

              <div className="my-7 grid gap-4 md:grid-cols-3">
                <SequenceCase
                  expression="seq < expected"
                  title="Duplicate / late"
                  body="Không apply lại; có thể đối chiếu fingerprint để phát hiện divergence."
                />
                <SequenceCase
                  expression="seq == expected"
                  title="Contiguous"
                  body="Apply transactionally rồi advance expected theo protocol."
                />
                <SequenceCase
                  expression="seq > expected"
                  title="Gap"
                  body="Buffer bounded, mark channel suspect và bắt đầu recovery."
                />
              </div>

              <p>
                “Advance sequence” cũng không universal: MoldUDP64 đánh số
                message nên next = first sequence + message count; CME MDP đánh
                số packet nên next = packet sequence + 1. Đừng đặt tên chung
                chung rồi vô tình dùng sai đơn vị.
              </p>

              <RecoveryStateMachine />

              <h3>Snapshot recovery đúng thứ tự</h3>
              <ol className="my-5 space-y-3">
                {[
                  "Dừng xem state hiện tại là fresh và queue live updates có giới hạn.",
                  "Dựng snapshot vào staging state, không overwrite book đang được reader dùng.",
                  "Đọc cutover metadata để biết snapshot chứa state đến sequence nào.",
                  "Bỏ buffered update cũ, apply phần còn lại liên tục theo sequence.",
                  "Validate invariants rồi atomic-publish generation mới.",
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
                Khi mất một packet, mày chưa biết packet đó chứa instrument nào.
                Mặc định toàn channel là suspect; chỉ thu hẹp scope khi
                per-instrument sequence hoặc recovery evidence thực sự chứng
                minh được.
              </KeyPoint>

              <Checkpoint
                question="Buffer gap đầy trước khi packet thiếu quay lại thì làm gì?"
                answer="Không bỏ ngẫu nhiên một packet rồi tiếp tục. Chuyển state sang full snapshot rebuild/recovery, giữ evidence và chỉ publish lại sau khi continuity cùng invariants được chứng minh."
              />
            </GuideSection>

            <GuideSection
              id="trade-statistics"
              number="06"
              eyebrow="Tape and interval features"
              title="Trade tape, OHLCV và correction"
              lead="Order-book mutation và trade statistics là hai state machine liên quan nhưng phải tách riêng."
            >
              <TradeForkDiagram />

              <p>
                Printable flag giúp tránh double-count một số auction/cross
                volume, nhưng không phải mọi printable trade đều được đưa vào
                mọi dataset. Eligibility còn phụ thuộc sale condition, session,
                auction và out-of-sequence policy.
              </p>

              <div className="my-7 overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/65">
                <div className="grid grid-cols-[90px_110px_90px_minmax(0,1fr)] border-b border-[#173f35]/10 bg-[#edf0e8] px-4 py-3 font-mono text-[10px] font-bold tracking-wide uppercase">
                  <span>Time</span>
                  <span>Price × qty</span>
                  <span>Eligible?</span>
                  <span>Effect</span>
                </div>
                <TradeRow
                  time="10:00:10"
                  trade="100.00 × 5"
                  eligible="Yes"
                  effect="Mở bar"
                />
                <TradeRow
                  time="10:00:20"
                  trade="100.02 × 3"
                  eligible="Yes"
                  effect="High/close mới"
                />
                <TradeRow
                  time="10:00:30"
                  trade="100.01 × 7"
                  eligible="No"
                  effect="Không cộng bar"
                />
                <TradeRow
                  time="10:01:00"
                  trade="100.03 × 2"
                  eligible="Yes"
                  effect="Thuộc bucket sau"
                  last
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormulaCard
                  label="Bar trước correction"
                  lines={[
                    "O = 100.00 · H = 100.02",
                    "L = 100.00 · C = 100.02",
                    "V = 5 + 3 = 8",
                    "VWAP = (100×5 + 100.02×3) / 8",
                    "VWAP = 100.0075",
                  ]}
                />
                <FormulaCard
                  label="Sau khi break trade 100.02 × 3"
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
                Để undo một trade, aggregator cần identity có đúng scope và giữ
                contribution cũ. Canonical turnover nên dùng checked fixed-point
                arithmetic. Interval nên có contract rõ như{" "}
                <InlineCode>[start, end)</InlineCode>; event đúng 10:01:00 thuộc
                bucket sau.
              </p>

              <h3>Đừng nén mọi clock thành một timestamp</h3>
              <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ClockCard label="Source time" body="Event tại matching engine" />
                <ClockCard label="Send time" body="Publisher đưa lên wire" />
                <ClockCard label="Receive time" body="NIC/process nhận packet" />
                <ClockCard label="Process time" body="Downstream nhận output" />
              </div>

              <Checkpoint
                question="Trade break có nên rollback current order book không?"
                answer="Không mặc định. Trong các feed như Nasdaq ITCH, Broken Trade sửa time-and-sales/statistics nhưng không thay đổi current displayed book. Book đã tiến theo order lifecycle riêng."
              />
            </GuideSection>

            <GuideSection
              id="interview-framework"
              number="07"
              eyebrow="From learning to answering"
              title="Khung trả lời phỏng vấn"
              lead="Scenario trading thường rộng. Một thứ tự trả lời ổn định giúp mày không nhảy thẳng vào container hoặc lock-free quá sớm."
            >
              <div className="my-7 grid gap-3">
                {[
                  ["01", "Input contract", "Feed, message semantics và failure model là gì?"],
                  ["02", "Ordering & identity", "Sequence unit và scoped key nào quyết định state?"],
                  ["03", "State", "Raw log, normalized event và derived state cần giữ gì?"],
                  ["04", "Invariants", "Điều gì luôn phải đúng sau mỗi transition?"],
                  ["05", "Data structure", "Lookup/update/publication cần complexity và memory nào?"],
                  ["06", "Failure & recovery", "Gap, duplicate, invalid event và overflow xử lý ra sao?"],
                  ["07", "Tests & evidence", "Replay, checksum, metrics và packet capture nào chứng minh đúng?"],
                  ["08", "Performance", "Chỉ sau correctness mới benchmark allocation/cache/tail latency."],
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
                  Capstone đề xuất
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Synthetic deterministic feed handler
                </h3>
                <pre className="mt-5 overflow-x-auto rounded-2xl bg-black/18 p-5 font-mono text-xs leading-7 text-white/80">
                  <code>{`parser → sequencer → event router
       → MBO state → MBP view
       → trade/bar state → immutable publication`}</code>
                </pre>
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/72 sm:grid-cols-2">
                  <li>✓ Invalid record không đổi state hash.</li>
                  <li>✓ Duplicate không apply hai lần.</li>
                  <li>✓ Gap làm output chuyển thành stale.</li>
                  <li>✓ Recovery đóng gap trước publish.</li>
                  <li>✓ Trade break tăng bar revision.</li>
                  <li>✓ Replay luôn cho cùng checksum.</li>
                </ul>
              </div>

              <div className="mt-7 rounded-3xl border border-[#79b82a]/35 bg-[#e8facb] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-wide text-[#526d1f] uppercase">
                    Next step
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    Giờ mày đã có nền để đọc 10 câu mới.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#52645c]">
                    Mở từng câu, thử trả lời trước rồi mới xem đáp án và rubric.
                  </p>
                </div>
                <Link
                  href="/admin#review-queue"
                  className="mt-5 inline-flex shrink-0 rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white sm:mt-0"
                >
                  Tới Review Queue →
                </Link>
              </div>
            </GuideSection>

            <section className="scroll-mt-8 border-t border-[#173f35]/15 py-12">
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
                Primary references
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Nguồn dùng để kiểm chứng bài
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#64736c]">
                Bài viết diễn giải lại cho người mới; khi implement feed thật,
                specification của venue và version đang dùng mới là source of
                truth.
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

              <details className="group mt-5 overflow-hidden rounded-2xl border border-[#173f35]/12 bg-white/55">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold">
                  <span>Đọc 5 note kỹ thuật đầy đủ trong repository</span>
                  <span className="text-xs text-[#356b58] group-open:hidden">
                    Mở ↓
                  </span>
                  <span className="hidden text-xs text-[#356b58] group-open:inline">
                    Thu gọn ↑
                  </span>
                </summary>
                <div className="grid gap-2 border-t border-[#173f35]/10 p-4 sm:grid-cols-2">
                  {TICK_DATA_REPO_LESSONS.map((lesson, index) => (
                    <a
                      key={lesson.href}
                      href={lesson.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-[#edf0e8]"
                    >
                      <span className="mr-2 font-mono text-[10px] text-[#ba4b2f]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {lesson.label} ↗
                    </a>
                  ))}
                </div>
              </details>
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
        <span className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
          C++
        </span>
        <span>
          <span className="block font-semibold tracking-[-0.02em]">Recall</span>
          <span className="block text-xs text-[#64736c]">Learning guide</span>
        </span>
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Điều hướng">
        <Link
          href="/worldquant"
          className="rounded-xl px-4 py-2 font-bold transition hover:bg-white/60"
        >
          WQ Hub
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
          Synthetic book
        </span>
      </div>
      <div className="p-5 font-mono text-xs">
        <div className="grid grid-cols-3 px-3 pb-3 text-[9px] tracking-[0.16em] text-white/35 uppercase">
          <span>Price</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Side</span>
        </div>
        <PreviewRow price="100.02" quantity="40" side="ASK" tone="ask" />
        <PreviewRow price="100.01" quantity="30" side="BEST ASK" tone="ask" />
        <div className="my-3 flex items-center gap-3 text-[9px] text-[#d7ff91]/70">
          <span className="h-px flex-1 bg-[#d7ff91]/20" />
          SPREAD 0.01
          <span className="h-px flex-1 bg-[#d7ff91]/20" />
        </div>
        <PreviewRow price="100.00" quantity="50" side="BEST BID" tone="bid" />
        <PreviewRow price="99.99" quantity="70" side="BID" tone="bid" />
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-white/10 bg-black/10 px-5 py-4 text-center sm:grid-cols-3 sm:gap-0">
        <PreviewMetric label="Events" value="ordered" />
        <PreviewMetric label="State" value="derived" />
        <PreviewMetric label="Replay" value="deterministic" />
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
        Reading map
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
          Contract → state → invariants → recovery → performance.
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
            Checkpoint
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
    ["Order-book builder", "MBO / MBP state"],
    ["Trade tape", "OHLCV / VWAP"],
    ["Session state", "Halt / resume"],
    ["Recovery", "Gap / heartbeat"],
  ];
  return (
    <div className="my-7 rounded-3xl border border-[#173f35]/12 bg-white/55 p-5 sm:p-6">
      <div className="grid gap-3 text-center sm:grid-cols-[1fr_40px_1fr_40px_1fr] sm:items-center">
        <DiagramNode label="Network packet" detail="raw bytes" />
        <DiagramArrow />
        <DiagramNode label="Validated message" detail="venue contract" />
        <DiagramArrow />
        <DiagramNode label="Normalized event" detail="owned value" accent />
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
        Synthetic Add record · 17 bytes
      </p>
      <div className="mt-4 flex min-w-[650px] font-mono text-xs text-center">
        <ByteField width="w-[280px]" label="order_id : 8" range="0..7" />
        <ByteField width="w-[160px]" label="price4 : 4" range="8..11" />
        <ByteField width="w-[160px]" label="quantity : 4" range="12..15" />
        <ByteField width="w-[70px]" label="side" range="16" />
      </div>
      <p className="mt-3 font-mono text-[10px] text-[#64736c]">
        big-endian · fixed width · bounds checked
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
    ["Live buffer", "98, 99, 101, 102, 103"],
    ["Snapshot", "state through update 100"],
    ["Cutover", "discard ≤ 100"],
    ["Replay", "101 → 102 → 103"],
    ["Publish", "atomic generation swap"],
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
          label="Feed A"
          points={["100", "101", "gap", "103"]}
          mutedIndex={2}
        />
        <TimelineTrack
          label="Feed B"
          points={["100", "101", "102", "103"]}
        />
        <div className="h-px bg-white/10" />
        <TimelineTrack
          label="Output"
          points={["100", "101", "102", "103"]}
          accent
        />
      </div>
      <p className="mt-5 text-center text-xs text-white/55">
        Packet 102 từ B đóng gap; 100/101/103 chỉ được apply một lần.
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
        <StateNode label="SYNCED" detail="state publishable" tone="green" />
        <span className="rotate-90 text-[#ba4b2f] md:rotate-0">gap →</span>
        <StateNode
          label="RECOVERING"
          detail="buffer + replay"
          tone="orange"
        />
      </div>
      <div className="mx-auto my-3 h-8 w-px bg-[#173f35]/20 md:ml-[75%]" />
      <div className="ml-auto max-w-md">
        <StateNode
          label="SNAPSHOT REBUILD"
          detail="timeout / overflow → staging → atomic cutover"
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
        label="Venue execution"
        detail="one source event"
        accent
      />
      <div className="mx-auto h-8 w-px bg-[#173f35]/20" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#173f35]/12 bg-white/75 p-5 text-center">
          <strong className="block">Book mutation</strong>
          <span className="mt-2 block text-sm text-[#64736c]">
            Giảm displayed remaining order
          </span>
        </div>
        <div className="rounded-2xl border border-[#79b82a]/35 bg-[#e8facb] p-5 text-center">
          <strong className="block">Eligibility policy → tape</strong>
          <span className="mt-2 block text-sm text-[#64736c]">
            OHLCV / VWAP / interval features
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
      <span className={eligible === "Yes" ? "text-[#65a30d]" : "text-[#ba4b2f]"}>
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
