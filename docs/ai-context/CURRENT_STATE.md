# Current state

File này chỉ giữ trạng thái semantic không thể sinh chắc chắn từ source. Số liệu
content, route, dependency, migration và fingerprint mới nhất nằm trong
`GENERATED_SNAPSHOT.md`. Branch, HEAD và worktree phải kiểm tra trực tiếp bằng
Git ở đầu mỗi session; không lưu chúng tại đây vì sẽ lỗi thời sau mỗi commit.

## Tính năng gần đây đáng biết

- AI admission reset theo ngày Việt Nam và practice ưu tiên question New.
- Tiêu đề question trong practice tự giảm cỡ chữ theo độ dài; câu ngắn giữ cỡ
  nổi bật, câu dài dùng typography gọn và line-height thoáng hơn.
- Curriculum/guide tick-data và order-book đã có trong C++20.
- Guide `/learn/cmake` có 16 chương target-based, dùng một TickPlatform xuyên
  suốt từ mental model, code generation và CTest tới packaging, CI và migration
  legacy; baseline thực hành là CMake 3.25.
- Mock interview WorldQuant có bộ đề versioned và code runner dùng isolated
  Vercel Sandbox.
- App hỗ trợ deck C++, Python và CMake; số lesson/question hiện hữu xem generated
  snapshot, không suy từ việc deck đã enable.
- Git giữ lesson source; production có pipeline sync derived snapshot và tạo
  DB-native question drafts trong Supabase.

## Giới hạn chưa thể suy ra từ repo

- Không có task spec chỉ vì tên branch trông giống một feature/fix.
- Repo không chứng minh trạng thái deploy Vercel, migration remote đã apply tới
  đâu, `QUESTION_STORE` production, secret hay quota thực tế.
- Phải kiểm tra external environment khi user yêu cầu; không suy đoán từ
  `.env.example`, migration tồn tại hay workflow.

## Task/handoff hiện tại

- Trang CMake là guide độc lập ở `web/src/app/learn/cmake/page.tsx`; mục lục,
  nguồn chính thức và mapping theo JD nằm ở `web/src/lib/learn/cmake-guide.ts`.
- Trang/data/test Tick được giữ nguyên có chủ đích; hai guide chỉ liên kết qua
  navigation, không dùng chung component để tránh refactor ngoài phạm vi.

## Validation gần nhất

- Content check, context refresh/check và `git diff --check`: pass.
- Lint toàn repo và TypeScript `--noEmit`: pass.
- Vitest: 43 test files, 190 tests pass.
- Next.js production build: pass, gồm compile, type-check và 19 generated pages;
  `/learn/cmake` được prerender static.

## Quy tắc cập nhật

Thay nội dung hiện tại, không nối changelog. Chỉ ghi blocker, quyết định, giới
hạn hoặc task dở có ích cho session kế tiếp. Các facts có thể tính từ repo phải
được thêm vào generator thay vì chép tay vào đây.
