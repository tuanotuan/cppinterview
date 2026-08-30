# Ngày 29 — Range, iterator và sentinel concepts

## 1. Vấn đề nó giải quyết

Concept C++20 mô tả khả năng duyệt của range, gồm end sentinel không bắt buộc cùng kiểu với iterator. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Iterator, concept và cách duyệt begin/end.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Iterator là con trỏ chạy, sentinel là biển dừng. Chúng chỉ cần quan hệ so sánh hợp lệ chứ không cần cùng biểu diễn. Hãy đọc `std::sentinel_for` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
static_assert(std::sentinel_for<Sentinel, Iterator>);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::sentinel_for`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Giả định random access hoặc iterator và end cùng kiểu sẽ loại range hữu ích và có thể chọn phép toán category không hỗ trợ.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi mã generic cần nêu yêu cầu duyệt và dừng yếu nhất mà nó thật sự dùng.
- Tránh dùng khi một concrete container đã xác định đầy đủ interface.

## 8. Ví dụ đơn giản

Các static assertion xác minh vector là range, iterator hợp lệ và end type là sentinel cho iterator đó. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::sentinel_for` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::sentinel_for` trong ví dụ tối thiểu là gì?
2. Trung bình — `std::sentinel_for<S, I>` yêu cầu quan hệ gì giữa `S` và `I`?
3. Khó — Vì sao algorithm có thể nhận sentinel khác kiểu dù không thể trừ sentinel cho iterator?
