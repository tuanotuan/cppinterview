# AI handoff: modern-cpp-features

Đọc file này đầu tiên ở mỗi session mới. Mục tiêu là nạp vừa đủ ngữ cảnh,
không đọc toàn repo nếu yêu cầu chưa cần.

## Project trong một câu

Đây là repo học/phỏng vấn kỹ thuật cá nhân: note C++/Python là nguồn bài học hiện
có, pipeline hỗ trợ thêm source CMake tùy chọn; app Next.js **Recall** cung cấp
thẻ ghi nhớ, AI coach, lộ trình WorldQuant, guide CMake/tick data và code runner
cô lập.

## Cách nạp ngữ cảnh ít token

1. Luôn chạy `git status --short --branch` và đọc yêu cầu hiện tại.
2. Bắt đầu bằng **một** file phù hợp nhất dưới đây; chỉ đọc thêm khi yêu cầu thật
   sự giao nhau giữa nhiều phạm vi:
   - Kiến trúc, tìm file cần sửa: [docs/ai-context/PROJECT_MAP.md](docs/ai-context/PROJECT_MAP.md)
   - Build/test, thêm lesson, DB/env/deploy: [docs/ai-context/DEVELOPMENT.md](docs/ai-context/DEVELOPMENT.md)
   - Task dở, blocker, giới hạn chưa xác nhận: [docs/ai-context/CURRENT_STATE.md](docs/ai-context/CURRENT_STATE.md)
   - Số liệu máy sinh mới nhất: [docs/ai-context/GENERATED_SNAPSHOT.md](docs/ai-context/GENERATED_SNAPSHOT.md)
3. Chỉ mở source trực tiếp liên quan. Dùng `rg` trước, không quét mọi
   `knowledge.md`, test hay migration.
4. Nếu sửa trong `web/`, bắt buộc đọc `web/AGENTS.md`. Với API/convention
   Next.js, đọc guide tương ứng trong `web/node_modules/next/dist/docs/` vì
   project dùng Next.js 16 có breaking changes.

## Những điều không được suy đoán

- Tên branch không chứng minh yêu cầu đang làm; kiểm tra diff và hỏi/đọc yêu cầu.
- Snapshot trong các file handoff có thể cũ; source, test, Git và migration mới
  hơn luôn thắng.
- `knowledge.md` và code mẫu ở các source root là nguồn chân lý bài học.
  `web/src/generated/content-manifest.json` là file sinh tự động.
- Git giữ lesson source; Supabase có thể phục vụ derived question bank ở
  `QUESTION_STORE=db`. Không chỉnh dữ liệu sinh ra để thay cho chỉnh nguồn.
- Không commit secret. Đặc biệt không đưa service-role/admin/code-runner key vào
  biến `NEXT_PUBLIC_*` hoặc client code.
- Không tự ý chạy migration, sync Supabase, gọi AI sinh draft hay deploy. Đây là
  external mutation; chỉ làm khi yêu cầu thật sự bao gồm hành động đó.

## Prompt ngắn dùng ở session mới

> Đọc `AI_START_HERE.md`, kiểm tra Git hiện tại, rồi xử lý yêu cầu sau: ...

Nếu việc tiếp nối đúng một task dở dang, thêm:

> Đọc thêm `docs/ai-context/CURRENT_STATE.md`; xác minh snapshot bằng Git trước
> khi sửa.

## Khi kết thúc một thay đổi

Đây là luật tự động, không chờ người dùng nhắc. Hễ code, test, lesson, tooling,
cấu hình, schema, migration hoặc CI thay đổi, phải làm theo `AGENTS.md` ngay
trong cùng task: chạy `cd web && npm run context:refresh`, cập nhật file semantic
liên quan, chạy `npm run context:check` và commit generated snapshot cùng thay
đổi. Công việc chưa hoàn tất nếu tài liệu bàn giao chưa khớp code. Giữ các file
ngắn; thay fact cũ và link tới source thay vì chép source.
