# Ngày 20 — Lambda capture *this và object lifetime

## 1. Vấn đề nó giải quyết

Capture `this` chỉ copy pointer, nên callback sống lâu hơn object có thể dereference dangling pointer. C++17 thêm `[*this]` để capture snapshot của object theo value.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết lambda capture, member function, copy, object lifetime và rủi ro callback bất đồng bộ.

## 3. Ý tưởng cốt lõi

`[*this]` lưu bản copy object hiện tại trong closure. Member access trong lambda chỉ bản copy đó, nên thay đổi hay destruction của original không làm snapshot invalid nếu copy từng member an toàn.

## 4. Cú pháp tối thiểu

```cpp
auto snapshot() const {
    return [*this] { return value_; };
}
```

## 5. Cách nó hoạt động

1. Member function tạo callback khi object lưu 10, sau đó original object đổi thành 99.
2. Closure giữ member value đã copy và chạy an toàn sau khi local original object rời scope.
3. Chương trình in `snapshot: 10` dù original đã thay đổi, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Shallow object copy vẫn có thể chứa raw pointer hay view bị dangling; `[*this]` copy theo semantics của member chứ không copy toàn external object graph.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi callback cần immutable snapshot semantics và copy operation của object giữ an toàn mọi lifetime cần thiết.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Callback thoát helper scope rồi in value cũ. Không giữ reference hay pointer tới original object.

## 9. Điều cần nhớ

- `[*this]` chỉ giải quyết pointer lifetime khi copy member thực sự tạo snapshot độc lập hợp lệ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Lambda capture *this và object lifetime giải quyết vấn đề chính nào?
2. Trung bình — Vì sao callback trả 10 thay vì 99?
3. Khó — Member dạng pointer nào vẫn có thể làm closure đã copy mất an toàn khi context gốc biến mất?
