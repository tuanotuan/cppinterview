# Ngày 22 — Designated initializers và aggregate initialization

## 1. Vấn đề nó giải quyết

Designated initializer làm aggregate construction dễ đọc bằng cách nêu tên member nhận giá trị. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Struct, thứ tự khai báo member và list initialization.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Aggregate là record mở đơn giản. Designator là nhãn gắn vào initializer để người đọc không phải nhớ ý nghĩa chỉ theo vị trí. Hãy đọc `.member = value` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
Settings s{.width = 800, .height = 600, .fullscreen = false};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `.member = value`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Designator C++ phải theo declaration order và không thể quay ngược tùy ý như vài ngôn ngữ khác; kiểu cũng phải vẫn là aggregate.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi record dữ liệu đơn giản có nhiều field và named initialization giúp rõ nghĩa.
- Tránh dùng khi kiểu bảo vệ invariant bằng constructor hoặc không còn là aggregate.

## 8. Ví dụ đơn giản

Một settings aggregate nhận width, height và fullscreen với tên member hiện rõ tại chỗ khởi tạo. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `.member = value` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `.member = value` trong ví dụ tối thiểu là gì?
2. Trung bình — Member aggregate bị bỏ qua nhận giá trị gì khi value initialization được áp dụng?
3. Khó — Vì sao thêm user-declared constructor có thể làm designated initialization cũ lỗi dù tên member không đổi?
