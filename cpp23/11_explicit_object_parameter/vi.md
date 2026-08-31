# Ngày 11 — Explicit object parameter và deducing `this`

## 1. Vấn đề nó giải quyết

Hàm thành viên truyền thống nhận `this` ngầm. C++23 cho phép viết object parameter tường minh, nhờ đó suy luận được kiểu và giảm các overload lặp lại.

## 2. Kiến thức cần có

- Ngày 4: template và hàm thành viên.
- Ngày 10: value category tại ranh giới return.

## 3. Ý tưởng cốt lõi

Đọc `this Counter& self` như ô đối tượng của lời gọi member được đưa ra rõ trong danh sách tham số. Cách gọi vẫn dùng cú pháp member bình thường. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
void add(this Counter& self, int n) { self.value += n; }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Explicit object parameter và deducing `this`.
1. Chương trình cập nhật bộ đếm nhỏ qua explicit object parameter khi compiler hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra giá trị bộ đếm mới hoặc thông báo hỗ trợ chính xác từ GCC 13 để dễ đối chiếu.

## 6. Lỗi thường gặp

- Vừa viết qualifier `const` phía sau vừa dùng explicit object parameter là không hợp lệ vì kiểu đối tượng đã nằm trong tham số đó.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi thư viện cần suy luận dạng cv/ref của đối tượng hoặc dùng chung một triển khai.
- Tránh dùng khi member thông thường không cần suy luận và rõ hơn với cú pháp truyền thống.

## 8. Ví dụ đơn giản

Accessor của container thay bốn overload theo cv/ref bằng một template explicit-object. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `this Widget& self` không phải tham số đầu tiên thông thường dù tên `self` được dùng giống tham số trong thân hàm?
