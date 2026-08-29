# Ngày 9 — Generic lambda

## 1. Vấn đề nó giải quyết

Lambda C++11 thông thường cố định kiểu của từng parameter nên một thao tác nhỏ có thể phải viết nhiều bản. C++14 cho phép parameter dùng `auto`, khiến call operator của lambda hoạt động giống function template.

## 2. Kiến thức cần có

- Ngày 2 và 4: suy luận `auto`, cú pháp lambda, parameter, giá trị trả về và capture.

## 3. Ý tưởng cốt lõi

Hãy hình dung compiler tạo một call operator dạng template ẩn. Mỗi tổ hợp kiểu argument sẽ tạo specialization phù hợp, còn thân lambda chỉ viết một lần.

## 4. Cú pháp tối thiểu

```cpp
auto add = [](auto left, auto right) {
    return left + right;
};
```

## 5. Cách nó hoạt động

1. Gọi lambda bằng số nguyên làm compiler suy ra parameter kiểu nguyên cho lần gọi đó.
2. Lần gọi sau bằng số thực instantiate một specialization khác của call operator và dùng phép toán số thực.
3. Một lambda cộng được cả hai cặp và in kết quả theo kiểu tự nhiên của từng biểu thức cộng.

## 6. Lỗi thường gặp

- Cho rằng hai kiểu bất kỳ đều dùng được là sai: thân lambda vẫn phải hợp lệ với từng tổ hợp argument thật sự được gọi.
- Trước khi áp dụng mẫu, phải kiểm tra kiểu parameter được suy ra, operator khả dụng, phép chuyển đổi và kiểu trả về.

## 7. Khi nào nên dùng

- Nên dùng khi một thao tác cục bộ ngắn giống nhau trên nhiều kiểu tương thích, nhất là trong STL algorithm.
- Tránh dùng khi hợp đồng kiểu cần ghi rõ hoặc lời gọi sai cần thông báo dễ hiểu hơn template chưa có constraint.

## 8. Ví dụ đơn giản

Cùng closure `add` nhận hai số nguyên rồi hai số thực. Type deduction diễn ra riêng cho mỗi lần gọi nên phép toán nguyên và floating-point vẫn tách biệt.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Generic lambda là cú pháp template ngắn cho callable cục bộ, không phải dynamic typing.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra kiểu parameter được suy ra, operator khả dụng, phép chuyển đổi và kiểu trả về.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Generic lambda là gì?
2. Trung bình — Hai parameter được suy ra kiểu gì trong các lời gọi `add(2, 3)` và `add(1.5, 2.0)`?
3. Khó — Nếu một argument là `std::string` và argument kia là `int`, phép `operator+` không hợp lệ gây lỗi ở thời điểm nào?
