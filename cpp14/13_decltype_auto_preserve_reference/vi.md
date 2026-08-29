# Ngày 13 — decltype(auto) và bảo toàn reference

## 1. Vấn đề nó giải quyết

Suy luận return bằng `auto` thường tạo value và bỏ reference. `decltype(auto)` của C++14 áp dụng quy tắc `decltype` lên biểu thức return, cho phép hàm forwarding hoặc accessor giữ reference.

## 2. Kiến thức cần có

- Ngày 2 và 12: quy tắc biểu thức của `decltype`, reference, value category và suy luận kiểu trả về.

## 3. Ý tưởng cốt lõi

Cách viết chính xác của biểu thức return rất quan trọng. Trả về lvalue có ngoặc như `(values.front())` suy ra lvalue reference, vì vậy nơi gọi truy cập được phần tử gốc.

## 4. Cú pháp tối thiểu

```cpp
decltype(auto) first(std::vector<int>& values) {
    return (values.front());
}
```

## 5. Cách nó hoạt động

1. Accessor tạo một biểu thức lvalue gọi tên phần tử do vector sở hữu.
2. `decltype(auto)` giữ loại biểu thức và suy ra `int&` thay vì copy một `int`.
3. Gán qua reference trả về làm thay đổi phần tử đầu trong vector gốc.

## 6. Lỗi thường gặp

- Trả reference tới biến cục bộ hoặc object tạm chỉ giữ lại dangling reference chứ không làm nó an toàn.
- Trước khi áp dụng mẫu, phải kiểm tra biểu thức return chính xác, value category và việc object được tham chiếu có sống lâu hơn reference trả về hay không.

## 7. Khi nào nên dùng

- Nên dùng khi accessor hoặc forwarding wrapper phải cố ý giữ hành vi value hay reference.
- Tránh dùng khi trả về value an toàn và rẻ hơn hoặc lifetime phía sau reference không được bảo đảm.

## 8. Ví dụ đơn giản

Hàm `first` trả phần tử đầu của vector bằng reference. Giữ kết quả bằng `decltype(auto)` rồi gán 99 chứng minh không có bản sao.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- `decltype(auto)` giữ nhiều thông tin kiểu hơn nên cũng giữ luôn rủi ro lifetime.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra biểu thức return chính xác, value category và việc object được tham chiếu có sống lâu hơn reference trả về hay không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của decltype(auto) và bảo toàn reference là gì?
2. Trung bình — Sau khi gán qua kết quả của `first(values)`, `values.front()` chứa gì?
3. Khó — Nếu bỏ ngoặc quanh một biến có tên trong return, suy luận `decltype(auto)` thay đổi thế nào theo quy tắc `decltype`?
