# Ngày 35 — source_location và osyncstream

## 1. Vấn đề nó giải quyết

`source_location` lấy metadata call site không cần macro; `osyncstream` buffer output để cả chunk hoàn chỉnh đi vào shared stream nguyên vẹn. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm, default argument, stream và thread.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Source location là con dấu địa chỉ người gọi; output sync stream là phong bì giữ message liền nhau trước khi gửi. Hãy đọc `std::source_location` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
void log(std::string_view msg, std::source_location where = std::source_location::current());
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::source_location`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Line number đổi khi source dịch chuyển; `osyncstream` ngăn ký tự xen kẽ nhưng không áp đặt thứ tự xác định giữa các thread.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi diagnostic cần file/function/line hoặc concurrent message phải nguyên vẹn.
- Tránh dùng khi cần ID machine-readable ổn định hoặc logging có global order.

## 8. Ví dụ đơn giản

Hàm log ghi line của call site và viết một message hoàn chỉnh qua `std::osyncstream`. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::source_location` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::source_location` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao default `source_location::current()` báo caller thay vì dòng bên trong thân hàm?
3. Khó — `osyncstream` bảo đảm điều gì trong concurrency, và cố ý không bảo đảm loại ordering nào?
