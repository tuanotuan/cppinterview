# Ngày 24 — Migration từ C++14 sang C++17 và compiler compatibility

## 1. Vấn đề nó giải quyết

Đổi standard flag có thể thay language rule, library availability, warning, ABI assumption và dependency requirement. Migration cần build matrix được audit chứ không chỉ search-and-replace.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết build flag, conditional compilation, feature-test macro, CI, dependency và deprecation warning.

## 3. Ý tưởng cốt lõi

Đầu tiên tạo baseline C++14 sạch warning, rồi thêm configuration C++17 đã test cho mọi compiler và platform. Ưu tiên standard feature-test macro hơn đoán compiler version, chỉ bỏ compatibility branch sau khi support policy đổi.

## 4. Cú pháp tối thiểu

```cpp
#if __cplusplus >= 201703L
const auto [a, b] = value;
#else
const auto a = value.first;
const auto b = value.second;
#endif
```

## 5. Cách nó hoạt động

1. Version gate chọn structured binding trong C++17 và giữ cách viết legacy rõ cho mode cũ.
2. Feature-test assertion riêng xác nhận compiler quảng bá hỗ trợ structured binding.
3. Chương trình in `mode: C++17` và `sum: 42`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Chỉ kiểm tra `__cplusplus` có thể bỏ sót library implementation chưa đủ hoặc dependency ABI issue; phải compile và chạy matrix thật.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi codebase cần tăng minimum standard trong khi release vẫn reproducible và có thể rollback.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

File chứa cả hai path để minh họa nhưng compiler của khóa học chỉ chọn và validate branch C++17.

## 9. Điều cần nhớ

- Migration là chương trình compatibility bao phủ compiler, standard library, dependency, warning, test, performance và deployment.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Migration từ C++14 sang C++17 và compiler compatibility giải quyết vấn đề chính nào?
2. Trung bình — Preprocessor branch nào được chọn với `-std=c++17`?
3. Khó — Vì sao hai compiler cùng báo C++17 mode nhưng khác nhau về standard-library facility dùng được?
