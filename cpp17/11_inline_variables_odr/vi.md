# Ngày 11 — Inline variables và One Definition Rule

## 1. Vấn đề nó giải quyết

Global hoặc static data định nghĩa trong header trước đây cần out-of-class definition hoặc dễ gặp multiple-definition linker error. Inline variable cho phép một logical variable có definition giống nhau ở nhiều translation unit.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết header, translation unit, linkage, static member của class và One Definition Rule cơ bản.

## 3. Ý tưởng cốt lõi

Inline variable có thể có definition giống nhau trong nhiều translation unit mà vẫn chỉ một entity với một address. C++17 cũng làm static data member `constexpr` mặc nhiên inline.

## 4. Cú pháp tối thiểu

```cpp
struct Config {
    inline static std::string mode = "C++17";
    inline static int reads = 0;
};
```

## 5. Cách nó hoạt động

1. Hai function truy cập cùng inline static counter được khai báo và khởi tạo ngay trong class definition.
2. Linker hợp nhất các definition giống nhau được phép thành một entity thay vì báo duplicate external definition.
3. Chương trình in `mode: C++17` và `reads: 2`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Inline không cho phép initializer hay definition khác nhau giữa translation unit; vi phạm ODR vẫn có thể làm program ill-formed mà không buộc diagnostic.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi constant trong header hoặc shared static data cần một identity trên toàn program.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Kiểu cấu hình dạng header-only giữ definition của text và counter trong class. Hai helper call cập nhật cùng counter.

## 9. Điều cần nhớ

- Inline variable giải quyết vị trí definition chứ không hợp thức hóa global state tùy tiện; ưu tiên immutable và interface hẹp.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Inline variables và One Definition Rule giải quyết vấn đề chính nào?
2. Trung bình — Có bao nhiêu counter object khi cùng inline definition hợp lệ xuất hiện trong nhiều translation unit?
3. Khó — Khác biệt nào giữa các inline definition được cho là giống nhau vi phạm ODR, và vì sao có thể không có diagnostic?
