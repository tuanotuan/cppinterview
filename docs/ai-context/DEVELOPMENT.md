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
Chỉ lesson đã đăng ký và được manifest tham chiếu mới thuộc fingerprint; thư
mục nháp chưa đăng ký không được làm snapshot của project đã commit lệch theo
file local. Chạy `content:refresh` để đăng ký lesson sẵn sàng đưa vào sản phẩm,
rồi refresh context.

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

Có thể bắt đầu từ prompt dùng lại
[`docs/prompts/cpp-daily-lesson.md`](../prompts/cpp-daily-lesson.md): dán prompt
vào GPT Web để tra nguồn trong Google Drive và nhận đúng hai tệp bài học tải
xuống với contract H1/H2 bắt buộc. Đưa hai tệp đó vào source lesson là bước riêng
và vẫn phải làm theo recipe dưới đây.

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
- Điều khiển sửa/xóa trên thẻ đang học chỉ hiện với GitHub provider identity
  `tuanotuan`; API question mutation phải kiểm tra lại identity này ở server.
  Sau khi sửa, revision cũ phải rời phiên học và bản mới trở về hàng chờ duyệt.
- Khi xóa lesson, câu hỏi của lesson được lưu trữ trong YAML để giữ lịch sử nhưng
  không còn xuất hiện trong generated manifest; DB sync lưu trữ câu hỏi vắng mặt.
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
- Production nên cấu hình `ALLOWED_SUPABASE_USER_ID` bằng danh sách UUID
  Supabase Auth bất biến, phân tách bằng dấu phẩy. `ALLOWED_GITHUB_LOGIN` mặc
  định trống và chỉ là phương án dự phòng chủ động bật; giá trị này chỉ được so
  với GitHub OAuth identity, không tin `user_metadata` do người dùng tự sửa.
- Khi không cấu hình Supabase, route AI chỉ được chạy không tính quota nếu
  `NODE_ENV=development` và `ALLOW_UNMETERED_LOCAL_AI=true`; production và test
  luôn bỏ qua cờ này rồi từ chối theo hướng an toàn.
- OpenAI routing cố định: Luna phục vụ AI Coach (chấm, hỏi tiếp/đào sâu),
  flashcard sửa lỗi và sinh nội dung; Terra chỉ phục vụ tổng kết phỏng vấn thử
  với reasoning `high`. Reservation quota phải dùng đúng tier gọi provider.
- Không log secret, không commit `.env.local`, không truyền secret vào sandbox.

App local không có Supabase vẫn chạy local-only. AI/runner/cloud feature cần
config tương ứng và có thể fail closed theo thiết kế.

## Browser state và privacy

Trạng thái trình duyệt không thêm migration:

- Progress, study session, Focus session, saved item/AI answer, Hub preference,
  Guided onboarding, WorldQuant training state và Mission snapshot đều dùng
  namespace theo `account UUID`/`local`. Không đọc hoặc tự nhận dữ liệu legacy
  không có chủ sở hữu; đăng nhập hay đổi tài khoản không được mang state của
  local/tài khoản cũ sang tài khoản mới.
- `worldquant/training-state.ts` và `practice/repair-queue.ts` dùng key
  localStorage versioned, tách `account UUID`/`local`; state local không tự gán
  sang account sau login. Training state hiện dùng schema/key v2; nếu khóa v2
  chưa tồn tại, đường đọc sao chép hợp lệ từ khóa v1 sang v2 đúng một chiều,
  không xóa hay ghi lại v1. Khi v2 đã tồn tại, mọi thay đổi tiếp theo ở khóa v1
  bị bỏ qua để tab ứng dụng cũ không thể ghi đè lịch sử mới.
- Training state, Mission snapshot, repair queue, practice progress và Focus CAS
  dùng Web Locks theo exact storage key khi browser hỗ trợ. Practice chỉ tính
  lịch và chấp nhận lượt rating đầu tiên của một câu/ngày bên trong cùng lock;
  Focus resume đọc lại snapshot mới nhất trong lock trước khi ghi. Mock report
  và mọi transition của phiên Mock v4 dùng CAS revision dưới exact account key;
  session sai owner bị bỏ. Answer intent được rebase lên revision mới nhất của
  đúng session/status để nhập nhanh cùng tab không mất ký tự, còn freeze/complete/
  reset giữ CAS nghiêm ngặt. Fallback vẫn reread/merge ngay trước write nhưng
  không thể cam kết atomic giữa hai tab trên browser không có Web Locks. Vì vậy
  checkpoint exposure trên browser thiếu Web Locks bị phân loại bảo thủ là
  repeat, không được dùng làm bằng chứng unseen.
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
- Hub chỉ đọc phiên v4 theo account hoặc lịch sử v4 từ máy chủ; không đọc khóa
  v3 dùng chung. Parser legacy chỉ còn là compatibility boundary, không được
  dùng để khôi phục phiên cũ đang làm dở hay đưa dữ liệu không có owner vào Hub.
- `ts-fsrs` dùng default FSRS-6 deterministic, retention 90%, fuzz tắt, chỉ
  replay exact question version/source hash trong Stats. Scheduler hiện hữu vẫn
  là nguồn due date duy nhất.
- WorldQuant training state ghi local trước, sau đó hợp nhất cloud theo revision
  CAS khi account đã đăng nhập. Mission snapshot cloud ưu tiên bản đã tồn tại
  theo exact ngày/vị trí/thời lượng để giữ kế hoạch ổn định giữa thiết bị. Lỗi
  mạng, 401/403 hoặc migration chưa chạy không được xóa local state. Không tự
  upload namespace `local` vào account sau login.

## Supabase

Migration là append-only, chạy theo timestamp trong `web/supabase/migrations/`.
Đọc `web/supabase/README.md` và migration liên quan trước khi đổi DB.

Các nhóm schema hiện có:

- auth-scoped progress, reviews, Anki state, approvals, overrides;
- AI daily/monthly accounting, provider reconciliation, Gemini usage/settings
  và reservation ledger UUID cho từng lượt OpenAI;
- immutable lesson/question revisions, sync runs, generation jobs;
- multi-language/CMake metadata;
- code execution admission/quota/idempotency.
- account-scoped Mock v4 history, report lease/cache và owner delete.
- owner-private Mistake Inbox, observation dedupe và grounded remediation drafts.
- WorldQuant training state và Mission snapshot account-scoped, chỉ đọc trực tiếp
  qua RLS; ghi chỉ qua RPC `save_worldquant_*` security-definer có `auth.uid()`,
  advisory lock và expected revision. Mission cloud giữ tối đa 24 snapshot mỗi user.
- coach attempt cho phép `candidate_answer` rỗng (nghĩa là chưa biết) và không có
  product-level character limit sau migration `20260730120000`.
- Coach evaluation có reservation account-scoped theo request fingerprint,
  canonical idempotency key và lease sau migration `20260730130000`; xóa attempt
  cũng xóa cache reservation liên quan.
- Migration `20260730140000` dùng retry protocol v3 cho Mistake: lease hết hạn
  trước marker provider được thu hồi và claim lại, còn lease đã marker hoặc kết
  quả provider/completion không xác định chuyển `dead_letter`. Trigger chặn
  materialize draft nếu chưa có marker. Migration `20260730150000` thay thân hàm
  backfill content legacy bằng lỗi SQLSTATE `55000`, thu hồi mọi role và bỏ các
  lệnh `content:backfill:*`; luồng hiện hành là `content:sync`.
- Migration `20260730160000` thêm cache/ambiguity barrier cho Coach follow-up.
  Coach evaluation/follow-up xóa lease hết hạn chưa dispatch để thử lại, nhưng
  terminalize lease đã dispatch. `20260730170000` áp dụng cùng nguyên tắc cho
  Mock report. `20260730190000` thêm sổ hạn mức theo reservation UUID, marker
  `dispatched`, transition idempotent và thu hồi mọi overload
  reserve/finalize/release tổng hợp cũ. RPC giới hạn mỗi reservation 500.000
  micros, daily limit do caller truyền 4.000.000 micros, 256 row/account/ngày
  Việt Nam, actual 4.000.000 micros, mỗi token counter 10.000.000 và model 200
  byte. `20260730200000` khóa theo account/question để rating đầu tiên mỗi ngày
  với đúng version/hash thắng nguyên tử; daily row của nội dung cũ được thay,
  còn review offline cũ hơn state máy chủ chỉ bổ sung lịch sử mà không ghi lùi
  lịch học. Reset tạo UUID generation mới; review chỉ được nhận khi token tại
  thời điểm tạo khớp generation hiện hành. Token tồn tại suốt generation và chỉ
  đổi ở lần reset tiếp theo; review, response đồng bộ và repair queue đều giữ
  token đó. Vì vậy stale tab không phục hồi lịch sử, còn reset và học lại cùng
  ngày vẫn hợp lệ. `20260730220000` backfill generation hiện hữu, khóa reset
  chung advisory lock và gỡ overload RPC năm tham số dùng trong giai đoạn mở
  rộng.
- `20260730210000` là retry protocol v2 cho content generation. Worker phải
  preflight đúng protocol trước khi claim và đánh dấu exact lease ngay trước
  mỗi OpenAI/Gemini request. Chỉ 429 đã nhận chắc chắn được tự động retry; lease
  đã dispatch mà hết hạn hoặc gặp kết quả mơ hồ phải terminalize để tránh gọi
  provider lần hai. Enqueue/claim/completion/retry dùng chung global advisory
  lock; ba bước điều phối còn khóa thêm theo lesson/source để serialize mọi
  generator version. Question đúng source đã materialize sẽ đóng queue còn lại.
  Sibling khác version đang chờ/chạy hoặc có kết quả provider chưa xác định làm
  claim trả `generation_history_conflict` trước khi gọi AI. Admin phải đóng rõ
  row obsolete; `pending` chỉ được đóng khi version khác bộ sinh hiện hành, còn
  outcome mơ hồ vẫn cần xác nhận chi phí trùng và lưu audit. Nếu queue chưa có
  exact version hiện hành, worker trả `generator_version_mismatch` và yêu cầu
  chạy `content:sync`.

Không sửa migration đã áp dụng; thêm migration mới. Giữ RLS và RPC
service-role-only/browser grants như contract hiện tại.

## CI

`.github/workflows/web-validate.yml`:

- Cả hai job dùng Node.js 22 và `npm ci`.
- PR hoặc non-main branch: chạy riêng các gate tương đương `npm run validate`
  để CI chú thích lỗi rõ hơn, gồm `content:check`, `context:check`, lint,
  typecheck, test và build.
- Push `main`, schedule mỗi 6 giờ và manual dispatch trên `main`: refresh + các
  gate tương đương validate; commit deterministic content nếu đổi; sync
  Supabase; xử lý tối đa 8 công việc tạo câu hỏi DB-native mỗi lượt.
- Manual dispatch trên nhánh khác chỉ chạy validation. Mọi job có thể commit,
  push, sync Supabase hoặc tạo câu hỏi DB-native phải được khóa bằng
  `github.ref == 'refs/heads/main'`.
- Workflow mặc định chỉ có `contents: read`; riêng job refresh trên `main` mới có
  `contents: write`. Main run không bị cancel giữa chừng.

## Invariants dễ làm hỏng

- Đọc `web/AGENTS.md` trước khi sửa web và đọc docs Next.js cài local cho API
  framework.
- Server-only module/secret không được import vào client component.
- Không dùng `window.alert`, `window.confirm` hoặc `window.prompt` cho luồng sản
  phẩm. Xác nhận thao tác phá hủy/rủi ro phải dùng confirmation sheet theo style
  Recall, có mô tả hậu quả, đường hủy rõ ràng và khóa nút khi đang xử lý; dữ liệu
  người dùng cần nhập phải dùng form dialog trong UI.
- Điều hướng mobile dùng `RecallMobileNav` ở layout và phải chừa bottom safe
  space cho nội dung. Không hiện navigation này trong mock/full-round để người
  học có trải nghiệm phỏng vấn tập trung, không lộ đường tắt hay hint.
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
  phải kiểm tra đúng revision dưới Focus lock; resume phải reread snapshot trong
  lock để tab cũ không ghi đè queue mới.
- Practice progress dùng key `account UUID`/`local`:v2. Rating tính transition
  từ progress vừa reread trong Web Lock, giữ lượt đầu tiên của exact
  question/ngày/phiên bản nội dung và chỉ enqueue repair cho lượt thắng. RPC
  `record_practice_review` dùng advisory lock account/question, thay daily row
  stale nếu nội dung vừa đổi, giữ review offline cũ hơn dưới dạng history-only và
  trả rating thẩm quyền. Review archive, sai version/hash hoặc transition thiếu
  trường không được đưa vào batch sync.
- OpenAI admission theo ngày Việt Nam. Mỗi request tạo reservation UUID trước
  RPC đầu tiên, ghi marker `dispatched` cho cả reservation ứng dụng
  (Coach/Mock/Mistake) và ledger hạn mức ngay trước provider, rồi chỉ
  finalize/release đúng UUID/lease đó; monthly row là accounting/backstop, không
  được khóa nhầm ngày mới.
- OpenAI/Gemini transport retry phải để `0` cho request trả phí. Lỗi cấu hình hoặc
  lỗi 4xx xác định trước/sau dispatch theo classifier hiện hành mới được release
  reservation; timeout, mất mạng, 408, 5xx hoặc parse response thất bại là kết
  quả mơ hồ: finalize budget bảo thủ và terminalize application reservation để
  request sau không gọi AI lần hai. RPC ledger được thử lại tối đa một lần với
  cùng UUID; không tạo reservation mới. Khi đã có response provider hợp lệ nhưng
  chưa đọc được kết quả accounting, trả response với budget snapshot rỗng.
  Background content job chỉ tự chạy lại khi nhận 429 xác định;
  timeout/mất mạng/5xx dừng để quản trị viên xem xét.
- Không suy phiên bản bộ sinh mới hơn từ ID hoặc thời điểm của generation job.
  Main workflow serialize run và luôn `content:sync` bằng
  `QUESTION_GENERATOR_PROMPT_VERSION` trước worker. Không chạy đồng thời worker
  service-role thuộc hai bản deploy; khi đổi version, conflict khác version
  phải được đóng rõ từ Admin của bản hiện hành trước lượt tạo tiếp theo.
- Daily web allowance chỉ dùng cost do interactive coach/report finalization
  ghi lại. Costs API là toàn project và có background generation, nên chỉ dùng
  cho project/monthly accounting; không đưa nó vào phần trăm hay admission web.
- Mọi bộ đọc cần toàn bộ lịch sử phải phân trang đến khi nhận trang rỗng, tiến
  cursor/offset theo số row thực nhận và fail closed nếu trang sau lỗi; không
  giả định backend luôn trả đủ page size yêu cầu.
- Queue ưu tiên question New theo giới hạn trước các review còn lại theo policy
  trong `learning-state.ts`.
- Hidden test/code-runner metadata không lộ ra client hay response.
- Mock v4 phải reserve durable history trước hidden runner/paid AI. Retry dùng
  frozen submission; chỉ token hiện hành được release/abort lease. Không chạy
  lại paid AI để khắc phục provider/completion response bất định. Lease hết hạn
  chưa dispatch được xóa để reserve lại; lease đã dispatch chuyển `failed` và
  không retry. Nếu provider đã trả nhưng normalize, debrief hoặc dựng artifact
  lỗi, route cũng terminalize reservation bằng `report_processing_failed`, không
  release để chấm lại.
- Mistake capture chỉ chạy sau durable coach/review hoặc completed Mock v4.
  Generated remediation luôn là DB-native draft chờ duyệt; không lưu candidate
  answer/hidden execution evidence và không tính card cá nhân vào content coverage.
  Client giữ `coachAttemptId` trên exact local review cho tới khi route trả
  resolution `acknowledged`/`discarded`; response sync cũ hoặc lỗi mạng không
  được xóa marker đang chờ. Route chỉ capture khi exact attempt/question/ngày/
  rating khớp kết quả DB thẩm quyền.
  Marker ứng dụng phải được DB xác nhận ngay trước từng provider. Lease hết hạn
  chưa marker được claim lại; nếu provider có kết quả mơ hồ thì terminalize đúng
  lease. Completion RPC chỉ được thử lại với cùng draft rồi chuyển `dead_letter`
  nếu vẫn không xác nhận; không gọi AI lại.
- Rollout bắt buộc theo thứ tự **deploy app mới trước, rồi mới chạy migration**
  `20260730130000`–`20260730170000` và
  `20260730190000`–`20260730220000`. Đặc biệt không chạy
  `20260730140000`, `20260730170000` hoặc `20260730210000` khi app/worker cũ
  còn phục vụ request. App mới chạy trước migration sẽ preflight/fail closed
  trước provider; migration budget chạy trước code cũng làm app cũ fail closed
  tại admission, nhưng không dùng điều đó để đảo thứ tự rollout. Riêng progress
  có đường tương thích hẹp trước migration: bỏ cột generation khi đúng lỗi thiếu
  cột và chỉ gọi RPC năm tham số khi RPC sáu tham số thật sự chưa tồn tại, review
  chưa mang token. Migration `20260730200000` giữ overload cũ tạm thời;
  `20260730220000` backfill generation rồi gỡ nó. Các giao thức AI không fallback
  sang RPC cũ để “khắc phục” lệch phiên bản.
- Áp dụng cùng thứ tự cho `20260801090000_add_worldquant_cloud_state.sql`: deploy
  API/client trước, quan sát local fallback, rồi mới chạy migration. Không chạy
  migration này chỉ vì source đã có mặt trong một nhánh chưa deploy.
- Same-session repair phải bind exact question version/source hash/history
  generation. Review đầu vẫn qua scheduler/cloud path; repair retry không tạo
  daily review thứ hai.
  Review `Again`/`Hard` phải giữ `repairPendingAt` trong progress cho tới khi
  exact repair queue write thành công; recovery được phép dựng lại item từ
  marker rồi mới xóa marker, không xóa trước.
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
