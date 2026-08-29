# Ngày 11 — Move-only lambda capture và capture lifetime

## 1. Vấn đề nó giải quyết

Một số trạng thái như `std::unique_ptr` không thể copy vào closure C++11. Init-capture C++14 có thể move trạng thái đó vào closure, biến closure thành owner mới và gắn lifetime tài nguyên với lifetime của closure.

## 2. Kiến thức cần có

- Ngày 3, 4 và 10: unique ownership, move semantics, lambda capture và init-capture.

## 3. Ý tưởng cốt lõi

Closure là object bình thường chứa data member move-only. Bản thân nó có thể được move nhưng không thể copy, và tài nguyên capture sống tới khi member trong closure bị hủy.

## 4. Cú pháp tối thiểu

```cpp
auto job = [ptr = std::move(owner)] {
    return *ptr;
};
```

## 5. Cách nó hoạt động

1. Init-capture cast smart pointer gốc thành rvalue rồi khởi tạo một member của closure.
2. Ownership được chuyển một lần lúc tạo closure, vì vậy nguồn rỗng và closure trở thành move-only.
3. Gọi closure vẫn truy cập tài nguyên an toàn dù smart pointer ban đầu không còn sở hữu gì.

## 6. Lỗi thường gặp

- Cố copy lambda này sẽ lỗi vì closure type do compiler sinh chứa member không thể copy.
- Trước khi áp dụng mẫu, phải kiểm tra việc chuyển ownership, nơi gọi move hay copy closure và closure object sống trong bao lâu.

## 7. Khi nào nên dùng

- Nên dùng khi công việc chạy trễ hoặc bất đồng bộ cần sở hữu độc quyền tài nguyên lâu hơn scope cục bộ của nơi tạo.
- Tránh dùng khi nhiều bản callable độc lập phải chia sẻ cùng trạng thái; khi đó cần thiết kế lại ownership.

## 8. Ví dụ đơn giản

Một chuỗi được cấp phát dưới unique pointer rồi move vào closure công việc. Nguồn báo rỗng, trong khi job vẫn in được chuỗi vì chính nó sở hữu vùng nhớ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Move-only capture chuyển ownership vào trạng thái closure và khiến closure không thể được copy.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra việc chuyển ownership, nơi gọi move hay copy closure và closure object sống trong bao lâu.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Move-only lambda capture và capture lifetime là gì?
2. Trung bình — `static_cast<bool>(owner)` cho kết quả gì sau khi `owner` được move vào capture?
3. Khó — Vì sao move closure sang owner khác có thể hợp lệ dù copy chính closure đó là ill-formed?
