# Ngày 46 — Awaitable, awaiter và suspension lifecycle

## 1. Vấn đề nó giải quyết

Awaiter định nghĩa coroutine có suspend không, điều gì xảy ra tại suspension và giá trị/effect nào xuất hiện khi resume. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Promise type, handle và coroutine suspension.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Ba hook tạo checkpoint: `await_ready` có thể bỏ qua, `await_suspend` đỗ hoặc chuyển control, `await_resume` cung cấp result cho continuation. Hãy đọc `await_suspend` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
bool await_ready() const noexcept;
void await_suspend(std::coroutine_handle<>);
int await_resume() const;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `await_suspend`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Lưu handle để dùng sau cần scheduler và kế hoạch lifetime hợp lệ; resume inline trong `await_suspend` có thể gây reentrancy tinh tế.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi external event, timer hoặc scheduler cần tích hợp với coroutine suspension.
- Tránh dùng khi operation có ngay và function call thường rõ hơn.

## 8. Ví dụ đơn giản

Tracing awaiter báo ready ngay nên output cho thấy `await_ready` rồi đến `await_resume` mà không suspend. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `await_suspend` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `await_suspend` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `await_suspend` không được gọi khi `await_ready` trả true?
3. Khó — Nếu `await_suspend` lưu handle, thành phần nào chịu trách nhiệm resume đúng lúc frame còn sống?
