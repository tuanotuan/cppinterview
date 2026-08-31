# Ngày 46 — `as_const`, `as_rvalue` và custom range adaptor

## 1. Vấn đề nó giải quyết

Pipeline có thể cần phần tử chỉ đọc hoặc quyền move phần tử khỏi nguồn. C++23 cung cấp `views::as_const` và `views::as_rvalue`, còn adaptor closure cho thư viện thêm phép biến đổi dùng được với pipe.

## 2. Kiến thức cần có

- Ngày 29: chiếu category cv/ref.
- Ngày 39 và 44–45: const range và pipeline adaptor.

## 3. Ý tưởng cốt lõi

Các view này đổi thấu kính truy cập, không đổi storage. Custom adaptor là thấu kính tái sử dụng có cách viết `range | adaptor` và forward range nền rõ ràng. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto read_only = range | std::views::as_const;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `as_const`, `as_rvalue` và custom range adaptor.
1. Chương trình cung cấp có điều kiện truy cập const, rvalue và pipe range qua custom take adaptor nhỏ.
1. Cuối cùng, nó in hoặc kiểm tra tham chiếu chỉ đọc, tham chiếu movable và custom view có giới hạn để dễ đối chiếu.

## 6. Lỗi thường gặp

- Đọc từ view `as_rvalue` tự nó chưa move, nhưng tiêu thụ phần tử vào object mới có thể để source ở trạng thái moved-from; custom adaptor giữ tham chiếu đến temporary có thể treo.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi pipeline generic cố ý kiểm soát khả năng sửa hoặc chuyển quyền sở hữu.
- Tránh dùng khi dùng `as_rvalue` chỉ để mong nhanh hơn mà chưa quyết định source có được tiêu thụ không.

## 8. Ví dụ đơn giản

Pipeline chuyển move chuỗi từ vector tạm sang storage cuối và không đọc lại giá trị tạm sau đó. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao duyệt `as_rvalue` không tự sửa source, nhưng tạo `std::string` mới từ mỗi phần tử dereference lại có thể sửa trạng thái source?
