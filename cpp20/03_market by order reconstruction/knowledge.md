# Trading Systems - Market-by-Order Reconstruction

## 1. Goal

Sau bài này, bạn cần:

1. hiểu Market-by-Order (MBO) lưu state gì;
2. áp dụng đúng lifecycle add, execute/reduce, delete và replace;
3. duy trì đồng thời lookup theo order ID và aggregate theo price level;
4. không publish state bị mutate một nửa khi gặp event lỗi;
5. biết những invariant và test nào bảo vệ book builder.

Ví dụ dùng semantics công khai của Nasdaq TotalView-ITCH để học. Khi làm feed
khác, phải thay state machine theo specification của feed đó.

## 2. Market-by-Order State

MBO giữ từng displayed order riêng biệt. Một record tối thiểu thường cần:

```cpp
struct Order {
    OrderId id;
    InstrumentId instrument;
    Side side;
    Price price;
    Quantity remaining;
};
```

Order ID cho phép event sau tham chiếu lại order đã add. State chính có thể là:

```text
order_id -> {instrument, side, price, remaining quantity}
```

Từ các order sống, book builder có thể tạo aggregate price levels:

```text
bids[price] = tổng remaining quantity của bid orders tại price
asks[price] = tổng remaining quantity của ask orders tại price
```

Top of book:

- best bid là bid price cao nhất;
- best ask là ask price thấp nhất;
- chỉ đúng như vậy với instrument có price convention thông thường. Một số feed
  có instrument/book convention đặc biệt và phải đọc Security Definition.

MBO khác Market-by-Price (MBP): MBP chỉ cho aggregate level, không nhất thiết cho
identity và queue position của từng order.

## 3. Apply the Venue Lifecycle Exactly

Với Nasdaq ITCH:

- `A`/`F`: thêm displayed order cùng day-unique Order Reference Number;
- `E`/`C`: một phần hoặc toàn bộ order được execute;
- `X`: giảm displayed shares do partial cancellation;
- `D`: toàn bộ remaining shares không còn accessible, xóa order;
- `U`: cancel-replace; old order ID bị loại và new order ID được dùng từ đó.

Các modify event cùng order ID có hiệu lực cộng dồn. Khi remaining quantity về
zero, order đã dead và phải bị xóa khỏi book.

Hai bẫy quan trọng của ITCH:

- `C` (Order Executed With Price) vẫn giảm quantity tại **display price gốc**
  của resting order. Execution price phục vụ trade/statistics; không được chuyển
  remaining shares sang execution price.
- `U` (Order Replace) không gửi lại side, stock hay attribution/MPID. Parser phải
  lấy các field đó từ old order; event chỉ thay identity, shares và price theo
  layout của message.

Đừng gom `X`, `D` và `U` thành một thao tác "cancel" mơ hồ:

- reduce cần biết lượng giảm;
- delete xóa toàn bộ remaining;
- replace tạo identity mới, có thể price/quantity mới;
- execution còn tạo dữ liệu cho trade/statistics consumer tùy message fields.

Replace đặc biệt dễ làm sai:

```text
old ID 10: bid 100.25 x 80
replace old 10 -> new 77: price 100.30 x 50
```

State đúng phải:

1. trừ 80 khỏi bid level 100.25;
2. xóa order ID 10;
3. thêm 50 vào bid level 100.30;
4. tạo order ID 77;
5. mọi update sau chỉ dùng ID 77.

## 4. Aggregate Indexes and Order Priority

Một thiết kế dễ kiểm chứng dùng hai lớp index:

```text
orders: unordered_map<OrderId, Order>
levels:
    bid price -> aggregate quantity, order count
    ask price -> aggregate quantity, order count
```

Lookup event theo ID thường là average O(1). Tìm best price bằng ordered map là
O(log L) cho update, với `L` là số levels. Thiết kế này dễ học và dễ tạo oracle.

Nhưng hai index trên chỉ đủ để tạo **aggregate MBP view từ MBO events**. Full MBO
còn phải giữ thứ tự order trong từng price level:

```text
price -> ordered queue of {venue priority, order_id}
```

Priority source phải theo feed contract:

- dùng explicit priority field nếu feed cung cấp;
- nếu protocol cho phép suy ra bằng ordered arrival, giữ đúng application order;
- partial execution/reduce thường không tự đẩy order xuống cuối queue, nhưng
  phải xác nhận rule của venue;
- cancel-replace tạo identity mới và priority effect phải theo venue contract,
  không được sửa ID tại chỗ rồi giữ queue position một cách mặc định.

Ví dụ với simple price-time policy:

```text
Add 10, Add 11, Add 12 cùng bid 100.00 -> [10, 11, 12]
Execute 10 một phần                      -> [10, 11, 12]
Delete 10                               -> [11, 12]
Replace 11 -> 77 cùng price             -> [12, 77]
```

Class trong `main.cpp` của bài minh họa aggregate view và lifecycle atomic; nó
không tự nhận là full-priority MBO. Production full MBO thường giữ thêm queue
node/priority index để update và kiểm tra thứ tự hiệu quả.

Trong production latency-sensitive, có thể dùng:

- flat/contiguous level array nếu price grid và depth bị giới hạn;
- preallocated pool cho order node;
- intrusive structure để tránh allocation;
- direct lookup table khi ID domain cho phép;
- shard theo channel/instrument để một owner thread mutate state.

Không chọn container chỉ vì big-O. Phải benchmark:

- distribution thật của message type;
- book depth và số live orders;
- burst traffic;
- allocation count;
- p50/p99/p99.9 latency;
- cache misses và memory footprint;
- replay output checksum để chứng minh optimization không đổi correctness.

## 5. Transactional Update and Fail Closed

Một event không hợp lệ không được để book mutate một nửa.

Ví dụ reduce 120 shares khỏi order còn 100:

```cpp
if (reduction == 0 || reduction > order.remaining) {
    return Error::quantity_underflow;
}
```

Chỉ sau validation mới:

1. cập nhật aggregate level;
2. cập nhật/xóa order record;
3. tăng applied sequence/state version;
4. publish snapshot/version mới.

Với replace, validate toàn bộ trước:

- old ID tồn tại;
- new ID chưa tồn tại;
- quantity mới dương;
- price/side/instrument hợp lệ;
- event thuộc đúng session.

Nếu một helper có thể throw sau khi đã trừ old level, cần rollback hoặc xây next
state rồi commit. Trên hot path thường tránh exception và dùng explicit status,
nhưng nguyên tắc atomic state transition vẫn giữ nguyên.

Unknown order ID không phải lúc nào cũng có cùng nguyên nhân:

- packet gap;
- duplicate/replayed event;
- session reset xử lý sai;
- parser decode sai ID;
- bug ở state mutation.

Không tự tạo placeholder order để "cho chạy tiếp". Làm vậy che mất corruption.

## 6. Invariants and Failure Policy

Sau mỗi event hoặc theo sampling/debug build, kiểm tra:

1. mọi live order có quantity > 0;
2. aggregate level bằng tổng quantity của các order thuộc level đó;
3. level quantity > 0; level zero phải bị xóa;
4. mỗi order nằm đúng instrument/side/price index;
5. replace không để đồng thời old ID và new ID;
6. state version/sequence chỉ tiến theo policy;
7. book chỉ ở trạng thái publishable khi channel synchronized.

Failure policy production có thể:

- mark instrument hoặc channel `suspect/out_of_sync`;
- dừng publish derived state của phạm vi bị ảnh hưởng;
- giữ raw packet và state checksum;
- kích hoạt retransmission/snapshot recovery;
- replay deterministic để phân biệt data loss và software bug;
- báo metric/alert có sequence range, không log tràn theo từng packet.

Không nên tự xóa một level chỉ vì best bid/ask trông lạ. Venue state, auction,
halt hoặc price convention có thể cần handling riêng.

## 7. Synthetic Trace as an Oracle

Trước khi chạy packet capture lớn, dùng trace nhỏ có expected state:

```text
Add     id=1 bid 100.00 qty=80
Add     id=2 bid 100.00 qty=20
Add     id=3 ask 100.05 qty=40
Execute id=1 qty=30
Cancel  id=2 qty=20
Replace id=1 -> id=4 bid 100.01 qty=25
Delete  id=3
```

Test sau mỗi bước:

- live order IDs;
- aggregate quantity từng level;
- best bid/ask;
- state hash;
- error event không đổi state hash.

Edge cases tối thiểu:

- duplicate add ID;
- reduce lớn hơn remaining;
- delete unknown ID;
- duplicate delete;
- replace sang ID đã tồn tại;
- partial fills cộng dồn về zero;
- reset trading day;
- same numeric ID ở session khác.
- `C` giảm order ở display price gốc, không phải execution price;
- `U` kế thừa side/instrument/attribution từ old order;
- ba order cùng price vẫn đúng priority sau partial execute và replace.

## 8. Primary References

- [Nasdaq TotalView-ITCH 5.0 Specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf)
  — Add Order, Executed, Cancel, Delete và Replace semantics.
- [Coinbase Exchange WebSocket Channels](https://docs.cdp.coinbase.com/exchange/websocket-feed/channels)
  — ví dụ chính thức về snapshot và level updates của một feed khác.
- [FIX Recommended Practices for Book Management](https://www.fixtrading.org/wp-content/uploads/download-manager-files/MDOWG_Book_Mgt-v20.pdf)
  — mô hình snapshot/incremental và book management.

Các letter code trong bài là của Nasdaq ITCH. Không tái sử dụng chúng làm
protocol chung cho venue khác.

## 9. End-of-Day Checklist

1. Phân biệt MBO với MBP.
2. Mô tả đúng add, execute/reduce, delete và replace.
3. Giải thích vì sao replace phải đổi sang new order ID.
4. Duy trì order index và aggregate level nhất quán.
5. Validation trước mutation và không publish half-applied state.
6. Nêu ít nhất năm invariant/test cho book builder.
7. Đưa ra failure policy cho unknown order ID hoặc quantity underflow.
