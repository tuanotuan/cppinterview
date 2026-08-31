# Ngày 32 — `std::out_ptr` và `std::inout_ptr`

## 1. Vấn đề nó giải quyết

API C thường trả quyền sở hữu qua `T**`, không khớp trực tiếp smart pointer C++. `std::out_ptr` và `std::inout_ptr` thích nghi output parameter rồi khôi phục quyền sở hữu RAII sau đó.

## 2. Kiến thức cần có

- Ngày 3: chuyển quyền sở hữu.
- Ngày 6: RAII và lifetime tài nguyên.

## 3. Ý tưởng cốt lõi

Adapter tạm mở một cửa raw pointer có kiểm soát. `out_ptr` chờ output mới; `inout_ptr` còn đưa pointer hiện có cho hàm C thay thế. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
legacy_create(std::out_ptr(owner));
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::out_ptr` và `std::inout_ptr`.
1. Chương trình cho các hàm create và replace kiểu C nhỏ điền `std::unique_ptr` khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra giá trị do smart pointer sở hữu sau khi thích nghi để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng `inout_ptr` với API không giải phóng cũng không thay pointer cũ có thể rò rỉ hoặc double-delete; custom deleter phải khớp hàm cấp phát C.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi kết nối smart pointer sở hữu với output parameter C cũ có hợp đồng rõ.
- Tránh dùng khi API C++ mới, vốn nên trả trực tiếp RAII owner thay vì lộ `T**`.

## 8. Ví dụ đơn giản

Trình nạp ảnh cũ ghi handle mới cấp phát qua `Handle**`, còn C++ lưu kết quả trong unique owner. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `out_ptr` phù hợp với owner rỗng còn `inout_ptr` cần hợp đồng chính xác về cách hàm C xử lý pointer cũ?
