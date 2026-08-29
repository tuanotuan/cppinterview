# Ngày 23 — Exception safety và noexcept

## 1. Vấn đề nó giải quyết

Thao tác có thể thất bại sau khi đã làm một phần công việc. Exception safety định nghĩa invariant và giá trị nào vẫn hợp lệ khi exception thoát ra, còn `noexcept` cam kết hàm không để exception lan ra ngoài.

## 2. Kiến thức cần có

- Ngày 18, 21 và 22: RAII, ownership, function contract, constructor và destructor.

## 3. Ý tưởng cốt lõi

Hãy tạo thay đổi trong trạng thái tạm được RAII quản lý rồi commit chỉ sau khi thành công. Chỉ đánh dấu `noexcept` khi mọi thao tác bên trong giữ được lời hứa; nếu exception thoát ra, chương trình sẽ terminate.

## 4. Cú pháp tối thiểu

```cpp
int divide(int a, int b);       // may throw
void reset(int& state) noexcept; // must not throw
```

## 5. Cách nó hoạt động

1. Hàm chia kiểm tra precondition trước phép toán và throw khi mẫu số bằng không.
2. Biên `try`/`catch` xử lý failure dự kiến, còn thao tác reset có hợp đồng không throw.
3. Thông báo lỗi được in, chương trình tiếp tục chạy và trạng thái được reset an toàn về không.

## 6. Lỗi thường gặp

- Thêm `noexcept` chỉ để tối ưu mà không kiểm tra callee có thể biến exception xử lý được thành terminate.
- Trước khi áp dụng mẫu, phải kiểm tra basic hay strong guarantee, cleanup tài nguyên, commit point, callee có throw và hợp đồng exception đã khai báo.

## 7. Khi nào nên dùng

- Nên dùng khi failure là ngoại lệ và caller cần bảo đảm rõ về trạng thái còn lại; dùng `noexcept` cho thao tác thật sự không throw.
- Tránh dùng khi lỗi là control flow bình thường phù hợp biểu diễn bằng value, hoặc hàm không thể thành thật giữ lời hứa không throw.

## 8. Ví dụ đơn giản

Phép chia số nguyên có kiểm tra báo input sai bằng exception. Caller catch lỗi rồi gọi reset nhỏ có `noexcept`, với hành vi dễ xác minh độc lập.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Exception safety mô tả trạng thái hợp lệ sau failure; `noexcept` mô tả việc lan exception chứ không nói failure có thể xảy ra hay không.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra basic hay strong guarantee, cleanup tài nguyên, commit point, callee có throw và hợp đồng exception đã khai báo.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Exception safety và noexcept là gì?
2. Trung bình — Sau khi exception chia cho không được catch, `main` có tiếp tục gọi `reset` không?
3. Khó — Điều gì xảy ra nếu hàm khai báo `noexcept` gọi thao tác khác throw mà không catch?
