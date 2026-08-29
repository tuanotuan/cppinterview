# Ngày 3 — Ôn value categories, move semantics và ownership

## 1. Vấn đề nó giải quyết

Sao chép object sở hữu tài nguyên có thể tốn kém hoặc bị cấm. Move semantics cho phép chuyển tài nguyên khỏi object sắp không còn cần, còn value category giúp overload resolution biết biểu thức nào có thể được move.

## 2. Kiến thức cần có

- Ngày 1-2; lvalue reference, object tạm, destructor và `std::unique_ptr` của C++11.

## 3. Ý tưởng cốt lõi

Lvalue thường gọi tên object còn tồn tại ổn định; rvalue thường là object tạm hoặc được đánh dấu có thể move. `std::move` không tự chuyển dữ liệu, nó chỉ cast để phép move có thể được chọn.

## 4. Cú pháp tối thiểu

```cpp
std::unique_ptr<int> a = std::make_unique<int>(42);
auto b = std::move(a);
```

## 5. Cách nó hoạt động

1. Một owner duy nhất được tạo nên kiểu smart pointer không cho phép sao chép.
2. Cast nguồn thành rvalue cho phép move constructor chuyển con trỏ đang giữ sang object đích.
3. Object đích sở hữu số nguyên, còn nguồn sau move vẫn hợp lệ nhưng trở thành rỗng.

## 6. Lỗi thường gặp

- Tiếp tục dùng object như thể giá trị cũ được bảo đảm sau khi move sẽ dễ gây bug logic.
- Trước khi áp dụng mẫu, phải kiểm tra ai sở hữu tài nguyên trước và sau move, cùng các thao tác hợp lệ trên object moved-from.

## 7. Khi nào nên dùng

- Nên dùng khi ownership là duy nhất và tài nguyên có thể được chuyển thay vì sao chép.
- Tránh dùng khi nguồn phải giữ nguyên giá trị cũ hoặc bài toán thực sự cần shared ownership.

## 8. Ví dụ đơn giản

Một điểm số cấp phát động ban đầu nằm trong `source`. Move smart pointer sang `destination` cũng chuyển trách nhiệm giải phóng, và phép kiểm tra Boolean xác nhận `source` đã rỗng.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Move semantics chủ yếu là chuyển trạng thái hoặc ownership, không phải lời hứa rằng object nguồn bị hủy.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra ai sở hữu tài nguyên trước và sau move, cùng các thao tác hợp lệ trên object moved-from.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn value categories, move semantics và ownership là gì?
2. Trung bình — Sau khi move một `std::unique_ptr`, trạng thái Boolean của nguồn và đích là gì?
3. Khó — Vì sao `std::move(x)` chỉ là một phép cast, và constructor hay assignment operator nào mới thực sự chuyển tài nguyên?
