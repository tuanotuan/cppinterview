# Ngày 12 — Explicit template parameter list cho lambda

## 1. Vấn đề nó giải quyết

C++20 cho phép lambda đặt tên template parameter, nhờ đó thể hiện quan hệ giữa các kiểu mà không cần tạo function template riêng. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Generic lambda và suy luận template argument.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Danh sách trong dấu ngoặc nhọn là template header riêng của lambda. Nó làm kiểu suy luận có tên để danh sách tham số tái sử dụng hoặc ràng buộc. Hãy đọc `[]<class T>` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto maximum = []<class T>(T a, T b) { return a < b ? b : a; };
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `[]<class T>`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Một `T` duy nhất yêu cầu các lần suy luận khớp nhau; lời gọi với hai kiểu khác nhau có thể lỗi dù lambda `auto, auto` vẫn nhận được.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi callable cục bộ cần template parameter có tên, pack hoặc constraint.
- Tránh dùng khi các tham số `auto` độc lập đã diễn đạt đúng độ linh hoạt.

## 8. Ví dụ đơn giản

Một lambda đặt tên `T`, nhận hai giá trị cùng kiểu rồi trả về giá trị lớn hơn. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `[]<class T>` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `[]<class T>` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao lời gọi với hai `int` biên dịch được, và kiểu trả về là gì?
3. Khó — Xung đột suy luận nào xảy ra khi gọi bằng `int` và `double` trong khi cả hai tham số đều là `T`?
