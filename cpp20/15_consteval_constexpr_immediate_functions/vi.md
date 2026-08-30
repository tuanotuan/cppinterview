# Ngày 15 — consteval, constexpr và immediate functions

## 1. Vấn đề nó giải quyết

`constexpr` cho phép đánh giá lúc biên dịch khi đầu vào phù hợp, còn `consteval` buộc mọi lời gọi thực sự được dùng phải xảy ra ở compile time. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm, constant expression và đánh giá lúc biên dịch.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

`constexpr` là làn nhanh có thể phục vụ cả runtime; `consteval` là cổng chỉ nhận lưu lượng compile time. Hãy đọc `consteval` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
consteval int checked(int value) { return value >= 0 ? value : throw 0; }
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `consteval`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Truyền giá trị runtime vào immediate function gây lỗi biên dịch; hàm `constexpr` không chắc chạy lúc biên dịch nếu ngữ cảnh không bắt buộc.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi cấu hình sai hoặc dữ liệu sinh ra phải bị từ chối trước khi chương trình chạy.
- Tránh dùng khi đầu vào vốn chỉ có tại runtime.

## 8. Ví dụ đơn giản

Ví dụ dùng hàm bình phương `constexpr` linh hoạt và một giá trị kiểm tra `consteval` bắt buộc ở compile time. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `consteval` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `consteval` trong ví dụ tối thiểu là gì?
2. Trung bình — Lời gọi nào bị buộc thực thi khi dịch, và hàm nào vẫn có thể nhận biến runtime?
3. Khó — Vì sao lưu kết quả hàm `constexpr` vào biến thường không tự chứng minh rằng phép tính đã diễn ra lúc biên dịch?
