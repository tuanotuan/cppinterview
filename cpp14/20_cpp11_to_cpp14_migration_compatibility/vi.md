# Ngày 20 — Migration từ C++11 sang C++14 và compiler compatibility

## 1. Vấn đề nó giải quyết

Đổi flag dự án từ C++11 sang C++14 không bảo đảm mọi target, compiler, platform và dependency hỗ trợ cùng tính năng. Migration cần ma trận build có kiểm soát, áp dụng feature có chọn lọc và kiểm tra tương thích.

## 2. Kiến thức cần có

- Ngày 1 và 8-19; chế độ chuẩn ghi rõ, bổ sung ngôn ngữ C++14, bổ sung thư viện và diagnostic.

## 3. Ý tưởng cốt lõi

Hãy xem migration như vòng lặp bằng chứng: chọn compiler tối thiểu, build mọi target ở chế độ C++14 rõ ràng, chạy test, áp dụng feature từng bước và cô lập workaround tương thích.

## 4. Cú pháp tối thiểu

```cpp
#if __cplusplus < 201402L
#error C++14 is required
#endif
```

## 5. Cách nó hoạt động

1. Preprocessor so sánh macro phiên bản ngôn ngữ của implementation với giá trị chuẩn C++14.
2. Chế độ không hỗ trợ dừng ngay với thông báo hữu ích thay vì lỗi muộn ở cú pháp không liên quan.
3. Build C++14 hợp lệ đi tới feature mẫu rồi in trạng thái tương thích và kết quả generic lambda.

## 6. Lỗi thường gặp

- Dùng feature mới chỉ vì compiler trên máy cá nhân chấp nhận có thể vô tình nâng toolchain tối thiểu cho mọi người.
- Trước khi áp dụng mẫu, phải kiểm tra phiên bản compiler, flag chính xác của mọi target, hỗ trợ thư viện chuẩn, nền tảng CI, dependency, warning và test.

## 7. Khi nào nên dùng

- Nên dùng khi môi trường hỗ trợ đã được ghi rõ và feature C++14 thật sự giảm phức tạp hoặc tăng an toàn.
- Tránh dùng khi compiler hoặc dependency bắt buộc chưa đạt baseline và không có đường tương thích chấp nhận được.

## 8. Ví dụ đơn giản

File bắt buộc C++14 bằng `__cplusplus` rồi dùng generic lambda như smoke test nhỏ. Migration thật phải lặp kiểm tra trên nhiều compiler và hệ điều hành trong CI.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Migration thành công khi baseline ngôn ngữ đã công bố khớp mọi môi trường build và test thật.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra phiên bản compiler, flag chính xác của mọi target, hỗ trợ thư viện chuẩn, nền tảng CI, dependency, warning và test.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Migration từ C++11 sang C++14 và compiler compatibility là gì?
2. Trung bình — Điều gì xảy ra ở bước tiền xử lý khi file được biên dịch bằng `-std=c++11`?
3. Khó — Vì sao chỉ test compiler mới nhất là chưa đủ khi thư viện hứa tương thích C++14 với các compiler cũ vẫn được hỗ trợ?
