# Ngày 52 — Cache locality và data-oriented design

## 1. Vấn đề nó giải quyết

Cache locality thưởng cho truy cập bộ nhớ gần nhau và dễ dự đoán; data-oriented design sắp dữ liệu quanh thao tác nóng thay vì quanh cây object. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 51, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: Cache locality thưởng cho truy cập bộ nhớ gần nhau và dễ dự đoán; data-oriented design sắp dữ liệu quanh thao tác nóng thay vì quanh cây object. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
for (std::size_t i=0; i<x.size(); ++i) x[i] += vx[i];
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Tách mọi field thành mảng riêng có thể hại thao tác luôn cần tất cả field; layout phải theo access pattern đã đo.

## 7. Khi nào nên dùng

- Nên dùng khi vòng lặp nóng liên tục chỉ chạm một phần field của nhiều record.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Các mảng position và velocity liên tục riêng biệt chỉ cập nhật field vòng lặp nóng cần rồi in checksum cố định. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Tách mọi field thành mảng riêng có thể hại thao tác luôn cần tất cả field; layout phải theo access pattern đã đo. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
