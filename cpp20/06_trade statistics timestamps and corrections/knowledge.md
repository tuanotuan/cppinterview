# Trading Systems - Trade Statistics, Timestamps and Corrections

## 1. Goal

Sau bài này, bạn cần:

1. tách book mutation khỏi trade tape/statistics;
2. tránh double-count printable và auction volume;
3. xử lý trade cancel/break/correction theo identity;
4. định nghĩa interval boundary và late-correction contract;
5. phân biệt source/exchange time, send time, receive time và sequence.

## 2. Trade Events and Book Events Serve Different Consumers

Một execution có thể đồng thời:

- giảm remaining quantity của displayed order;
- tạo trade information;
- mang flag quyết định có được tính vào public time-and-sales/volume hay không.

Một `Trade Message` khác có thể phục vụ tape/statistics nhưng không mutate
displayed book. Nasdaq ITCH nói rõ non-cross Trade Message không ảnh hưởng book.
Broken Trade Message ảnh hưởng time-and-sales/statistics nhưng không ảnh hưởng
current book.

Vì vậy nên có pipeline tách:

```text
venue event
    -> book mutation stream
    -> eligible trade stream
    -> correction/cancel stream
```

Không tính volume bằng cách cộng mọi message có field `shares`.

## 3. Printability and Double Counting

Feed specification có thể đánh dấu execution printable/non-printable. Mục tiêu
là tránh một logical trade xuất hiện nhiều lần trong public statistics.

Nasdaq ITCH hướng dẫn không đưa non-printable transactions vào time-and-sales
hoặc volume khi cần tránh double-count cross volume. NYSE Pillar cũng công khai
Printable Flag và lưu ý individual executions của auction có thể non-printable
để auction volume không bị tính hai lần.

Rule đúng phải cấu hình theo feed/message:

```cpp
bool eligible_for_bar(const VenueTrade& trade,
                      const VenueStatisticsPolicy& policy);
```

Không viết `printable == false => bỏ ở mọi consumer`. Book builder vẫn có thể
cần execution để giảm order. Audit pipeline vẫn cần raw event.

Ngược lại, `printable == true` cũng chưa tự động có nghĩa "đưa vào mọi bar".
Eligibility còn phụ thuộc sale condition, regular/extended session, auction,
out-of-sequence policy và loại statistic theo contract của venue/dataset.

## 4. Correctable Trade State

OHLCV/VWAP chỉ append là chưa đủ nếu feed có trade break/cancel/correction.

Giữ identity có đúng namespace:

```text
(venue, session/trading date, instrument,
 partition/SystemID, ID namespace, trade/cross ID) -> accepted event
```

Scope cụ thể là venue-dependent. Ví dụ NYSE `TradeID` có scope theo matching
engine symbol partition/symbol, và `CrossID` là namespace khác. Không gộp tất cả
vào một `uint64_t` global chỉ vì wire field cùng kích thước.

Khi nhận printable trade:

- reject/flag duplicate ID có payload khác;
- nếu cùng ID và payload giống, treat idempotent duplicate;
- thêm quantity, turnover và price occurrence;
- lưu event ordering key phục vụ open/close.

Khi nhận break/cancel:

- tìm trade gốc;
- trừ quantity và turnover;
- loại price occurrence;
- recompute open/high/low/close từ remaining trades nếu cần;
- bump bar revision;
- emit correction record, không âm thầm overwrite output đã publish.

Unknown break có thể do gap, retention quá ngắn hoặc duplicate. Không được tạo
negative volume.

Không gom mọi correction thành `erase(id)`. Có ít nhất hai transition khác nhau:

```text
CancelTrade(id)                         -> loại accepted trade cũ
CorrectCross(cross_id, corrected_volume) -> thay contribution cũ bằng volume mới
```

NYSE Cross Correction là ví dụ của transition thứ hai. Normalized schema nên
dùng event type riêng và giữ old/new contribution để audit, thay vì giả lập
correction bằng cancel rồi tự đoán một trade mới.

## 5. Exact Arithmetic and VWAP

Với fixed-point price:

```text
turnover_raw = sum(price_raw * quantity)
volume       = sum(quantity)
vwap_raw     = turnover_raw / volume
```

Phải kiểm tra overflow. `price_raw * quantity` có thể vượt 64-bit trước khi cộng.
Các lựa chọn:

- checked 128-bit accumulator nếu compiler/platform contract cho phép;
- decimal/big integer cho offline pipeline;
- scale và range contract có static/runtime checks;
- partition then checked reduction.

Rounding VWAP phải được định nghĩa: truncate, nearest, bankers rounding hay giữ
rational pair `(turnover, volume)` đến boundary cuối. Replay trên các máy phải
cho cùng kết quả.

Không dùng `double` làm canonical aggregate nếu yêu cầu exact parity với legacy
hoặc result dùng làm audit. Floating point vẫn có thể dùng cho analytics sau khi
conversion/rounding contract được chốt.

## 6. Interval Boundaries

Trước khi code bar một phút, chốt:

- event time nào quyết định bucket;
- interval là `[start, end)` hay rule khác;
- timezone/session calendar;
- out-of-sequence trade condition xử lý ra sao;
- late event được chấp nhận bao lâu;
- empty interval có emit không;
- auction/cross thuộc bucket nào;
- corrected bar được version và publish thế nào.

Ví dụ `[10:00:00, 10:01:00)`:

- event đúng `10:00:00` thuộc bucket;
- event đúng `10:01:00` thuộc bucket sau.

Đừng suy ra order bằng timestamp nếu protocol cung cấp sequence. Timestamp dùng
cho bucket theo contract; sequence dùng cho deterministic application order.

## 7. Multiple Clocks, Not One Magic Timestamp

NYSE Pillar phân biệt:

- `Source Time`: thời điểm matching-engine event gây ra message;
- `Send Time`: lúc XDP Publisher đưa packet lên multicast wire.

Feed handler nên tự capture:

- kernel/NIC receive time nếu có;
- process decode/normalize time;
- publish-to-downstream time.

Từ đó mới đo:

```text
publisher delay ~= send_time - source_time
network/receive ~= receive_time - send_time
processing      ~= downstream_time - receive_time
```

Các phép trừ chỉ có ý nghĩa khi clock domain/synchronization được hiểu. Negative
latency có thể là clock skew hoặc field semantics, không phải phép màu.

Canonical event nên giữ nhiều clock field, không overwrite tất cả vào một
`timestamp`. Nếu chỉ giữ receive time, replay không tái tạo event-time bars. Nếu
chỉ giữ exchange time, không đo được system latency.

## 8. Late Data and Versioned Output

Một bar đã publish vẫn có thể đổi vì:

- delayed/out-of-sequence trade;
- trade break/cancel;
- recovery replay;
- parser/policy bug cần backfill.

Contract tốt:

```text
BarKey    = (instrument, interval_start, policy_version)
Revision  = monotonic integer
Payload   = OHLCV, turnover, trade_count
Reason    = initial | late_trade | trade_break | backfill
```

Consumer phải chọn:

- latest revision;
- immutable change log;
- hoặc finalized watermark theo SLA.

Đừng overwrite database row mà không lưu revision/reason nếu research cần tái
hiện dataset cũ.

## 9. Test Matrix

1. first/last event đúng boundary;
2. multiple partial executions cùng order;
3. printable và non-printable pair;
4. auction bulk print không double-count;
5. duplicate trade ID cùng payload;
6. duplicate ID khác payload;
7. break của high, low, open hoặc close;
8. unknown/duplicate break;
9. out-of-order arrival nhưng deterministic sequence application;
10. turnover multiplication/sum overflow;
11. exact VWAP rounding;
12. correction revision và idempotent replay.
13. cùng numeric ID nhưng khác instrument/partition/ID namespace;
14. cross correction thay volume cũ, không chỉ xóa.

## 10. Primary References

- [Nasdaq TotalView-ITCH 5.0 Specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf)
  — execution printability, Trade Message và Broken Trade semantics.
- [NYSE Pillar Integrated Feed Specification](https://www.nyse.com/publicdocs/nyse/data/NYSE_Pillar_Integrated_Feed_Client_Specification_v2.5.pdf)
  — execution, non-displayed trade, trade cancel và printable fields.
- [NYSE Pillar Common Client Specification](https://www.nyse.com/publicdocs/nyse/data/Pillar_Common_Client_Specification_v2.5.pdf)
  — source time, send time, channel và symbol sequencing.

## 11. End-of-Day Checklist

1. Tách book mutation khỏi eligible trade stream.
2. Không cộng mọi message có quantity vào volume.
3. Lưu match/trade ID để undo correction.
4. Dùng fixed-point và checked turnover arithmetic.
5. Chốt interval boundary, late-data và rounding contract.
6. Phân biệt source, send, receive và processing timestamps.
7. Version output khi trade break hoặc backfill thay đổi bar.
