# Ngày 6 — decltype và trailing return type

## 1. Vấn đề nó giải quyết

`decltype` lấy kiểu của biểu thức mà không chạy biểu thức; trailing return type cho phép kiểu trả về phụ thuộc vào tên tham số. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 5, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: `decltype` lấy kiểu của biểu thức mà không chạy biểu thức; trailing return type cho phép kiểu trả về phụ thuộc vào tên tham số. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
auto add(T a, U b) -> decltype(a + b);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- `decltype(name)` và `decltype((name))` có thể cho kiểu khác nhau vì dạng có ngoặc xét value category của biểu thức.

## 7. Khi nào nên dùng

- Nên dùng khi kiểu trả về phụ thuộc vào biểu thức dùng các tham số hàm.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Hàm `add` nhỏ trả về đúng kiểu của `a + b`; cộng `int` với `double` tạo kết quả `double`. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: `decltype(name)` và `decltype((name))` có thể cho kiểu khác nhau vì dạng có ngoặc xét value category của biểu thức. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
