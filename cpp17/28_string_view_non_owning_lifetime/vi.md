# Ngày 28 — std::string_view và non-owning lifetime

## 1. Vấn đề nó giải quyết

Xử lý string read-only thường chỉ cần character range, nhưng nhận hay tạo `std::string` value có thể allocate và copy. `std::string_view` biểu diễn view non-owning rẻ.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết contiguous character storage, pointer và length, substring cùng object lifetime.

## 3. Ý tưởng cốt lõi

String view lưu pointer và size nhưng không sở hữu cũng không đảm bảo null terminator. Copy view rẻ; mọi lần dùng vẫn đòi character storage gốc còn sống và không bị thay đổi làm invalid pointer.

## 4. Cú pháp tối thiểu

```cpp
std::string_view first_word(std::string_view text) {
    return text.substr(0, text.find(' '));
}
```

## 5. Cách nó hoạt động

1. Function nhận view trên owned string còn sống rồi trả subview cho word đầu.
2. Không character allocation nào xảy ra; cả hai view tiếp tục reference cùng stable string buffer lúc in.
3. Chương trình in `first: Modern` và source length, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Return view vào temporary string hoặc giữ view qua source reallocation tạo dangling view dù nó vẫn có thể trông non-empty.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi API đọc substring trong owner lifetime rõ và không cần ownership.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Owning string được khai báo trong `main` và sống lâu hơn cả hai view, nên first-word view trả về vẫn valid khi in.

## 9. Điều cần nhớ

- View tối ưu bằng cách bỏ ownership; lifetime contract của nó phải chặt và rõ hơn copied string.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::string_view và non-owning lifetime giải quyết vấn đề chính nào?
2. Trung bình — Object nào sở hữu character được in qua returned view?
3. Khó — Mutation nào của `std::string` có thể invalidate view hiện có, và vì sao?
