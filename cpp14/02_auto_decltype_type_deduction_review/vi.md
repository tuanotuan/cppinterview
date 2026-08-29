# Ngày 2 — Ôn auto, decltype và type deduction

## 1. Vấn đề nó giải quyết

Các kiểu dài hoặc phụ thuộc biểu thức khiến khai báo rối và dễ ghi sai. `auto` suy ra kiểu biến mới từ giá trị khởi tạo, còn `decltype` hỏi kiểu của một tên hoặc biểu thức.

## 2. Kiến thức cần có

- Toolchain ngày 1; biến, `const`, reference và biểu thức cơ bản của C++11.

## 3. Ý tưởng cốt lõi

Hãy xem `auto` giống suy luận đối số template: `const` cấp cao nhất và reference thường bị bỏ. Dùng `decltype` khi cần giữ đúng kiểu khai báo hoặc value category.

## 4. Cú pháp tối thiểu

```cpp
const int n = 7;
auto copy = n;          // int
decltype(n) exact = n;  // const int
```

## 5. Cách nó hoạt động

1. Compiler xem giá trị khởi tạo của khai báo `auto` rồi suy ra một kiểu mới cho biến.
2. Với `decltype(name)`, kiểu khai báo của tên được giữ lại; thêm ngoặc có thể chuyển sang quy tắc theo loại biểu thức.
3. Bản sao có thể thay đổi độc lập, còn reference được suy ra sẽ sửa trực tiếp object gốc.

## 6. Lỗi thường gặp

- Cho rằng `auto` luôn giữ `const` hoặc `&` có thể biến một alias dự kiến thành bản sao.
- Trước khi áp dụng mẫu, phải kiểm tra kết quả suy luận là value, reference hay kiểu có const.

## 7. Khi nào nên dùng

- Nên dùng khi kiểu đã rõ từ initializer hoặc phụ thuộc biểu thức và việc ghi tay chỉ làm code dài hơn.
- Tránh dùng khi kiểu suy ra che mất phép chuyển đổi quan trọng, quyết định ownership hoặc mất độ chính xác.

## 8. Ví dụ đơn giản

Một giá trị cấu hình được sao chép bằng `auto`, còn `decltype(ref)` giữ reference tới cấu hình thật. Output cho thấy khai báo nào giữ bản sao riêng.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Type deduction giảm lặp chữ, nhưng người viết vẫn phải suy luận rõ qualifier và reference.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra kết quả suy luận là value, reference hay kiểu có const.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn auto, decltype và type deduction là gì?
2. Trung bình — Sau `const int n = 7; auto x = n;`, chương trình có thể gán `x = 8` không, và vì sao?
3. Khó — So sánh `decltype(value)` và `decltype((value))` với biến `int` có tên. Dạng nào là reference?
