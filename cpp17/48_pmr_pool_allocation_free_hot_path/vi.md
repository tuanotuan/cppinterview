# Ngày 48 — PMR memory pool và allocation-free hot path

## 1. Vấn đề nó giải quyết

Allocation lặp lại trong latency-sensitive loop có thể thêm contention và delay khó đoán. PMR pool có thể allocation lúc setup, còn container đã reserve tái dùng capacity trong hot path.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết PMR resource ngày 40, reserve so với size, pool behavior, buffer exhaustion và benchmark.

## 3. Ý tưởng cốt lõi

`unsynchronized_pool_resource` reuse block theo size class không internal lock và chỉ phù hợp khi một thread sở hữu từ bên ngoài. Reserve vector trước timed loop giúp clear-and-refill sau đó không allocation storage nếu không vượt capacity.

## 4. Cú pháp tối thiểu

```cpp
std::pmr::unsynchronized_pool_resource pool{&upstream};
std::pmr::vector<int> values{&pool};
values.reserve(32);
// hot path: clear and push at most 32 values
```

## 5. Cách nó hoạt động

1. Fixed byte buffer làm backing cho monotonic upstream resource, resource đó cấp cho unsynchronized pool và một PMR vector.
2. Sau reserve, clear và push lặp vẫn trong vector capacity ban đầu; null upstream ngăn hidden heap fallback.
3. Chương trình in `capacity stable: 1` và `sum: 496`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Capacity ổn định chỉ chứng minh vector không reallocate, không chứng minh element constructor hay called code không allocate; phải audit và đo toàn hot path.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi phase single-thread có storage demand bounded và allocation jitter đã đo.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Hierarchy có lifetime rõ và an toàn theo thứ tự ngược. Iteration cuối lưu zero tới thirty-one, có sum 496.

## 9. Điều cần nhớ

- Chỉ đưa allocation ra khỏi hot path sau khi bound capacity, định nghĩa exhaustion behavior và chứng minh resource lifetime.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — PMR memory pool và allocation-free hot path giải quyết vấn đề chính nào?
2. Trung bình — Vì sao `clear` không giảm vector capacity?
3. Khó — `std::bad_alloc` từ null upstream ảnh hưởng real-time guarantee thế nào?
