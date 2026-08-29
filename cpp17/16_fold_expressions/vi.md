# Ngày 16 — Fold expressions

## 1. Vấn đề nó giải quyết

Áp dụng một operator cho mọi phần tử parameter pack trước đây cần overload đệ quy và base case. Fold expression biểu diễn reduction trực tiếp và thường tạo diagnostic ngắn hơn.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu variadic template, parameter-pack expansion, associativity và identity value.

## 3. Ý tưởng cốt lõi

Unary hoặc binary fold expand pack quanh một operator. Vị trí ellipsis chọn kết hợp trái hay phải; initial value cung cấp identity và cho phép empty pack khi operator phù hợp.

## 4. Cú pháp tối thiểu

```cpp
template<class... Ts>
auto sum(Ts... values) {
    return (0 + ... + values);
}
```

## 5. Cách nó hoạt động

1. Binary left fold bắt đầu từ zero rồi cộng từng argument theo source order.
2. Comma fold thứ hai gọi output expression cho mọi pack element mà không cần recursive function call.
3. Chương trình in `sum: 10` rồi `values: 1 2 3 4`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Fold trái và phải có thể khác với operator không associative; empty unary fold chỉ được định nghĩa cho một nhóm operator hạn chế.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi một operator kết hợp hoặc sắp thứ tự mọi phần tử của variadic parameter pack.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ dùng arithmetic fold có identity và comma fold để output, thể hiện cả value reduction lẫn side effect có thứ tự.

## 9. Điều cần nhớ

- Chọn hướng fold và identity dựa trên semantics của operator, không chỉ dựa vào cách viết ngắn.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Fold expressions giải quyết vấn đề chính nào?
2. Trung bình — `sum()` trả gì với binary fold đã cho?
3. Khó — Phép trừ khác nhau thế nào giữa left fold và right fold trên cùng pack?
