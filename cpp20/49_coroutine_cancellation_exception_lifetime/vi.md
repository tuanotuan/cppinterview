# Ngày 49 — Coroutine cancellation, exception, lifetime và allocation

## 1. Vấn đề nó giải quyết

Coroutine type dùng thật phải phối hợp cooperative cancellation, lưu exception, sở hữu frame lifetime và hiểu frame allocation xảy ra ở đâu. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Task promise, stop token, RAII, exception và ownership frame.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Frame là hồ sơ công việc được quản lý: stop token đánh dấu cancellation, promise giữ failure, wrapper sở hữu destroy hồ sơ đã allocate đúng một lần. Hãy đọc `unhandled_exception` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
void unhandled_exception() { error = std::current_exception(); }
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `unhandled_exception`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Destroy frame đang chạy, nuốt exception đã lưu, capture reference chết hoặc nghĩ cancellation giải phóng frame ngay đều phá tính đúng.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi bạn đang implement hoặc audit ownership protocol của coroutine abstraction.
- Tránh dùng khi library task đã kiểm thử cung cấp sẵn semantics cần thiết.

## 8. Ví dụ đơn giản

Task đếm allocation của promise, lưu exception bằng `unhandled_exception`, quan sát stop request và destroy frame theo RAII. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `unhandled_exception` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `unhandled_exception` trong ví dụ tối thiểu là gì?
2. Trung bình — Exception bị throw được lưu ở đâu trước khi caller rethrow?
3. Khó — Vì sao request cancellation không xóa yêu cầu phải có đúng một lần `destroy()` frame sau đó?
