# Ngày 13 — Deducing `this` với templates và concepts

## 1. Vấn đề nó giải quyết

Khi kiểu đối tượng đã được suy luận, member có thể ràng buộc kiểu đó như mọi tham số template khác. Kết quả là một member generic có quy tắc tham gia dễ đọc.

## 2. Kiến thức cần có

- Ngày 4: concept và template có ràng buộc.
- Ngày 11–12: object parameter tường minh và được suy luận.

## 3. Ý tưởng cốt lõi

Explicit object parameter mở một cánh cổng; concept là người gác kiểm tra đối tượng đi vào có các phép toán mà thân hàm cần hay không. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
template<class Self>
requires HasValue<Self>
int read(this Self const& self);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Deducing `this` với templates và concepts.
1. Chương trình gọi member explicit-object có ràng buộc trên kiểu thỏa `HasValue`.
1. Cuối cùng, nó in hoặc kiểm tra giá trị bên trong, còn hình dạng đối tượng sai bị loại trước khi instantiate thân hàm để dễ đối chiếu.

## 6. Lỗi thường gặp

- Ràng buộc sai dạng `Self` có thể vô tình loại lời gọi `const` hoặc có tham chiếu; concept cú pháp vẫn có thể thiếu yêu cầu ngữ nghĩa.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi mixin generic có member chỉ nên tồn tại cho hình dạng đối tượng dẫn xuất tương thích.
- Tránh dùng khi thêm concept chỉ lặp lại lỗi vốn đã rõ trong member không generic.

## 8. Ví dụ đơn giản

Mixin tuần tự hóa chỉ bật `save()` khi đối tượng cuối cung cấp đủ trường cần thiết. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — `HasValue<Self>` nên kiểm tra `Self`, `remove_reference_t<Self>` hay biểu thức trên `self`, và lựa chọn đó thay đổi lời gọi const-reference thế nào?
