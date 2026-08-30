# Ngày 1 — Toolchain, cờ compiler và chế độ C++20

## 1. Vấn đề nó giải quyết

Toolchain biến mã nguồn thành chương trình chạy được, còn các cờ compiler chọn bộ quy tắc ngôn ngữ, mức cảnh báo và tên tệp đầu ra. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Một tệp nguồn có hàm `main`.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy hình dung một dây chuyền: mã nguồn được dịch, kiểm tra theo luật C++20, liên kết rồi mới chạy. Cờ biên dịch là chỉ dẫn gắn vào dây chuyền đó. Hãy đọc `-std=c++20` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
// g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o main
#if __cplusplus >= 202002L
// C++20 mode is active.
#endif
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `-std=c++20`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Nếu thiếu `-std=c++20`, compiler có thể từ chối cú pháp hợp lệ hoặc âm thầm dùng chuẩn cũ; bỏ qua warning có thể che giấu lỗi thật.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi bạn biên dịch bài học, thử một tính năng hoặc cần chẩn đoán có thể lặp lại.
- Tránh dùng khi bạn chỉ chạy một tệp thực thi đã được biên dịch sẵn.

## 8. Ví dụ đơn giản

Chương trình in `__cplusplus` và xác nhận compiler có đang dùng C++20 trở lên hay không. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `-std=c++20` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `-std=c++20` trong ví dụ tối thiểu là gì?
2. Trung bình — Nếu `__cplusplus` nhỏ hơn `202002`, bạn cần kiểm tra phần nào của lệnh biên dịch?
3. Khó — Vì sao cùng một mã nguồn có thể cho kết quả biên dịch khác khi chỉ bỏ `-std=c++20`, dù vẫn dùng đúng compiler đó?
