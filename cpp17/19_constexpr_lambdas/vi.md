# Ngày 19 — constexpr lambda

## 1. Vấn đề nó giải quyết

Computation cục bộ nhỏ dùng trong constant expression trước đây cần function có tên riêng. C++17 cho call operator phù hợp của lambda tham gia constant evaluation.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết lambda syntax, capture, constant expression, function `constexpr` và array extent.

## 3. Ý tưởng cốt lõi

Lambda có body thỏa constant-expression rule có thể có call operator `constexpr`, explicit hoặc implicit. Lời gọi chỉ constant-evaluate khi argument và captured state cũng dùng được trong context đó.

## 4. Cú pháp tối thiểu

```cpp
constexpr auto square = [](int x) constexpr {
    return x * x;
};
static_assert(square(4) == 16);
```

## 5. Cách nó hoạt động

1. Lambda square không capture được gọi trong static assertion và để xác định array extent.
2. Compiler evaluate cả hai lời gọi trong lúc dịch; closure đó vẫn có thể được gọi bình thường ở runtime.
3. Chương trình in `array size: 9` và `runtime square: 25`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Đánh dấu variable `constexpr` không làm operation với runtime argument thành constant; constant evaluation phụ thuộc toàn call expression.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi policy hoặc transformation ngắn nên giữ cục bộ nhưng cũng phải chạy trong compile-time context.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Một closure được dùng lại ở compile time và runtime, chứng minh constexpr mô tả capability evaluate chứ không phải engine riêng.

## 9. Điều cần nhớ

- Constexpr lambda có thể evaluate sớm khi mọi input cho phép, đồng thời vẫn là callable bình thường.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — constexpr lambda giải quyết vấn đề chính nào?
2. Trung bình — Lời gọi nào trong ví dụ bắt buộc evaluate trong lúc dịch?
3. Khó — Capture có thể ngăn lời gọi lambda trở thành constant expression thế nào?
