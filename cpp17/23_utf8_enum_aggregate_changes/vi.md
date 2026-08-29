# Ngày 23 — UTF-8 character literals, enum initialization và aggregate changes

## 1. Vấn đề nó giải quyết

Một số thay đổi nhỏ của C++17 làm notation dữ liệu và aggregate construction đều hơn: UTF-8 character literal, direct-list initialization enum có fixed underlying type và aggregate class có public base.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết character literal, scoped enum, narrowing rule, aggregate initialization và inheritance.

## 3. Ý tưởng cốt lõi

Trong C++17, UTF-8 character literal như `u8'A'` có type `char`. Enum có fixed underlying type có thể initialize từ non-narrowing value bằng brace, và public base phù hợp tham gia aggregate initialization.

## 4. Cú pháp tối thiểu

```cpp
char letter = u8'A';
enum class Byte : unsigned char {};
Byte value{42};
Derived point{{3}, 4};
```

## 5. Cách nó hoạt động

1. Program dựng một value bằng từng quy tắc C++17 trong ba nhóm.
2. Static type check xác nhận literal và enum representation, còn nested brace khởi tạo base subobject trước derived member.
3. Chương trình in `letter: A`, `byte: 42` và `point: 3,4`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Một UTF-8 character literal không biểu diễn được character cần nhiều code unit; source encoding, execution encoding và Unicode code point vẫn là khái niệm khác nhau.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi representation và aggregate layout đơn giản, rõ và được bảo vệ khỏi narrowing.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Static assertion kiểm tra type và size; in underlying numeric data tránh xem scoped enum là implicitly convertible.

## 9. Điều cần nhớ

- Tiện ích syntax nhỏ vẫn cần suy luận cẩn thận về encoding, narrowing và object layout.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — UTF-8 character literals, enum initialization và aggregate changes giải quyết vấn đề chính nào?
2. Trung bình — Trong C++17, `u8'A'` có type gì?
3. Khó — Vì sao UTF-8 character nhiều byte không phù hợp cùng literal model?
