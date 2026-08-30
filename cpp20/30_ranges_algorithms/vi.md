# Ngày 30 — Ranges algorithms

## 1. Vấn đề nó giải quyết

Ranges algorithm nhận nguyên range, tích hợp constraint và thường tránh lặp cặp begin/end thủ công. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Algorithm, iterator, range và projection.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Range được giao như một gói. Algorithm mở nó qua `begin` và `end`, còn concept loại gói không tương thích từ sớm. Hãy đọc `std::ranges::sort` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::ranges::sort(values);
auto it = std::ranges::find(values, 3);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::ranges::sort`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Iterator trả về vẫn có thể bị invalid khi container thay đổi; algorithm có thể trả `dangling` cho temporary range không an toàn.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi standard algorithm tự nhiên làm việc trên toàn range hoặc hưởng lợi từ projection.
- Tránh dùng khi chỉ một iterator subrange được chọn có chủ ý cần xử lý.

## 8. Ví dụ đơn giản

Một vector được sort và tìm bằng range overload với dữ liệu cố định. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::ranges::sort` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::ranges::sort` trong ví dụ tối thiểu là gì?
2. Trung bình — Sau khi sort `{4,1,3,2}`, `std::ranges::find(values, 3)` trỏ tới đâu?
3. Khó — Vì sao return type có thể đổi thành `std::ranges::dangling` khi cùng algorithm nhận temporary non-borrowed range?
