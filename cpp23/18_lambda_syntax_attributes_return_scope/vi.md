# Ngày 18 — Cú pháp lambda, attributes và trailing-return scope

## 1. Vấn đề nó giải quyết

C++23 làm cú pháp lambda đều đặn hơn: attribute có thể áp lên call operator sinh ra, dấu ngoặc được bỏ trong nhiều dạng hơn và lookup của trailing return nhìn đúng scope lambda.

## 2. Kiến thức cần có

- Ngày 14–15: closure object và static lambda.
- Attribute và trailing return type.

## 3. Ý tưởng cốt lõi

Lambda là class vô danh có call operator. Vị trí attribute cho biết thực thể sinh ra nào nhận metadata, còn trailing return mô tả kết quả của operator đó. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto f = [] [[nodiscard]] (int x) -> decltype(x) { return x * 2; };
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Cú pháp lambda, attributes và trailing-return scope.
1. Chương trình gọi lambda có call operator mang attribute và trailing return tường minh.
1. Cuối cùng, nó in hoặc kiểm tra một giá trị nhân đôi xác định để dễ đối chiếu.

## 6. Lỗi thường gặp

- Đặt attribute sai vị trí có thể áp nó lên closure type hoặc function type thay vì call operator, hoặc bị compiler từ chối.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi generic lambda có kiểu trả về hoặc chẩn đoán tốt hơn khi khai báo tường minh.
- Tránh dùng khi thêm attribute hoặc trailing return không truyền đạt ràng buộc hay ý định hữu ích.

## 8. Ví dụ đơn giản

Callback chuyển đổi đánh dấu kết quả `[[nodiscard]]` vì bỏ qua giá trị đã đổi thường là bug. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu init-capture trùng tên biến ngoài nhưng khác kiểu, lookup trong trailing return của C++23 phải dùng khai báo nào?
