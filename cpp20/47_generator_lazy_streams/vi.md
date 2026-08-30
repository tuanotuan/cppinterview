# Ngày 47 — Generator và lazy data streams

## 1. Vấn đề nó giải quyết

Generator bộc lộ sequence từng phần tử mà không cần allocate và điền toàn bộ result container trước. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Coroutine frame, handle và yield suspension.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Nó là producer đang pause. Mỗi request resume producer đến `co_yield` tiếp theo, rồi frame giữ nguyên local state và chờ. Hãy đọc `co_yield` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
for (int value = first; value <= last; ++value) co_yield value;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `co_yield`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Reference tới giá trị nội bộ được yield chỉ hợp lệ theo protocol generator; bỏ generator giữa chừng vẫn phải destroy frame.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi giá trị được tính theo nhu cầu, có thể rất nhiều hoặc caller dừng sớm.
- Tránh dùng khi mọi giá trị ít, có sẵn và ownership trong container đơn giản hơn.

## 8. Ví dụ đơn giản

Generator đếm số giá trị đã sản xuất và chứng minh chưa có gì được tạo trước request đầu. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `co_yield` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `co_yield` trong ví dụ tối thiểu là gì?
2. Trung bình — Production counter bằng bao nhiêu trước resume đầu và sau khi yêu cầu hai giá trị?
3. Khó — Vì sao giữ reference tới `promise.current` qua lần resume tiếp có thể quan sát giá trị đã đổi?
