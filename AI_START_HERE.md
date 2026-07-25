# AI handoff: modern-cpp-features

Đọc file này đầu tiên ở mỗi session mới. Mục tiêu là nạp vừa đủ ngữ cảnh,
không đọc toàn repo nếu yêu cầu chưa cần.

## Project trong một câu

Đây là repo học/phỏng vấn kỹ thuật cá nhân: các note C++/Python/CMake là nguồn
nội dung; app Next.js tên **Recall** biến note thành question bank, lịch ôn kiểu
Anki, AI coach, mock interview WorldQuant và code runner cô lập.

## Cách nạp ngữ cảnh ít token

1. Luôn chạy `git status --short --branch` và đọc yêu cầu hiện tại.
2. Đọc đúng **một** file sau theo loại việc:
   - Kiến trúc, tìm file cần sửa: [docs/ai-context/PROJECT_MAP.md](docs/ai-context/PROJECT_MAP.md)
   - Build/test, thêm lesson, DB/env/deploy: [docs/ai-context/DEVELOPMENT.md](docs/ai-context/DEVELOPMENT.md)
   - Branch, số liệu, việc vừa làm, điểm chưa chắc: [docs/ai-context/CURRENT_STATE.md](docs/ai-context/CURRENT_STATE.md)
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

## Khi kết thúc một thay đổi lớn

Cập nhật `CURRENT_STATE.md` nếu branch/feature/blocker thay đổi. Chỉ cập nhật
`PROJECT_MAP.md` hoặc `DEVELOPMENT.md` khi kiến trúc, command hay invariant thật
sự đổi. Giữ các file ngắn; link tới source thay vì chép source.
