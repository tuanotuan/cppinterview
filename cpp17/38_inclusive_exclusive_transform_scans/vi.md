# Ngày 38 — Inclusive scan, exclusive scan và transform scan

## 1. Vấn đề nó giải quyết

Nhiều algorithm cần mọi prefix result thay vì một final reduction: running total, offset, cumulative product và transformed prefix. C++17 cung cấp scan algorithm cho các pattern này.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết prefix sum, range, output iterator, binary operation và reduction ordering.

## 3. Ý tưởng cốt lõi

`inclusive_scan` gồm current input trong mỗi output, còn `exclusive_scan` ghi prefix trước current input nên cần initial value. Transform scan áp unary transform trước khi kết hợp.

## 4. Cú pháp tối thiểu

```cpp
std::inclusive_scan(first, last, out);
std::exclusive_scan(first, last, out, 0);
std::transform_inclusive_scan(first, last, out, plus, square);
```

## 5. Cách nó hoạt động

1. Cùng bốn integer đi vào inclusive, exclusive và square-transform inclusive scan.
2. Các fixed-size output array riêng nhận một result cho mỗi input position, làm prefix alignment rõ.
3. Chương trình in `inclusive: 1 3 6 10`, `exclusive: 0 1 3 6` và squared prefix, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Output storage phải đủ lớn và tuân non-overlap rule; parallel regrouping cũng cần operation phù hợp.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi mọi position cần cumulative state, offset, index hoặc transformed prefix.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Helper in từng result array để inclusion boundary được so sánh theo từng position.

## 9. Điều cần nhớ

- Chọn inclusive hay exclusive từ ý nghĩa output position zero, rồi chọn identity và transform rõ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Inclusive scan, exclusive scan và transform scan giải quyết vấn đề chính nào?
2. Trung bình — Vì sao exclusive output đầu là zero còn inclusive output đầu là one?
3. Khó — Algebraic property nào quan trọng nếu scan được chạy parallel?
