# Ngày 4 — Ôn lambda và capture trong C++11

## 1. Vấn đề nó giải quyết

Một hành vi ngắn chỉ dùng một lần sẽ bất tiện nếu phải tách thành hàm có tên, nhất là khi nó cần trạng thái xung quanh. Lambda tạo callable không tên và capture list cho biết biến bên ngoài nào trở thành một phần của callable.

## 2. Kiến thức cần có

- Ngày 1-3; biến cục bộ, reference, gọi hàm và object lifetime.

## 3. Ý tưởng cốt lõi

Lambda giống một function object nhỏ do compiler sinh ra. Capture theo value giữ bản chụp, còn capture theo reference truy cập object gốc nên quy tắc lifetime và thay đổi dữ liệu khác nhau.

## 4. Cú pháp tối thiểu

```cpp
int n = 3;
auto by_value = [n] { return n; };
auto by_ref = [&n] { ++n; };
```

## 5. Cách nó hoạt động

1. Capture list được xử lý lúc object lambda được tạo, không phải mỗi lần gọi.
2. Một member dạng value giữ số cũ, còn reference đã capture tiếp tục trỏ tới biến cục bộ ban đầu.
3. Thay đổi biến gốc ảnh hưởng lambda capture reference nhưng không đổi bản chụp theo value.

## 6. Lỗi thường gặp

- Trả về lambda đã capture biến cục bộ bằng reference sẽ để lại dangling reference khi scope kết thúc.
- Trước khi áp dụng mẫu, phải kiểm tra kiểu capture, khả năng thay đổi và việc mọi object được tham chiếu có sống lâu hơn lần gọi lambda hay không.

## 7. Khi nào nên dùng

- Nên dùng khi algorithm hoặc thao tác cục bộ cần callable nhỏ gắn với dữ liệu ở gần.
- Tránh dùng khi thân hàm dài, được tái sử dụng rộng hoặc lifetime của dữ liệu capture không rõ ràng.

## 8. Ví dụ đơn giản

Thuế suất được capture theo value để cố định quy tắc tính, còn bộ đếm số lần gọi được capture theo reference để mọi lần gọi cùng cập nhật một biến.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Capture list là một phần trạng thái của lambda và phải thể hiện rõ bản chụp hay truy cập chung.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra kiểu capture, khả năng thay đổi và việc mọi object được tham chiếu có sống lâu hơn lần gọi lambda hay không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn lambda và capture trong C++11 là gì?
2. Trung bình — Nếu `rate` đổi sau khi lambda capture theo value được tạo, lambda dùng mức thuế nào?
3. Khó — Điều gì trở nên không hợp lệ khi lambda dùng `[&local]` thoát khỏi scope sở hữu `local`?
