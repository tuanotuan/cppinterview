# Trading Systems - Market-by-Price, Depth and Book Invariants

## 1. Goal

Sau bài này, bạn cần:

1. phân biệt Market-by-Price (MBP) với MBO;
2. hiểu snapshot và incremental price-level update;
3. chọn data structure theo depth, price grid và latency target;
4. xây invariant mà không áp một price convention cho mọi instrument;
5. biết khi nào book phải bị đánh dấu out-of-sync thay vì "tự sửa".

## 2. Market-by-Price State

MBP lưu aggregate tại mỗi price level, thường gồm:

```cpp
struct Level {
    Price price;
    Quantity quantity;
    std::uint32_t order_count; // chỉ có nếu feed cung cấp
};
```

Bạn biết tổng displayed quantity ở price, nhưng không nhất thiết biết từng order
hay queue position bên trong level.

CME mô tả MBP central limit order book là aggregate quantity của tất cả
individual orders tại cùng price level. CME cũng lưu ý book depth có thể khác
giữa các instrument trên cùng channel; client phải đọc `MarketDepth` từ Security
Definition thay vì hard-code depth cho toàn channel.

Feed khác có contract khác. Binance diff depth, ví dụ, gửi absolute quantity mới
cho một price level:

- quantity dương: insert hoặc replace level quantity;
- quantity zero: remove level;
- update có `U`/`u` để liên hệ range update ID.

Đừng đọc field tên `quantity` rồi mặc định đó là delta cộng/trừ. Phải biết nó là:

- absolute quantity;
- signed delta;
- total quantity của level mới;
- hay quantity của một order.

## 3. Snapshot and Incremental Updates

Một local book thường được bootstrap bằng:

1. mở live stream và buffer incremental events;
2. lấy snapshot;
3. tìm mốc sequence/update ID nối snapshot với buffer;
4. bỏ event đã nằm trong snapshot;
5. apply liên tục phần còn lại;
6. chỉ publish khi state synchronized.

Official Binance procedure là một ví dụ cụ thể:

- buffer diff events trước;
- fetch depth snapshot;
- bỏ event có final update ID `u <= lastUpdateId`;
- first applicable event phải cover mốc `lastUpdateId + 1`;
- nếu next event bắt đầu sau expected update ID thì bỏ local book và bootstrap
  lại.

Đây là contract của feed đó, không phải thuật toán universal. CME/FIX feeds có
field và recovery cycle khác. Nguyên tắc chung là cần một cutover point rõ ràng
giữa snapshot và incremental stream.

Snapshot không tự chứng minh nó "mới". Nếu live buffer đã vượt quá snapshot mà
không còn vùng nối liên tục, không được apply snapshot rồi nhảy thẳng tới live.

## 4. Data Structures and Hot-Path Cost

Lựa chọn phổ biến:

### Ordered map

```text
std::map<Price, Level, descending> bids
std::map<Price, Level, ascending> asks
```

- dễ implement;
- best price ở `begin()`;
- update O(log L);
- node allocation và pointer chasing có thể tốn cache.

Hai comparator trên chỉ đúng cho price convention thông thường. Với instrument
inverted, best bid/ask có thể nằm ở đầu ngược lại. Có thể lưu levels theo một
ordering trung lập rồi chọn đầu theo `InstrumentMetadata`, hoặc inject comparator
đúng khi tạo book; không hard-code comparator toàn hệ thống.

### Sorted vector hoặc fixed-depth array

- contiguous và cache-friendly;
- tốt khi depth K nhỏ và được feed giới hạn;
- insert/delete có thể shift O(K), nhưng K cố định nhỏ có thể nhanh hơn tree;
- cần xử lý update theo position đúng specification.

### Dense price ladder

- index trực tiếp theo tick khi price range hữu hạn;
- rất nhanh nhưng memory có thể lớn;
- phải xử lý thay đổi tick size, scale và instrument metadata.

### Hybrid

- hash/dense index để lookup price;
- compact ordered top-K để publish;
- staging state riêng cho recovery.

Benchmark phải replay cùng event trace và kiểm checksum state, nếu không một
"optimization" có thể nhanh vì đã bỏ qua event hoặc invariant.

## 5. Book Depth Is Instrument Metadata

Không hard-code:

```cpp
constexpr int depth = 10;
```

nếu feed nói depth thuộc instrument definition. Cùng channel có thể chứa
instrument 5-deep và 10-deep. Khi metadata đổi:

- version instrument definition;
- resize/rebuild state theo documented transition;
- không để consumer tưởng level thiếu là quantity zero;
- lưu metadata revision cùng derived output để replay giải thích được.

Depth snapshot cũng có giới hạn. Binance cảnh báo snapshot tối đa một số levels
không cho biết state của level sâu hơn cho tới khi level đó thay đổi. Vì vậy
"không thấy trong local snapshot" không luôn đồng nghĩa "venue không có level".

## 6. Locked, Crossed and Inverted Books

Với price convention thông thường:

- locked: best bid bằng best ask;
- crossed: best bid lớn hơn best ask.

Crossed state có thể là quality signal cho gap, apply sai side, stale snapshot
hoặc ordering bug. Nhưng không được hard-code:

```text
best_bid >= best_ask => book corrupt
```

vì:

1. locked khác crossed;
2. auction/status/single-venue context cần diễn giải đúng;
3. một số instrument dùng inverted price convention.

CME Globex công khai rằng yield/rate/repo books có thể inverted. Không chỉ
plausibility relation đổi: **price-level priority cũng đảo** — trong ví dụ CME,
bid thấp hơn có book level tốt hơn và offer cao hơn có book level tốt hơn.
Instrument đó được đánh dấu bằng `InvertedBook` attribute trong Security
Definition.

Invariant đúng phải nhận instrument metadata:

```cpp
bool is_plausible(const Book& book, const Instrument& instrument) {
    if (book.empty_side()) return true;
    if (instrument.inverted_book) {
        return book.best_bid() >= book.best_ask();
    }
    return book.best_bid() <= book.best_ask();
}
```

`best_bid()` và `best_ask()` trong đoạn trên bắt buộc đã dùng comparator theo
instrument. Nếu vẫn lấy bid lớn nhất và ask nhỏ nhất như normal book rồi chỉ đổi
dấu so sánh, kết quả top-of-book vẫn sai.

Đây vẫn chỉ là plausibility check. Không được tự xóa level để làm book "đẹp".
Hãy mark suspect, giữ evidence và recovery.

## 7. Publication Contract

Downstream không nên đọc trực tiếp nhiều container đang mutate. Các cách phổ biến:

- một writer thread sở hữu mutable state và publish immutable snapshot/version;
- sequence lock/version check cho read-only view;
- double buffer rồi atomic pointer swap;
- message passing theo instrument shard.

Publication metadata nên có:

- book version;
- last applied sequence/update ID;
- synchronized/suspect/recovering status;
- instrument definition revision;
- source channel/session;
- checksum nếu cần đối chiếu legacy/new platform.

Nếu đang recovery, chọn contract rõ:

- không publish;
- publish last-known-good kèm stale flag;
- hoặc publish recovery generation sang consumer opt-in.

Không để consumer vô tình thấy bid từ generation mới và ask từ generation cũ.

## 8. Test Matrix

Tối thiểu test:

1. new/change/delete theo đúng semantics của feed;
2. quantity zero;
3. unknown delete;
4. duplicate update;
5. update vượt depth;
6. depth khác nhau trên cùng channel;
7. snapshot stale và không có bridge;
8. locked, crossed và inverted instrument;
9. one-sided/empty book;
10. publication không lộ half-applied state;
11. replay cùng trace cho cùng final checksum;
12. property test: level quantity không âm và ordering đúng metadata.

## 9. Primary References

- [CME MDP 3.0 Central Limit Order Book](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457640186/MDP+3.0+-+Central+Limit+Order+Book)
  — aggregate MBP, update actions và per-instrument market depth.
- [CME MDP 3.0 Inverted Price Book Processing](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457605769/MDP+3.0+-+Inverted+Price+Book+Processing)
  — instrument metadata và inverted book behavior.
- [Binance Spot WebSocket Streams](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)
  — diff depth snapshot/update bootstrap contract.
- [Coinbase Exchange Product Book](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-book)
  — public L1/L2/L3 book levels.

## 10. End-of-Day Checklist

1. Phân biệt MBP và MBO.
2. Xác định quantity field là absolute hay delta từ specification.
3. Giải thích snapshot/incremental cutover point.
4. So sánh map, vector/fixed array và dense ladder.
5. Không hard-code depth cho toàn channel khi nó là instrument metadata.
6. Phân biệt locked, crossed và inverted book.
7. Thiết kế publication không lộ state nửa cũ nửa mới.
