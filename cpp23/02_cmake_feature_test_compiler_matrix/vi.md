# Ngày 2 — CMake C++23, feature-test macro và ma trận compiler

## 1. Vấn đề nó giải quyết

Dự án cần một cách lặp lại được để yêu cầu C++23 và một cách riêng để kiểm tra từng tính năng. CMake mô tả yêu cầu build; feature-test macro mô tả khả năng của mã.

## 2. Kiến thức cần có

- Ngày 1: nhận diện compiler, chế độ chuẩn và việc hỗ trợ có thể chưa đầy đủ.

## 3. Ý tưởng cốt lõi

CMake chọn làn đường, còn feature-test macro kiểm tra thiết bị trên xe. Ma trận compiler lặp phép kiểm tra đó trên nhiều hãng và phiên bản. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
#include <version>
#if defined(__cpp_lib_expected)
#endif
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho CMake C++23, feature-test macro và ma trận compiler.
1. Chương trình báo các macro ngôn ngữ và thư viện sau khi hệ thống build yêu cầu C++23.
1. Cuối cùng, nó in hoặc kiểm tra các giá trị tính năng chính xác do bản libstdc++ này cung cấp để dễ đối chiếu.

## 6. Lỗi thường gặp

- Chỉ dùng `CXX_STANDARD 23` mà không kiểm tra thành phần thư viện mới sẽ đánh đồng chế độ yêu cầu với mức triển khai.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi repository đa nền tảng hoặc bài học có thể chạy trên nhiều phiên bản compiler.
- Tránh dùng khi rải kiểm tra số phiên bản hãng trong mã khi đã có feature-test macro chuẩn.

## 8. Ví dụ đơn giản

Dự án chỉ bật nhánh `std::expected` tùy chọn khi `__cpp_lib_expected` đạt giá trị cần thiết. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu CMake yêu cầu C++23 nhưng thiếu `__cpp_lib_print`, dữ kiện nào phải quyết định việc gọi `std::print`, và vì sao?
