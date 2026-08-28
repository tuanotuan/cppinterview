# Ngày 36 — Variadic templates và parameter packs

## 1. Vấn đề nó giải quyết

Variadic template nhận không hoặc nhiều template argument, giữ chúng trong parameter pack rồi expand thành cú pháp lặp. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 35, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: Variadic template nhận không hoặc nhiều template argument, giữ chúng trong parameter pack rồi expand thành cú pháp lặp. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
template<class T, class... Rest> auto sum(T first, Rest... rest);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Pack expansion đệ quy cần overload kết thúc; thiếu nó thì lần instantiate cuối không còn hàm hợp lệ để gọi.

## 7. Khi nào nên dùng

- Nên dùng khi hàm type-safe cần nhận số lượng đối số thay đổi nhỏ.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Hàm `sum` variadic đệ quy tách một đối số mỗi lần cho tới base case không đối số trả 0. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Pack expansion đệ quy cần overload kết thúc; thiếu nó thì lần instantiate cuối không còn hàm hợp lệ để gọi. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
