# Ngày 38 — Kiểm tra chuỗi và `resize_and_overwrite`

## 1. Vấn đề nó giải quyết

Tìm substring không nên phải so với `npos`, và điền chuỗi qua buffer ghi thô không nên cần bước sửa size riêng. C++23 thêm API trực tiếp cho cả hai việc.

## 2. Kiến thức cần có

- Ngày 23: biểu diễn văn bản và code unit.
- Lambda và `std::string_view`.

## 3. Ý tưởng cốt lõi

`contains` trả lời câu hỏi có/không. `resize_and_overwrite` cho callback mượn storage ghi được với size yêu cầu, rồi callback trả số ký tự đã khởi tạo thật. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
bool found = text.contains(needle);
text.resize_and_overwrite(n, writer);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Kiểm tra chuỗi và `resize_and_overwrite`.
1. Chương trình kiểm tra hai đoạn con rồi thay nội dung chuỗi qua buffer được cấp.
1. Cuối cùng, nó in hoặc kiểm tra hai kết quả đúng rồi đến chuỗi ngắn đã viết lại để dễ đối chiếu.

## 6. Lỗi thường gặp

- Trả size lớn hơn capacity callback nhận gây undefined behavior; dùng contains theo byte như tìm kiếm ngữ nghĩa Unicode có thể sai ranh giới grapheme.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi kiểm tra substring rõ ràng và sinh trực tiếp hiệu quả vào storage chuỗi sở hữu.
- Tránh dùng khi API ngoài giữ lại pointer buffer tạm hoặc thao tác text cần chuẩn hóa Unicode.

## 8. Ví dụ đơn giản

Formatter dành đúng ba ký tự, ghi `C++` rồi trả độ dài đã khởi tạo. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Điều gì xảy ra nếu callback overwrite chỉ khởi tạo ba ký tự nhưng trả size yêu cầu là mười?
