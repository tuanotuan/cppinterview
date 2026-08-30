# Ngày 50 — Cache locality, data-oriented design và assume_aligned

## 1. Vấn đề nó giải quyết

Hiệu năng thường phụ thuộc cách đặt dữ liệu dùng nhiều liền nhau và truyền alignment đã chứng minh cho optimized code. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Array, pointer, loop, memory layout và profiling cơ bản.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Cache lấy cả vùng lân cận chứ không hiểu abstract object. Data-oriented design đặt hot field dọc đường duyệt để mỗi cache line hữu ích. Hãy đọc `std::assume_aligned` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
double* aligned = std::assume_aligned<alignof(double)>(values.data());
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::assume_aligned`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- `assume_aligned` là lời hứa không có runtime check; đưa pointer không đạt alignment đã nêu gây undefined behavior.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi profiling tìm ra hot loop tuần tự và layout có thể khớp access pattern.
- Tránh dùng khi không có số đo ủng hộ độ phức tạp hoặc alignment không thể bảo đảm.

## 8. Ví dụ đơn giản

Các mảng tọa độ riêng, liên tục được duyệt tuyến tính và chỉ natural alignment của `double` được hứa an toàn. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::assume_aligned` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::assume_aligned` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao separate array cải thiện locality khi loop chỉ đọc tọa độ `x`?
3. Khó — Precondition chính xác nào phải đúng trước khi thay `alignof(double)` bằng alignment lớn hơn?
