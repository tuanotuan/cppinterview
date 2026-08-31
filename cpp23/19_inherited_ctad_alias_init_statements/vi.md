# Ngày 19 — CTAD từ inherited constructor và alias trong init-statement

## 1. Vấn đề nó giải quyết

C++23 lấp hai khoảng trống về suy luận và scope. Constructor kế thừa có thể tham gia CTAD, và alias declaration có thể nằm trong init-statement của `if` hoặc `switch` với scope gọn.

## 2. Kiến thức cần có

- Ngày 4: template và class template argument deduction.
- Đã biết init-statement của `if` và `switch`.

## 3. Ý tưởng cốt lõi

Inherited CTAD cho template dẫn xuất mượn manh mối suy luận của constructor. Alias init-statement là từ vựng tạm chỉ thấy trong condition và body theo sau. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
if (using score_t = int; score_t{7} > 5) { }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho CTAD từ inherited constructor và alias trong init-statement.
1. Chương trình dùng alias có scope trong `if` và đặt cú pháp inherited CTAD sau guard hỗ trợ rõ ràng.
1. Cuối cùng, nó in hoặc kiểm tra nhánh được chọn cùng ghi nhận trung thực về mức hỗ trợ compiler để dễ đối chiếu.

## 6. Lỗi thường gặp

- Cho rằng mọi constructor kế thừa đều tạo deduction guide hữu ích có thể sai khi không suy ra được tham số; đưa alias ra scope rộng làm mất lợi ích.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi wrapper dẫn xuất nhỏ có đối số constructor suy ra được và tên kiểu cục bộ chỉ dùng trong một nhánh.
- Tránh dùng khi CTAD khi template argument tường minh diễn đạt ý nghĩa miền bài toán rõ hơn.

## 8. Ví dụ đơn giản

Nhánh kiểm tra tạo `using score_t = int` chỉ tại nơi biểu thức điểm được kiểm tra. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Khi constructor kế thừa chỉ nhắc một phần tham số của class template dẫn xuất, CTAD suy ra được phần nào và phần nào vẫn không thể?
