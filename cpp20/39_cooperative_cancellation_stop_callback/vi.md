# Ngày 39 — Cooperative cancellation và stop_callback

## 1. Vấn đề nó giải quyết

Các stop-state type cho một thành phần request cancellation, observer truy vấn trạng thái và callback phản ứng nhanh không cần polling. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- stop_source, stop_token và lifetime callback.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Stop source điều khiển một chuông báo chung, token lắng nghe trạng thái, callback là chuông con reo khi báo động được kích hoạt. Hãy đọc `std::stop_callback` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::stop_callback callback{token, [] { /* wake or mark */ }};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::stop_callback`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Cancellation vẫn cooperative; callback phải nhanh, thread-safe và sẵn sàng chạy ngay lúc đăng ký nếu stop đã được request.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi nhiều operation chia sẻ cancellation signal hoặc công việc đang block cần wake-up hook.
- Tránh dùng khi cleanup không an toàn trong callback context hoặc code đang giả định hard termination.

## 8. Ví dụ đơn giản

Stop source sở hữu state, callback đổi atomic flag và request stop tạo kết quả xác định. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::stop_callback` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::stop_callback` trong ví dụ tối thiểu là gì?
2. Trung bình — `request_stop()` trả gì ở lần request thành công đầu, và token báo trạng thái nào sau đó?
3. Khó — Vì sao lifetime của callback và captured reference vẫn phải hợp lệ khi đăng ký sau lúc stop đã được request?
