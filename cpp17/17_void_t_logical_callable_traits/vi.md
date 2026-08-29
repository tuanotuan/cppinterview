# Ngày 17 — std::void_t, conjunction, disjunction và callable type traits

## 1. Vấn đề nó giải quyết

Generic code cần hỏi type có expression nào đó không, nhiều constraint có cùng đúng không và callable có nhận signature cho trước không mà không gây hard compile error.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết SFINAE, partial specialization, `decltype`, `std::declval` và Boolean type trait.

## 3. Ý tưởng cốt lõi

`std::void_t` map dependent expression hợp lệ thành `void` để detection. `std::conjunction` và `std::disjunction` kết hợp trait có short-circuit, còn `std::is_invocable` kiểm tra call syntax.

## 4. Cú pháp tối thiểu

```cpp
template<class T, class = void>
struct has_size : std::false_type {};
template<class T>
struct has_size<T, std::void_t<decltype(
    std::declval<const T&>().size())>> : std::true_type {};
```

## 5. Cách nó hoạt động

1. Detection trait kiểm tra expression `size()` const-qualified trên nhiều candidate type.
2. Logical trait kết hợp result, còn invocability trait kiểm tra lời gọi lambda cùng return conversion yêu cầu.
3. Chương trình in ba dòng Boolean cho detection, conjunction và invocability, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Detection chỉ chứng minh expression hợp lệ về syntax, không chứng minh complexity, lifetime, exception hay semantics mong muốn.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi generic code C++17 cần điều khiển participation mềm trước khi concepts có sẵn.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Vector và string thỏa detector, integer không thỏa, còn generic lambda square gọi được với integer argument.

## 9. Điều cần nhớ

- Detection idiom mô tả khả năng syntax; cần thêm tài liệu semantics rõ phía trên.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::void_t, conjunction, disjunction và callable type traits giải quyết vấn đề chính nào?
2. Trung bình — Vì sao kiểm tra `has_size<int>` cho false thay vì hard error?
3. Khó — Short-circuit trait composition tránh instantiate operand sau không hợp lệ thế nào?
