# Ngày 50 — Binary parsing bằng std::byte, string_view và from_chars

## 1. Vấn đề nó giải quyết

Text-framed byte field và binary protocol cần bound chặt, numeric validation, exact width và byte order rõ. Kết hợp non-owning input view, low-level conversion và byte storage giúp các policy nhìn thấy.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết `std::byte`, `std::string_view`, `std::from_chars`, fixed-width integer, shift và endianness.

## 3. Ý tưởng cốt lõi

Parse từng token phân cách trong view range rõ, yêu cầu consume hết, reject value lớn hơn một byte, rồi assemble big-endian representation đã khai báo bằng cách widen trước shift. Không reinterpret external byte thành native struct.

## 4. Cú pháp tối thiểu

```cpp
auto result = std::from_chars(first, last, value, 16);
byte = static_cast<std::byte>(value);
word = (word << 8) | std::to_integer<unsigned>(byte);
```

## 5. Cách nó hoạt động

1. Bốn hexadecimal token trong string view được parse vào fixed byte array với range check đầy đủ.
2. Các byte được widen rồi fold trái theo network order đã khai báo để tạo integer 32-bit độc lập host representation.
3. Chương trình in `parsed: 12 34 56 78` và `word: 12345678`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Nhận partial token, bỏ overflow, shift trước widen hoặc giả định native struct layout có thể tạo bug security và portability.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi format có tài liệu cung cấp token grammar, byte width, bound và byte order chặt.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Parser nhận đúng bốn token và reject trailing input không phải space. Output dùng hexadecimal formatting để phản ánh wire representation.

## 9. Điều cần nhớ

- Parsing portable validate syntax và range trước, rồi dựng value rõ theo external format.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Binary parsing bằng std::byte, string_view và from_chars giải quyết vấn đề chính nào?
2. Trung bình — Vì sao mỗi byte phải widen trước khi tham gia left shift 32-bit?
3. Khó — Production API sẽ báo exact offset và reason của malformed input thế nào?
