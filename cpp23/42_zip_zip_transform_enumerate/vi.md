# Ngày 42 — View `zip`, `zip_transform` và `enumerate`

## 1. Vấn đề nó giải quyết

Chương trình thường duyệt các dãy liên quan cùng nhịp hoặc cần chỉ số bên cạnh phần tử. C++23 cung cấp view lười thay cho tự quản lý index hoặc tạo container tuple ngay.

## 2. Kiến thức cần có

- Ngày 5: view lười và sentinel.
- Ngày 41: range được container tiêu thụ.

## 3. Ý tưởng cốt lõi

`zip` kéo khóa từng vị trí và dừng theo input ngắn nhất. `zip_transform` áp hàm ngay, còn `enumerate` zip chỉ số sinh ra với giá trị. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
for (auto [index, value] : std::views::enumerate(range)) { }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho View `zip`, `zip_transform` và `enumerate`.
1. Chương trình ghép tên với điểm, kết hợp cặp số và enumerate giá trị khi các view tồn tại.
1. Cuối cùng, nó in hoặc kiểm tra cặp cùng nhịp và cặp index-value mà không cần container trung gian để dễ đối chiếu.

## 6. Lỗi thường gặp

- Cho rằng zip chạy đến input dài nhất sẽ âm thầm mất dữ liệu; giữ tuple reference sau khi range nguồn chết tạo tham chiếu treo.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi duyệt cùng nhịp các range liên quan có lifetime tương thích.
- Tránh dùng khi input mà độ dài khác nhau là lỗi phải kiểm tra tường minh trước khi zip.

## 8. Ví dụ đơn giản

Báo cáo điểm zip tên sinh viên với điểm rồi enumerate các dòng kết quả để hiển thị. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu một range zip có ba phần tử và range kia có năm, size kết quả là bao nhiêu và cần kiểm tra gì khi không chấp nhận cắt ngắn?
