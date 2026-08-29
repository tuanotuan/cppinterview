# Ngày 14 — Relaxed constexpr trong C++14

## 1. Vấn đề nó giải quyết

Thân hàm `constexpr` của C++11 bị giới hạn mạnh, thường buộc phải viết đệ quy bằng một biểu thức. C++14 cho phép biến cục bộ, vòng lặp, nhánh và thay đổi trạng thái cục bộ nhưng vẫn tính ở compile-time khi argument cho phép.

## 2. Kiến thức cần có

- Ngày 5 và 12: hàm, vòng lặp, biến cục bộ, constant expression và kiểm tra compile-time.

## 3. Ý tưởng cốt lõi

Hàm `constexpr` C++14 có thể trông như code mệnh lệnh bình thường. Nó chỉ trở thành phép tính compile-time khi được gọi trong constant-expression context với input hợp lệ.

## 4. Cú pháp tối thiểu

```cpp
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

## 5. Cách nó hoạt động

1. Hàm khởi tạo biến tích lũy cục bộ rồi cập nhật nó qua vòng lặp hữu hạn.
2. Khi dùng để khởi tạo biến `constexpr`, compiler tính mọi vòng lặp trong lúc dịch.
3. `static_assert` xác minh kết quả giai thừa trước khi tạo executable, còn runtime chỉ in hằng đã có.

## 6. Lỗi thường gặp

- Gắn `constexpr` cho hàm không bảo đảm mọi lời gọi đều được tính ở compile-time.
- Trước khi áp dụng mẫu, phải kiểm tra input hằng, thao tác được phép, điều kiện dừng vòng lặp, overflow và context yêu cầu constant expression.

## 7. Khi nào nên dùng

- Nên dùng khi phép tính xác định có lợi từ kiểm tra compile-time nhưng vẫn cần gọi được ở runtime.
- Tránh dùng khi công việc phụ thuộc I/O, global state thay đổi, cấp phát động hoặc giá trị chưa có lúc dịch.

## 8. Ví dụ đơn giản

Hàm giai thừa lặp dùng biến kết quả cục bộ và vòng `for`, đều được quy tắc C++14 nới lỏng cho phép. Compile-time assertion kiểm tra `factorial(5)`.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Quy tắc C++14 nới lỏng giúp dễ đọc nhưng không bỏ yêu cầu phép tính hằng chỉ dùng thao tác hợp lệ.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra input hằng, thao tác được phép, điều kiện dừng vòng lặp, overflow và context yêu cầu constant expression.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Relaxed constexpr trong C++14 là gì?
2. Trung bình — `factorial(runtime_input)` có còn là lời gọi hợp lệ khi argument không phải hằng compile-time không?
3. Khó — Vì sao cùng một hàm `constexpr` có thể chạy ở compile-time trong context này nhưng ở runtime trong context khác?
