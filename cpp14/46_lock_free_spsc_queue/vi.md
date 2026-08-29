# Ngày 46 — Lock-free SPSC queue

## 1. Vấn đề nó giải quyết

Một producer và một consumer có thể trao đổi item hữu hạn không cần mutex khi mỗi phía sở hữu một index. SPSC ring dùng atomic head/tail để publish cùng storage cố định, tránh allocation ở steady state.

## 2. Kiến thức cần có

- Ngày 32 và 43-45: ring buffer, atomic, release/acquire ordering, false sharing và role một owner.

## 3. Ý tưởng cốt lõi

Chỉ producer ghi `tail` và buffer slot trước release store. Chỉ consumer ghi `head` sau khi đọc slot, còn acquire load quan sát progress phía kia đã publish.

## 4. Cú pháp tối thiểu

```cpp
buffer[tail] = value;
tail.store(next, std::memory_order_release);

if (head != tail.load(std::memory_order_acquire)) { /* pop */ }
```

## 5. Cách nó hoạt động

1. Producer retry bounded push cho các value 10, 20, 30; chỉ nó cập nhật tail index.
2. Consumer retry pop, chỉ đọc slot đã publish và tiến head bằng release ordering.
3. Sau khi hai thread join, array nhận được in đúng FIFO order mà không mutex hay dynamic allocation.

## 6. Lỗi thường gặp

- Dùng cùng queue với nhiều producer hoặc consumer phá giả định ownership và tạo race.
- Trước khi áp dụng mẫu, phải kiểm tra invariant một producer/một consumer, quy tắc capacity trừ một, index wraparound, publication order, object lifetime và progress.

## 7. Khi nào nên dùng

- Nên dùng khi đúng một producer và một consumer trao đổi dữ liệu nhỏ hữu hạn dưới yêu cầu latency đã đo.
- Tránh dùng khi role có nhiều bên hoặc thay đổi, blocking chấp nhận được hay đã có queue thư viện được kiểm chứng.

## 8. Ví dụ đơn giản

Array capacity bốn cung cấp ba slot dùng được để phân biệt full với empty. Hai thread chuyển ba số nguyên và main in dãy nhận sau khi join.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Tính đúng lock-free SPSC đến từ role cố định, ownership index và publication ordering chính xác.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra invariant một producer/một consumer, quy tắc capacity trừ một, index wraparound, publication order, object lifetime và progress.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Lock-free SPSC queue là gì?
2. Trung bình — Vì sao ring có bốn slot vật lý chỉ cung cấp ba vị trí queue dùng được trong thiết kế này?
3. Khó — Write nào phải happen-before consumer đọc slot, và release store tail cùng acquire load tail thiết lập quan hệ đó thế nào?
