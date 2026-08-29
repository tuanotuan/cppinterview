# Ngày 28 — Numeric algorithms và thống kê cơ bản

## 1. Vấn đề nó giải quyết

Tính tổng, tích vô hướng và thống kê đơn giản là các mẫu reduction phổ biến. Numeric algorithm diễn đạt trực tiếp các thao tác này và giảm lỗi index, còn kiểu của giá trị khởi đầu kiểm soát kiểu số học.

## 2. Kiến thức cần có

- Ngày 6 và 27: vector, iterator range, algorithm, arithmetic conversion và floating-point value.

## 3. Ý tưởng cốt lõi

Reduction gộp cả range vào một accumulator. Hãy chọn kiểu accumulator trước, rồi suy ra mean hoặc variance từ giá trị trung gian có tên và công thức population hay sample được nói rõ.

## 4. Cú pháp tối thiểu

```cpp
double sum = std::accumulate(values.begin(), values.end(), 0.0);
double squares = std::inner_product(values.begin(), values.end(),
                                    values.begin(), 0.0);
```

## 5. Cách nó hoạt động

1. `std::accumulate` cộng mọi phần tử vào accumulator double bắt đầu bằng `0.0`.
2. `std::inner_product` nhân các phần tử tương ứng của cùng range rồi cộng các bình phương.
3. Mean và population variance được tính từ dữ liệu cố định rồi cùng in ra 5.

## 6. Lỗi thường gặp

- Bắt đầu accumulate bằng số nguyên không có thể ép phép toán dùng số nguyên và cắt phần thập phân dù container giữ floating-point.
- Trước khi áp dụng mẫu, phải kiểm tra kiểu accumulator, hành vi range rỗng, overflow, numerical stability và variance là population hay sample.

## 7. Khi nào nên dùng

- Nên dùng khi reduction chuẩn khớp công thức và kích thước dữ liệu phù hợp với số học trực tiếp.
- Tránh dùng khi dữ liệu lớn hoặc kém điều kiện cần thuật toán online ổn định số hơn.

## 8. Ví dụ đơn giản

Bốn số chẵn được reduction thành tổng và tổng bình phương. Chương trình chia cho số phần tử đã biết để tính population mean và variance.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Giá trị accumulator khởi đầu quyết định cả phần tử đơn vị lẫn kiểu số học trong nhiều numeric algorithm.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra kiểu accumulator, hành vi range rỗng, overflow, numerical stability và variance là population hay sample.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Numeric algorithms và thống kê cơ bản là gì?
2. Trung bình — Mean và population variance của `{2.0, 4.0, 6.0, 8.0}` là bao nhiêu?
3. Khó — Thay initial value `0.0` bằng `0` có thể thay đổi phép tính trên input không nguyên thế nào?
