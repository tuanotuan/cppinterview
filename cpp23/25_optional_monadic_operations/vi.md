# Ngày 25 — Monadic operation của `std::optional`

## 1. Vấn đề nó giải quyết

Mã liên tục kiểm tra optional dễ lồng sâu và nhiều nhiễu. C++23 thêm `and_then`, `transform` và `or_else` để ghép rõ nhánh có giá trị và nhánh rỗng.

## 2. Kiến thức cần có

- Ngày 5: pipeline biến đổi lười.
- Ngày 24: dùng tính năng thư viện C++23 an toàn.

## 3. Ý tưởng cốt lõi

Hãy hình dung chiếc hộp có thể rỗng. `transform` đổi món bên trong nhưng bỏ qua hộp rỗng, `and_then` có thể trả hộp mới, còn `or_else` xử lý rỗng. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
opt.transform(f).and_then(g).or_else(recover);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Monadic operation của `std::optional`.
1. Chương trình nhân đôi điểm có sẵn, kiểm tra, đổi sang chữ và cấp fallback nếu cần.
1. Cuối cùng, nó in hoặc kiểm tra chuỗi đã biến đổi cho điểm hợp lệ cố định để dễ đối chiếu.

## 6. Lỗi thường gặp

- Trả giá trị thường từ `and_then` là lỗi kiểu vì callable phải trả optional khác; capture tham chiếu treo trong lambda pipeline cũng không an toàn.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi chuỗi thao tác phụ thuộc ngắn, nơi vắng giá trị phải bỏ qua các bước thành công sau.
- Tránh dùng khi pipeline có lambda che control flow phức tạp nên viết bằng bước có tên hoặc `if` thường.

## 8. Ví dụ đơn giản

Tra cứu cấu hình parse port tùy chọn, kiểm tra khoảng và chỉ dùng mặc định khi không còn giá trị hợp lệ. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Kiểu trả về bắt buộc của callable truyền cho `transform` và `and_then` khác nhau thế nào, và nhầm chúng tạo mức lồng nào?
