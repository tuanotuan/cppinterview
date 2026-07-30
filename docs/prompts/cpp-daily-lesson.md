# Prompt tạo bài học C++ hằng ngày

Thay toàn bộ giá trị trong dấu `[...]` trước khi dùng. Chọn đúng một chế độ đầu
ra:

- `REPOSITORY`: tạo lesson trực tiếp trong `modern-cpp-features`, kiểm tra,
  commit, push feature branch và tạo hoặc cập nhật pull request.
- `DOWNLOAD`: tạo đúng hai tệp độc lập và gửi liên kết tải xuống.

## Prompt

````text
Tôi đang học lộ trình C++ để hướng tới vị trí C++ Tick Data Engineer tại
WorldQuant.

Phiên bản C++: [CHỌN MỘT: C++11 | C++14 | C++17 | C++20 | C++23]
Ngày học: [SỐ NGUYÊN DƯƠNG]
Chủ đề hôm nay: [CHỦ ĐỀ]
Các chủ đề đã học trước đó: [DANH SÁCH NGẮN THEO THỨ TỰ]
Chế độ đầu ra: [REPOSITORY | DOWNLOAD]
Thư mục gốc trong repo nếu dùng REPOSITORY: [VÍ DỤ: cpp11]

## 1. Nguồn bắt buộc

Trước khi giảng:

1. Kết nối Google Drive và mở đúng thư mục `SimplifyCPP_Books`.
2. Tìm sách, chương và mục liên quan trực tiếp đến chủ đề hôm nay.
3. Dùng nội dung tìm được làm nguồn chính; diễn giải lại, không chép đoạn dài.
4. Ghi tên sách và chương/mục đã dùng ở cuối câu trả lời.
5. Nếu không truy cập được thư mục, không tìm thấy nguồn phù hợp hoặc không xác
   minh được nội dung, hãy nói rõ đang bị chặn. Không tự bịa nguồn hoặc giả vờ
   đã đọc sách.

## 2. Bài giảng trong câu trả lời

Giảng bằng tiếng Việt cho người mới học, theo đúng thứ tự:

1. Kiến thức nào của những ngày trước cần dùng?
2. Chủ đề này giải quyết vấn đề gì?
3. Mô hình tư duy (mental model) đơn giản là gì?
4. Cú pháp tối thiểu cần nhớ là gì?
5. Chương trình hoạt động từng bước như thế nào?
6. Dùng sai dễ gây lỗi, undefined behavior hoặc vấn đề hiệu năng ở đâu?
7. Khi nào nên dùng và khi nào không nên dùng?
8. Chủ đề này xuất hiện thế nào trong tick data, trade, quote, order hoặc order
   book?
9. Ba câu hỏi tự kiểm tra.
10. Một bài tập nhỏ có đầu vào và kết quả mong đợi rõ ràng.

Yêu cầu giảng dạy:

- Dùng từ đơn giản; giải thích thuật ngữ ở lần xuất hiện đầu tiên.
- Kiến thức cũ phải thật sự hỗ trợ chủ đề hôm nay.
- Không dùng kiến thức thuộc ngày sau, trừ khi bắt buộc để chương trình đúng.
- Nếu bắt buộc nhắc kiến thức mới hơn, chỉ giải thích phần tối thiểu và đánh dấu
  rõ là kiến thức xem trước.
- Nếu chủ đề lớn, chỉ dạy phần cốt lõi có thể hoàn thành trong một ngày.
- Không biến ví dụ đơn giản thành hệ thống trading phức tạp.

## 3. Hai tệp bài học

Tạo đúng hai tệp bài học thật; không dùng code block trong chat để thay cho tệp.
Tạo một `topic_slug` bằng chữ ASCII thường và dấu gạch dưới, không có khoảng
trắng, dấu `*`, dấu ngoặc hoặc ký tự tiếng Việt.

Nếu `Chế độ đầu ra = DOWNLOAD`:

- `day_[SỐ NGÀY]_[topic_slug].cpp`
- `day_[SỐ NGÀY]_[topic_slug].md`

Nếu `Chế độ đầu ra = REPOSITORY`:

- Đọc `AI_START_HERE.md` và các `AGENTS.md` áp dụng trước khi sửa.
- Kiểm tra Git và giữ nguyên mọi thay đổi không liên quan của người dùng.
- Tạo thư mục
  `[THƯ MỤC GỐC]/[SỐ NGÀY]_[topic_slug]/`.
- Hai tệp bài học phải là `main.cpp` và `knowledge.md`.
- Không đồng thời tạo thêm bản `day_*.cpp` hoặc `day_*.md`.
- Registry, manifest và handoff là tệp sinh ra hoặc tệp quản lý project; chúng
  được phép thay đổi ngoài hai tệp bài học.

## 4. Contract của tệp C++

Tệp C++ phải:

- là một chương trình hoàn chỉnh, tự chạy được;
- chỉ minh họa chủ đề hôm nay;
- dùng ví dụ trading đơn giản với Tick, Trade, Quote, Order, Price hoặc Volume;
- không dùng thư viện ngoài;
- không có nhiều class hoặc abstraction không cần thiết;
- dài khoảng 30–70 dòng;
- có comment ngắn ở những dòng quan trọng;
- dùng dữ liệu đầu vào cố định và kết quả đầu ra dễ kiểm tra; và
- không dùng tính năng mới hơn phiên bản C++ đã chọn.

## 5. Contract bắt buộc của tệp Markdown

Tệp Markdown phải là UTF-8, viết bằng tiếng Anh đơn giản và dài khoảng 300–500
từ. Dòng đầu tiên phải là đúng một heading cấp 1. Mọi phần chính phải là heading
cấp 2 có số thứ tự. Không được viết tiêu đề phần như một dòng văn bản thường.

Dùng chính xác skeleton sau:

~~~markdown
# Day [SỐ NGÀY] — [ENGLISH TOPIC TITLE]

## 1. Problem It Solves

[One or two short paragraphs.]

## 2. Prerequisites

- [Only knowledge from earlier days.]

## 3. Core Idea

[A simple mental model.]

## 4. Minimal Syntax

```cpp
// Only the smallest syntax fragment needed for this topic.
```

## 5. How It Works

1. [Step one.]
2. [Step two.]
3. [Step three.]

## 6. Common Mistakes

- [Concrete mistake and consequence.]

## 7. When to Use It

- Use it when [...]
- Avoid it when [...]

## 8. Trading Use Case

[One simple tick, trade, quote, order, price, volume, or order-book example.]

## 9. Key Takeaways

- [Three to five concise points.]

## 10. Self-Check Questions

1. [Question one?]
2. [Question two?]
3. [Question three?]

## 11. Small Exercise

[A small task with fixed input and an expected result.]
~~~

Quy tắc Markdown:

- Có đúng một dòng trống sau mỗi heading và trước/sau list hoặc fenced code.
- Dùng `-` cho bullet và `1.` cho danh sách có thứ tự.
- Đặt tên kiểu, hàm, biến, keyword và đoạn syntax ngắn trong backtick.
- Fenced code phải ghi ngôn ngữ `cpp` và phải đóng fence.
- Không dùng HTML, heading bị bỏ cấp, heading in đậm thay cho `#`/`##`, hoặc
  heading không có ký hiệu Markdown.
- Không chép toàn bộ chương trình từ tệp `.cpp` vào Markdown.
- Không thêm lời chào, báo cáo compile, link tải hay ghi chú ngoài bài học vào
  bên trong tệp Markdown.
- Trước khi hoàn tất, tự kiểm tra rằng parser Markdown sẽ nhận được một H1 và
  đúng 11 H2 như skeleton.

## 6. Kiểm tra bắt buộc

1. Chạy `[COMPILER] --version` và ghi lại compiler thực tế.
2. Compile bằng standard đúng với phiên bản đã chọn, cùng `-Wall -Wextra
   -Wpedantic`.
3. Chạy chương trình và kiểm tra output với dữ liệu cố định.
4. Sửa mọi compiler warning có thể sửa.
5. Nếu compiler không hỗ trợ tính năng, nói rõ và không tuyên bố đã compile
   thành công.
6. Kiểm tra lại tệp Markdown theo toàn bộ contract ở trên.

Nếu dùng `REPOSITORY`, tiếp tục:

1. Chạy `npm run content:refresh` từ `web/`.
2. Kiểm tra ID, thứ tự, tag và prerequisite trong registry/manifest; sửa
   prerequisite nếu discovery không thể suy ra đúng.
3. Cập nhật handoff semantic liên quan.
4. Chạy `npm run context:check` và `npm run validate`.
5. Commit vào feature branch hiện tại, push branch và tạo hoặc cập nhật pull
   request vào `main`. Không push trực tiếp lên `main`.
6. Nếu pull request cũ đã merge hoặc đóng, tạo pull request mới chỉ chứa commit
   mới.
7. Không chạy Supabase sync, migration, deploy hoặc AI content generation.

## 7. Câu trả lời cuối

Nêu ngắn gọn:

- sách và chương/mục đã dùng;
- compiler và câu lệnh compile chính xác;
- kết quả chạy chương trình;
- kết quả kiểm tra Markdown;
- kết quả validation;
- commit và pull request nếu dùng `REPOSITORY`; hoặc
- hai link tải trực tiếp nếu dùng `DOWNLOAD`.

Không tuyên bố thành công cho bước nào chưa thật sự chạy.
````
