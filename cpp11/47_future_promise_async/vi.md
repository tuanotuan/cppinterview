# Ngày 47 — Future, promise và std::async

## 1. Vấn đề nó giải quyết

Future nhận một kết quả trong tương lai, promise cung cấp kết quả rõ ràng, còn `std::async` gói việc chạy task và chuyển kết quả. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 46, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: Future nhận một kết quả trong tương lai, promise cung cấp kết quả rõ ràng, còn `std::async` gói việc chạy task và chuyển kết quả. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
std::future<int> f = std::async(std::launch::async, task); int x = f.get();
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Gọi `get` hai lần là không hợp lệ vì future thường chỉ chuyển kết quả một lần; promise bị bỏ dở còn báo exception.

## 7. Khi nào nên dùng

- Nên dùng khi một kết quả hoặc exception cần đi qua ranh giới bất đồng bộ.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Promise gửi một số nguyên từ thread; task async riêng trả về một phép tính cố định khác. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Gọi `get` hai lần là không hợp lệ vì future thường chỉ chuyển kết quả một lần; promise bị bỏ dở còn báo exception. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
