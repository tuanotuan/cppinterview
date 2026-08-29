# Ngày 42 — Thread, future, promise và asynchronous pipeline

## 1. Vấn đề nó giải quyết

Stage bất đồng bộ cần chuyển value hoặc exception mà không tự share mutable result storage. Future biểu diễn eventual result, còn promise cung cấp producer endpoint.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết thread lifetime, join, move-only handle, exception và blocking wait.

## 3. Ý tưởng cốt lõi

Promise và future share một state. Producer fulfill state đúng một lần; future consume value hoặc exception. `std::async(std::launch::async, ...)` khởi động stage bất đồng bộ khác và trả future riêng.

## 4. Cú pháp tối thiểu

```cpp
std::promise<int> promise;
auto future = promise.get_future();
auto next = std::async(std::launch::async,
    [f = std::move(future)]() mutable { return f.get() * 7; });
```

## 5. Cách nó hoạt động

1. Producer thread đặt số sáu vào promise trong khi async stage wait trên future đã move.
2. State readiness đồng bộ producer completion với waiting stage, stage này transform value rồi fulfill future thứ hai.
3. Chương trình in `pipeline result: 42`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Destroy joinable thread làm terminate program, promise bị bỏ không set value tạo broken-promise error, còn deferred async policy có thể gây bất ngờ scheduling.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi stage bất đồng bộ one-shot tự nhiên chuyển result và error theo value.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Future là move-only nên single-consumer ownership rõ. Explicit async launch tránh deferred stage do implementation tự chọn.

## 9. Điều cần nhớ

- Mô hình hóa asynchronous dataflow bằng result channel có ownership, launch policy rõ và join hoặc wait xác định.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Thread, future, promise và asynchronous pipeline giải quyết vấn đề chính nào?
2. Trung bình — Stage nào block tới khi promise được fulfill?
3. Khó — Exception do async callable throw được chuyển tới caller thế nào?
