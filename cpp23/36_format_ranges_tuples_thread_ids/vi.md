# Ngày 36 — Formatting range, tuple và thread ID

## 1. Vấn đề nó giải quyết

C++23 mở formatting vượt khỏi giá trị đơn. Formatter chuẩn cho range, tuple-like và thread ID giúp chẩn đoán dữ liệu có cấu trúc mà không tự viết loop hay ghép chuỗi.

## 2. Kiến thức cần có

- Ngày 5: range và phép duyệt.
- Ngày 6: thread.
- Ngày 35: output format hiện đại.

## 3. Ý tưởng cốt lõi

Formatter là thấu kính hiển thị. Formatter range và tuple áp thấu kính đệ quy lên phần tử, còn formatter thread ID cho danh tính in được nhưng phụ thuộc implementation. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto text = std::format("values={} pair={}", values, pair);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Formatting range, tuple và thread ID.
1. Chương trình format các giá trị có cấu trúc cố định khi đủ formatter C++23.
1. Cuối cùng, nó in hoặc kiểm tra cấu trúc dễ đọc hoặc thông báo thư viện chưa hỗ trợ chính xác để dễ đối chiếu.

## 6. Lỗi thường gặp

- Cho rằng chuỗi thread ID ổn định qua nhiều lần chạy là sai; format range lồng sâu cũng có thể tạo log lớn và tốn chi phí.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi chẩn đoán và hiển thị gọn các giá trị thư viện chuẩn có cấu trúc nhỏ.
- Tránh dùng khi tuần tự hóa máy đọc, nơi cần định dạng và quy tắc escape được đặc tả.

## 8. Ví dụ đơn giản

Một dòng debug hiển thị worker ID, tuple `(task, priority)` và range số đo ngắn. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu kiểu phần tử range không có formatter, vì sao format cả range thất bại dù kiểu range bên ngoài đã được nhận diện?
