# Ngày 1 — Toolchain, compiler flags và chế độ C++17

## 1. Vấn đề nó giải quyết

Chỉ source code không tự chọn chuẩn ngôn ngữ, warning policy, optimizer hay input cho linker. Lệnh build rõ ràng giúp mọi bài có thể lặp lại và chứng minh cú pháp C++17 thực sự được chấp nhận.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết mở terminal, lưu file nguồn và phân biệt bước biên dịch với bước chạy executable.

## 3. Ý tưởng cốt lõi

Xem toolchain như bốn bước preprocess, compile, assemble và link. Tùy chọn `-std=c++17` chọn quy tắc ngôn ngữ; `-Wall -Wextra -Wpedantic` bật chẩn đoán hữu ích, còn `-pthread` hỗ trợ các bài thread.

## 4. Cú pháp tối thiểu

```cpp
g++ -std=c++17 -Wall -Wextra -Wpedantic -pthread main.cpp -o app
```

## 5. Cách nó hoạt động

1. Preprocessor kiểm tra `__cplusplus` trước khi compiler dịch khai báo structured binding.
2. Trong chế độ C++17 phù hợp, macro ít nhất là `201703L`; chuẩn cũ hơn dừng tại lỗi chủ động.
3. Chương trình in số biểu thị language level và `sum: 42`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Dựa vào default của IDE hay compiler có thể vô tình nhận extension mới hơn hoặc từ chối cú pháp C++17 cần thiết trên máy khác.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi một build phải chạy nhất quán trong terminal, editor, CI và môi trường của đồng đội.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Một pair được tách bằng structured binding, tính năng chưa có trước C++17. Version guard và tổng được in giúp nhìn thấy cả chuẩn đã chọn lẫn hành vi chương trình.

## 9. Điều cần nhớ

- Hãy xem tên, phiên bản compiler, standard mode, warning, optimization level và link option là một phần của chương trình.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Toolchain, compiler flags và chế độ C++17 giải quyết vấn đề chính nào?
2. Trung bình — `__cplusplus` phải thuộc khoảng nào khi file được compile đúng chế độ C++17?
3. Khó — Vì sao compilation có thể thành công nhưng final link vẫn lỗi khi thiếu tùy chọn thư viện cần thiết?
