# Ngày 36 — Variadic templates và parameter packs

## 1. Vấn đề nó giải quyết

Một số thao tác tự nhiên nhận số lượng argument khác kiểu thay đổi ở compile-time. Variadic template gom các argument đó thành parameter pack và pack expansion áp dụng một mẫu cho từng phần tử.

## 2. Kiến thức cần có

- Ngày 5, 34 và 35: template, deduction, recursion hoặc expansion context và số argument compile-time.

## 3. Ý tưởng cốt lõi

Pack là sequence compile-time, không phải container runtime. Dấu ba chấm bung một mẫu cú pháp, còn `sizeof...(pack)` cho biết số phần tử.

## 4. Cú pháp tối thiểu

```cpp
template<class... Values>
void print_all(const Values&... values) {
    int sink[] = {0, ((void)(std::cout << values), 0)...};
}
```

## 5. Cách nó hoạt động

1. Deduction đặt kiểu và value của từng call argument vào template parameter pack cùng function parameter pack tương ứng.
2. Mẫu initializer-list bung một lần cho mỗi value và bảo đảm evaluation từ trái sang phải trong kỹ thuật C++14 này.
3. Một hàm in số nguyên, string literal và floating-point value rồi báo số lượng compile-time là ba.

## 6. Lỗi thường gặp

- Pack không thể đứng một mình ở nơi grammar yêu cầu một expression; nó phải nằm trong expansion context hợp lệ.
- Trước khi áp dụng mẫu, phải kiểm tra dấu ba chấm áp dụng vào đâu, evaluation order, hành vi pack rỗng, forwarding, điểm dừng đệ quy và diagnostic.

## 7. Khi nào nên dùng

- Nên dùng khi số lượng và kiểu argument biết ở compile-time nhưng thay đổi giữa các lời gọi.
- Tránh dùng khi argument là dữ liệu runtime đồng nhất phù hợp lưu trong container hơn.

## 8. Ví dụ đơn giản

Ví dụ bung biểu thức in cho ba value khác kiểu. Dummy array có một phần tử giúp trường hợp zero argument vẫn hợp lệ và sắp thứ tự các side effect.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Parameter pack biểu diễn biến thể compile-time; expansion context quyết định đoạn code nào được lặp.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra dấu ba chấm áp dụng vào đâu, evaluation order, hành vi pack rỗng, forwarding, điểm dừng đệ quy và diagnostic.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Variadic templates và parameter packs là gì?
2. Trung bình — `sizeof...(values)` có giá trị gì với lời gọi ba argument?
3. Khó — Vì sao số không giả ở đầu giữ initializer array hợp lệ ngay cả khi parameter pack rỗng?
