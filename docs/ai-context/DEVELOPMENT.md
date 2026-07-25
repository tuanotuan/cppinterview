# Development guide

Chạy command từ `web/` trừ khi ghi khác. Trên PowerShell có thể dùng
`npm.cmd` nếu execution policy chặn `npm.ps1`.

## Thiết lập và command

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
npm run content:refresh
npm run dev
```

Validation:

```powershell
npm run content:check   # manifest có khớp source/registry/question YAML
npm run context:check   # generated AI snapshot có khớp project inputs
npm run lint
npm run typecheck
npm test
npm run build
npm run validate        # toàn bộ gate theo thứ tự trên
```

`content:refresh` có ghi registry/manifest. `content:check`, test, lint,
typecheck và `context:check` là read-only. `content:refresh` cũng refresh
`docs/ai-context/GENERATED_SNAPSHOT.md`. `content:sync`,
`content:generate:db`, migration và deploy có tác động external; không chạy chỉ
để “kiểm tra”.

Sau mọi thay đổi project, chạy:

```powershell
npm run context:refresh
```

Snapshot máy sinh có fingerprint của lesson, content, source/test, scripts,
package metadata, env template, CI và Supabase. CI chặn snapshot cũ. Nếu behavior
hay kiến trúc đổi, vẫn phải cập nhật file context semantic theo `AGENTS.md`;
fingerprint không thể tự giải thích ý nghĩa thay đổi.

## Recipe: sửa/thêm lesson

1. Tạo hoặc sửa `<source-root>/<lesson>/knowledge.md`; cần một `#` title và ít
   nhất một `##` section.
2. Thêm code mẫu đúng ngôn ngữ nếu cần: `main.cpp`, `main.py`, hoặc
   `CMakeLists.txt`.
3. Chạy `npm run content:refresh`, rồi `npm run content:status`.
4. Review diff trong `web/content/lesson-registry.yaml` và
   `web/src/generated/content-manifest.json`.
5. Chạy `npm run validate`.

Source roots được discovery: `cpp98_foundation`, `cpp11`, `cpp20`, `python`,
`cmake`. ID mới được suy ra từ path; nếu collision, đăng ký thủ công. Rename có
thể được nhận ra và giữ ID, nhưng luôn kiểm tra diff.

Trên `main`, CI refresh deterministic files, commit nếu cần, sync snapshot sang
Supabase, rồi enqueue/generate DB-native drafts. Không dùng `content:auto` hay
`content:draft` cho production flow bình thường.

## Recipe: sửa question

- Contract đầy đủ: `web/content/README.md`.
- YAML Git-owned: `web/content/questions/*.yaml`.
- Question mới bắt đầu ở `draft`; `verified` cần review người.
- Approval phải bind đúng `version` và `sourceHash`.
- Sửa nội dung làm tăng version và vô hiệu approval cũ.
- “Delete” ở Admin là archive overlay, không xóa history.
- Production AI drafts nằm ở Supabase immutable revisions, không append vào
  `generated.yaml`.

## Content store modes

| `QUESTION_STORE` | Hành vi |
|---|---|
| `repo` | Đọc generated Git manifest |
| `shadow` | Đọc cả DB để báo mismatch nhưng vẫn serve Git |
| `db` | Serve DB; fail closed nếu DB/schema lỗi |

Chỉ cut over sau khi `/api/admin/content-parity` trả `ok: true`,
`readyForCutover: true` và source revision khớp. Rollback là đổi về `shadow`;
không xóa revision DB.

## Env và secret boundaries

Xem danh sách chuẩn trong `web/.env.example`.

- Public duy nhất: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server app: OpenAI/Gemini keys, admin billing key, project ID, code-runner
  config.
- GitHub Actions only: `SUPABASE_SERVICE_ROLE_KEY` cho content sync/generation.
- Code runner dùng secret Supabase riêng, không tái dùng content-sync key.
- `ALLOWED_GITHUB_LOGIN` mặc định `tuanotuan`; auth/API trả quyền chỉ cho owner.
- Không log secret, không commit `.env.local`, không truyền secret vào sandbox.

App local không có Supabase vẫn chạy local-only. AI/runner/cloud feature cần
config tương ứng và có thể fail closed theo thiết kế.

## Supabase

Migration là append-only, chạy theo timestamp trong `web/supabase/migrations/`.
Đọc `web/supabase/README.md` và migration liên quan trước khi đổi DB.

Các nhóm schema hiện có:

- auth-scoped progress, reviews, Anki state, approvals, overrides;
- AI daily/monthly accounting, provider reconciliation, Gemini usage/settings;
- immutable lesson/question revisions, sync runs, generation jobs;
- multi-language/CMake metadata;
- code execution admission/quota/idempotency.

Không sửa migration đã áp dụng; thêm migration mới. Giữ RLS và RPC
service-role-only/browser grants như contract hiện tại.

## CI

`.github/workflows/web-validate.yml`:

- PR hoặc non-main branch: `npm ci` + `npm run validate`, gồm
  `context:check`.
- Push `main`, schedule mỗi 6 giờ, manual dispatch: refresh + validate; commit
  deterministic content nếu đổi; sync Supabase; generate tối đa một batch DB
  drafts.
- Workflow có `contents: write`; main run không bị cancel giữa chừng.

## Invariants dễ làm hỏng

- Đọc `web/AGENTS.md` trước khi sửa web và đọc docs Next.js cài local cho API
  framework.
- Server-only module/secret không được import vào client component.
- Zod schema là boundary cho manifest, API body và AI structured output.
- Giữ stable IDs, immutable audit history và source/version/hash binding.
- Đừng cho stale/archived/unapproved question vào practice hoặc AI coach.
- OpenAI admission theo ngày Việt Nam; monthly row là accounting/backstop, không
  được khóa nhầm ngày mới.
- Queue ưu tiên question New theo giới hạn trước các review còn lại theo policy
  trong `learning-state.ts`.
- Hidden test/code-runner metadata không lộ ra client hay response.

## Chọn validation theo phạm vi

- Logic thuần một domain: test file liên quan + `npm run typecheck`.
- Content/note/schema: `content:check` + content tests.
- Route/UI/cross-domain: lint + typecheck + tests liên quan.
- Trước handoff/merge: `npm run context:refresh`, rồi `npm run validate`.

Ghi chính xác command nào đã chạy và command nào chưa chạy; không nói “pass”
nếu chỉ suy luận.
