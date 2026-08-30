# Ngày 45 — Promise type, coroutine handle và coroutine frame

## 1. Vấn đề nó giải quyết

Promise tùy chỉnh hành vi coroutine, handle điều khiển suspended frame, còn frame lưu state cần qua các lần suspension. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Mô hình coroutine state machine ở Ngày 44.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Promise là bảng điều khiển trong frame; handle là remote nhỏ có thể resume, inspect hoặc destroy frame đó. Hãy đọc `std::coroutine_handle` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
using Handle = std::coroutine_handle<promise_type>;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::coroutine_handle`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Raw handle không tự sở hữu cleanup; destroy hai lần, leak hoặc resume frame hoàn tất/dangling đều gây undefined behavior.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi xây coroutine abstraction cần protocol lifecycle và result rõ ràng.
- Tránh dùng khi task hoặc generator abstraction có sẵn đã cung cấp ownership an toàn.

## 8. Ví dụ đơn giản

Task move-only nhỏ lấy typed handle từ promise, resume một lần, đọc result và destroy frame trong destructor. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::coroutine_handle` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::coroutine_handle` trong ví dụ tối thiểu là gì?
2. Trung bình — Promise member nào tạo return object chứa handle?
3. Khó — Vì sao wrapper phải cấm copy khi destructor gọi `handle.destroy()`?
