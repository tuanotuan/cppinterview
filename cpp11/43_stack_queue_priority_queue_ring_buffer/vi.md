# Ngày 43 — Stack, queue, priority queue và ring buffer

## 1. Vấn đề nó giải quyết

Container adapter giới hạn truy cập theo LIFO, FIFO hoặc ưu tiên cao nhất; ring buffer tái sử dụng vùng nhớ cố định theo vòng tròn. Nó làm ràng buộc quan trọng hiện rõ thay vì bắt người đọc đoán. Bài chỉ giữ phần cốt lõi C++11 vừa đủ cho một ngày tập trung.

## 2. Kiến thức cần có

- Kiến thức Ngày 42, cùng biến, hàm và cách đọc output đã học trước đó.

## 3. Ý tưởng cốt lõi

Mental model: Container adapter giới hạn truy cập theo LIFO, FIFO hoặc ưu tiên cao nhất; ring buffer tái sử dụng vùng nhớ cố định theo vòng tròn. Hãy xác định giá trị hoặc trạng thái liên quan, ai sở hữu nó và quy tắc tác động lúc compile hay lúc chạy.

## 4. Cú pháp tối thiểu

```cpp
std::stack<int> s; std::queue<int> q; std::priority_queue<int> p;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo dữ liệu nhỏ, cố định và không cần nhập bàn phím.
1. C++11 hoặc contract thư viện chuẩn áp dụng quy tắc hôm nay.
1. Chương trình in kết quả quan trọng để đối chiếu với mã nguồn.

## 6. Lỗi thường gặp

- Gọi `top` hoặc `front` trên adapter rỗng gây undefined behavior; index vòng cũng phải phân biệt trạng thái đầy và rỗng.

## 7. Khi nào nên dùng

- Nên dùng khi thứ tự xử lý theo stack, lượt đến, độ ưu tiên hoặc vòng hữu hạn.
- Tránh dùng khi nó che ownership, lifetime, kiểu, thứ tự hoặc chi phí.

## 8. Ví dụ đơn giản

Ba adapter chuẩn cho biết phần tử kế tiếp; mảng ba ô minh họa ghi vòng bằng phép modulo. File `.cpp` dùng dữ liệu cố định và không thêm abstraction ngoài chủ đề.

## 9. Điều cần nhớ

- Tính năng nằm trong phạm vi C++11 của lộ trình này.
- Hiểu hệ quả về lifetime, ownership, kiểu và thứ tự trước khi dùng.
- Compile với cảnh báo và ưu tiên cách viết nhỏ nhất làm quy tắc hiện rõ.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chủ đề hôm nay giải quyết vấn đề gì, và token hoặc khai báo nào trong cú pháp tối thiểu kích hoạt nó?
1. Trung bình — Đọc ví dụ nhỏ ở trên. Chương trình sẽ in giá trị hoặc trạng thái nào, và quy tắc nào tạo ra kết quả đó?
1. Khó — Tìm và giải thích lỗi tinh tế trong tình huống sau: Gọi `top` hoặc `front` trên adapter rỗng gây undefined behavior; index vòng cũng phải phân biệt trạng thái đầy và rỗng. Cách sửa nhỏ nhất nhưng an toàn trong C++11 là gì?
