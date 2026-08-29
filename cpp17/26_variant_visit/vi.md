# Ngày 26 — std::variant và std::visit

## 1. Vấn đề nó giải quyết

Value có thể hợp lệ ở một trong nhiều type đã biết, nhưng union cần theo dõi lifetime thủ công còn base-class polymorphism thêm allocation hoặc hierarchy. `std::variant` là tagged union type-safe.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết template, object lifetime, overload, generic lambda và xử lý state đầy đủ.

## 3. Ý tưởng cốt lõi

Variant sở hữu đúng một active alternative và lưu index. `std::visit` gọi callable phải hợp lệ cho mọi active alternative có thể có trong tập variant được visit.

## 4. Cú pháp tối thiểu

```cpp
std::variant<int, std::string> value = 42;
std::visit(overloaded{
    [](int n) { /*...*/ },
    [](const std::string& s) { /*...*/ }
}, value);
```

## 5. Cách nó hoạt động

1. Overloaded visitor kết hợp hai lambda, một cho integer và một cho string.
2. Sau assignment đổi active alternative, `std::visit` dispatch tới overload phù hợp mà không cần manual tag check.
3. Chương trình in `integer: 42` rồi `text: C++17`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Gọi `std::get<T>` cho alternative không active sẽ throw `std::bad_variant_access`; visitation thường an toàn hơn để xử lý đầy đủ.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi tập type khả dĩ là closed set đã biết và mỗi state có behavior riêng theo type.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Cùng variant được visit ở hai state, và overload resolution chọn lambda phù hợp mỗi lần.

## 9. Điều cần nhớ

- Variant đưa alternative vào type; visitor làm xử lý state nhìn thấy và được compiler kiểm tra.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::variant và std::visit giải quyết vấn đề chính nào?
2. Trung bình — Overload nào chạy sau string assignment?
3. Khó — `valueless_by_exception` là gì, và operation nào có thể tạo trạng thái đó?
