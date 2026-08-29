# Ngày 38 — Compile-time tables bằng constexpr và variable templates

## 1. Vấn đề nó giải quyết

Bảng lookup nhỏ, xác định không cần được dựng lại lúc khởi động hay ghi tay dễ sai. `constexpr` nới lỏng của C++14 có thể điền một literal table type nhỏ bằng vòng lặp, còn variable template cung cấp một bảng cho mỗi size.

## 2. Kiến thức cần có

- Ngày 14-15 và 37: `constexpr` nới lỏng, variable template, built-in array, vòng lặp và non-type parameter.

## 3. Ý tưởng cốt lõi

Generator là công thức compile-time thuần và specialization của variable template lưu kết quả. Sau đó bảng hoạt động như array read-only bình thường ở runtime.

## 4. Cú pháp tối thiểu

```cpp
template<std::size_t N>
struct Table { int values[N]{}; };

template<std::size_t N>
constexpr Table<N> squares = make_squares<N>();
```

## 5. Cách nó hoạt động

1. Non-type parameter cố định chiều dài array và generator khởi tạo mọi phần tử trong vòng lặp hữu hạn.
2. Initializer của variable template gọi generator trong constant-expression context cho size được yêu cầu.
3. `static_assert` kiểm tra một entry và runtime in bảng bình phương đã được tạo sẵn.

## 6. Lỗi thường gặp

- Generator được cho là compile-time nhưng phụ thuộc runtime input không thể khởi tạo bảng `constexpr`.
- Trước khi áp dụng mẫu, phải kiểm tra array bound, input xác định, thao tác constant expression, integer overflow, chi phí compile-time và kích thước bảng.

## 7. Khi nào nên dùng

- Nên dùng khi bảng nhỏ xác định loại bỏ công việc runtime lặp lại và kiểm tra compile-time có ích.
- Tránh dùng khi bảng rất lớn, phụ thuộc cấu hình runtime hoặc tăng build cost và binary size mà không có lợi.

## 8. Ví dụ đơn giản

Generator điền năm vị trí trong literal table nhỏ bằng bình phương index. Variable template `squares<5>` lưu kết quả và output cho 0, 1, 4, 9, 16.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Compile-time table đổi công sức build và dữ liệu binary lấy lookup runtime dự đoán được.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra array bound, input xác định, thao tác constant expression, integer overflow, chi phí compile-time và kích thước bảng.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Compile-time tables bằng constexpr và variable templates là gì?
2. Trung bình — Giá trị nào nằm ở index 3 của `squares<5>`?
3. Khó — Vì sao table quá lớn hoặc generation đắt có thể làm build chậm dù runtime rẻ hơn?
