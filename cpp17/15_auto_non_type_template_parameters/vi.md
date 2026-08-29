# Ngày 15 — Non-type template parameters với auto

## 1. Vấn đề nó giải quyết

Non-type template parameter trước đây yêu cầu ghi type cụ thể dù value đã làm type rõ. C++17 cho phép `auto` để một template nhận nhiều constant-value type được hỗ trợ.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết type template parameter, compile-time constant, `decltype` và integral constant expression.

## 3. Ý tưởng cốt lõi

Trong `template<auto Value>`, deduction xác định cả value lẫn type khi instantiate. Value vẫn là compile-time template argument; value hoặc type khác tạo specialization khác.

## 4. Cú pháp tối thiểu

```cpp
template<auto Value>
struct Constant {
    static constexpr auto value = Value;
};
```

## 5. Cách nó hoạt động

1. Cùng class template được instantiate một lần với integer và một lần với character.
2. `decltype(Value)` được suy ra riêng cho từng specialization, còn inline constexpr storage cung cấp constant không cần runtime state.
3. Chương trình in `integer: 42` và `character: Z`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Argument phải là non-type value compile time được phép; runtime object tùy ý và nhiều value phụ thuộc address không dùng được.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi behavior hoặc storage phụ thuộc compile-time value có exact type được hỗ trợ có thể thay đổi.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Static assertion xác nhận integer và character giữ type của chúng. Runtime printing chỉ làm các lựa chọn compile time nhìn thấy được.

## 9. Điều cần nhớ

- `auto` làm non-type template tổng quát hơn nhưng không biến runtime value thành template argument.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Non-type template parameters với auto giải quyết vấn đề chính nào?
2. Trung bình — Type nào được suy ra cho `Constant<'Z'>::value`?
3. Khó — Vì sao `Constant<1>` và `Constant<1L>` là hai specialization khác nhau?
