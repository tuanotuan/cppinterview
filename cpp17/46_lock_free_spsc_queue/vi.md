# Ngày 46 — Lock-free SPSC queue

## 1. Vấn đề nó giải quyết

Một producer và một consumer có thể cần channel bounded, low-latency mà không block bằng mutex. Ring buffer với index có owner riêng có thể cài concurrency contract hẹp này.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết ring buffer, atomic, acquire/release publication, cache contention và tradeoff fixed capacity.

## 3. Ý tưởng cốt lõi

Chỉ producer ghi head index và chỉ consumer ghi tail. Release store publish slot đã hoàn tất hoặc removal đã xong; acquire load tương ứng ngăn một phía reuse slot trước khi work phía kia visible.

## 4. Cú pháp tối thiểu

```cpp
buffer[head] = value;
head_.store(next, std::memory_order_release);
const auto head = head_.load(std::memory_order_acquire);
```

## 5. Cách nó hoạt động

1. Producer push bốn integer cố định vào bounded ring trong khi một consumer pop đúng bốn.
2. Một slot để trống nhằm phân biệt full với empty, còn operation fail sẽ yield tới khi có progress.
3. Chương trình in `received: 10 20 30 40`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Thêm producer hoặc consumer thứ hai phá assumption về index ownership; wraparound, destruction và non-trivial element lifetime cũng cần design đầy đủ hơn.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi topology đúng một producer một consumer, capacity bounded và latency measurement chứng minh lock-free complexity đáng giá.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ dùng integer nên slot lifetime đơn giản. Thread join và fixed count tránh cần shutdown protocol riêng.

## 9. Điều cần nhớ

- Lock-free nghĩa là system progress không cần lock, không tự động bảo đảm wait-freedom, fairness hay nhanh hơn.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Lock-free SPSC queue giải quyết vấn đề chính nào?
2. Trung bình — Vì sao ring bốn slot chỉ giữ tối đa ba queued value trong design này?
3. Khó — Happens-before edge nào bảo vệ việc đọc slot sau khi producer ghi?
