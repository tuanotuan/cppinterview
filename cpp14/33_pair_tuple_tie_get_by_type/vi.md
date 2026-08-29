# Ngày 33 — std::pair, std::tuple, std::tie và std::get<T>

## 1. Vấn đề nó giải quyết

Nhóm nhỏ cố định gồm nhiều kiểu không phải lúc nào cũng cần class có tên. `std::pair` giữ hai value, `std::tuple` giữ số lượng cố định bất kỳ, `std::tie` gán qua reference và C++14 cho phép `std::get<T>` khi kiểu là duy nhất.

## 2. Kiến thức cần có

- Ngày 2, 6 và 15: type deduction, template, function return value, reference và utility type chuẩn.

## 3. Ý tưởng cốt lõi

Tuple là record theo vị trí. Index luôn dùng được; truy cập theo kiểu chỉ rõ hơn khi đúng một phần tử có kiểu được yêu cầu.

## 4. Cú pháp tối thiểu

```cpp
std::tuple<int, std::string, double> row{1, "An", 9.5};
std::tie(id, name, score) = row;
auto value = std::get<double>(row);
```

## 5. Cách nó hoạt động

1. Pair lưu ví dụ key/value gọn, còn tuple lưu một row nhiều kiểu.
2. `std::tie` tạo tuple các reference để assignment, còn `std::get<double>` chọn phần tử double duy nhất.
3. Các biến cục bộ có tên nhận field của tuple và lookup theo kiểu in đúng cùng điểm số.

## 6. Lỗi thường gặp

- `std::get<T>` là ill-formed khi `T` không xuất hiện đúng một lần trong tuple.
- Trước khi áp dụng mẫu, phải kiểm tra thứ tự phần tử, kiểu duy nhất cho type access, lifetime reference từ `tie` và việc struct có tên có rõ hơn không.

## 7. Khi nào nên dùng

- Nên dùng khi kết quả cục bộ có vài field rõ hoặc cần tương tác với tuple utility tổng quát.
- Tránh dùng khi field có ý nghĩa domain cần tên, invariant hoặc behavior riêng.

## 8. Ví dụ đơn giản

Tuple sinh viên chứa các phần tử `int`, `std::string` và `double` duy nhất. `tie` unpack vào biến có tên, còn type access lấy điểm.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Tuple phù hợp nhóm cấu trúc nhỏ; get theo kiểu yêu cầu kiểu đó phải duy nhất.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra thứ tự phần tử, kiểu duy nhất cho type access, lifetime reference từ `tie` và việc struct có tên có rõ hơn không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của std::pair, std::tuple, std::tie và std::get<T> là gì?
2. Trung bình — `std::get<double>(row)` chọn phần tử nào trong ví dụ?
3. Khó — Vì sao thêm một `double` thứ hai làm `std::get<double>` mơ hồ dù access bằng index vẫn hợp lệ?
