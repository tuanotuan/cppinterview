# Ngày 37 — std::reduce và std::transform_reduce

## 1. Vấn đề nó giải quyết

Numeric workload cần reduction có thể reorganize hoặc chạy dưới execution policy, cùng operation fuse transform-and-reduce như dot product. C++17 chuẩn hóa cả hai.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết `std::accumulate`, associativity, floating-point rounding, iterator và binary operation.

## 3. Ý tưởng cốt lõi

`std::reduce` kết hợp range và có thể group operation theo order không quy định. `std::transform_reduce` transform input tương ứng rồi reduce result, có thể cho fusion và parallel execution.

## 4. Cú pháp tối thiểu

```cpp
auto total = std::reduce(first, last, init);
auto dot = std::transform_reduce(a.begin(), a.end(),
                                 b.begin(), 0);
```

## 5. Cách nó hoạt động

1. Một integer vector được reduce thành sum, rồi hai vector được transform theo cặp bằng multiplication và reduce.
2. Integer addition vẫn exact trong range nên regrouping không quy định không thể đổi result cố định.
3. Chương trình in `sum: 10` và `dot: 70`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Operation không associative hoặc floating-point addition có thể cho result khác khi reduction order đổi; không nên đặt side effect vào operation.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi workload có thể reduce về toán học và regroup operation là chấp nhận được.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Dot product nhân phần tử tương ứng rồi cộng mà không cần intermediate vector. Integer nhỏ loại overflow khỏi bài.

## 9. Điều cần nhớ

- Reduction cho phép reorder; hãy chọn operation và numeric type chịu được tự do đó.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::reduce và std::transform_reduce giải quyết vấn đề chính nào?
2. Trung bình — Pairwise product nào góp vào dot product?
3. Khó — Vì sao `reduce` và `accumulate` có thể khác với floating-point data?
