# Ngày 5 — Ôn templates, parameter packs, type traits và constexpr

## 1. Vấn đề nó giải quyết

Lặp cùng một thuật toán cho nhiều kiểu tạo ra code trùng. Template mô tả cả họ khai báo, parameter pack nhận số lượng template argument thay đổi, type trait kiểm tra kiểu, còn `constexpr` cho phép tính toán trong lúc biên dịch.

## 2. Kiến thức cần có

- Ngày 1-4; hàm, overload, đệ quy, `auto` và hằng số compile-time của C++11.

## 3. Ý tưởng cốt lõi

Template là công thức ở compile-time. Khi instantiate, compiler thay kiểu cụ thể, trait cung cấp thông tin Boolean về kiểu và lời gọi constant expression có thể được tính trước khi chương trình chạy.

## 4. Cú pháp tối thiểu

```cpp
template<class T, class... Rest>
constexpr T sum(T first, Rest... rest);
```

## 5. Cách nó hoạt động

1. Mỗi lần gọi suy ra các kiểu argument cụ thể và bung pack thành lời gọi đệ quy nhỏ hơn.
2. Type trait kiểm tra kiểu kết quả, còn `constexpr` cho phép compiler dùng kết quả trong `static_assert`.
3. Cùng một định nghĩa cộng được nhiều giá trị nguyên và chứng minh kết quả mong đợi ngay lúc biên dịch.

## 6. Lỗi thường gặp

- Bung pack mà không có overload dừng hoặc trộn các kiểu không tương thích có thể tạo thông báo lỗi rất dài.
- Trước khi áp dụng mẫu, phải kiểm tra base case, common type được suy ra, điều kiện trait và giới hạn của constant expression.

## 7. Khi nào nên dùng

- Nên dùng khi một thao tác thực sự áp dụng cho nhiều kiểu hoặc số argument khác nhau và kiểm tra compile-time đem lại ích lợi.
- Tránh dùng khi overload thông thường rõ hơn hoặc lỗi template phức tạp hơn lợi ích tái sử dụng.

## 8. Ví dụ đơn giản

Hàm đệ quy nhỏ `sum` nhận ba số nguyên. `std::common_type` chọn kiểu kết quả phù hợp và `static_assert` kiểm tra đáp án trước runtime.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Trừu tượng compile-time hữu ích khi constraint và quy tắc kết thúc vẫn nhìn thấy rõ.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra base case, common type được suy ra, điều kiện trait và giới hạn của constant expression.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn templates, parameter packs, type traits và constexpr là gì?
2. Trung bình — Sau khi gọi `sum(1, 2, 3)` và đi tới base case một argument, đã có bao nhiêu bước đệ quy?
3. Khó — Vì sao kiểu trả về phải tính đến mọi phần tử trong pack thay vì chỉ dùng kiểu của argument đầu?
