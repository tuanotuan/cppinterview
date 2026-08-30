# Ngày 16 — constinit và static initialization

## 1. Vấn đề nó giải quyết

`constinit` xác minh object có static hoặc thread storage được static initialization, tránh thứ tự dynamic initialization khó đoán. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Storage duration, biến toàn cục và constant initialization.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Đây là bảo đảm về thời điểm, không phải nhãn chỉ đọc: object phải được khởi tạo sớm nhưng sau đó vẫn có thể thay đổi. Hãy đọc `constinit` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
constinit int counter = 7;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `constinit`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Nhầm `constinit` với `const` có thể dẫn đến mutation bất ngờ; initializer không phải constant sẽ gây lỗi biên dịch.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi trạng thái static storage có thể thay đổi nhưng cần khởi tạo không phụ thuộc thứ tự startup động.
- Tránh dùng khi biến local automatic hoặc object `constexpr` bất biến phù hợp hơn.

## 8. Ví dụ đơn giản

Một global counter `constinit` bắt đầu bằng hằng số, được sửa trong `main` rồi in giá trị mới. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `constinit` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `constinit` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao tăng biến vẫn hợp lệ dù declaration có `constinit`?
3. Khó — `constinit` xử lý vấn đề thứ tự static initialization thế nào mà không làm các lần đọc ghi sau đó thread-safe?
