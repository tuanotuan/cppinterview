# Ngày 48 — Asynchronous task bằng coroutine

## 1. Vấn đề nó giải quyết

Coroutine task biểu diễn operation có thể pause rồi cung cấp một result hoặc exception cho continuation sau. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Awaiter, task result, handle và scheduling boundary.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Task là biên nhận cho công việc chưa xong. `co_await` đăng ký điểm tiếp tục, còn scheduler hoặc event source cuối cùng resume frame. Hãy đọc `co_await` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
int value = co_await operation;
co_return value;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `co_await`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Coroutine không tự động parallel hay asynchronous; thiếu scheduler thật, awaiter có thể chỉ mô phỏng suspension point.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi code nhìn tuần tự cần phối hợp completion bất đồng bộ thật.
- Tránh dùng khi công việc có ngay, CPU-bound không scheduler hoặc plain future đã đủ.

## 8. Ví dụ đơn giản

Task nhỏ suspend một lần, được `main` resume thủ công rồi trả integer cố định qua promise. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `co_await` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `co_await` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao result chưa có trước khi caller resume suspended task?
3. Khó — Thành phần nào còn thiếu khiến ví dụ giáo dục này chưa thực hiện background I/O thật?
