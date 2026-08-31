# Ngày 14 — Deducing `this` với CRTP, mixin và recursive lambda

## 1. Vấn đề nó giải quyết

Deducing `this` có thể thay bớt boilerplate CRTP và cho lambda gọi chính callable object của nó mà không cần `std::function` bên ngoài. Đệ quy trở nên cục bộ, không cấp phát.

## 2. Kiến thức cần có

- Ngày 4: CRTP và generic programming.
- Ngày 11–13: object parameter được suy luận và ràng buộc.

## 3. Ý tưởng cốt lõi

Callable truyền chính nó qua ô object. Mỗi lời gọi đệ quy tái dùng đối tượng self đó, giống hàm có tên nhưng không cần khai báo riêng. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto fact = [](this auto self, int n) { return n < 2 ? 1 : n * self(n - 1); };
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Deducing `this` với CRTP, mixin và recursive lambda.
1. Chương trình dùng tham số self tường minh để tính giai thừa nhỏ bằng đệ quy.
1. Cuối cùng, nó in hoặc kiểm tra kết quả giai thừa mong đợi hoặc thông báo chưa hỗ trợ chính xác để dễ đối chiếu.

## 6. Lỗi thường gặp

- Capture recursive lambda bằng tham chiếu ngay trong lúc chính nó khởi tạo là không hợp lệ; đệ quy bất cẩn vẫn có thể tràn stack.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi thuật toán đệ quy cục bộ nhỏ và mixin nơi explicit-object bỏ các phép cast CRTP lặp lại.
- Tránh dùng khi đệ quy sâu hoặc trường hợp hàm có tên diễn đạt ý định rõ hơn.

## 8. Ví dụ đơn giản

Phép tính độ sâu cây cục bộ dùng recursive lambda mà không type erasure hay cấp phát heap. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `this auto self` thường sao chép closure object, và khi nào `this auto&& self` làm thay đổi hành vi hoặc hiệu năng?
