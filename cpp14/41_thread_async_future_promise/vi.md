# Ngày 41 — std::thread, std::async, future và promise

## 1. Vấn đề nó giải quyết

Khởi chạy công việc và chuyển kết quả tương lai là hai mối quan tâm riêng. `std::thread` chạy callable rõ ràng, `std::async` ghép task launch với future, còn cặp `promise`/`future` tạo kênh truyền một kết quả.

## 2. Kiến thức cần có

- Ngày 7 và 21-23: thread, synchronization, RAII, exception, return value và ownership.

## 3. Ý tưởng cốt lõi

Future là đầu nhận của shared asynchronous state. Promise tự ghi state đó; `async` quản lý cơ chế producer và trả trực tiếp future đầu nhận.

## 4. Cú pháp tối thiểu

```cpp
std::promise<int> promise;
auto result = promise.get_future();
std::thread producer([&] { promise.set_value(21); });
auto task = std::async(std::launch::async, [] { return 42; });
```

## 5. Cách nó hoạt động

1. Promise cung cấp future trước khi producer thread được khởi chạy.
2. Một thread lưu 21 vào state của promise, còn `std::async` chạy hàm riêng trả 42.
3. Gọi `get` chờ khi cần, chuyển mỗi result hoặc exception đúng một lần rồi in giá trị xác định.

## 6. Lỗi thường gặp

- Hủy `std::thread` vẫn joinable sẽ gọi `std::terminate`; gọi `get` hai lần trên cùng future cũng không hợp lệ.
- Trước khi áp dụng mẫu, phải kiểm tra launch policy, join thread, việc fulfill promise, broken promise, chuyển exception và future chỉ consume một lần.

## 7. Khi nào nên dùng

- Nên dùng khi công việc có thể chạy chồng thời gian và caller cần result hoặc exception có kiểu trong tương lai.
- Tránh dùng khi task quá nhỏ, thứ tự bắt buộc hoặc lời gọi hàm trực tiếp rõ và rẻ hơn.

## 8. Ví dụ đơn giản

Producer thủ công gửi 21 qua promise, còn async task tính 42. Main nhận cả hai qua future và join thread được tạo rõ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Thread thực thi callable; future chuyển completion, value và exception.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra launch policy, join thread, việc fulfill promise, broken promise, chuyển exception và future chỉ consume một lần.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của std::thread, std::async, future và promise là gì?
2. Trung bình — Điều gì khiến `future.get()` chờ tới khi producer cung cấp value?
3. Khó — Exception throw bên trong task `std::async` đi tới thread gọi `get` bằng cách nào?
