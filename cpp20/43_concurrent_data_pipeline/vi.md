# Ngày 43 — Thiết kế concurrent data pipeline

## 1. Vấn đề nó giải quyết

Data pipeline chia công việc thành stage có input, output, ownership transfer và synchronization boundary rõ ràng. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Thread, future, ownership, synchronization và stage.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy nghĩ đến các trạm nối nhau: mỗi stage nhận một kiện hàng, biến đổi rồi trao kiện hoàn chỉnh cho trạm tiếp. Hãy đọc `std::async` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto next = std::async(std::launch::async, [input = std::move(previous)] { return transform(input.get()); });
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::async`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Chia sẻ mutable container giữa stage dễ tạo race; queue không giới hạn gây áp lực bộ nhớ, chờ sai dependency order có thể deadlock.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi công việc tự nhiên tách thành stage có thứ tự và ownership theo value rõ.
- Tránh dùng khi data quá nhỏ hoặc overhead stage lớn hơn lợi ích concurrency.

## 8. Ví dụ đơn giản

Ba stage `std::async` tạo số, nhân đôi rồi reduce thành tổng xác định qua future được move. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::async` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::async` trong ví dụ tối thiểu là gì?
2. Trung bình — Future nào sở hữu từng intermediate result trước khi stage tiếp theo gọi `get`?
3. Khó — Vì sao chuyển value qua future tránh data race dù runtime có thể xếp stage trên thread khác nhau?
