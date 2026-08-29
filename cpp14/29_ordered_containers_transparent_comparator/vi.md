# Ngày 29 — Ordered containers và transparent comparator

## 1. Vấn đề nó giải quyết

Ordered container duy trì key theo comparator và khái niệm tương đương đến từ ordering chứ không phải `operator==`. Transparent comparator C++14 như `std::less<>` có thể so sánh các kiểu giống key tương thích.

## 2. Kiến thức cần có

- Ngày 6, 25-27: container, ordering, iterator, generic callable và string value.

## 3. Ý tưởng cốt lõi

Cây chỉ hỏi một key có nhỏ hơn key kia không. Transparent comparator có call operator dạng template và cho biết lookup không cần dựng trước đúng kiểu key được lưu.

## 4. Cú pháp tối thiểu

```cpp
std::set<std::string, std::less<>> names;
auto it = names.find("linh");
```

## 5. Cách nó hoạt động

1. Set lưu string theo thứ tự comparator và từ chối key tương đương theo comparator đó.
2. `std::less<>` so sánh `std::string` được lưu với lookup argument tương thích mà không cố định một kiểu operand.
3. Phép duyệt in tên đã sắp xếp và lookup bằng string literal tìm đúng string đã lưu.

## 6. Lỗi thường gặp

- Comparator không tạo strict weak ordering có thể phá invariant logic của container và làm lookup không đáng tin.
- Trước khi áp dụng mẫu, phải kiểm tra strict weak ordering, tính bất biến của key, trạng thái comparator, equivalence và phép so sánh khác kiểu được hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi cần duyệt đã sắp xếp, tìm logarithmic hoặc uniqueness theo thứ tự và có comparator nhất quán.
- Tránh dùng khi không cần thứ tự và hash lookup phù hợp hơn với access pattern đã đo.

## 8. Ví dụ đơn giản

Set string transparent lưu ba tên. Comparator sắp xếp từ điển và chấp nhận string literal làm search key tương thích.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Tính đúng của ordered container phụ thuộc ordering và equivalence của comparator, không chỉ equality của key.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra strict weak ordering, tính bất biến của key, trạng thái comparator, equivalence và phép so sánh khác kiểu được hỗ trợ.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ordered containers và transparent comparator là gì?
2. Trung bình — `"lan"`, `"an"` và `"minh"` được set in theo thứ tự nào?
3. Khó — Vì sao cả `comp(a, b)` và `comp(b, a)` phải false để hai key tương đương trong ordered container?
