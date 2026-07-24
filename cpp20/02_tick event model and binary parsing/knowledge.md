# Trading Systems - Tick Event Model and Safe Binary Parsing

## 1. Goal

Sau bài này, bạn cần hiểu được:

1. Vì sao một `tick` không đồng nghĩa với một giao dịch.
2. Cách tách wire message, normalized event và derived state.
3. Vì sao không được `reinterpret_cast` thẳng byte mạng thành C++ struct.
4. Cách biểu diễn price, timestamp và identifier để replay deterministic.
5. Những validation nào phải chạy trước khi một event được đưa xuống downstream.

Đây là nền móng của feed handler. Nếu event model sai, order book, interval
statistics và mọi feature phía sau đều có thể sai dù code chạy rất nhanh.

## 2. Tick Is an Event, Not a Synonym for Trade

Trong hệ thống market data, "tick" thường được dùng theo nghĩa rộng: một event
mới đến từ feed. Event đó có thể là:

- thêm, giảm, thực thi, thay thế hoặc xóa một order;
- cập nhật quantity tại một price level;
- một trade print phục vụ time-and-sales;
- trạng thái halt/resume;
- symbol directory hoặc session event;
- heartbeat hay thông tin phục vụ recovery.

Không phải event nào cũng thay đổi displayed order book. Nasdaq TotalView-ITCH,
chẳng hạn, có `Trade Message` để phản ánh giao dịch liên quan tới non-displayed
order. Specification nói message này phục vụ time-and-sales và market
statistics, nhưng không ảnh hưởng displayed book.

Vì vậy không nên viết một hàm chung kiểu:

```cpp
void on_tick(const Tick& tick) {
    book.apply(tick);
    bars.apply(tick);
}
```

Nó che mất semantic quan trọng. Tốt hơn là phân loại event và route theo consumer:

```text
wire record
    -> validated venue event
    -> normalized event
        -> book builder, nếu event làm đổi book
        -> trade tape / statistics, nếu event là printable trade
        -> session state, nếu event là control/status
```

Một event có thể phục vụ nhiều consumer, nhưng quyết định đó phải dựa trên
specification của feed, không dựa trên tên field hay phỏng đoán.

## 3. A Normalized Event Model

Wire model nên bám sát specification của venue. Normalized model nên bám sát
những semantic mà downstream thật sự cần.

Ví dụ:

```cpp
using OrderId = std::uint64_t;
using Price4 = std::int64_t; // 1234500 biểu diễn 123.4500

struct AddOrder {
    OrderId order_id;
    Price4 price;
    std::uint32_t quantity;
    bool is_bid;
};

struct ReduceOrder {
    OrderId order_id;
    std::uint32_t quantity;
};

struct DeleteOrder {
    OrderId order_id;
};

struct TradePrint {
    std::uint64_t match_id;
    Price4 price;
    std::uint64_t quantity;
    bool printable;
};

using MarketEvent =
    std::variant<AddOrder, ReduceOrder, DeleteOrder, TradePrint>;
```

Model này không cố ép mọi message thành cùng một struct đầy field optional.
`std::variant` giúp compiler buộc code xử lý từng loại event rõ ràng.

Normalized event cũng nên giữ provenance:

- venue/feed/channel;
- trading session hoặc trading date;
- transport sequence;
- instrument identifier đã normalize;
- exchange event time;
- local receive time;
- raw-record offset hoặc capture identifier phục vụ replay/debug.

Đừng vứt bỏ raw immutable log quá sớm. Khi production có sai lệch, khả năng
decode lại cùng byte bằng parser mới là bằng chứng quan trọng.

## 4. Binary Wire Data Is Not a C++ Struct

Nasdaq ITCH 5.0 mô tả integer theo big-endian network byte order, phần lớn là
unsigned. Alpha field là ASCII padded. Price là integer fixed-point với precision
được quy định; timestamp là nanoseconds since midnight.

Byte trên wire không tự động có:

- alignment phù hợp với C++ type;
- padding giống compiler/ABI đang dùng;
- byte order giống CPU;
- lifetime của một C++ object;
- dữ liệu đầy đủ để đọc hết field.

Code như sau là nguy hiểm:

```cpp
auto* message = reinterpret_cast<const AddMessage*>(bytes.data());
```

Nó có thể vi phạm alignment, phụ thuộc padding, đọc quá buffer hoặc giải mã sai
endianness. `#pragma pack` chỉ giải quyết một phần layout; nó không tự bounds
check và không đổi network byte order.

Cách an toàn là đọc từng field từ `std::span<const std::byte>`:

```cpp
std::uint64_t read_be(std::span<const std::byte> bytes) {
    if (bytes.empty() || bytes.size() > sizeof(std::uint64_t)) {
        throw std::runtime_error("invalid integer width");
    }

    std::uint64_t value = 0;
    for (std::byte byte : bytes) {
        value = (value << 8) | std::to_integer<unsigned char>(byte);
    }
    return value;
}
```

Parser cần kiểm tra message length và type trước khi đọc offset của type đó.
Một record truncated phải tạo parse error; không được phát một event nửa đúng
nửa rác.

## 5. Fixed-Point Price and Identifiers

Không dùng `double` làm canonical price key của order book. Binary floating
point không biểu diễn chính xác mọi decimal price và có thể tạo key/rounding
khác mong đợi.

Giữ price dưới dạng integer kèm scale:

```cpp
struct DecimalPrice {
    std::int64_t mantissa;
    std::uint8_t scale;
};
```

Với Nasdaq `Price(4)`, raw integer `1234500` biểu diễn `123.4500`. Chỉ format
sang decimal ở boundary hiển thị. Khi normalize nhiều venue có scale khác nhau,
conversion phải:

1. xác định scale đích;
2. kiểm tra overflow trước khi nhân;
3. quy định rõ rounding nếu phải giảm scale;
4. có test round-trip cho boundary values.

Identifier cũng phải có scope. ITCH `Stock Locate` được gán lại mỗi ngày và
không được giả định ổn định qua ngày. `Order Reference Number` là day-unique.
Vì vậy key bền vững thường cần composite context:

```text
(venue, channel/session, trading_date, order_id)
```

Không để một cache nhiều ngày dùng `order_id` đơn lẻ.

## 6. Session Scope and Lifetime

Timestamp exchange và sequence number giải quyết hai vấn đề khác nhau:

- timestamp cho biết thời điểm theo clock được feed định nghĩa;
- sequence cho biết vị trí trong ordered stream hoặc giúp phát hiện mất dữ liệu.

Không sort lại một ordered feed chỉ bằng timestamp. Hai event có thể có cùng
timestamp; clock semantics còn khác giữa venue. Feed handler nên lưu ít nhất:

- `exchange_time`: thời gian do feed cung cấp;
- `receive_time`: lúc process nhận packet/event;
- `sequence`: thứ tự áp dụng theo protocol;
- `trading_date` hoặc session ID.

Lifetime của normalized event cũng phải rõ. Nếu event giữ `std::string_view` hay
`std::span` trỏ vào receive buffer, buffer phải sống lâu hơn mọi consumer. Cách
đơn giản và an toàn hơn cho boundary đầu tiên là copy những field nhỏ cần thiết
vào value object. Chỉ dùng zero-copy khi ownership được thiết kế và benchmark
chứng minh nó đáng giá.

## 7. Validation Before Normalization

Trước khi publish event:

1. xác nhận packet/record length;
2. xác nhận message type được hỗ trợ;
3. decode byte order và fixed-point có kiểm tra overflow;
4. kiểm tra enum/side/flag theo specification;
5. với message phụ thuộc instrument, xác nhận instrument/session context đã tồn
   tại; không áp rule này máy móc cho system/control message (Nasdaq có thể dùng
   `Stock Locate = 0` cho loại message đó);
6. gắn sequence, source và timestamps;
7. chỉ sau đó mới tạo normalized event.

Khi validation fail:

- đếm metric theo reason/channel/type;
- giữ raw evidence và offset;
- không mutate order book;
- tùy severity mà quarantine instrument, đánh dấu channel out-of-sync hoặc
  kích hoạt recovery;
- không "sửa đại" byte rồi tiếp tục.

Một feed handler tốt fail rõ ràng và replay được. Silent corruption nguy hiểm
hơn crash có kiểm soát.

## 8. Primary References

Note này tóm tắt và diễn giải từ các nguồn chính thức:

- [Nasdaq TotalView-ITCH 5.0 Specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf)
  — event types, wire data types, fixed-point price, timestamp và daily IDs.
- [Nasdaq MoldUDP64 Specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/moldudp64.pdf)
  — session, message sequence và transport framing.
- [FIX Simple Binary Encoding Technical Specification](https://www.fixtrading.org/packages/simple-binary-encoding-technical-specification-final/)
  — các nguyên tắc binary encoding cho hệ thống low-latency.

Thông tin message cụ thể luôn phải kiểm tra lại bản specification mà venue/feed
đang triển khai. Không coi ví dụ Nasdaq là quy tắc chung cho mọi sàn.

## 9. End-of-Day Checklist

1. Giải thích được vì sao tick không đồng nghĩa với trade.
2. Phân biệt wire message, normalized event và derived state.
3. Parse big-endian field có bounds check mà không `reinterpret_cast` struct.
4. Giải thích vì sao price canonical nên là fixed-point integer.
5. Nêu được scope của order ID và instrument locate.
6. Phân biệt timestamp với sequence number.
7. Đưa ra failure policy không publish dữ liệu chưa được validate.
