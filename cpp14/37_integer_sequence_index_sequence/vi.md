# Ngày 37 — std::integer_sequence và std::index_sequence

## 1. Vấn đề nó giải quyết

Tuple lưu value sau compile-time index nhưng C++14 không có vòng lặp thường nào biến runtime index thành template argument. `std::index_sequence` tạo các index thành parameter pack để bung.

## 2. Kiến thức cần có

- Ngày 33 và 36: tuple, `std::get<I>`, variadic template, pack và expansion.

## 3. Ý tưởng cốt lõi

Integer sequence là một kiểu mang các số compile-time. `make_index_sequence<N>` tạo `0, 1, ..., N-1`, rồi helper function bung chúng thành các biểu thức `std::get<I>` lặp lại.

## 4. Cú pháp tối thiểu

```cpp
template<class Tuple, std::size_t... I>
void print(const Tuple& t, std::index_sequence<I...>);
```

## 5. Cách nó hoạt động

1. Tuple wrapper tính số kiểu phần tử bằng `sizeof...(Types)`.
2. `make_index_sequence` tạo index pack và helper bung một thao tác `get` cho mỗi index.
3. Mọi phần tử tuple được in theo thứ tự vị trí mà không phải viết overload riêng cho từng tuple size.

## 6. Lỗi thường gặp

- Tạo sequence sai độ dài làm index `std::get<I>` sau expansion vượt giới hạn tuple ở compile-time.
- Trước khi áp dụng mẫu, phải kiểm tra độ dài sequence, index bắt đầu, tuple size đích, mẫu expansion, sequence rỗng và evaluation order.

## 7. Khi nào nên dùng

- Nên dùng khi vị trí compile-time phải điều khiển expansion của tuple, array hoặc callable trong C++14.
- Tránh dùng khi container runtime và vòng lặp thường đã mô tả dữ liệu đồng nhất.

## 8. Ví dụ đơn giản

Tuple gồm ID, tên và điểm được ghép với index 0, 1, 2. Pack expansion gọi `std::get` cho từng vị trí rồi in row phân cách bằng dấu phẩy.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Index sequence nối một số lượng compile-time với pack các vị trí compile-time.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra độ dài sequence, index bắt đầu, tuple size đích, mẫu expansion, sequence rỗng và evaluation order.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của std::integer_sequence và std::index_sequence là gì?
2. Trung bình — `std::make_index_sequence<3>` chứa các index nào?
3. Khó — Vì sao biến của vòng `for` runtime không thể truyền trực tiếp làm non-type template argument cho `std::get<I>`?
