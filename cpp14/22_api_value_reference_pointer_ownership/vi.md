# Ngày 22 — Thiết kế API bằng value, reference, pointer và ownership

## 1. Vấn đề nó giải quyết

Function signature không chỉ để kiểm tra kiểu; nó truyền đạt copy, mutation, optionality, borrowing và chuyển ownership. Chọn value, reference, raw pointer hay smart pointer có chủ đích làm hợp đồng API hiện rõ tại call site.

## 2. Kiến thức cần có

- Ngày 2-3, 18 và 21: reference, pointer, move, smart pointer, lifetime và RAII.

## 3. Ý tưởng cốt lõi

Dùng value cho input hoặc output độc lập, `T&` cho mutable borrow bắt buộc, `const T&` cho read-only borrow bắt buộc, `T*` cho borrow có thể null và smart pointer cho ownership.

## 4. Cú pháp tối thiểu

```cpp
void increment(int& value);
const int* find(const std::vector<int>& values, int target);
std::unique_ptr<int> make_score(int value);
```

## 5. Cách nó hoạt động

1. Mỗi kiểu parameter hoặc return ghi lại việc callee có thể copy, mutate, không tìm thấy object hay tạo owner.
2. Reference và pointer borrow vẫn phụ thuộc lifetime do caller sở hữu, còn kết quả smart pointer sở hữu allocation mới.
3. Caller có thể đọc giá trị tìm được, quan sát mutation và giữ điểm số mới tạo với cleanup rõ ràng.

## 6. Lỗi thường gặp

- Trả pointer hoặc reference tới object cục bộ làm lộ vùng nhớ đã chết khi caller sử dụng.
- Trước khi áp dụng mẫu, phải kiểm tra nullability, khả năng mutate, chi phí copy, owner, lifetime và việc có chuyển ownership hay không.

## 7. Khi nào nên dùng

- Nên dùng khi hình thức đã chọn mô tả chính xác data-flow và hợp đồng lifetime của hàm.
- Tránh dùng khi raw pointer được dùng để che ownership hoặc output parameter làm rối một value return đơn giản.

## 8. Ví dụ đơn giản

Ví dụ mutate một số nguyên qua reference, tìm trong vector qua read-only reference với pointer kết quả có thể null, rồi tạo điểm số có owner bằng `std::make_unique`.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- API tốt làm ownership và borrowing hiện rõ trong kiểu thay vì phụ thuộc comment.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra nullability, khả năng mutate, chi phí copy, owner, lifetime và việc có chuyển ownership hay không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Thiết kế API bằng value, reference, pointer và ownership là gì?
2. Trung bình — Hàm mẫu nào có thể không tìm thấy object và kiểu trả về biểu diễn kết quả đó thế nào?
3. Khó — Vì sao nhận `std::unique_ptr<T>` theo value truyền đạt hợp đồng khác với nhận `T*`?
