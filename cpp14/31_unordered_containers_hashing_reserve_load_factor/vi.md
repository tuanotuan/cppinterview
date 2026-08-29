# Ngày 31 — Unordered containers, hashing, reserve và load factor

## 1. Vấn đề nó giải quyết

Cây có thứ tự phải trả chi phí sắp xếp dù caller chỉ cần tìm key. Unordered container đặt key vào bucket bằng hash, so sánh equality trong bucket ứng viên và cung cấp reserve cùng load factor để lập kế hoạch cấp phát.

## 2. Kiến thức cần có

- Ngày 6 và 25-30: container, key lookup, equality, allocation, lập kế hoạch capacity và trade-off hiệu năng.

## 3. Ý tưởng cốt lõi

Hash thu hẹp tìm kiếm vào một bucket; equality xác nhận key. `load_factor` xấp xỉ số phần tử chia số bucket, còn reserve trước khi chèn có thể giảm rehash và xáo trộn iterator.

## 4. Cú pháp tối thiểu

```cpp
std::unordered_map<std::string, int> table;
table.max_load_factor(0.75f);
table.reserve(8);
```

## 5. Cách nó hoạt động

1. Map đặt load factor tối đa mục tiêu và yêu cầu capacity cho số phần tử dự kiến trước khi chèn.
2. Hash của mỗi string chọn bucket và equality phân biệt key bị collision; container có thể rehash khi vượt ngưỡng.
3. Ba entry được tìm đúng và phép kiểm tra in ra xác nhận load hiện tại nằm trong mức tối đa đã cấu hình.

## 6. Lỗi thường gặp

- Custom hash không nhất quán với equality có thể làm key bằng nhau đi vào đường lookup không tương thích.
- Trước khi áp dụng mẫu, phải kiểm tra tính nhất quán hash/equality, số phần tử dự kiến, invalidation do rehash, chất lượng collision, load factor và access pattern đã đo.

## 7. Khi nào nên dùng

- Nên dùng khi truy cập key average constant-time quan trọng và thứ tự duyệt không cần thiết.
- Tránh dùng khi cần thứ tự ổn định, range query, bảo đảm worst-case hoặc dữ liệu rất nhỏ khiến cây hay dãy phẳng rõ hơn.

## 8. Ví dụ đơn giản

Bảng điểm reserve chỗ cho tám key, chèn ba record rồi tìm một tên. Chương trình kiểm tra size, value và invariant load factor thay vì phụ thuộc thứ tự bucket.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Unordered lookup cần cả hash tốt lẫn equality nhất quán với hash đó.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra tính nhất quán hash/equality, số phần tử dự kiến, invalidation do rehash, chất lượng collision, load factor và access pattern đã đo.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Unordered containers, hashing, reserve và load factor là gì?
2. Trung bình — Vì sao bảng vẫn cho lookup đúng dù thứ tự duyệt không được quy định?
3. Khó — Những ảnh hưởng nào tới iterator và hiệu năng có thể xảy ra khi insertion kích hoạt `rehash`?
