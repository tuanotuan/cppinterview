# Ngày 34 — Thiết kế function templates và class templates

## 1. Vấn đề nó giải quyết

Generic code nên tái sử dụng một ý tưởng thật sự độc lập với kiểu mà không xóa thông tin tĩnh hữu ích. Function template parameter hóa hành vi, còn class template parameter hóa biểu diễn dữ liệu và thao tác.

## 2. Kiến thức cần có

- Ngày 2, 5, 15 và 33: type deduction, template parameter, constructor, operator và value semantics.

## 3. Ý tưởng cốt lõi

Bắt đầu từ thao tác cụ thể dùng được cho nhiều kiểu, xác định biểu thức tối thiểu cần có rồi chỉ biến các kiểu hoặc value đó thành parameter. Mọi instantiation phải thỏa hợp đồng ngầm.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
T max_value(const T& a, const T& b);

template<class T>
class Box { T value_; };
```

## 5. Cách nó hoạt động

1. Function template suy ra một `T` chung và so sánh hai value qua `operator<`.
2. Class template lưu value thuộc `T` đã chọn và cung cấp accessor const reference.
3. Instantiation cho số nguyên và string tái sử dụng definition nhưng vẫn giữ kiểu tĩnh.

## 6. Lỗi thường gặp

- Biến code thành template trước khi xác định thao tác bắt buộc sẽ tạo constraint ngoài ý muốn và lỗi khó đọc.
- Trước khi áp dụng mẫu, phải kiểm tra deduction, operator bắt buộc, chi phí copy/move, reference lifetime, nhu cầu specialization và độ rõ API.

## 7. Khi nào nên dùng

- Nên dùng khi cùng semantics áp dụng cho nhiều kiểu thỏa một hợp đồng thao tác nhỏ, ổn định.
- Tránh dùng khi runtime polymorphism, một kiểu cụ thể hoặc overload thông thường mô tả domain rõ hơn.

## 8. Ví dụ đơn giản

Hàm maximum tổng quát so sánh số nguyên, còn `Box` tổng quát sở hữu string. Hai ví dụ tách tái sử dụng hành vi và tái sử dụng biểu diễn.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Template tốt parameter hóa biến thể thật sự và giữ các thao tác bắt buộc nhỏ, dễ thấy.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra deduction, operator bắt buộc, chi phí copy/move, reference lifetime, nhu cầu specialization và độ rõ API.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Thiết kế function templates và class templates là gì?
2. Trung bình — Kiểu nào được suy ra cho `max_value(3, 7)` và kiểu đó phải hỗ trợ thao tác gì?
3. Khó — Vì sao `max_value(1, 2.5)` thất bại khi suy ra một `T` dù ngôn ngữ có thể đổi `int` sang `double`?
