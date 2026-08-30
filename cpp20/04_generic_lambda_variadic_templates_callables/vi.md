# Ngày 4 — Generic lambda, variadic templates và callables

## 1. Vấn đề nó giải quyết

Callable cho phép thuật toán nhận hành vi như dữ liệu; dạng generic và variadic giúp một callable xử lý nhiều kiểu hoặc số lượng đối số khác nhau. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Lambda, template và lời gọi hàm.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy xem lambda như một object hàm nhỏ không tên. Mỗi tham số `auto` được suy luận kiểu, còn parameter pack là túi đối số được bung tại dấu `...`. Hãy đọc `auto...` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto sum = [](auto... values) { return (values + ...); };
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `auto...`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Fold expression cần toán tử hợp lệ và cách xử lý trường hợp rỗng; một số phép fold sẽ không hợp lệ khi pack không có phần tử.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi một thao tác ngắn nên nằm gần chỗ dùng và hoạt động với nhiều đầu vào tương thích.
- Tránh dùng khi thao tác cần tên công khai ổn định, trạng thái phức tạp hoặc được tái sử dụng nhiều.

## 8. Ví dụ đơn giản

Một variadic generic lambda cộng ba giá trị cố định rồi được truyền sang hàm khác như callable. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `auto...` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `auto...` trong ví dụ tối thiểu là gì?
2. Trung bình — Kết quả của phép cộng `1`, `2.5` và `3` được suy luận thành kiểu gì và có giá trị bao nhiêu?
3. Khó — Vì sao `(values + ...)` có thể biên dịch với một pack nhưng thất bại với pack khác dù số phần tử bằng nhau?
