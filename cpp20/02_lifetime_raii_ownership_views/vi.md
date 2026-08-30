# Ngày 2 — Lifetime, RAII, ownership và non-owning views

## 1. Vấn đề nó giải quyết

Các khái niệm này trả lời ai sở hữu tài nguyên, tài nguyên sống bao lâu và đoạn mã khác được quan sát nó thế nào mà không nhận quyền sở hữu. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Biến, phạm vi, tham chiếu và container.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Owner giống như ngôi nhà, còn view chỉ là địa chỉ. RAII dọn tài nguyên khi owner ra khỏi scope, nhưng địa chỉ không còn hữu ích sau khi ngôi nhà biến mất. Hãy đọc `std::span` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::vector<int> owner{1, 2, 3};
std::span<int> view{owner};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::span`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Trả về hoặc lưu một view sau khi owner đã chết tạo dangling view; đọc qua view đó là undefined behavior.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi một đối tượng sở hữu dữ liệu và đoạn mã ngắn chỉ cần xem hoặc sửa dữ liệu đang tồn tại.
- Tránh dùng khi phía nhận phải giữ dữ liệu sống độc lập.

## 8. Ví dụ đơn giản

Một `std::vector` sở hữu ba số nguyên và `std::span` tạm thời nhìn vào đúng các phần tử đó. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::span` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::span` trong ví dụ tối thiểu là gì?
2. Trung bình — Sau khi span sửa phần tử đầu, vector in giá trị nào và vì sao?
3. Khó — Vì sao span trả về từ hàm tạo vector cục bộ bị vô hiệu dù bản thân đối tượng span đã được sao chép thành công?
