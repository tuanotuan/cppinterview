# Ngày 50 — Data race, deadlock và false sharing

## 1. Vấn đề nó giải quyết

Data race là truy cập đồng thời thiếu đồng bộ, deadlock là chờ vòng tròn, còn false sharing là tranh chấp cache line giữa các phép ghi độc lập về logic. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 49, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: Data race là truy cập đồng thời thiếu đồng bộ, deadlock là chờ vòng tròn, còn false sharing là tranh chấp cache line giữa các phép ghi độc lập về logic. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
std::lock(a, b); alignas(64) std::atomic<int> counter;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Thêm atomic có thể hết data race nhưng vẫn còn false sharing; thứ tự khóa mutex không nhất quán có thể deadlock thao tác đúng về dữ liệu.

## 7. Khi nào nên dùng

- Nên dùng khi kiểm tra đúng đắn concurrent trước rồi mới tối ưu tranh chấp cache.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Hai thread cập nhật atomic counter được padding; `std::lock` lấy hai mutex mà không áp đặt thứ tự thủ công nguy hiểm. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Thêm atomic có thể hết data race nhưng vẫn còn false sharing; thứ tự khóa mutex không nhất quán có thể deadlock thao tác đúng về dữ liệu. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
