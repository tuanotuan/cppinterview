# Ngày 28 — `std::move_only_function`

## 1. Vấn đề nó giải quyết

`std::function` yêu cầu target được lưu phải copy được. C++23 thêm `std::move_only_function` để callback type-erased có thể sở hữu trạng thái move-only như `std::unique_ptr`.

## 2. Kiến thức cần có

- Ngày 3: quyền sở hữu move-only và forwarding.
- Ngày 14–15: lambda và callable object.

## 3. Ý tưởng cốt lõi

Đây là hộp callable có thể move nhưng không copy. Chữ ký trong dấu ngoặc nhọn quy định bên gọi được phép gọi target bên trong như thế nào. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::move_only_function<int()> task = [p = std::move(ptr)] { return *p; };
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::move_only_function`.
1. Chương trình lưu lambda sở hữu unique pointer rồi gọi nó qua type erasure.
1. Cuối cùng, nó in hoặc kiểm tra số nguyên chỉ callback sở hữu để dễ đối chiếu.

## 6. Lỗi thường gặp

- Copy wrapper gây lỗi biên dịch, và gọi wrapper rỗng có undefined behavior thay vì bảo đảm ném `bad_function_call` như `std::function`.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi callback cần type erasure lúc chạy và phải sở hữu capture không copy được.
- Tránh dùng khi kiểu lambda cụ thể đã đủ hoặc bên gọi thật sự cần callback copy được.

## 8. Ví dụ đơn giản

Hàng đợi công việc lưu các task, mỗi task sở hữu tài nguyên khác nhau rồi chuyển từng task cho một worker. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Điều gì xảy ra với nguồn sau khi move một `move_only_function` không rỗng, và precondition nào phải đúng trước khi gọi một trong hai wrapper?
