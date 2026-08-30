# Ngày 44 — Coroutine model, co_await, co_yield và co_return

## 1. Vấn đề nó giải quyết

Coroutine có thể suspend trong khi giữ local state rồi resume sau; ba keyword diễn đạt chờ, yield và hoàn tất. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm, state machine, RAII và template cơ bản.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Compiler viết lại hàm thành resumable state machine nằm trong coroutine frame. Mỗi suspension là một dấu trang. Hãy đọc `co_yield` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
co_await awaitable;
co_yield value;
co_return;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `co_yield`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Keyword tự nó không cung cấp scheduling, thread hay ownership; return type và promise quyết định hành vi frame cùng cleanup.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi computation tự nhiên pause/resume, sinh sequence hoặc chờ external completion.
- Tránh dùng khi hàm hoặc loop thường diễn đạt control flow đơn giản hơn.

## 8. Ví dụ đơn giản

Generator tối thiểu dùng `co_await suspend_never`, yield hai giá trị rồi đến `co_return`; wrapper hủy frame. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `co_yield` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `co_yield` trong ví dụ tối thiểu là gì?
2. Trung bình — Caller lấy lại quyền điều khiển ở statement nào sau khi yêu cầu generated value đầu?
3. Khó — Vì sao hai coroutine return type có thể diễn giải cùng cú pháp `co_return` khác nhau?
