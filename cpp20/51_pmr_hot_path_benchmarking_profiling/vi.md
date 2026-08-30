# Ngày 51 — PMR, allocation-free hot path, benchmarking và profiling

## 1. Vấn đề nó giải quyết

PMR arena cố định có thể loại heap allocation khỏi hot loop được đo; benchmark đo một câu hỏi còn profiler tìm cost trên toàn hệ thống. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- PMR resource, container, cache behavior và chrono timing.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Chuẩn bị xưởng trước khi bấm giờ: reserve storage từ arena rồi chỉ đo công việc lặp. Benchmark là đồng hồ, profiler là bản đồ. Hãy đọc `std::pmr::monotonic_buffer_resource` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::pmr::monotonic_buffer_resource arena{buffer.data(), buffer.size(), std::pmr::null_memory_resource()};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::pmr::monotonic_buffer_resource`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Timing quá nhỏ có thể bị optimize mất, nhiễu lấn át hoặc trả lời sai câu hỏi; null upstream resource sẽ throw nếu fixed buffer cạn.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi allocation đã được đo là bottleneck và bounded arena phù hợp lifetime.
- Tránh dùng khi allocation thường không nằm trong hot path hoặc object phải sống lâu hơn arena.

## 8. Ví dụ đơn giản

PMR vector reserve từ stack buffer trước timing rồi update phần tử trong hot path mà không allocation thêm. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::pmr::monotonic_buffer_resource` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::pmr::monotonic_buffer_resource` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `reserve` được gọi trước start timestamp?
3. Khó — Dùng `null_memory_resource()` làm lỗi vượt buffer hiện rõ thế nào thay vì âm thầm fallback sang heap?
