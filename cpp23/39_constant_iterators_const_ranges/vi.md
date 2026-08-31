# Ngày 39 — Constant iterator và const-aware range

## 1. Vấn đề nó giải quyết

Mã generic đôi khi có đối tượng range mutable nhưng phải lộ phép duyệt chỉ đọc. Tiện ích constant iterator và concept range biết const trong C++23 diễn đạt lời hứa đó mà không copy phần tử.

## 2. Kiến thức cần có

- Ngày 5: iterator, sentinel và view.
- Ngày 12: lan truyền `const`.

## 3. Ý tưởng cốt lõi

Constant iterator là chiếc găng chỉ đọc bọc iterator. Nó vẫn di chuyển trong cùng dãy nhưng dereference không cho sửa qua đường đó. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::basic_const_iterator it{range.begin()};
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Constant iterator và const-aware range.
1. Chương trình dùng constant iterator C++23 khi có và so với đường `cbegin` truyền thống.
1. Cuối cùng, nó in hoặc kiểm tra giá trị đầu cùng kiểm tra compile-time rằng đó là const-reference để dễ đối chiếu.

## 6. Lỗi thường gặp

- Const iterator không làm đối tượng nền bất biến qua mọi alias; giữ iterator mutable khác vẫn có thể sửa phần tử.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi interface generic chỉ đọc nhưng phải nhận range có iterator vốn mutable.
- Tránh dùng khi dùng nó như cơ chế đồng bộ hoặc bằng chứng không mã nào khác sửa storage.

## 8. Ví dụ đơn giản

Hàm báo cáo nhận vector mutable do nơi khác sở hữu nhưng chỉ đưa constant iteration cho pipeline format. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu `*it` là `const T&`, `T` nền vẫn có thể đổi qua alias khác không, và constant iterator thật sự bảo đảm điều gì?
