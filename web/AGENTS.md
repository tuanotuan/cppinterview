<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Ngôn ngữ giao diện

- Nội dung người dùng nhìn thấy phải dùng “bạn” hoặc câu trung tính; không dùng
  “mày”, “tao” hay cách xưng hô suồng sã tương tự.
- Ưu tiên tiếng Việt tự nhiên. Chỉ giữ thuật ngữ tiếng Anh khi đó là tên riêng,
  từ kỹ thuật rất phổ biến hoặc không có cách dịch ngắn và chính xác; giải thích
  bằng tiếng Việt ở lần xuất hiện đầu tiên nếu người dùng có thể chưa quen.
- Không dịch tên riêng hoặc tên sản phẩm, dịch vụ bên ngoài như Recall,
  WorldQuant, OpenAI, Gemini và Supabase. Không đổi cú pháp hoặc định danh trong
  mã nguồn, lệnh, route, khóa lưu trữ, trường schema, enum hay thuật ngữ chuẩn
  như C++, CMake, API, CI/CD và Git.
- Bài luyện giao tiếp có chủ đích yêu cầu trả lời bằng tiếng Anh được giữ đề
  tiếng Anh; phần chỉ dẫn và ngữ cảnh xung quanh vẫn dùng tiếng Việt.
- Dùng nhãn tiếng Việt nhất quán cho khái niệm sản phẩm: “Trung tâm chuẩn bị”,
  “Chế độ hướng dẫn”, “Phiên ôn tập trọng tâm”, “Nhiệm vụ”, “phỏng vấn thử”,
  “điểm cần cải thiện”, “tiêu chí chấm”, “bài kiểm tra xác nhận”, “phản hồi”,
  “Trợ giúp” và “Làm lại”. Khi thêm giao diện hoặc lời nhắc AI mới, cập nhật
  kiểm thử ngôn ngữ nếu xuất hiện một cách gọi cần được ngăn tái diễn.
