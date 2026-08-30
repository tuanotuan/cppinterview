# Ngày 40 — atomic_ref, atomic wait/notify và atomic smart pointers

## 1. Vấn đề nó giải quyết

C++20 có thể áp atomic operation lên storage phù hợp đang tồn tại, block hiệu quả đến khi giá trị đổi và publish shared-pointer ownership atomically. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Atomic, shared ownership, alignment và đồng bộ thread.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

`atomic_ref` cho object mượn bộ điều khiển atomic, wait/notify là chuông cửa báo đổi giá trị, atomic smart pointer publish cả pointer lẫn ownership an toàn. Hãy đọc `std::atomic_ref` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::atomic_ref<int> ref{value};
ref.wait(old_value);
ref.notify_one();
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::atomic_ref`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Mọi access trong lúc atomic_ref điều khiển concurrent use phải theo quy tắc atomic; alignment và lifetime rất nghiêm ngặt.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi storage aligned sẵn có cần atomic access, polling nên đổi thành blocking hoặc shared ownership cần publish atomically.
- Tránh dùng khi compound invariant bảo vệ bằng mutex đơn giản hơn.

## 8. Ví dụ đơn giản

Ví dụ tăng `int` qua atomic_ref, đánh thức waiting thread và store/load shared pointer atomically. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::atomic_ref` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::atomic_ref` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao waiter kiểm tra lại atomic value sau khi thức thay vì xem notification chính là state?
3. Khó — Data race nào xuất hiện nếu thread khác ghi `int` được tham chiếu bằng cách non-atomic khi atomic_ref đang hoạt động?
