# Ngày 36 — std::clamp, std::sample, std::not_fn, std::gcd và std::lcm

## 1. Vấn đề nó giải quyết

Operation nhỏ thông dụng thường được viết lại với lỗi boundary, randomness, predicate hoặc arithmetic tinh tế. C++17 thêm vocabulary chuẩn cho clamp, sample, negate predicate, greatest common divisor và least common multiple.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết strict comparison, random engine, predicate, iterator, integer arithmetic và overflow limit.

## 3. Ý tưởng cốt lõi

`std::clamp` trả value nằm trong bound có thứ tự, `std::sample` chọn không lặp qua generator do caller cấp, `std::not_fn` bọc negation của callable, còn `gcd/lcm` cài number theory chuẩn.

## 4. Cú pháp tối thiểu

```cpp
auto bounded = std::clamp(value, low, high);
std::sample(first, last, out, count, engine);
auto odd = std::not_fn(is_even);
```

## 5. Cách nó hoạt động

1. Integer cố định dùng để chạy clamp, divisor calculation và predicate negation.
2. Random engine có seed điều khiển sampling; chỉ sample size được in để selection detail tùy implementation không ảnh hưởng oracle.
3. Chương trình in `clamped: 10`, `gcd: 6`, `lcm: 42`, ba số lẻ và sample size ba, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Clamp cần ordered range hợp lệ, lcm có thể overflow result type, và random reproducibility giữa library implementation không chỉ dựa vào engine seed.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi các standard operation này khớp đúng domain rule và loại bỏ custom edge-case code.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Một program chạy cả năm facility với input nhỏ, còn mọi property được in đều xác định giữa implementation hợp lệ.

## 9. Điều cần nhớ

- Vocabulary algorithm chuẩn làm ý định rõ, nhưng precondition, overflow và randomness policy vẫn thuộc caller.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::clamp, std::sample, std::not_fn, std::gcd và std::lcm giải quyết vấn đề chính nào?
2. Trung bình — Vì sao negate even predicate đếm đúng ba value?
3. Khó — Vì sao cùng seed vẫn có thể cho sampled element khác giữa standard-library implementation?
