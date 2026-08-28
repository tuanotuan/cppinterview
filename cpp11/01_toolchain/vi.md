# Ngày 1 — Toolchain, cờ biên dịch và chế độ C++11

## 1. Vấn đề nó giải quyết

Toolchain biến mã nguồn thành chương trình chạy được; các cờ biên dịch chọn bộ quy tắc ngôn ngữ và mức cảnh báo cho lần build đó. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Biết mở terminal, dùng trình soạn thảo và chạy một lệnh cơ bản.

## 3. Ý tưởng cốt lõi

Mental model: Toolchain biến mã nguồn thành chương trình chạy được; các cờ biên dịch chọn bộ quy tắc ngôn ngữ và mức cảnh báo cho lần build đó. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
g++ -std=c++11 -Wall -Wextra -Wpedantic main.cpp -o main
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Không ghi rõ chuẩn có thể khiến máy này nhận tính năng mới nhưng máy khác lại từ chối, làm kết quả build thiếu ổn định.

## 7. Khi nào nên dùng

- Nên dùng khi cần một quy trình build C++11 lặp lại được và có cảnh báo hữu ích.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Chương trình in `__cplusplus`; khi dùng `-std=c++11`, giá trị này cho biết chế độ ngôn ngữ đã chọn rồi in thêm một phép tính cố định. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Không ghi rõ chuẩn có thể khiến máy này nhận tính năng mới nhưng máy khác lại từ chối, làm kết quả build thiếu ổn định. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
