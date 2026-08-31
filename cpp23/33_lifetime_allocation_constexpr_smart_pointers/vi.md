# Ngày 33 — Bắt đầu lifetime, cấp phát và smart pointer `constexpr`

## 1. Vấn đề nó giải quyết

C++23 mở ba khu vực trước đây khó diễn đạt: bắt đầu đối tượng implicit-lifetime trong raw storage, yêu cầu cấp phát kèm số lượng thật nhận được và dùng thêm thao tác smart pointer lúc tính hằng.

## 2. Kiến thức cần có

- Ngày 6: RAII và lifetime bộ nhớ.
- Ngày 8: constant evaluation được mở rộng.

## 3. Ý tưởng cốt lõi

Storage là căn phòng trống, lifetime là quyền xem byte như một đối tượng, còn ownership là chìa khóa. `allocate_at_least` có thể thuê phòng lớn hơn và báo kích thước thật. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto block = allocator.allocate_at_least(count);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Bắt đầu lifetime, cấp phát và smart pointer `constexpr`.
1. Chương trình kiểm tra thao tác smart pointer constexpr và minh họa có điều kiện phép cấp phát hoặc bắt đầu lifetime tường minh.
1. Cuối cùng, nó in hoặc kiểm tra giá trị cố định cùng thông tin hỗ trợ chính xác cho tính năng thấp tầng để dễ đối chiếu.

## 6. Lỗi thường gặp

- Truy cập storage trước khi lifetime đối tượng bắt đầu là undefined behavior; deallocate bằng số yêu cầu thay vì số trả về có thể vi phạm hợp đồng allocator.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi triển khai allocator, object pool và thử nghiệm ownership compile-time có suy luận lifetime chặt.
- Tránh dùng khi đối tượng ứng dụng thường có thể tạo bình thường bằng container hoặc factory smart pointer.

## 8. Ví dụ đơn giản

Pool yêu cầu ít nhất tám ô, ghi capacity trả về và chỉ bắt đầu object trong raw slot được chọn. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao nhận storage đúng alignment và bắt đầu lifetime đối tượng là hai yêu cầu riêng, và thao tác nào đáp ứng từng yêu cầu?
