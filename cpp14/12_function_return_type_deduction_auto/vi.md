# Ngày 12 — Function return type deduction với auto

## 1. Vấn đề nó giải quyết

Kiểu trả về của hàm có thể dài hoặc phụ thuộc biểu thức. C++14 cho phép hàm thường dùng `auto` làm placeholder kiểu trả về để compiler suy ra từ câu lệnh return.

## 2. Kiến thức cần có

- Ngày 2 và 9: suy luận `auto`, kiểu biểu thức, return của hàm và generic lambda.

## 3. Ý tưởng cốt lõi

Hàm vẫn chỉ có một kiểu trả về tĩnh. Compiler xem các câu lệnh trả về value có thể đi tới và yêu cầu chúng suy ra cùng một kiểu; đây là suy luận compile-time chứ không đổi kiểu lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
auto square(int value) {
    return value * value;
}
```

## 5. Cách nó hoạt động

1. Compiler xác định kiểu của biểu thức return sau các phép chuyển đổi số học thông thường.
2. Kiểu được suy ra trở thành kiểu trả về cố định của hàm trong khai báo và mọi lần gọi.
3. Hàm số nguyên trả về số nguyên, còn một hàm riêng dùng phép toán double trả về double.

## 6. Lỗi thường gặp

- Return `int` ở một nhánh và `double` ở nhánh khác không tự chọn common type; việc suy luận sẽ lỗi.
- Trước khi áp dụng mẫu, phải kiểm tra mọi biểu thức return, phép chuyển đổi ngầm bên trong và việc có định trả về reference hay không.

## 7. Khi nào nên dùng

- Nên dùng khi biểu thức làm kiểu kết quả rõ ràng và việc ghi lặp bằng tay dễ sai.
- Tránh dùng khi kiểu trả về ghi rõ giúp API dễ hiểu hơn hoặc cần ngăn thay đổi kiểu ngoài ý muốn.

## 8. Ví dụ đơn giản

Ví dụ định nghĩa `square` cho số nguyên và `half` cho double. Mỗi thân hàm có một biểu thức return rõ nên kiểu suy ra dễ kiểm tra.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Suy luận kiểu trả về giảm chữ phải viết nhưng không bỏ yêu cầu hàm chỉ có một kiểu trả về.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra mọi biểu thức return, phép chuyển đổi ngầm bên trong và việc có định trả về reference hay không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Function return type deduction với auto là gì?
2. Trung bình — Kiểu trả về nào được suy ra cho `square(int)` và `half(double)`?
3. Khó — Vì sao hàm có `return 1;` và `return 2.0;` ở hai nhánh lại thất bại khi suy luận return `auto`?
