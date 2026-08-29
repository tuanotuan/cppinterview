# Ngày 21 — Object lifetime, RAII, Rule of Five và Rule of Zero

## 1. Vấn đề nó giải quyết

Tài nguyên phải được giải phóng trên mọi đường chạy, kể cả return sớm và exception. RAII gắn cleanup với object lifetime; Rule of Five chỉ ra các special operation mà owner tự quản lý có thể cần, còn Rule of Zero giao việc đó cho member type đáng tin cậy.

## 2. Kiến thức cần có

- Ngày 3, 11 và 18: ownership, move, destructor, scope và smart pointer.

## 3. Ý tưởng cốt lõi

Lifetime của object giống một cặp ngoặc: construction tạo trạng thái hợp lệ và destruction đóng nó lại. Ưu tiên member như `std::vector` và `std::unique_ptr` để hành vi copy, move, hủy do compiler sinh làm đúng việc.

## 4. Cú pháp tối thiểu

```cpp
struct Buffer {
    std::vector<int> data; // Rule of Zero
};
```

## 5. Cách nó hoạt động

1. Một scope tạo buffer sở hữu value, trong đó vector nhận vùng lưu trữ khi construction.
2. Copy sao chép phần tử vector, còn move chuyển trạng thái vector qua special member đã được thư viện cài đúng.
3. Ra khỏi scope hủy mọi buffer và tự giải phóng vùng nhớ mà không cần `delete` thủ công.

## 6. Lỗi thường gặp

- Tự định nghĩa một special member liên quan ownership nhưng quên các member còn lại có thể gây leak, giải phóng hai lần hoặc vô tình mất move.
- Trước khi áp dụng mẫu, phải kiểm tra construction, thứ tự destruction, copy so với move, self-assignment và ownership của member.

## 7. Khi nào nên dùng

- Nên dùng khi object phải giữ invariant tài nguyên hợp lệ đúng trong lifetime của nó.
- Tránh dùng khi code special member thủ công chỉ lặp hành vi đã có từ RAII member chuẩn.

## 8. Ví dụ đơn giản

`Buffer` chỉ chứa vector nên tuân theo Rule of Zero. Chương trình copy một buffer, move bản copy rồi để scope exit thực hiện toàn bộ cleanup.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Rule of Zero là mặc định; chỉ viết Rule of Five khi class thật sự tự quản lý ranh giới tài nguyên thô.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra construction, thứ tự destruction, copy so với move, self-assignment và ownership của member.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Object lifetime, RAII, Rule of Five và Rule of Zero là gì?
2. Trung bình — Sau khi move vector đã copy vào `moved`, object nào sở hữu các phần tử dùng để in?
3. Khó — Vì sao chỉ thêm user-declared destructor có thể thay đổi việc compiler sinh move dù thân destructor trông vô hại?
