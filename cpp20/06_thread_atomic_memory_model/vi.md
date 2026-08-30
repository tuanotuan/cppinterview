# Ngày 6 — Thread, atomic và C++ memory model

## 1. Vấn đề nó giải quyết

Nhiều thread có thể truy cập trạng thái chung cùng lúc, vì vậy chương trình cần quy tắc rõ ràng về khả năng nhìn thấy và thứ tự bộ nhớ. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm, lambda, lifetime của object và RAII.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy tưởng tượng mỗi thread có một bàn làm việc. Phép atomic là hộp thư được đồng bộ, còn memory model quy định thread khác chắc chắn thấy lần ghi nào. Hãy đọc `std::atomic` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::atomic<int> counter{0};
counter.fetch_add(1);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::atomic`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Hai truy cập xung đột không đồng bộ vào object không atomic tạo data race và undefined behavior, chứ không chỉ thỉnh thoảng cho tổng sai.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi nhiều thread chia sẻ một giá trị nhỏ, độc lập như bộ đếm hoặc cờ.
- Tránh dùng khi nhiều trường hợp thành một invariant sẽ rõ hơn khi bảo vệ bằng mutex.

## 8. Ví dụ đơn giản

Hai thread tăng cùng atomic counter; hai lệnh `join` tạo điểm hoàn tất rõ ràng trước khi in. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::atomic` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::atomic` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao giá trị cuối vẫn xác định sau hai lệnh `join` dù thứ tự các lần tăng không xác định?
3. Khó — Thay atomic bằng `volatile int` có xóa data race không? Hãy giải thích bằng tính atomic và visibility, không dựa vào timing.
