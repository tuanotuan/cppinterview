# Ngày 47 — Thuật toán tìm kiếm range trong C++23

## 1. Vấn đề nó giải quyết

C++23 lấp các khoảng trống tìm kiếm phổ biến bằng `contains`, `contains_subrange`, `starts_with`, `ends_with` và `find_last`. Tên hàm nêu thẳng câu hỏi và nhận range thay vì cặp iterator thủ công.

## 2. Kiến thức cần có

- Ngày 5: range và projection.
- Ngày 42–46: ghép range view.

## 3. Ý tưởng cốt lõi

Hãy xem các thuật toán như từ vựng có/không cộng một truy vấn vị trí. Kiểm tra prefix/suffix so ở mép tương ứng; tìm cuối trả vị trí khớp cuối. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
bool has = std::ranges::contains(range, value);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Thuật toán tìm kiếm range trong C++23.
1. Chương trình đặt cả năm câu hỏi trên một dãy số nguyên cố định khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra các câu trả lời đúng hoặc sai và index của lần khớp cuối để dễ đối chiếu.

## 6. Lỗi thường gặp

- `find_last` trả subrange thay vì một iterator đơn; dereference begin mà không kiểm tra rỗng là không hợp lệ khi không có kết quả.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi kiểm tra biên và membership dễ đọc trên range có ngữ nghĩa equality tương thích.
- Tránh dùng khi tìm text theo locale hoặc trường hợp cần thuật toán matching phức tạp hơn.

## 8. Ví dụ đơn giản

Bộ kiểm tra giao thức xác nhận dãy byte bắt đầu bằng header, kết thúc bằng marker và chứa cờ bắt buộc. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Needle rỗng có ý nghĩa chính xác gì với `contains_subrange`, `starts_with`, `ends_with`, và vì sao phải test trường hợp biên?
