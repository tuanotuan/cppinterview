# Ngày 4 — Ôn templates, parameter packs, type traits và constexpr

## 1. Vấn đề nó giải quyết

Code tái sử dụng cần nhận nhiều kiểu mà không mất validation hay lặp thuật toán. Template mô tả họ kiểu, pack biểu diễn số đối số thay đổi, trait cung cấp fact compile time và `constexpr` cho phép constant evaluation.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu overload, recursion, compile-time constant và khác biệt giữa type với value.

## 3. Ý tưởng cốt lõi

Variadic template nhận parameter pack có thể expand hoặc xử lý đệ quy. Type trait kiểm tra đối số được hỗ trợ, còn lời gọi `constexpr` hợp lệ có thể khởi tạo constant hay static assertion.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
constexpr T sum(T value) { return value; }
template<class T, class... Ts>
constexpr auto sum(T first, Ts... rest) {
    return first + sum(rest...);
}
```

## 5. Cách nó hoạt động

1. Các overload đệ quy lấy từng value cho tới khi chạm base case một đối số.
2. Phép conjunction của trait kiểm tra mọi kiểu, còn lời gọi integer cố định được evaluate trong lúc dịch.
3. Chương trình in `compile-time sum: 10` và `mixed sum: 7.5`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Template không constraint thường lỗi bằng diagnostic dài sâu trong expression; hãy kiểm tra miền hợp lệ gần interface.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi một operation có ý nghĩa cho nhiều kiểu liên quan hoặc số lượng đối số thay đổi.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Hàm sum đệ quy ôn cơ chế cũ trước khi ngày 16 thay recursion bằng fold C++17. Trait xác nhận mọi đối số là arithmetic.

## 9. Điều cần nhớ

- Template sinh code, trait mô tả candidate và constant evaluation chuyển công việc phù hợp từ runtime sang lúc dịch.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Ôn templates, parameter packs, type traits và constexpr giải quyết vấn đề chính nào?
2. Trung bình — Vì sao tổng integer khởi tạo được biến `constexpr` còn lời gọi dùng runtime input thì không?
3. Khó — Điều gì thay đổi khi recursion trên pack được thay bằng fold expression C++17?
