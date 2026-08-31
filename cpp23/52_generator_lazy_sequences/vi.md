# Ngày 52 — `std::generator` và dãy coroutine lười

## 1. Vấn đề nó giải quyết

Viết coroutine generator trước đây cần promise, iterator và wrapper lifetime tự tạo. `std::generator` C++23 chuẩn hóa range đồng bộ, lười, có coroutine yield từng phần tử.

## 2. Kiến thức cần có

- Ngày 5: range lười.
- Ngày 6: coroutine frame và lifetime.

## 3. Ý tưởng cốt lõi

Coroutine là producer bị tạm dừng. Mỗi lần tăng iterator sẽ resume đến `co_yield` kế tiếp; frame giữ trạng thái cục bộ giữa các lần kéo và bị hủy cùng generator. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::generator<int> count() { co_yield 1; }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::generator` và dãy coroutine lười.
1. Chương trình yield dãy số nguyên ngắn rồi tiêu thụ bằng range-based loop khi header tồn tại.
1. Cuối cùng, nó in hoặc kiểm tra các số theo thứ tự mà không cần vector trung gian để dễ đối chiếu.

## 6. Lỗi thường gặp

- Trả tham chiếu đến đối tượng hết đời giữa các lần resume có thể treo; cho rằng generator là bất đồng bộ hoặc thread-safe là hiểu sai mô hình pull đồng bộ.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi dãy lớn hoặc vô hạn được tiêu thụ từng phần qua interface range chuẩn.
- Tránh dùng khi dữ liệu cố định nhỏ nơi container hoặc `views::iota` đơn giản hơn và không có coroutine frame.

## 8. Ví dụ đơn giản

Parser yield từng record đã decode để bên gọi có thể dừng sớm mà không dựng cả collection. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Mã trước `co_yield` đầu tiên chạy khi nào, và lifetime nào sở hữu biến cục bộ coroutine giữa hai lần tăng iterator?
