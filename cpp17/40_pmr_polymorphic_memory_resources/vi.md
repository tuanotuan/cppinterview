# Ngày 40 — std::pmr và polymorphic memory resources

## 1. Vấn đề nó giải quyết

Allocator type thường trở thành một phần static type của container, khiến đổi allocation policy runtime khó. Polymorphic allocator C++17 định tuyến allocation qua interface `memory_resource` runtime.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết allocator, alignment, object lifetime, container allocation và stack-backed buffer.

## 3. Ý tưởng cốt lõi

Container trong `std::pmr` dùng `polymorphic_allocator` trỏ tới resource. `monotonic_buffer_resource` cấp phát từ buffer và release cùng lúc, đổi individual deallocation lấy bulk lifetime rẻ.

## 4. Cú pháp tối thiểu

```cpp
std::byte buffer[1024];
std::pmr::monotonic_buffer_resource arena{buffer, sizeof buffer};
std::pmr::vector<int> values{&arena};
```

## 5. Cách nó hoạt động

1. Monotonic resource nhận fixed local buffer, còn PMR vector được gắn rõ với resource đó.
2. Dynamic storage của vector đến từ arena khi đủ chỗ; destruction kết thúc element trước khi resource release storage hàng loạt.
3. Chương trình in `size: 4` và `sum: 10`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Container không được sống lâu hơn resource, và monotonic growth không phù hợp khi workload dài cần reclaim từng allocation.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi nhiều allocation ngắn hạn liên quan cùng có arena lifetime rõ và profiling cho thấy allocation overhead.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Buffer, resource và vector được khai báo theo lifetime order để destruction xảy ra an toàn theo thứ tự ngược.

## 9. Điều cần nhớ

- PMR tách container algorithm khỏi runtime allocation policy, nhưng resource lifetime trở thành dependency rõ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::pmr và polymorphic memory resources giải quyết vấn đề chính nào?
2. Trung bình — Object nào phải sống lâu hơn PMR vector?
3. Khó — Điều gì xảy ra khi initial monotonic buffer hết mà upstream resource vẫn có?
