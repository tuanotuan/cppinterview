# Ngày 1 — Toolchain, compiler flags và chế độ C++14

## 1. Vấn đề nó giải quyết

File nguồn C++ không tự quyết định chế độ ngôn ngữ hay mức cảnh báo. Toolchain và các compiler flag xác định cú pháp C++14 có được chấp nhận hay không, cảnh báo nào xuất hiện và file nguồn được biến thành chương trình chạy được như thế nào.

## 2. Kiến thức cần có

- Biết dùng trình soạn thảo, terminal và hiểu rằng file nguồn phải được dịch trước khi chạy.

## 3. Ý tưởng cốt lõi

Hãy hình dung toolchain như dây chuyền gồm tiền xử lý, biên dịch, hợp dịch rồi liên kết. Lệnh biên dịch là một hợp đồng chọn chuẩn C++ và yêu cầu compiler báo những đoạn code đáng ngờ.

## 4. Cú pháp tối thiểu

```cpp
g++ -std=c++14 -Wall -Wextra -Wpedantic main.cpp -o app
```

## 5. Cách nó hoạt động

1. Compiler driver đọc file nguồn, áp dụng quy tắc ngôn ngữ C++14 và bật ba nhóm cảnh báo đã yêu cầu.
2. Sau tiền xử lý và dịch mã, linker ghép object code với phần thư viện chuẩn mà chương trình cần.
3. Khi chạy, chương trình in giá trị macro phiên bản C++ và một giá trị được viết bằng cú pháp hợp lệ của C++14.

## 6. Lỗi thường gặp

- Biên dịch mà không ghi rõ `-std=c++14` có thể âm thầm dùng chuẩn mặc định khác và che mất lỗi tương thích.
- Trước khi áp dụng mẫu, phải kiểm tra chuẩn được chọn, các cờ cảnh báo, tên file nguồn và tùy chọn liên kết.

## 7. Khi nào nên dùng

- Nên dùng khi mỗi lần biên dịch bài tập, kiểm tra tính tương thích hoặc cần một lệnh build có thể lặp lại.
- Tránh dùng khi chỉ dựa vào cấu hình ẩn của IDE mà không biết nó chọn compiler và chuẩn ngôn ngữ nào.

## 8. Ví dụ đơn giản

Ví dụ dùng tiền xử lý để từ chối chuẩn cũ hơn C++14, sau đó in `__cplusplus` và một bit mask viết ở dạng nhị phân. Nhờ vậy chế độ đang dùng được kiểm chứng thay vì chỉ đoán.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Một lệnh build C++ có thể lặp lại luôn ghi rõ chuẩn ngôn ngữ và mức cảnh báo cần thiết.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra chuẩn được chọn, các cờ cảnh báo, tên file nguồn và tùy chọn liên kết.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Toolchain, compiler flags và chế độ C++14 là gì?
2. Trung bình — Với GCC ở chế độ C++14, điều kiện `__cplusplus >= 201402L` cho kết quả gì?
3. Khó — Vì sao code có thể biên dịch bằng cấu hình mặc định nhưng thất bại khi build lại với `-std=c++14 -Wpedantic`?
