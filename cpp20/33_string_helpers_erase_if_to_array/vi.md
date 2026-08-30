# Ngày 33 — starts_with, ends_with, contains, erase_if và to_array

## 1. Vấn đề nó giải quyết

C++20 thêm thao tác ngắn cho kiểm tra prefix/suffix, membership associative, xóa theo predicate và tạo `std::array` từ built-in array literal. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Chuỗi, associative container, array và predicate.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Đây là các ý định có tên: hỏi hai đầu chuỗi, hỏi set về membership, xóa phần tử khớp và giữ kích thước array trong type. Hãy đọc `std::erase_if` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
bool prefix = text.starts_with("log:");
std::erase_if(values, predicate);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::erase_if`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- `contains` thuộc C++20 với associative container chứ chưa phải `std::string::contains`; string `contains` xuất hiện sau nên phải giữ ranh giới phiên bản.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi named operation khớp đúng ý định và làm code dễ đọc.
- Tránh dùng khi bạn nhắm standard library cũ hoặc cần chính sách match/xóa khác.

## 8. Ví dụ đơn giản

Chương trình kiểm tra chuỗi, truy vấn set, xóa số chẵn khỏi vector và tạo fixed array. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::erase_if` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::erase_if` trong ví dụ tối thiểu là gì?
2. Trung bình — Sau khi `std::erase_if` xóa số chẵn, giá trị nào còn lại và theo thứ tự nào?
3. Khó — Vì sao thay `set.contains(key)` bằng `text.contains(fragment)` sẽ vượt ranh giới C++20 của khóa học?
