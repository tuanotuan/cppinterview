# Ngày 41 — Counting semaphore và binary semaphore

## 1. Vấn đề nó giải quyết

Semaphore kiểm soát truy cập bằng permit: counting form biểu diễn nhiều slot, còn binary form có tối đa một permit. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Thread, counter, blocking và synchronization.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy tưởng tượng bát token. `acquire` lấy một token và có thể chờ; `release` trả token. Binary semaphore là bát có sức chứa một. Hãy đọc `std::counting_semaphore` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::counting_semaphore<2> slots{1};
slots.acquire();
slots.release();
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::counting_semaphore`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Release vượt maximum vi phạm precondition; semaphore cũng không tự bảo vệ complex data invariant.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi cần giới hạn số người dùng đồng thời của resource hoặc gửi availability signal đơn giản.
- Tránh dùng khi một owner cần bảo vệ shared state có cấu trúc, nơi mutex rõ hơn.

## 8. Ví dụ đơn giản

Ví dụ một thread acquire/release counting và binary permit một cách xác định, không phụ thuộc timing. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::counting_semaphore` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::counting_semaphore` trong ví dụ tối thiểu là gì?
2. Trung bình — `acquire` làm gì khi số permit hiện tại bằng 0?
3. Khó — Vì sao binary semaphore báo event được nhưng vẫn có thể là primitive sai để bảo vệ nhiều field liên quan?
