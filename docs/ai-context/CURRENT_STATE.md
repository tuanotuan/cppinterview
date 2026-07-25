# Current state

File này chỉ giữ trạng thái semantic không thể sinh chắc chắn từ source. Số liệu
content, route, dependency, migration và fingerprint mới nhất nằm trong
`GENERATED_SNAPSHOT.md`. Branch, HEAD và worktree phải kiểm tra trực tiếp bằng
Git ở đầu mỗi session; không lưu chúng tại đây vì sẽ lỗi thời sau mỗi commit.

## Tính năng gần đây đáng biết

- AI admission reset theo ngày Việt Nam và practice ưu tiên question New.
- Curriculum/guide tick-data và order-book đã có trong C++20.
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

- Hệ thống handoff đã có generator/fingerprint, `context:refresh`,
  `context:check`, CI gate và root `AGENTS.md` buộc duy trì phần semantic.
- PR #58 đang được chẩn đoán vì validation fail. PR validation được tách thành
  từng gate tương đương để xác định chính xác lỗi trước khi sửa.

## Validation gần nhất

- Generator refresh và check mode: pass bằng Deno compatibility runtime.
- Type-check riêng generator: pass với
  `deno check --node-modules-dir=manual scripts/generate-ai-context.ts`.
- `git diff --check`: pass.
- Chưa chạy full `npm run validate` vì shell hiện tại không có `node`/`npm`
  trong `PATH`. CI Node 22 vẫn là validation gate chuẩn sau khi push.

## Quy tắc cập nhật

Thay nội dung hiện tại, không nối changelog. Chỉ ghi blocker, quyết định, giới
hạn hoặc task dở có ích cho session kế tiếp. Các facts có thể tính từ repo phải
được thêm vào generator thay vì chép tay vào đây.
