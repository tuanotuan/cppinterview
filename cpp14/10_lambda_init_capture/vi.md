# Ngày 10 — Lambda init-capture

## 1. Vấn đề nó giải quyết

Capture C++11 thường sao chép hoặc tham chiếu biến cục bộ đã tồn tại với cùng tên. Init-capture C++14 cho closure tạo member riêng từ biểu thức bất kỳ và có thể đặt tên member rõ hơn.

## 2. Kiến thức cần có

- Ngày 2, 4 và 9: type deduction, capture value/reference, gọi lambda và generic lambda.

## 3. Ý tưởng cốt lõi

Hãy đọc init-capture giống initializer cho private data member: biểu thức được tính khi object lambda được tạo và tên capture mới tồn tại bên trong thân lambda.

## 4. Cú pháp tối thiểu

```cpp
int base = 10;
auto twice = [value = base * 2] { return value; };
```

## 5. Cách nó hoạt động

1. Biểu thức bên phải capture initializer được tính đúng một lần khi closure được tạo.
2. Kết quả khởi tạo member mới của closure tên `value`, với kiểu được suy ra giống `auto`.
3. Thay đổi biến bên ngoài sau đó không làm đổi initialized capture đã lưu.

## 6. Lỗi thường gặp

- Cho rằng biểu thức initializer chạy lại ở mỗi lần gọi là nhầm giữa lúc tạo closure với lúc invoke.
- Trước khi áp dụng mẫu, phải kiểm tra thời điểm tính biểu thức, tên capture mới, kiểu được suy ra và việc thân lambda có cần `mutable` hay không.

## 7. Khi nào nên dùng

- Nên dùng khi closure cần bản chụp đã biến đổi, trạng thái được đổi tên hoặc giá trị chỉ tạo riêng cho closure.
- Tránh dùng khi capture thông thường đã diễn đạt đủ đơn giản hoặc cần theo dõi trực tiếp object gốc bằng reference.

## 8. Ví dụ đơn giản

Giá cơ sở được nhân đôi lúc tạo closure và lưu dưới tên `snapshot`. Gán lại giá gốc sau đó chứng minh closure sở hữu giá trị đã tính trước.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Init-capture tạo trạng thái do closure sở hữu từ một biểu thức tại thời điểm tạo lambda.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra thời điểm tính biểu thức, tên capture mới, kiểu được suy ra và việc thân lambda có cần `mutable` hay không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Lambda init-capture là gì?
2. Trung bình — Nếu `base` đổi sau khi `[snapshot = base * 2]` được tính, lambda trả về gì?
3. Khó — Kiểu được suy ra của init-capture khác thế nào với việc capture một biến reference có sẵn bằng reference?
