# Ngày 2 — Ôn object lifetime, RAII, move semantics và Rule of Zero

## 1. Vấn đề nó giải quyết

Đường cleanup thủ công tăng nhanh khi hàm return sớm hoặc throw. RAII gắn việc giải phóng với object lifetime, còn kiểu Rule of Zero giao ownership cho member chuẩn đã cài đúng copy, move và destruction.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu scope, constructor, destructor, value, reference và mục đích của `std::move`.

## 3. Ý tưởng cốt lõi

Object bắt đầu lifetime sau khi được khởi tạo hợp lệ và kết thúc khi destructor chạy. Ưu tiên member như `std::string`, `std::vector` và smart pointer để class bao ngoài không cần tự viết destructor, copy hay move constructor.

## 4. Cú pháp tối thiểu

```cpp
struct Batch {
    std::string name;
    std::vector<int> values;
};
Batch moved = std::move(source);
```

## 5. Cách nó hoạt động

1. Một aggregate theo Rule of Zero sở hữu chuỗi và dãy động qua value member của thư viện chuẩn.
2. Move operation do compiler sinh yêu cầu từng member move; source và destination vẫn là object hợp lệ tới khi scope kết thúc.
3. Chương trình in tên và số phần tử của destination, cùng Boolean cho thấy source sau move vẫn hợp lệ, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Object sau move vẫn hợp lệ nhưng giá trị cũ thường không được quy định; chỉ thao tác mà hợp đồng của kiểu cho phép mới an toàn.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi class sở hữu tài nguyên có thể biểu diễn bằng các RAII value type sẵn có.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Batch không khai báo special member function nào. Move chuyển trạng thái hiệu quả, còn automatic destruction sau đó giải phóng mọi member mà không cần nhánh cleanup.

## 9. Điều cần nhớ

- Ưu tiên Rule of Zero; chỉ viết special member khi class sở hữu tài nguyên có policy không thể biểu diễn bằng RAII member chuẩn.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Ôn object lifetime, RAII, move semantics và Rule of Zero giải quyết vấn đề chính nào?
2. Trung bình — Object nào sở hữu phần tử vector sau move, và thao tác nào vẫn an toàn với source?
3. Khó — Tự khai báo destructor ảnh hưởng việc sinh implicit move như thế nào?
