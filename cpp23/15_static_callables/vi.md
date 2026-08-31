# Ngày 15 — Static lambda và static call operator

## 1. Vấn đề nó giải quyết

Callable không dùng trạng thái đối tượng thì không cần object parameter ngầm. C++23 cho phép call operator của lambda và `operator()` hoặc `operator[]` nạp chồng là static.

## 2. Kiến thức cần có

- Ngày 14: closure object của lambda và explicit object parameter.
- Nạp chồng operator cơ bản.

## 3. Ý tưởng cốt lõi

Callable thường có một cửa vào đối tượng không dùng. Đánh dấu operator là static đóng cửa đó và nói rằng lời gọi chỉ phụ thuộc đối số tường minh. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto twice = [](int x) static { return x * 2; };
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Static lambda và static call operator.
1. Chương trình gọi static lambda và các call/subscript operator static không trạng thái.
1. Cuối cùng, nó in hoặc kiểm tra các kết quả nguyên đơn giản cho thấy không có trạng thái riêng của đối tượng được dùng để dễ đối chiếu.

## 6. Lỗi thường gặp

- Static lambda không thể capture biến; đánh dấu thao tác có trạng thái là static sẽ lỗi biên dịch hoặc che giấu trạng thái ở nơi khác.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi policy không trạng thái, customization object và callback chỉ phụ thuộc đối số.
- Tránh dùng khi callable cần capture, cấu hình theo instance hoặc trạng thái đa hình.

## 8. Ví dụ đơn giản

Policy đổi đơn vị nhân đầu vào với hệ số compile-time cố định và không lưu dữ liệu đối tượng. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Khác biệt quan sát nào còn lại giữa captureless lambda không static và static lambda khi chuyển đổi hoặc lấy địa chỉ thao tác gọi?
