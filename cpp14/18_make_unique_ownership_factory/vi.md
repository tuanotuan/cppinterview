# Ngày 18 — std::make_unique và ownership factory

## 1. Vấn đề nó giải quyết

C++11 thường phải ghi `new` trong lúc tạo `std::unique_ptr`. `std::make_unique` của C++14 kết hợp cấp phát với tạo ownership trong một factory call rõ ràng và không lộ raw owning pointer.

## 2. Kiến thức cần có

- Ngày 3 và 11: `std::unique_ptr`, exclusive ownership, move semantics và RAII.

## 3. Ý tưởng cốt lõi

Factory tạo đúng một object rồi đặt ngay dưới một unique owner. Khi owner ra khỏi scope hoặc bị gán lại, object tự động được hủy.

## 4. Cú pháp tối thiểu

```cpp
auto item = std::make_unique<Item>(42);
```

## 5. Cách nó hoạt động

1. Template argument `Item` chọn kiểu được cấp phát và các function argument được chuyển tới constructor.
2. Kết quả cấp phát được bọc trực tiếp trong `std::unique_ptr<Item>` với ownership độc quyền.
3. Có thể truy cập member qua smart pointer và code người dùng không cần gọi `delete`.

## 6. Lỗi thường gặp

- Tạo nhiều unique pointer độc lập từ cùng raw address sẽ xóa nhiều lần và gây undefined behavior.
- Trước khi áp dụng mẫu, phải kiểm tra owner duy nhất, constructor argument, điểm chuyển ownership, object lifetime và nhu cầu custom deleter.

## 7. Khi nào nên dùng

- Nên dùng khi object cấp phát động có một owner rõ và lifetime đi theo scope hoặc smart pointer được trả về.
- Tránh dùng khi automatic storage hoặc value member trực tiếp đơn giản hơn, hoặc object thực sự cần shared ownership.

## 8. Ví dụ đơn giản

Một `Item` nhỏ được tạo từ constructor argument số nguyên. Unique pointer sở hữu nó, in giá trị rồi tự giải phóng khi kết thúc `main`.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- `std::make_unique` là factory mặc định của C++14 cho dynamic ownership độc quyền, rõ ràng.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra owner duy nhất, constructor argument, điểm chuyển ownership, object lifetime và nhu cầu custom deleter.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của std::make_unique và ownership factory là gì?
2. Trung bình — Ai hủy `Item` đã cấp phát khi smart pointer đi tới cuối `main`?
3. Khó — Vì sao factory trả `std::unique_ptr` an toàn hơn trả raw owning pointer mà quy tắc xóa chỉ được ghi bằng lời?
