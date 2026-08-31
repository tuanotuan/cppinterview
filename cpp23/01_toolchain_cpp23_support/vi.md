# Ngày 1 — Toolchain và mức hỗ trợ C++23

## 1. Vấn đề nó giải quyết

Chuẩn ngôn ngữ là bản đặc tả, còn GCC, Clang và MSVC là các bản triển khai. Bài này chỉ cách bật chế độ C++23 và kiểm tra compiler hiện tại thật sự cung cấp gì.

## 2. Kiến thức cần có

- Biết dùng dòng lệnh cơ bản và đã thấy một chương trình C++ tối thiểu.

## 3. Ý tưởng cốt lõi

Hãy hình dung C++23 là một bảng kiểm. Toolchain có thể hỗ trợ nhiều ô nhưng vẫn bỏ trống một số tính năng ngôn ngữ hoặc thư viện. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
static_assert(__cplusplus > 202002L);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Toolchain và mức hỗ trợ C++23.
1. Chương trình in giá trị chế độ chuẩn và nhận diện compiler đang dùng qua macro định nghĩa sẵn.
1. Cuối cùng, nó in hoặc kiểm tra số hiệu chế độ C++23 và phiên bản GCC nhìn thấy rõ để dễ đối chiếu.

## 6. Lỗi thường gặp

- Xem `-std=c++23` là bằng chứng hỗ trợ đầy đủ có thể làm mã lỗi trên phiên bản thư viện chuẩn khác.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi khởi tạo dự án, báo lỗi compiler hoặc lập ma trận tính tương thích.
- Tránh dùng khi đóng cứng phiên bản hãng khi feature-test macro có thể kiểm tra đúng tính năng.

## 8. Ví dụ đơn giản

Một tác vụ CI ghi `__cplusplus` và macro của hãng bên cạnh từng kết quả build. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao hai bản cài GCC cùng nhận `-std=c++23` nhưng lại cung cấp các thành phần thư viện C++23 khác nhau?
