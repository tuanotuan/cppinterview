# Ngày 10 — Nested namespaces

## 1. Vấn đề nó giải quyết

Namespace hierarchy sâu trước đây cần nhiều block lồng nhau và closing brace. Boilerplate đó làm boundary khó đọc và dễ tạo comment đóng scope sai.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu namespace, qualified name, tổ chức code nội bộ và One Definition Rule ở mức cơ bản.

## 3. Ý tưởng cốt lõi

C++17 cho phép `namespace company::product::math { ... }` để định nghĩa lồng gọn hơn. Đây là cú pháp tổ chức; lookup, linkage và qualification giống khi viết block lồng riêng.

## 4. Cú pháp tối thiểu

```cpp
namespace app::math {
int square(int value) { return value * value; }
}
```

## 5. Cách nó hoạt động

1. Function được định nghĩa trong namespace ba cấp bằng một header gọn.
2. Fully qualified name chỉ đúng các scope mà ba khai báo namespace truyền thống sẽ tạo.
3. Chương trình in `square: 49` từ lời gọi fully qualified, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Cú pháp gọn không phải lý do tạo hierarchy quá sâu, và `using namespace` vẫn có thể làm ô nhiễm lookup.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi module hoặc library hierarchy ổn định thực sự cần nhiều namespace level.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ định nghĩa và gọi hàm square bằng qualification rõ. Không có global using directive che nơi sở hữu tên.

## 9. Điều cần nhớ

- Nested namespace bỏ bớt brace chứ không bỏ trách nhiệm kiến trúc; namespace vẫn phải mô tả boundary có nghĩa.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nested namespaces giải quyết vấn đề chính nào?
2. Trung bình — Fully qualified name nào chỉ function, và cách lồng trước C++17 viết thế nào?
3. Khó — Vì sao namespace syntax không tạo runtime object, allocation hay access-control boundary?
