# Ngày 13 — Lambda capture parameter packs và __VA_OPT__

## 1. Vấn đề nó giải quyết

C++20 cho phép lambda capture từng phần tử của parameter pack và cho macro phát token chỉ khi danh sách đối số variadic không rỗng. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Variadic template, lambda capture và macro.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Pack capture đóng gói nhiều giá trị vào một closure; `__VA_OPT__` là phong bì có điều kiện, chỉ mở khi macro pack có phần tử. Hãy đọc `__VA_OPT__` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
#define LOG(format, ...) std::printf(format __VA_OPT__(,) __VA_ARGS__)
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `__VA_OPT__`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Capture tham chiếu vào lambda chạy trễ có thể dangling; các mẹo dấu phẩy cũ cho variadic macro rỗng không thay thế `__VA_OPT__` một cách portable.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi closure được tạo cần giữ số lượng giá trị thay đổi hoặc logging macro cần dấu phẩy tùy chọn.
- Tránh dùng khi hàm thường hoặc container diễn đạt luồng dữ liệu trực tiếp hơn.

## 8. Ví dụ đơn giản

Ví dụ tạo printer sở hữu một captured pack và gọi logging macro một lần có, một lần không có đối số bổ sung. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `__VA_OPT__` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `__VA_OPT__` trong ví dụ tối thiểu là gì?
2. Trung bình — `__VA_OPT__(,)` tạo ra token gì khi danh sách variadic rỗng?
3. Khó — Đổi init-capture từ giá trị sang tham chiếu sẽ làm yêu cầu lifetime của closure thay đổi thế nào?
