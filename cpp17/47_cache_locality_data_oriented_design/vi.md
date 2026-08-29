# Ngày 47 — Cache locality và data-oriented design

## 1. Vấn đề nó giải quyết

Thuật toán đúng vẫn có thể tốn phần lớn thời gian chờ memory rải rác hoặc load field mà hot loop không dùng. Data-oriented design sắp dữ liệu quanh access pattern đã đo.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết contiguous vector, structure, cache line, profiling, iteration order và vectorization cơ bản.

## 3. Ý tưởng cốt lõi

Giữ data được đọc cùng nhau ở gần nhau và traverse theo pattern dễ đoán. Structure-of-arrays có thể cải thiện streaming khi pass chỉ chạm vài field, còn array-of-structures có thể tốt hơn khi dùng cả record.

## 4. Cú pháp tối thiểu

```cpp
for (std::size_t i = 0; i < positions.size(); ++i) {
    positions[i] += velocities[i] * time_step;
}
```

## 5. Cách nó hoạt động

1. Position và velocity được lưu trong các contiguous array song song có index tương ứng.
2. Update loop stream qua đúng hai field cần dùng, tạo pattern đơn giản cho prefetch và vectorization.
3. Chương trình in `positions: 3 6 21`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Đổi layout không profiling có thể phá invariant và readability trong khi tối ưu cold path; cache behavior phụ thuộc hardware và workload.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi profiling xác định memory stall trong hot loop trên nhiều record được xử lý giống nhau.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ba position component tiến theo velocity nhân fixed step. Hot loop chỉ chạm array liên quan.

## 9. Điều cần nhớ

- Data-oriented design bắt đầu từ data movement đã đo và giữ domain invariant qua index relationship rõ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cache locality và data-oriented design giải quyết vấn đề chính nào?
2. Trung bình — Array nào được read hoặc write ở mọi iteration?
3. Khó — Khi nào array-of-structures có thể nhanh hơn structure-of-arrays cho cùng entity?
