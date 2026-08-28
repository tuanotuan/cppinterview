# Ngày 38 — User-defined literals, raw strings, Unicode, attributes, alignment và thread_local

## 1. Vấn đề nó giải quyết

C++11 bổ sung ký pháp và metadata cho giá trị miền, text dễ đọc, chuỗi có encoding, ý định cho compiler, căn chỉnh bộ nhớ và trạng thái riêng từng thread. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 37, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: C++11 bổ sung ký pháp và metadata cho giá trị miền, text dễ đọc, chuỗi có encoding, ý định cho compiler, căn chỉnh bộ nhớ và trạng thái riêng từng thread. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
2_kb; R"(raw text)"; u8"text"; [[noreturn]]; alignas(16); thread_local int n;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Chuỗi UTF-8 vẫn là dãy code unit; index theo byte không tương đương index theo ký tự người dùng nhìn thấy.

## 7. Khi nào nên dùng

- Nên dùng khi cú pháp cần biểu đạt trực tiếp đơn vị, text, ràng buộc bộ nhớ hoặc trạng thái từng thread.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Một chương trình gọn dùng literal `_kb`, raw path, text UTF-8, `[[noreturn]]`, `alignas/alignof` và bộ đếm `thread_local`. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Chuỗi UTF-8 vẫn là dãy code unit; index theo byte không tương đương index theo ký tự người dùng nhìn thấy. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
