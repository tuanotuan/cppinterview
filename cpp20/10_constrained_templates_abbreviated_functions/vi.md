# Ngày 10 — Constrained templates và abbreviated function templates

## 1. Vấn đề nó giải quyết

Constraint ngăn template nhận đối số không hợp lệ, còn cú pháp abbreviated loại bớt boilerplate cho tham số có ràng buộc đơn giản. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Standard concept và function template thông thường.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Constrained template vẫn là template thường nhưng có cánh cổng. Viết `Concept auto` đặt cánh cổng ngay cạnh tham số hàm. Hãy đọc `Concept auto` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::integral auto square(std::integral auto value);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `Concept auto`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Các vị trí đặt constraint nhìn có vẻ tương đương nhưng có thể tham gia overload ordering khác nhau nếu biểu thức constraint không có quan hệ cấu trúc.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi hàm mang tính generic nhưng mỗi tham số có hợp đồng concept rõ ràng.
- Tránh dùng khi bạn cần đặt tên hoặc ràng buộc quan hệ giữa nhiều template parameter.

## 8. Ví dụ đơn giản

Chương trình định nghĩa một named constrained template và một abbreviated function, cả hai chỉ nhận số nguyên. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `Concept auto` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `Concept auto` trong ví dụ tối thiểu là gì?
2. Trung bình — Compiler ngầm tạo template parameter nào cho `std::integral auto value`?
3. Khó — Khi hai tham số phải có đúng cùng kiểu, vì sao hai tham số `std::integral auto` riêng biệt có thể là ràng buộc quá yếu?
