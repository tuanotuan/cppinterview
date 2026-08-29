# Ngày 44 — Atomic operations, compare-and-swap và memory ordering

## 1. Vấn đề nó giải quyết

Một số shared state transition cần read-modify-write không chia cắt mà không dùng mutex. Compare-and-swap chỉ update atomic nếu observed value vẫn khớp expected value.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết atomic, data race, modification order, acquire/release, relaxed ordering và retry loop.

## 3. Ý tưởng cốt lõi

`compare_exchange_weak` so atomic với `expected`; success lưu desired value, còn failure ghi current value trở lại `expected`. Weak CAS có thể fail spurious nên loop retry.

## 4. Cú pháp tối thiểu

```cpp
int expected = counter.load(std::memory_order_relaxed);
while (!counter.compare_exchange_weak(
    expected, expected + 1,
    std::memory_order_relaxed)) {}
```

## 5. Cách nó hoạt động

1. Hai thread liên tục increment một atomic counter bằng CAS retry loop.
2. Relaxed ordering đủ vì chỉ final value không chia cắt của counter quan trọng; không payload khác được publish qua nó.
3. Chương trình in `counter: 2000`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Không tính việc `expected` bị overwrite có thể làm sai retry logic; relaxed CAS không publish non-atomic data khác.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi atomic state machine nhỏ đã được chứng minh đúng và measurement contention cho thấy đáng tránh mutex.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Mỗi CAS success góp đúng một increment. Thread join xác định lúc main được in completed result.

## 9. Điều cần nhớ

- Chọn memory order từ cross-object visibility requirement; atomicity một mình không định nghĩa protocol đầy đủ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Atomic operations, compare-and-swap và memory ordering giải quyết vấn đề chính nào?
2. Trung bình — Vì sao weak compare-exchange loop có thể retry dù không có writer khác?
3. Khó — Ordering bổ sung nào cần có nếu counter còn publish payload?
