# Ngày 22 — `#elifdef`, `#elifndef` và `#warning`

## 1. Vấn đề nó giải quyết

Nhánh preprocessor thường kiểm tra macro có tồn tại. C++23 rút gọn dạng `#elif defined(...)` phổ biến và chuẩn hóa `#warning` để phát chẩn đoán có chủ ý mà không dừng dịch.

## 2. Kiến thức cần có

- Ngày 1: macro hãng và lựa chọn compiler.
- Ngày 2: feature-test macro và conditional compilation.

## 3. Ý tưởng cốt lõi

Preprocessor chọn văn bản trước khi compiler phân tích C++. `#elifdef X` hỏi nhãn có tồn tại; `#warning` để lại cảnh báo rõ cho cấu hình được chọn. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
#elifdef FEATURE_NAME
#elifndef OTHER_FEATURE
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `#elifdef`, `#elifndef` và `#warning`.
1. Chương trình chọn một hằng bằng `#elifdef` và giữ ví dụ `#warning` trong nhánh tắt.
1. Cuối cùng, nó in hoặc kiểm tra giá trị từ nhánh preprocessor mong đợi và không có warning khi build để dễ đối chiếu.

## 6. Lỗi thường gặp

- Nhầm macro không tồn tại với macro được định nghĩa bằng `0` làm đổi logic nhánh; bật `#warning` thường trực làm bẩn build và che chẩn đoán quan trọng.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi header cấu hình portable và cảnh báo migration tạm gắn với nhánh cụ thể.
- Tránh dùng khi logic tính năng phức tạp nên biểu diễn bằng cấu hình sinh ra hoặc `if constexpr` C++.

## 8. Ví dụ đơn giản

Thư viện chọn backend được hỗ trợ và cảnh báo khi biên dịch backend dự phòng. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu `FEATURE` được định nghĩa bằng `0`, `#elifdef FEATURE` và `#elif FEATURE` khác nhau thế nào?
