# Ngày 34 — `std::stacktrace` và `std::source_location`

## 1. Vấn đề nó giải quyết

Chẩn đoán cần cả vị trí gọi ngay lập tức và chuỗi lời gọi dẫn đến đó. `std::source_location` chụp metadata nguồn với chi phí thấp; `std::stacktrace` C++23 chụp frame runtime khi được triển khai.

## 2. Kiến thức cần có

- Ngày 1: mức khả dụng compiler và thư viện.
- Ngày 6: call stack runtime và ngữ cảnh concurrency.

## 3. Ý tưởng cốt lõi

Source location là một ghim trên bản đồ. Stacktrace là tuyến đường đã đi đến ghim đó; symbol và tối ưu quyết định tuyến đường chi tiết đến đâu. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
void log(std::source_location where = std::source_location::current());
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::stacktrace` và `std::source_location`.
1. Chương trình chụp tên hàm bên gọi và báo stacktrace có được hỗ trợ hay không.
1. Cuối cùng, nó in hoặc kiểm tra tên hàm nguồn dễ nhận biết và trạng thái hỗ trợ trung thực để dễ đối chiếu.

## 6. Lỗi thường gặp

- Gọi `source_location::current()` trong thân hàm chụp dòng trong thân thay vì call site qua default argument; stacktrace có thể thiếu trong binary tối ưu đã strip.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi logging, assertion, báo lỗi và chẩn đoán sau thất bại nơi ngữ cảnh thật sự hữu ích.
- Tránh dùng khi hot path chụp cả stack trên mọi thao tác thành công.

## 8. Ví dụ đơn giản

Logger validation ghi hàm bên gọi và chỉ chụp stack khi invariant thất bại. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao đặt `source_location::current()` trong default parameter chụp bên gọi, còn đánh giá nó trong hàm lại chụp dòng khác?
