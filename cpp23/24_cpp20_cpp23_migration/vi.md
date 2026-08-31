# Ngày 24 — Deprecation, compatibility và migration C++20–C++23

## 1. Vấn đề nó giải quyết

Migration không chỉ là đổi cờ. Nhóm phải tìm tính năng bị bỏ hoặc deprecated, kiểm tra mức hỗ trợ, giữ hành vi ổn định và đưa thay thế vào từng bước dễ review.

## 2. Kiến thức cần có

- Ngày 1–2: ma trận hỗ trợ và feature-test macro.
- Ngày 7–23: các thay đổi ngôn ngữ cần migration.

## 3. Ý tưởng cốt lõi

Hãy xem migration như qua cầu có trạm kiểm: làm sạch warning C++20, bật C++23, xem tính năng có sẵn, thay API rủi ro rồi test từng compiler. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
[[deprecated("use new_api")]] int old_api();
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Deprecation, compatibility và migration C++20–C++23.
1. Chương trình giữ wrapper deprecated để nhận diện nhưng nhánh chạy gọi API thay thế.
1. Cuối cùng, nó in hoặc kiểm tra cùng kết quả qua API hiện tại và build không warning để dễ đối chiếu.

## 6. Lỗi thường gặp

- Đổi chế độ ngôn ngữ và mọi idiom thư viện cùng lúc làm khó cô lập regression; tắt warning deprecation che giấu nợ kỹ thuật.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi nâng cấp có kế hoạch với test, ma trận compiler và lớp tương thích nhỏ.
- Tránh dùng khi viết lại mã ổn định chỉ để dùng mọi tính năng mới hoặc bỏ fallback trước khi compiler mục tiêu theo kịp.

## 8. Ví dụ đơn giản

Dự án giữ `old_total()` ở trạng thái deprecated một bản phát hành trong khi lời gọi nội bộ chuyển sang `new_total()`. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Làm sao wrapper tương thích giữ source compatibility mà không âm thầm đổi overload resolution hoặc hành vi sở hữu?
