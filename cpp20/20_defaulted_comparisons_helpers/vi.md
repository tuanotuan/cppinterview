# Ngày 20 — Defaulted comparisons và comparison helpers

## 1. Vấn đề nó giải quyết

Defaulted comparison bỏ code so từng member lặp lại, còn helper đọc category result mà không so nó với số nguyên tùy ý. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Spaceship operator và comparison category.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Compiler so các member theo thứ tự khai báo. Helper như `std::is_lt` chuyển category result thành câu hỏi Boolean có tên rõ ràng. Hãy đọc `std::is_lt` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
bool operator==(const Point&) const = default;
auto operator<=>(const Point&) const = default;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::is_lt`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Thứ tự member trở thành thứ tự comparison, nên đổi vị trí field có thể âm thầm đổi semantics sắp xếp; tự viết vài operator cũng có thể xung đột với operator được sinh.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi thứ tự từ điển của member đúng với equality và ordering mong muốn.
- Tránh dùng khi thứ tự miền bài toán bỏ qua field hoặc theo quy tắc khác declaration order.

## 8. Ví dụ đơn giản

Hai point dùng equality và spaceship mặc định, sau đó `std::is_lt` đọc kết quả. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::is_lt` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::is_lt` trong ví dụ tối thiểu là gì?
2. Trung bình — Nếu hai member `x` bằng nhau thì member nào được so tiếp?
3. Khó — Vì sao thêm data member mới có thể đổi cả equality lẫn ordering mà không sửa hai defaulted operator?
