# Ngày 30 — Heterogeneous lookup

## 1. Vấn đề nó giải quyết

Tìm trong map có key `std::string` bằng kiểu giống chuỗi khác có thể phải tạo temporary key chỉ để lookup. Heterogeneous lookup dùng transparent comparator để tìm trực tiếp bằng kiểu thay thế tương thích.

## 2. Kiến thức cần có

- Transparent comparator ngày 29; map, construction của string, key equivalence và iterator kết quả.

## 3. Ý tưởng cốt lõi

Kiểu key được lưu không đổi. Chỉ thao tác lookup trở thành template và comparator phải biết sắp thứ tự key lưu với probe được truyền theo cả hai chiều.

## 4. Cú pháp tối thiểu

```cpp
std::map<std::string, int, std::less<>> scores;
const char* probe = "mai";
auto it = scores.find(probe);
```

## 5. Cách nó hoạt động

1. Map lưu key string sở hữu dữ liệu và điểm số nguyên theo thứ tự cây.
2. Transparent comparator nhận probe `const char*` trong `find` thay vì yêu cầu tạo temporary `std::string` có tên.
3. Iterator đi tới entry có sẵn trong map và in điểm.

## 6. Lỗi thường gặp

- Gọi heterogeneous lookup bằng kiểu có ordering không nhất quán với key lưu có thể cho hành vi tìm sai.
- Trước khi áp dụng mẫu, phải kiểm tra hỗ trợ transparent comparator, tính nhất quán so sánh hai chiều, lifetime của probe trong lời gọi và kiểm tra end iterator.

## 7. Khi nào nên dùng

- Nên dùng khi lookup thường xuyên và caller tự nhiên đang có kiểu khác key nhưng tương thích, có thể tránh temporary construction.
- Tránh dùng khi chi phí conversion không đáng kể, code khó hiểu hơn hoặc comparator không thể order probe an toàn.

## 8. Ví dụ đơn giản

Map điểm sở hữu key `std::string`, còn caller có probe dạng C string. `std::less<>` cho phép `find` dùng probe đó trực tiếp.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Heterogeneous lookup thay đổi kiểu probe, không thay kiểu key lưu hay ownership.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra hỗ trợ transparent comparator, tính nhất quán so sánh hai chiều, lifetime của probe trong lời gọi và kiểm tra end iterator.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Heterogeneous lookup là gì?
2. Trung bình — Kết quả iterator nào cho biết probe `"mai"` khớp key đang tồn tại?
3. Khó — Vì sao custom transparent comparator phải hỗ trợ ordering nhất quán cho cả `(Key, Probe)` lẫn `(Probe, Key)`?
