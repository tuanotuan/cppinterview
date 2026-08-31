# Ngày 50 — `std::mdspan`, extents và dữ liệu nhiều chiều

## 1. Vấn đề nó giải quyết

Dữ liệu nhiều chiều thường nằm trong một buffer liên tục. `std::mdspan` cung cấp view đánh chỉ số không sở hữu, còn extents mô tả mỗi chiều có size tĩnh hoặc runtime.

## 2. Kiến thức cần có

- Ngày 5: view không sở hữu.
- Ngày 16: đánh chỉ số nhiều chiều.

## 3. Ý tưởng cốt lõi

Buffer là sàn kho, extents là số đo hàng và cột, còn mdspan là bản đồ tọa độ. Nó không sở hữu hoặc resize nhà kho. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::mdspan matrix(data.data(), rows, columns);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::mdspan`, extents và dữ liệu nhiều chiều.
1. Chương trình bọc sáu số nguyên thành matrix hai nhân ba rồi đọc một tọa độ khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra giá trị tại hàng một, cột hai để dễ đối chiếu.

## 6. Lỗi thường gặp

- Storage nền phải sống lâu hơn mdspan, và index ngoài bất kỳ extent nào là undefined behavior; extents không cấp phát hay xác nhận size buffer không liên quan.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi kernel số học, ảnh, matrix và interface tensor trên bộ nhớ do nơi khác sở hữu.
- Tránh dùng khi dữ liệu cần view tự sở hữu, resize hoặc tự kiểm tra biên.

## 8. Ví dụ đơn giản

Buffer ảnh sáu giá trị được xem thành hai hàng, ba cột mà không copy pixel. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu extent là static trong kiểu, thông tin size nào còn được lưu lúc chạy, và điều gì xảy ra khi buffer cấp thật sự quá nhỏ?
