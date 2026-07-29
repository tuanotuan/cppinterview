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

## Ngôn ngữ sản phẩm

Nội dung người dùng nhìn thấy, thông báo lỗi từ API và lời nhắc tạo phản hồi AI
phải dùng “bạn” hoặc câu trung tính. Ưu tiên tiếng Việt tự nhiên; chỉ giữ tên
riêng, mã nguồn và thuật ngữ kỹ thuật phổ biến hoặc không có cách dịch chính xác.
Không dịch route, khóa lưu trữ, trường schema hay giá trị enum. Quy ước chi tiết
nằm trong `web/AGENTS.md`.

`src/lib/content/user-facing-language.test.ts` quét giao diện, lời nhắc và học
liệu để ngăn cách xưng hô “mày/tao”; riêng danh sách nhãn sản phẩm cũ được quét
trong các tệp giao diện `.tsx`. Khi thêm một nhãn khó hiểu mới, mở rộng kiểm thử
này. Không sửa máy móc câu hỏi đã duyệt: thay đổi nội dung câu hỏi phải tuân theo
quy tắc tăng phiên bản, `sourceHash` và duyệt lại ở phần dưới.

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
- Có thể thêm tranche Git-owned đã viết/review nguồn thủ công, nhưng vẫn phải để
  `draft`; không dùng cách này để giả lập production AI generation.
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
- Code runner và Mock v4 history dùng hai secret Supabase riêng
  (`CODE_RUNNER_SUPABASE_SECRET_KEY`, `MOCK_HISTORY_SUPABASE_SECRET_KEY`);
  không tái dùng content-sync key hay dùng chung với nhau.
- `ALLOWED_GITHUB_LOGIN` mặc định `tuanotuan`; auth/API trả quyền chỉ cho owner.
- Không log secret, không commit `.env.local`, không truyền secret vào sandbox.

App local không có Supabase vẫn chạy local-only. AI/runner/cloud feature cần
config tương ứng và có thể fail closed theo thiết kế.

## WorldQuant training state và browser privacy

Các feature Curriculum/Drill/Mission/Full Round không thêm migration:

- `worldquant/training-state.ts` và `practice/repair-queue.ts` dùng key
  localStorage versioned, tách `account UUID`/`local`; state local không tự gán
  sang account sau login. Training state hiện dùng schema/key v2; nếu khóa v2
  chưa tồn tại, đường đọc sao chép hợp lệ từ khóa v1 sang v2 đúng một chiều,
  không xóa hay ghi lại v1. Khi v2 đã tồn tại, mọi thay đổi tiếp theo ở khóa v1
  bị bỏ qua để tab ứng dụng cũ không thể ghi đè lịch sử mới.
- Mutation read-modify-write dùng Web Locks theo exact storage key khi browser
  hỗ trợ; fallback vẫn reread/merge ngay trước write nhưng không thể cam kết
  atomic giữa hai tab trên browser không có Web Locks. Vì vậy checkpoint exposure
  trên browser thiếu Web Locks bị phân loại bảo thủ là repeat, không được dùng
  làm bằng chứng unseen.
- Mission snapshot tách theo account/local, ngày Việt Nam, role và budget; chỉ
  giữ identity/version/hash, drill revision và repair ID. Snapshot stale phải
  fail closed rồi rebuild, không được giữ card revision/competency cũ hoặc
  `content_gap` trái với canonical approved content hiện tại. Personal remediation
  có thể cùng tồn tại với canonical gap và vẫn phải round-trip. Snapshot chứa
  mock cũng phải rebuild khi account/history backend không đủ capability lưu
  completion bền vững. Mỗi account chỉ giữ tối đa 24 key snapshot v2; prune
  không được chạm key account/namespace khác hoặc key v1. Snapshot v1 không được
  di chuyển vì kế hoạch có thể chứa revision cũ; đường đọc phải bỏ qua và dựng
  lại bản v2 từ dữ liệu hiện hành.
- Guided onboarding là UI state versioned riêng theo `account UUID`/`local`,
  không phải learning evidence. Return từ Focus/Drill/Mock chỉ dùng allowlisted
  marker + role + budget 15 phút hợp lệ để dựng lại `/worldquant/mission`; không
  nhận hoặc chuyển tiếp return URL tùy ý.
- Drill/full-round answer không được ghi vào training state. Practice study
  session lưu draft answer cùng cờ hint/reveal/coach trong browser; cờ hỗ trợ là
  irreversible trong attempt chưa rate và sống qua navigation/reload, chỉ rating
  mới kết thúc và xóa cờ của exact card đó. Practice không thu thập confidence.
- Full Round không lưu/upload audio. Transcript chỉ ở React memory và bị xóa
  sau khi summary đã lưu; write fail phải giữ response trong tab để retry. Web
  Speech do browser/OS cung cấp, có thể dùng dịch vụ của vendor. Timer dùng deadline
  tuyệt đối và khóa mutator khi hết giờ; voice metrics loại text gõ tay và chỉ tính
  thời gian microphone thực. Summary bind exact role/full-round/round/drill revision.
- Danh mục bài luyện v2 chỉ viết lại câu chữ của v1; cấu trúc bài và tiêu chí
  chấm không đổi. Lượt làm, lần mở bài kiểm tra và kết quả vòng phỏng vấn v1 vẫn
  được giữ làm lịch sử, nhưng chỉ phiên bản hiện hành được phép cập nhật điểm
  cần cải thiện, xác nhận năng lực hoặc ghi một lượt hoàn thành mới. Mọi phiên
  bản sau chỉ được coi là tương đương khi được thêm rõ ràng vào nhóm tương đương;
  không tự suy ra chỉ vì ID và số tiêu chí giống nhau.
- Bộ đọc phiên phỏng vấn cũ chỉ chấp nhận phiên đã hoàn tất có báo cáo. Hồ sơ
  bản 3 được giữ để Hub hiển thị lịch sử, nhưng parser phiên đang hoạt động vẫn
  yêu cầu đúng hồ sơ hiện hành và không được khôi phục phiên bản cũ.
- `ts-fsrs` dùng default FSRS-6 deterministic, retention 90%, fuzz tắt, chỉ
  replay exact question version/source hash trong Stats. Scheduler hiện hữu vẫn
  là nguồn due date duy nhất.

## Supabase

Migration là append-only, chạy theo timestamp trong `web/supabase/migrations/`.
Đọc `web/supabase/README.md` và migration liên quan trước khi đổi DB.

Các nhóm schema hiện có:

- auth-scoped progress, reviews, Anki state, approvals, overrides;
- AI daily/monthly accounting, provider reconciliation, Gemini usage/settings;
- immutable lesson/question revisions, sync runs, generation jobs;
- multi-language/CMake metadata;
- code execution admission/quota/idempotency.
- account-scoped Mock v4 history, report lease/cache và owner delete.
- owner-private Mistake Inbox, observation dedupe và grounded remediation drafts.
- coach attempt cho phép `candidate_answer` rỗng (nghĩa là chưa biết) và không có
  product-level character limit sau migration `20260730120000`.

Không sửa migration đã áp dụng; thêm migration mới. Giữ RLS và RPC
service-role-only/browser grants như contract hiện tại.

## CI

`.github/workflows/web-validate.yml`:

- Cả hai job dùng Node.js 22 và `npm ci`.
- PR hoặc non-main branch: chạy riêng các gate tương đương `npm run validate`
  để CI chú thích lỗi rõ hơn, gồm `content:check`, `context:check`, lint,
  typecheck, test và build.
- Push `main`, schedule mỗi 6 giờ, manual dispatch: refresh + các gate tương
  đương validate; commit deterministic content nếu đổi; sync Supabase; xử lý
  tối đa 8 công việc tạo câu hỏi DB-native mỗi lượt.
- Workflow có `contents: write`; main run không bị cancel giữa chừng.

## Invariants dễ làm hỏng

- Đọc `web/AGENTS.md` trước khi sửa web và đọc docs Next.js cài local cho API
  framework.
- Server-only module/secret không được import vào client component.
- Zod schema là boundary cho manifest, API body và AI structured output.
- Giữ stable IDs, immutable audit history và source/version/hash binding.
- Chỉ khai báo hai phiên bản danh mục bài luyện tương đương khi ID, loại bài,
  năng lực, khái niệm, cấu trúc tiêu chí và ý nghĩa chấm đều không đổi. Quan hệ
  bản 1 ↔ bản 2 được khai báo thủ công vì bản 2 chỉ bản địa hóa; phiên bản sau
  mặc định không tương đương. Bộ đọc có thể giữ lịch sử tương đương, nhưng lượt
  hoàn tất và bằng chứng cập nhật điểm cần cải thiện mới luôn phải khớp đúng bản
  hiện hành; một vòng phỏng vấn không được trộn phiên bản.
- Khi sửa `WORLDQUANT_ROLE_QUESTIONS`, tăng cả `version` và
  `contentRevision`; tăng `specRevision` nếu quy ước chạy mã thay đổi. Không tái
  sử dụng định danh nội dung cũ cho câu hỏi đã đổi.
- Đừng cho stale/archived/unapproved question vào practice hoặc AI coach.
- Focus Sprint chỉ persist exact question identity/version/hash/deck, không
  prompt/answer; chỉ reconcile với approved bank. Rating vẫn phải đi qua
  scheduler/cloud path chuẩn trước khi tiến session, và mọi local session write
  phải kiểm tra đúng revision để tab cũ không ghi đè queue mới.
- OpenAI admission theo ngày Việt Nam; monthly row là accounting/backstop, không
  được khóa nhầm ngày mới.
- Daily web allowance chỉ dùng cost do interactive coach/report finalization
  ghi lại. Costs API là toàn project và có background generation, nên chỉ dùng
  cho project/monthly accounting; không đưa nó vào phần trăm hay admission web.
- Queue ưu tiên question New theo giới hạn trước các review còn lại theo policy
  trong `learning-state.ts`.
- Hidden test/code-runner metadata không lộ ra client hay response.
- Mock v4 phải reserve durable history trước hidden runner/paid AI. Retry dùng
  frozen submission; chỉ token hiện hành được release/abort lease. Không chạy
  lại paid AI chỉ để khắc phục một completion response bất định.
- Mistake capture chỉ chạy sau durable coach/review hoặc completed Mock v4.
  Generated remediation luôn là DB-native draft chờ duyệt; không lưu candidate
  answer/hidden execution evidence và không tính card cá nhân vào content coverage.
- Same-session repair phải bind exact question version/source hash. Review đầu
  vẫn qua scheduler/cloud path; repair retry không tạo daily review thứ hai.
- Blank AI Coach attempt phải vào Rescue và khóa rating kể cả khi đáp án tham
  khảo đã mở. Chỉ current nonblank feedback hoặc reveal ngoài Rescue/Retry mới
  mở rating. CTA Retry phải xóa attempt/idempotency/follow-up cũ; kết quả retry
  chỉ hoàn tất qua `rateCurrent` để scheduler, Mistake capture và khoảng cách
  Recall Repair 3/5 thẻ không bị tách đôi hoặc duplicate.
- Async AI response phải bind request/session hiện hành; response của card cũ
  không được tái tạo feedback cho attempt mới.
- Gap chỉ được `verified` bởi checkpoint clean đạt ≥80%, đủ hai follow-up và
  không dùng hint sau khi practice đã `transfer_ready`. Exposure phải được ghi
  ngay trước khi prompt mở; bằng chứng hợp lệ là checkpoint unseen hoặc clean
  spaced retest sau tối thiểu 24 giờ. Catalog giữ hai checkpoint khác nhau mỗi
  competency; Full Round không tái sử dụng chúng. Evidence cũ không được ghi đè
  state mới hơn; `not_assessed` không mở/verify gap.
- Collision exposure của hai tab phải fail closed thành repeat. Mission chỉ báo
  `content_gap` khi không có approved card cho competency; card mature/chưa đến
  hạn hoặc không vừa budget không phải content gap. `content_gap` không phải
  actionable item và không được làm UI báo Mission đã hoàn tất.
- Personal remediation, drill và draft không được tính thay approved card trong
  content coverage.

## Chọn validation theo phạm vi

- Logic thuần một domain: test file liên quan + `npm run typecheck`.
- Content/note/schema: `content:check` + content tests.
- Route/UI/cross-domain: lint + typecheck + tests liên quan.
- Trước handoff/merge: `npm run context:refresh`, rồi `npm run validate`.

Ghi chính xác command nào đã chạy và command nào chưa chạy; không nói “pass”
nếu chỉ suy luận.
