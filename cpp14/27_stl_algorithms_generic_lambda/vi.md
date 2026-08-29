# Ngày 27 — STL algorithms kết hợp generic lambda

## 1. Vấn đề nó giải quyết

Vòng lặp viết tay thường trộn traversal với logic biến đổi, lọc hoặc sắp thứ tự. STL algorithm nêu rõ mẫu duyệt, còn generic lambda cung cấp thao tác nhỏ mà không cố định parameter type không cần thiết.

## 2. Kiến thức cần có

- Ngày 6, 9, 25 và 26: algorithm, generic lambda, container, iterator range và invalidation.

## 3. Ý tưởng cốt lõi

Chọn algorithm theo ý định, truyền range hợp lệ rồi để lambda chỉ mô tả quy tắc trên một phần tử. Algorithm quản lý việc duyệt; lambda quản lý một quyết định cục bộ.

## 4. Cú pháp tối thiểu

```cpp
std::transform(input.begin(), input.end(), output.begin(),
               [](auto value) { return value * value; });
```

## 5. Cách nó hoạt động

1. Output vector được đặt đúng size trước khi `std::transform` ghi một kết quả cho mỗi input.
2. Generic lambda suy ra kiểu phần tử rồi trả bình phương; `std::count_if` dùng một predicate cục bộ khác.
3. Dãy đã biến đổi và số lượng bình phương chẵn được in mà không cần index thủ công.

## 6. Lỗi thường gặp

- Ghi qua `output.begin()` khi output container chưa có đủ phần tử sẽ gây undefined behavior.
- Trước khi áp dụng mẫu, phải kiểm tra size của input/output range, tính hợp lệ của lambda, aliasing, iterator category và side effect mutation.

## 7. Khi nào nên dùng

- Nên dùng khi một thao tác transform, search, count, sort hoặc partition quen thuộc mô tả đúng vòng lặp.
- Tránh dùng khi vòng lặp có control flow phức tạp hoặc nhiều chuyển trạng thái gắn chặt mà algorithm làm khó hiểu.

## 8. Ví dụ đơn giản

Một transform bình phương bốn giá trị, sau đó predicate count tìm các kết quả chẵn. Mỗi lambda chỉ có một biểu thức và size container làm vị trí ghi rõ ràng.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Algorithm truyền đạt ý định duyệt tốt nhất khi lambda nhỏ, ít side effect và tập trung.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra size của input/output range, tính hợp lệ của lambda, aliasing, iterator category và side effect mutation.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của STL algorithms kết hợp generic lambda là gì?
2. Trung bình — Transform tạo dãy nào từ `{1, 2, 3, 4}` và có bao nhiêu kết quả chẵn?
3. Khó — Vì sao phải đặt trước size cho `squares` khi dùng `squares.begin()`, còn `std::back_inserter` sẽ thay đổi yêu cầu đó?
