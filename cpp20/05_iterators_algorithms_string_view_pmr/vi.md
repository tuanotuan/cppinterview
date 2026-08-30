# Ngày 5 — Iterators, algorithms, string_view và PMR

## 1. Vấn đề nó giải quyết

Thư viện chuẩn tách việc lưu trữ, duyệt, thuật toán, view văn bản và chính sách cấp phát để từng phần có thể tái sử dụng. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Container, chuỗi, vòng lặp và thuật toán cơ bản.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Container sở hữu phần tử, iterator đánh dấu vị trí, algorithm làm việc giữa các vị trí, `string_view` mượn văn bản và PMR chọn nguồn bộ nhớ động. Hãy đọc `std::pmr` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::pmr::vector<std::pmr::string> words{&resource};
std::sort(words.begin(), words.end());
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::pmr`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Iterator và view có thể dangling khi nguồn thay đổi hoặc chết; container PMR không được sống lâu hơn memory resource của nó.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi bạn muốn dùng thuật toán chuẩn với đầu vào không sở hữu hoặc kiểm soát vùng cấp phát tạm.
- Tránh dùng khi container thường và chuỗi sở hữu đã diễn đạt đủ rõ lifetime lẫn hiệu năng.

## 8. Ví dụ đơn giản

Ví dụ lưu các chuỗi PMR trong buffer cục bộ, sắp xếp qua iterator rồi in mỗi chuỗi bằng `string_view`. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::pmr` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::pmr` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao sắp xếp container cũng làm thay đổi thứ tự mà các iterator mới quan sát?
3. Khó — Đối tượng nào phải sống lâu hơn PMR vector, và vì sao chỉ move vector sang nơi khác chưa tự động kéo dài lifetime đó?
