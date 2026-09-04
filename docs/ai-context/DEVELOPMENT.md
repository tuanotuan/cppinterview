# Development guide

Chạy command từ `web/` trừ khi ghi khác. Trên PowerShell có thể dùng
`npm.cmd` nếu execution policy chặn `npm.ps1`.

## Thiết lập và command

## Ranh giới content C++

Chỉ `cpp98_foundation/`, `cpp11/`, `cpp14/`, `cpp17/`, `cpp20/`, `cpp23/` và
collection `dailycppinterview/` là source root của web.
Không thêm `python/` hay CMake vào discovery/content sync; thư mục Python ở
repo root được giữ độc lập với sản phẩm.

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
npm run eval:evidence  # corpus grading/evidence deterministic, không gọi provider
npm run build
npm run validate        # toàn bộ gate theo thứ tự trên
```

## Project-local agent skills

`.agents/skills/` chứa skill dùng trong repo. `update-skills.ps1` tải và thay thế
skill từ upstream, nên chỉ chạy khi thật sự muốn cập nhật dependency tooling; sau
đó kiểm tra diff, refresh context và commit toàn bộ thay đổi liên quan.

`content:refresh` có ghi registry/manifest và overlay lesson tiếng Anh sinh từ
file `en.md` đi cùng bài. `content:check`, test, lint,
typecheck và `context:check` là read-only. `content:refresh` cũng refresh
`docs/ai-context/GENERATED_SNAPSHOT.md`. `content:sync`,
`content:generate:db`, migration và deploy có tác động external; không chạy chỉ
để “kiểm tra”.

Các script tạo draft có trả phí chạy qua Node với điều kiện `react-server` vì
chúng dùng chung module OpenAI server-only với route Next.js. Không đổi các lệnh
này về `tsx <script>` trực tiếp; cách đó làm import fail trước khi pipeline sync
và worker có thể xử lý hàng đợi.

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

Learner UI hỗ trợ `vi` và `en` bằng `next-intl`; mọi route learner có prefix
locale bắt buộc. Chuỗi UI nằm trong `src/messages/{vi,en}.json`, còn nội dung
question/lesson dịch qua `src/lib/content/translations.ts` và catalog
`src/content-translations/`. Bản dịch phải bind exact ID + version + source hash
(lesson bind content hash), giữ nguyên code, nguồn, taxonomy, schema và enum.
Question translation có `draft` phải được duyệt riêng trong Admin. API chỉ lấy
copy từ catalog server và ghi publication verified; Practice, Coach và Mock chỉ
áp publication khớp nguyên văn bản catalog hiện tại, nên sửa bản dịch sẽ tự đưa
nó về hàng chờ mà không tạo ID hay lịch học mới.
Không dùng machine translation ở runtime. Thiếu bản dịch thì dùng canonical
content ở các bề mặt cho phép fallback; không được trình bày fallback như một
bản dịch đã được review. Riêng `/en/practice` chỉ đưa question có overlay bind
đúng revision vào hàng học, và không hiển thị source excerpt/title của lesson
chưa có overlay tiếng Anh. Quy tắc nghiêm ngặt này ngăn học liệu tiếng Việt lọt
vào một phiên Practice được gắn nhãn English.

Nội dung tiếng Việt người dùng nhìn thấy, thông báo lỗi từ API và lời nhắc tạo
phản hồi AI phải dùng “bạn” hoặc câu trung tính. Chỉ giữ tên riêng, mã nguồn và
thuật ngữ kỹ thuật phổ biến hoặc không có cách dịch chính xác. WorldQuant drill
được thiết kế bằng tiếng Anh vẫn giữ tiếng Anh. Quy ước chi tiết nằm trong
`web/AGENTS.md`.

AI Coach nhận `responseLocale` trong request/idempotency và lưu
`coach_attempts.response_locale`. Mock đóng băng locale khi tạo session; report
và artifact history mới giữ locale đó. Khi thêm locale mới, cập nhật routing,
message catalog, contract AI/Mock, overlay content và test identity/coverage cùng
một thay đổi.

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

1. Lesson đơn ngữ dùng `<source-root>/<lesson>/knowledge.md`; lesson song ngữ
   dùng canonical tiếng Việt `vi.md` và companion `en.md`. Mỗi file cần một `#`
   title và ít nhất một `##` section; hai bản song ngữ phải có cùng số/thứ tự
   section để pipeline giữ ID canonical và sinh overlay exact-revision. Nếu cả
   `vi.md` và legacy `knowledge.md` cùng tồn tại, loader dùng `vi.md`.
2. Thêm code mẫu đúng ngôn ngữ nếu cần: `main.cpp`, `main.py`, hoặc
   `CMakeLists.txt`.
3. Chạy `npm run content:refresh`, rồi `npm run content:status`.
4. Review diff trong `web/content/lesson-registry.yaml`,
   `web/src/generated/content-manifest.json` và
   `web/src/generated/lesson-translations-en.json`.
5. Chạy `npm run validate`.

Source roots được discovery: `cpp98_foundation`, `cpp11`, `cpp14`, `cpp17`,
`cpp20`, `cpp23`, `dailycppinterview`. ID mới được
suy ra từ path; nếu collision, đăng ký thủ công. Rename có
thể được nhận ra và giữ ID, nhưng luôn kiểm tra diff.

### Collection Real-World C++ Interviews

- `web/content/daily-cpp-interview-source.json` là manifest biên tập cho 146 mục
  nguồn theo đúng thứ tự; PDF tham chiếu không được lưu trong repo. Prompt nguồn
  được giữ nguyên theo từng ngôn ngữ, còn phần giải thích và code mẫu được biên
  soạn độc lập.
- Chạy `node scripts/generate-daily-cpp-interview.mjs` từ `web/` để sinh lại
  `dailycppinterview/`, phần registry, YAML câu hỏi và overlay tiếng Anh; sau đó
  chạy `npm run content:generate`. Mỗi thư mục phải có đúng `vi.md`, `en.md`,
  `main.cpp`, còn mỗi lesson chỉ có một question ID `dailycpp-qNNN-001`.
- Chuỗi `Daily C++ Interview` đã nằm trong 146 revision v1 và tham gia source
  hash nên generator cố ý giữ nó ở source; `localizeContentManifest()` thay bằng
  tên hiển thị `Real-World C++ Interviews` trước khi render. Không sửa chuỗi nguồn
  chỉ để rebrand. `collection.defaultQuestionVersion` là version mặc định; nếu
  nội dung/hash của một câu thật sự đổi, tăng `questionVersion` riêng trên mục đó
  (hoặc tăng default khi toàn bộ collection đổi). Generator phải fail nếu hash
  đổi mà version không tăng, trước khi chạm vào bất kỳ source hay catalog sinh tự
  động nào.
- Giữ cả 146 mục, bao gồm 19 câu lặp có chủ ý của nguồn; không gộp ID và không tự
  sinh bộ ba Dễ/Trung bình/Khó. Difficulty là ước tính biên tập lưu trong manifest.
- Track `dailycpp` là collection trung lập phiên bản: hiển thị trong Library và
  queue học sau C++23, nhưng không có file/route roadmap, không tham gia ma trận
  coverage theo phiên bản và chưa được chọn vào Mock C++11–23.

Trên `main`, CI refresh deterministic files, commit nếu cần, sync snapshot sang
Supabase, rồi enqueue/generate DB-native drafts. Không dùng `content:auto` hay
`content:draft` cho production flow bình thường.

## Recipe: sửa roadmap C++11/C++14/C++17/C++20/C++23

- Registry riêng nằm tại `web/content/roadmaps/<track>.yaml`; không dùng
  `lesson.order` làm số ngày và không thêm placeholder vào
  `content/lesson-registry.yaml`.
- Giữ đúng 53 ngày cho C++11, 50 ngày cho C++14/C++17, 52 ngày cho C++20 hoặc 54 ngày cho C++23 và
  dependency chỉ trỏ về ngày trước đó. `planned` không có `lessonIds`;
  `ready`/`partial` chỉ được trỏ tới lesson đúng track đã có thật.
- Title/objective/phase phải có cả `vi` và `en`. Chuỗi khung giao diện vẫn nằm
  trong `src/messages/{vi,en}.json`.
- Thứ tự `lessonIds` có ý nghĩa: `lessonIds[0]` là lesson chính mà node roadmap
  mở trong tab mới; các ID còn lại là học liệu liên quan. Ngày chưa có học liệu giữ
  mảng rỗng để UI render placeholder disabled, không dùng URL giả hoặc URL rỗng.
- Coverage `ready`/`partial`/`planned` mô tả học liệu, không được dùng làm tiến độ
  account. Tiến độ cá nhân chỉ có `learning`/`done`/`skipped` trong
  `user_roadmap_lesson_states`; chọn lại cùng trạng thái xóa row về pending ngầm,
  và chỉ `done + skipped` tính completion. Không tái dùng state/review FSRS.
- Link mở lesson và toolbar trạng thái phải là sibling, không lồng `button` trong
  link. Desktop hỗ trợ hover lẫn `focus-within`; mobile/touch phải có trigger tối
  thiểu 44 px. Guest chọn trạng thái mở dialog dùng đúng Google/GitHub/email hiện
  có; không thêm provider chỉ để bắt chước UI tham khảo.
- Chạy targeted test roadmap/API/migration tương ứng rồi `npm run validate`.
  Sửa YAML/content roadmap đơn thuần không cần migration hay sync Supabase. Thay
  đổi schema tiến độ phải thêm migration append-only và pgTAP owner/other-owner/
  anonymous-Auth; chỉ push remote sau khi nhánh đã merge và người dùng yêu cầu rõ.

## Recipe: sửa question

- Contract đầy đủ: `web/content/README.md`.
- YAML Git-owned: `web/content/questions/*.yaml`.
- Question mới bắt đầu ở `draft`; `verified` cần review người.
- Target ngân hàng C++ là 300 câu: 100 knowledge, 80 code-reading/UB, 60
  coding, 30 review/debug, 20 design/performance, 10 communication/ownership.
  `interviewCategory`, `interviewFormat` và `assessmentSkills` là metadata nội
  bộ; không thêm chip hay filter mới vào card người học. Format dùng cho
  generation/Admin gồm bug hunt, crash/leak, UB, API/class review, comparison,
  correctness-preserving optimization, compiler diagnostic, ownership/lifetime,
  test-first debugging và code review theo dòng.
- `interviewFormat: code_review` bắt buộc có field `code` riêng và
  `responseMode: text`. Practice lưu annotation `[Dòng n]` vào candidate answer;
  AI Coach đọc đúng answer này, còn rubric/expected comments không được lộ ra
  trước khi người học trả lời.
- Một câu `responseMode: code` chỉ được Git content checker cho xuất bản
  `verified` khi `codeTestSuite` khai báo tối thiểu một public và một hidden
  case, đồng thời khớp exact server-owned registry ID/version/source hash/suite
  revision. Hidden test không được đi vào manifest/client. AI chỉ tạo draft;
  thiếu test suite là trạng thái bình thường của draft và không được tính vào
  mức bao phủ xác minh.
- Có thể thêm tranche Git-owned đã viết/review nguồn thủ công, nhưng vẫn phải để
  `draft`; không dùng cách này để giả lập production AI generation.
- Approval phải bind đúng `version` và `sourceHash`.
- Luồng “Luyện thẻ của bài này” là lesson check một lần, không phải custom study:
  chỉ lấy question đã qua publication/approval filter của exact lesson, không
  ghi review, không hỏi interval và không cập nhật scheduler.
- Sửa nội dung làm tăng version và vô hiệu approval cũ.
- “Lưu trữ” ở Admin là archive overlay có thể khôi phục và không xóa history.
  Riêng “Từ chối” trong hàng đợi ghi tombstone vĩnh viễn theo question ID qua
  `reject_queued_content_question`; API và RPC đều bắt buộc admin, bind exact
  version/source hash và chỉ chấp nhận question còn ở trạng thái chờ duyệt.
- Điều khiển sửa/xóa trên thẻ đang học chỉ hiện với GitHub provider identity
  `tuanotuan`; API question mutation phải kiểm tra lại identity này ở server.
  Sau khi sửa, revision cũ phải rời phiên học và bản mới trở về hàng chờ duyệt.
- Khi xóa lesson, câu hỏi của lesson được lưu trữ trong YAML để giữ lịch sử nhưng
  không còn xuất hiện trong generated manifest; DB sync lưu trữ câu hỏi vắng mặt.
- Production AI drafts nằm ở Supabase immutable revisions, không append vào
  `generated.yaml`.
- Khi sửa prompt/shape AI draft phải tăng `QUESTION_GENERATOR_PROMPT_VERSION`;
  workflow sync trước rồi worker mới claim job để lịch sử generation không lẫn
  category contract cũ/mới.
- Admin `tuanotuan` có thể tạo câu hỏi DB-native thủ công tại `/admin` khi `QUESTION_STORE=db`: chỉ nhập đề bài và đáp án tham khảo rồi tạo draft chờ duyệt. Câu được gắn vào lesson nội bộ `admin-manual-questions` (không có file `.md` hay nguồn hiển thị), có revision/audit riêng và được trigger bảo vệ khỏi repository sync archive. Cần deploy app mới trước, rồi chạy migration `20260809100000_create_standalone_admin_manual_questions.sql`.
- Từ chối vĩnh viễn câu hỏi trong hàng đợi cần migration
  `20260828064241_permanently_reject_queued_questions.sql`. Có thể deploy app
  trước: reader coi schema chưa có là chưa có tombstone, còn mutation fail closed
  cho tới khi migration được áp dụng. Không chạy migration remote từ coding task
  nếu chưa được người dùng cho phép rõ ràng.
- Bộ 53 bài C++11 chỉ giữ ba canonical question cho mỗi bài. Migration
  `20260828223000_retire_pre_curriculum_questions.sql` tombstone đúng danh sách
  90 question ID legacy đã xác định, kể cả câu từng được duyệt, đồng thời gỡ liên
  kết remediation nhưng không xóa revision, approval hay lịch sử học tập.
- Duyệt question translation cần migration
  `20260828093103_approve_question_translations.sql`. Migration chỉ cấp
  insert/update qua RLS cho content admin, bind actor và exact current
  question/version/source hash; không cấp delete. Deploy app tương thích trước,
  sau đó mới áp migration remote khi được cho phép.

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

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và
  `NEXT_PUBLIC_SITE_URL`. Production phải đặt `NEXT_PUBLIC_SITE_URL` thành origin
  canonical HTTPS để metadata canonical/hreflang không dùng localhost; Vercel có
  thể fallback qua `VERCEL_PROJECT_PRODUCTION_URL`.
- Server app: OpenAI/Gemini keys, admin billing key, project ID, code-runner
  config.
- GitHub Actions only: `SUPABASE_SERVICE_ROLE_KEY` cho content sync/generation.
- Code runner và Mock v4/v5 history cùng publication loader của Practice/Mock dùng hai secret Supabase riêng
  (`CODE_RUNNER_SUPABASE_SECRET_KEY`, `MOCK_HISTORY_SUPABASE_SECRET_KEY`);
  không tái dùng content-sync key hay dùng chung với nhau.
- Publication loader chạy server-side bằng `service_role`; migration phục vụ
  loader chỉ bổ sung quyền đọc. Vì các view `content_current_*` dùng
  `security_invoker`, migration phải cấp `SELECT` cho cả view và đúng các bảng
  nguồn mà view đọc; không bổ sung quyền ghi hay mở quyền tương ứng cho
  `anon`/`authenticated`.
- cppinterview mở cho mọi Supabase Auth account đã xác thực. Email provider phải bật;
  production nên bật xác minh email và đặt Site URL/Redirect URLs gồm
  `/auth/callback` cùng `/auth/confirm`. Mật khẩu được kiểm tra ở cả browser và
  Server Action (ít nhất 8 ký tự, đăng ký phải nhập trùng hai lần và một nút
  hiện/ẩn áp dụng đồng thời cho hai ô), không log hay lưu lại trong ứng dụng.
  Email/password account dùng recovery OTP; OAuth-only account không tạo recovery
  token và phải đăng nhập Google/GitHub trước, sau đó đặt mật khẩu tại
  `/auth/set-password` qua `auth.updateUser({ password })`. Server Action trả
  thông báo thêm/đổi thành công ngay trong form và không đăng xuất hay chuyển về
  màn hình đăng nhập; Supabase giữ phiên hiện tại và thu hồi các phiên khác theo
  chính sách Auth của dự án. Nhãn Đặt/Đổi không được suy ra riêng từ provider vì
  OAuth-first account có thể đã có password mà vẫn thiếu email identity:
  `20260902154929_track_account_password_capability.sql` backfill rồi đồng bộ duy
  nhất boolean `has_password` từ `auth.users` sang bảng owner-private có RLS.
  App có fallback provider để rolling deploy không gián đoạn; mỗi môi trường vẫn
  phải áp migration để trạng thái OAuth-first cũ hiển thị chính xác.
  Quyền quản trị vẫn chỉ dựa vào GitHub provider identity
  bất biến `tuanotuan`, không tin `user_metadata` do người dùng tự sửa.
- Proxy SSR làm mới cookie phiên bằng `supabase.auth.getClaims()`; không dùng
  `getSession()` để xác thực, và không gọi `getUser()` chỉ để làm mới phiên trên
  mỗi lần điều hướng. Các route vẫn đọc user record khi cần dữ liệu mới nhất.
- Next.js giữ page segment động trong router cache 30 giây để hỗ trợ chuyển qua
  lại giữa các trang. Server Action đổi cookie, `router.refresh` và revalidation
  vẫn xóa cache này ngay; không dùng cache đó làm nguồn xác thực.
- Khi không cấu hình Supabase, route AI chỉ được chạy không tính quota nếu
  `NODE_ENV=development` và `ALLOW_UNMETERED_LOCAL_AI=true`; production và test
  luôn bỏ qua cờ này rồi từ chối theo hướng an toàn.
- OpenAI routing cố định: Luna phục vụ AI Coach (chấm, hỏi tiếp/đào sâu),
  lesson tutor, flashcard sửa lỗi và sinh nội dung; Terra chỉ phục vụ tổng kết phỏng vấn thử
  với reasoning `high`. Reservation quota phải dùng đúng tier gọi provider.
- Không log secret, không commit `.env.local`, không truyền secret vào sandbox.

App local không có Supabase vẫn chạy local-only. AI/runner/cloud feature cần
config tương ứng và có thể fail closed theo thiết kế.

## Browser state và privacy

Trạng thái trình duyệt không thêm migration:

- Transcript “Học với AI” của lesson chỉ sống trong React memory, không ghi
  localStorage/Supabase và reset khi đổi lesson, locale hoặc content hash. Client
  không gửi Markdown/code lesson; route luôn dựng lại localized context canonical.
  Client chỉ hiện form sau auth-status check, còn route phải xác minh lại account
  không ẩn danh và trả `401` trước quota/provider cho guest; không coi UI gate là
  ranh giới bảo mật.
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
  giữ identity/version/hash, drill revision, repair ID và fingerprint an toàn của
  projection evidence; không lưu answer/code/excerpt hay payload attempt. Snapshot stale phải
  fail closed rồi rebuild, không được giữ card revision/competency cũ hoặc
  `content_gap` trái với canonical approved content hiện tại. Personal remediation
  có thể cùng tồn tại với canonical gap và vẫn phải round-trip. Snapshot chứa
  mock cũng phải rebuild khi account/history backend không đủ capability lưu
  completion bền vững. Mỗi account chỉ giữ tối đa 24 key snapshot v2; prune
  không được chạm key account/namespace khác hoặc key v1. Snapshot v1 không được
  di chuyển vì kế hoạch có thể chứa revision cũ; đường đọc phải bỏ qua và dựng
  lại bản v2 từ dữ liệu hiện hành. Snapshot v2 cũ thiếu fingerprint được hiểu là
  `none`; nó chỉ còn hợp lệ khi projection hiện tại cũng chưa có evidence đã đánh giá.
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
- `ts-fsrs` là scheduler thẩm quyền. `fsrs-scheduler.ts` ghim 21 trọng số FSRS 6,
  retention 90%, tối đa 36.500 ngày, tắt fuzz và short-term vì review durable chỉ
  có độ phân giải một ngày. Mọi preview/transition phải replay rating của đúng
  question version/source hash/reset generation; `fsrs-shadow.ts` chỉ là projection
  chẩn đoán dùng lại cùng engine và route Stats không render nó.
- Stats dùng tập ID cố định từ question trong repo của deck C++ và năm chuẩn
  C++11/14/17/20/23 làm mẫu số; overlay/DB chỉ cung cấp identity/nội dung hiện
  hành. DB-native extra không được làm đổi mẫu số hoặc lọt vào custom-study queue
  mở từ dashboard. State thiếu, `new` hoặc sai exact revision đều là chưa phủ;
  `review` không suspended với interval từ 21 ngày là đã nhớ.
- WorldQuant training state ghi local trước, sau đó hợp nhất cloud theo revision
  CAS khi account đã đăng nhập. Mission snapshot cloud ưu tiên bản đã tồn tại
  theo exact ngày/vị trí/thời lượng để giữ kế hoạch ổn định giữa thiết bị. Lỗi
  mạng, 401/403 hoặc migration chưa chạy không được xóa local state. Không tự
  upload namespace `local` vào account sau login.

### Targeted Mock v2 invariants

- Chỉ server được dựng lại targeted plan từ profile version, catalog revision,
  mode, duration, scenario family và variant. Client không được tự gán câu,
  competency, gate hay thay đổi `new-feed`/`migration-incident` sau khi freeze.
- Profile v1 và plan v1 là boundary lịch sử chỉ đọc. Debrief/historical trend phải
  dùng exact profile version đã đóng băng, không lấy weight v2 để diễn giải lượt
  cũ hoặc so chúng như cùng chuẩn.
- Mock gate là deterministic: score theo mapping câu hỏi server-owned và hidden
  execution; lỗi execution không được nâng gate lên pass. `not_assessed` không
  phải 0 và artifact/report không được khẳng định người học đã role-ready.
- Strict Mock không lộ rubric/hint/follow-up trong lúc trả lời. Guided Full Round
  chỉ mở follow-up sau base answer có nội dung và thao tác chủ động; rubric vẫn
  chỉ lộ sau khi mở follow-up.

## Public AI quota

Migrations `20260805100000_create_public_ai_quota_admission.sql` and
`20260805110000_create_public_ai_budget_ledger.sql` enable public Coach/Mock and
non-admin Luna access. They store HMAC hashes of IP, device, and optional account identities in
rolling 24-hour windows; raw IPs, device tokens, prompts, and answers are never
persisted. The admission RPC is service-role-only and reserves a lease before
the site-wide budget ledger dispatches a provider call. An undispatched lease can
be released or expires safely, while a dispatched request continues consuming one
of the three turns even if its outcome is unknown. The client may show only the
public turn count/reset returned by the route, never identities or cost ledger.

Existing environments must also apply
`20260809110000_refresh_public_ai_quota_rpc_contract.sql`, followed by
`20260809120000_add_public_ai_quota_status.sql`. The web client calls the exact
eight-argument v2 quota RPC (including the 600-second lease); before the latest
migration exists it falls back only to the original enforcing RPC so deploy-first
rollout does not interrupt Coach. The latest migration adds a service-role-only
status read and makes returned counters use the most restrictive active IP,
device, or account window without changing existing quota data.

`/practice` hydrates the public counter on the server. A fresh incognito profile
has no durable device cookie, so the read uses the HMAC IP identity (and account
when present); no browser fingerprint is collected. Closing incognito therefore
does not replenish the network allowance. If status cannot be read, the UI must
show an unknown/checking state rather than incorrectly claiming all three turns
remain.

Coach idempotency keys are deterministic UUIDv8 values. Any server-side UUID
validator on the Coach/public-admission path must accept versions 1–8 and reject
the nil UUID; narrowing validation to versions 1–5 blocks every guest request
before Supabase is called.

Create a dedicated Supabase secret API key for
`PUBLIC_AI_QUOTA_SUPABASE_SECRET_KEY` and a random
`PUBLIC_AI_QUOTA_IDENTITY_PEPPER`. Do not reuse the code-runner, Mock-history,
or content-sync key; neither variable may use `NEXT_PUBLIC_`. Keep
`PUBLIC_AI_ENABLED=false` until the migrations and deployed API/UI version are
both ready.

Lesson tutor chỉ dành cho account không ẩn danh; account non-admin vẫn dùng cùng
public quota ba lượt/24 giờ với request kind `lesson_assistant`, còn guest bị
chặn trước admission. Migration
`20260829130024_add_lesson_ai_assistant.sql` mở rộng constraint/RPC quota và tạo
terminal cache account-scoped cho owner. Migration không lưu prompt/transcript,
thu hồi quyền table và chỉ cấp đúng RPC cần thiết. Migration tương thích với app
cũ; áp migration đó rồi
`20260830021455_fix_lesson_ai_dispatch_coalesce.sql` trước khi deploy UI/API mới.
Bản sửa giữ nguyên auth/lock/lease nhưng dùng `COALESCE` đúng cú pháp trong dispatch
RPC. Nếu bước đánh dấu dispatch lỗi, route trả `provider_not_started`/503 và không
gọi OpenAI. Coding task chỉ chuẩn bị migration local, không tự push Supabase
remote.

## Supabase

Migration là append-only, chạy theo timestamp trong `web/supabase/migrations/`.
Đọc `web/supabase/README.md` và migration liên quan trước khi đổi DB.

Migration `20260806100000_create_admin_mobile_usage.sql` thêm aggregate thời gian
active trên điện thoại cho riêng content admin. Client chỉ gửi tab UUID ngắn hạn
khi trang đang visible; RPC tự bỏ khoảng heartbeat quá 45 giây, tách đúng ngày
Việt Nam và không lưu IP, user-agent, tên thiết bị hay URL. Deploy app trước,
sau đó mới chạy migration; khi migration chưa có, endpoint fail closed và việc
học không bị ảnh hưởng.

Các nhóm schema hiện có:

- auth-scoped progress, reviews, Anki state, approvals, overrides;
- account-scoped roadmap lesson state (`learning`/`done`/`skipped`), tách khỏi
  Anki/FSRS và chỉ cấp CRUD qua owner-only RLS cho permanent account;
- AI daily/monthly accounting, provider reconciliation, Gemini usage/settings
  và reservation ledger UUID cho từng lượt OpenAI;
- immutable lesson/question revisions, sync runs, generation jobs;
- C++ content metadata;
- code execution admission/quota/idempotency.
- account-scoped Mock v4/v5 history, report lease/cache và owner delete.
- owner-private Mistake Inbox, observation dedupe và grounded remediation drafts.
- WorldQuant training state và Mission snapshot account-scoped, chỉ đọc trực tiếp
  qua RLS; ghi chỉ qua RPC `save_worldquant_*` security-definer có `auth.uid()`,
  advisory lock và expected revision. Mission cloud giữ tối đa 24 snapshot mỗi user.
- coach attempt cho phép `candidate_answer` rỗng (nghĩa là chưa biết) và không có
  product-level character limit sau migration `20260730120000`.
- Coach evaluation có reservation account-scoped theo request fingerprint,
  canonical idempotency key và lease sau migration `20260730130000`; migration
  `20260828110000` đồng bộ fingerprint với `responseLocale`, chỉ nhận fingerprint
  legacy như tiếng Việt và persist locale đó trên attempt. Xóa attempt cũng xóa
  cache reservation liên quan. Trong rollout trước migration, app chỉ fallback
  khi nhận đúng `P0001` fingerprint mismatch từ RPC cũ. Tiếng Việt giữ cặp
  fingerprint/UUIDv8 legacy; tiếng Anh phải dùng source revision transport
  server-derived cùng cặp fingerprint/UUIDv8 riêng để không thể đọc cache tiếng
  Việt. Dispatch/complete luôn dùng exact identity RPC đã reserve; không ghép key
  locale-aware với fingerprint legacy vì row đó sẽ conflict sau migration.
- Lesson assistant cần migration
  `20260829130024_add_lesson_ai_assistant.sql`: owner reservation bind exact
  lesson/locale/context hash/transcript; public admission thêm cùng request kind
  vào quota hiện hữu. RPC dùng `auth.uid()`, advisory lock, lease/dispatch marker,
  terminal `completed`/`outcome_unknown`, fixed empty `search_path` và không cấp
  quyền đọc/ghi trực tiếp bảng cho client. Luôn áp tiếp
  `20260830021455_fix_lesson_ai_dispatch_coalesce.sql`; migration này sửa dispatch
  marker mà không mở rộng quyền hoặc đổi contract RPC.
- C++14/C++17 lesson/question sync cần lần lượt
  `20260829100000_add_cpp14_content_track.sql` và
  `20260829130000_add_cpp17_content_track.sql`. Cả hai chỉ mở rộng bốn check
  constraint standard/track hiện có; không đổi dữ liệu, RLS, grant, view hay RPC.
  Áp đúng thứ tự trước lần `content:sync` đầu tiên có lesson tương ứng; không push
  DB chỉ vì migration mới xuất hiện trong một nhánh chưa merge.
- C++20 đã thuộc các constraint standard/track hiện hành; thêm lesson/question
  C++20 không cần migration mới. Vẫn không chạy `content:sync` hoặc mutation remote
  nếu người dùng chưa yêu cầu rõ ràng.
- C++23 cần `20260831025153_add_cpp23_content_track.sql` sau các migration C++14/C++17
  và trước lần `content:sync` đầu tiên chứa lesson C++23. Migration chỉ mở rộng bốn
  check constraint; không đổi dữ liệu, RLS, grant, view hay RPC. Không push migration,
  chạy `content:sync` hoặc mutation remote nếu người dùng chưa yêu cầu rõ ràng.
- Real-World C++ Interviews cần
  `20260904092827_add_daily_cpp_content_track.sql` trước lần `content:sync` đầu
  tiên chứa track `dailycpp`. Migration chỉ thay bốn check constraint
  standard/track theo mẫu append-only hiện có; không đổi dữ liệu, RLS, grant,
  view hay RPC. Không push migration hoặc sync remote từ nhánh feature.
- Roadmap account progress cần migration
  `20260903102303_create_roadmap_lesson_progress.sql`. Deploy/apply migration theo
  quy trình sau merge; trước migration API trả trạng thái unavailable và không
  fallback sang localStorage. `anon` không có table grant; anonymous Auth dù dùng
  role `authenticated` vẫn bị restrictive policy chặn, còn account thường chỉ
  thấy/sửa row có `user_id = auth.uid()`. Không push migration remote từ coding
  task nếu người dùng chưa yêu cầu rõ ràng.
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
  cppinterview, có mô tả hậu quả, đường hủy rõ ràng và khóa nút khi đang xử lý; dữ liệu
  người dùng cần nhập phải dùng form dialog trong UI.
- Điều hướng mobile dùng `RecallMobileNav` ở layout và phải chừa bottom safe
  space cho nội dung. Không hiện navigation này trong mock/full-round để người
  học có trải nghiệm phỏng vấn tập trung, không lộ đường tắt hay hint.
- Landing ở `/` luôn là trang chủ public, còn workspace học tập ở `/practice`.
  Thanh điều hướng mobile phải ẩn ở landing để không biến trang giới thiệu thành
  không gian luyện tập trước khi người dùng chọn CTA.
- Biểu tượng thương hiệu ở góc trái của mọi header là lối tắt nhất quán về
  trang chủ `/`; phải có nhãn truy cập được và vòng focus rõ ràng. Các liên kết
  điều hướng đến khu vực con vẫn nằm trong thanh điều hướng của chính trang đó.
- Mọi hiệu ứng UI phải tôn trọng `prefers-reduced-motion`; loading cần có
  trạng thái đọc được bởi screen reader, còn điều hướng mobile giữ vùng chạm và
  focus-visible rõ ràng.
- Navigation trong mock chỉ được trình bày vị trí câu và việc đã/chưa trả lời.
  Không dùng topic, difficulty, rubric, source hay bất kỳ metadata nào có thể
  trở thành hint trước lúc nộp báo cáo.
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
  FSRS từ progress vừa reread trong Web Lock, giữ lượt đầu tiên của exact
  question/ngày/phiên bản nội dung và chỉ enqueue repair cho lượt thắng. RPC
  `record_practice_review` overload FSRS nhận interval đã được server replay,
  kiểm tra scheduler version và biên 1–36.500 ngày, dùng advisory lock
  account/question, thay daily row stale nếu nội dung vừa đổi, giữ review offline
  cũ hơn dưới dạng history-only và trả rating thẩm quyền. Overload generation-aware
  cũ phải được giữ trong migration để app/DB rolling deploy theo hai chiều; API
  fallback khi PostgREST chưa thấy overload mới. Review archive, sai version/hash
  hoặc transition thiếu trường không được đưa vào batch sync.
- Daily plan không được tính bằng tổng learning state hiện tại. Phải rebuild
  trạng thái đầu ngày từ review history + cloud generation, chọn tối đa năm New,
  mọi Learning/Relearning đến hạn và tối đa năm Review đến hạn, rồi trừ các ID đã
  review trong ngày. Không được chạy lại selection trên state sau rating vì sẽ
  tự bơm câu khác vào quota và làm mẫu số tiến độ tăng. Thứ tự mặc định là
  Relearning/Learning → Review đến hạn → New. New chưa học giữ nguyên slot trong
  ngày; ngày kế tiếp dựng lại tối đa năm New nên chỉ lấy thêm đủ số slot còn
  thiếu sau các thẻ tồn. Custom Study, Focus và Repair không được làm lệch ba
  counter của daily plan. New đi theo C++11 → C++14 → C++17 → C++20 → C++23 →
  Real-World C++ Interviews, rồi Dễ → Trung bình → Khó trong từng track; C++98 không tự
  vào daily New.
- Learner/guest không được dùng `question_approvals` theo account làm nguồn xuất
  bản. Practice và Mock phải đọc exact revision do `content_admins` duyệt qua
  `published-question-bank.server.ts` bằng credential server-only; chỉ truyền
  content/publication DTO cần thiết xuống client. Lỗi reader phải fail closed và
  hiện retry, không được giả thành ngân hàng 0 câu. Editorial preview của admin
  vẫn dùng manifest/override/approval theo phiên quản trị.
- OpenAI admission theo ngày Việt Nam. Mỗi request tạo reservation UUID trước
  RPC đầu tiên, ghi marker `dispatched` cho cả reservation ứng dụng
  (Coach/Mock/Mistake) và ledger hạn mức ngay trước provider, rồi chỉ
  finalize/release đúng UUID/lease đó; monthly row là accounting/backstop, không
  được khóa nhầm ngày mới.
- AI Coach public/non-admin chỉ được mở khi đủ hai migration public AI và các
  secret riêng. Mỗi evaluation/follow-up phải qua HMAC admission cho IP +
  thiết bị (+ account nếu đã đăng nhập), tối đa ba lượt rolling 24 giờ, rồi
  reserve ledger Luna site-wide trước dispatch. Không dùng identity thô làm
  safety identifier, không dùng owner `ai_usage_*` hay Gemini fallback. Nếu
  dispatch có outcome mơ hồ, terminalize admission và charge bảo thủ; không
  gọi lại provider cùng lượt.
- Lesson tutor phải rebuild full localized lesson server-side, hard-fail nếu quá
  context bound, không tin context/citation từ client và không đưa question bank,
  rubric hay đáp án vào prompt. Route phải xác minh account không ẩn danh trước
  admission/provider; account non-admin dùng admission hiện hữu, owner dùng account
  reservation + daily/monthly budget. Cả hai chỉ gọi Luna một lần, `store: false`,
  structured output và không fallback Gemini. Guest Practice vẫn được dùng Coach
  tối đa ba lượt rolling 24 giờ; không mở lại lesson tutor cho guest.
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
- Daily New chỉ nhận C++11/14/17/20/23 và được xếp theo chuẩn tăng dần, rồi
  Dễ → Trung bình → Khó, rồi manifest order. Remediation priority chỉ được đổi
  thứ tự bên trong cùng nhóm chuẩn/độ khó, không được nhảy cóc curriculum.
- Hidden test/code-runner metadata không lộ ra client hay response.
- Mock v5 công khai chỉ nhận browser-safe question refs rồi server dựng lại exact
  plan từ câu verified hoặc publication của `content_admins`; đáp án mẫu/hint/rubric không được gửi
  qua RSC props hay nhận lại từ client. Sau khi server resolve exact plan, phiên mới được
  lưu thêm snapshot bounded chỉ gồm question ID/version/hash, đề/code đã hiển thị, câu trả lời
  người dùng và thời gian; không đưa evaluation guide hay hidden diagnostic vào snapshot.
  Cloud snapshot nằm trong `public_attempt` owner-scoped hiện hữu và chỉ được server đọc bằng
  exact `user_id`; guest/local history giữ cùng contract trong localStorage. Artifact cũ không có
  snapshot phải vẫn mở normalized report, không được giả lập lại câu trả lời đã mất. Plan phải phủ đủ C++11/14/17/20/23, dùng
  quota/budget public trước Luna và chỉ lưu cloud history khi có account. Guest
  session/history ở localStorage theo scope `guest`; không được biến thiếu đăng
  nhập thành gate. Mutation `question_approvals` qua Data API phải đồng thời bind
  `auth.uid()` và `is_content_admin()`. Lỗi provider được xác nhận là chưa bắt đầu
  phải release admission để retry cùng frozen request; outcome không xác định phải
  terminalize, không tạo idempotency key mới để gọi lại.
- `GREATEST`/`LEAST` là conditional expressions đặc biệt của PostgreSQL, không
  phải function có thể gọi bằng `pg_catalog.greatest(...)`; quota RPC phải dùng
  cú pháp không schema-qualified. Sau mỗi push migration quota, kiểm tra migration
  history, query `pg_policies`, chạy `db lint` và `db advisors` trên linked project.
- Mock v4 lịch sử phải reserve durable history trước hidden runner/paid AI. Retry dùng
  frozen submission; chỉ token hiện hành được release/abort lease. Không chạy
  lại paid AI để khắc phục provider/completion response bất định. Lease hết hạn
  chưa dispatch được xóa để reserve lại; lease đã dispatch chuyển `failed` và
  không retry. Nếu provider đã trả nhưng normalize, debrief hoặc dựng artifact
  lỗi, route cũng terminalize reservation bằng `report_processing_failed`, không
  release để chấm lại.
- Report Mock mới luôn có đúng tám dimension theo thứ tự canonical
  (`correctness`, `complexity`, `idiomatic_cpp`, `lifetime_ownership`,
  `testing_debugging`, `communication`, `requirement_clarification`,
  `tradeoff_reasoning`). Server dựng evidence catalog từ exact submission,
  code trong đề và kết quả hidden-test; model chỉ được trả ID có trong catalog,
  rồi server resolve/validate trước khi lưu. Mọi action trong `nextPracticeActions`
  phải có đúng ba mục priority 1–3 và cite evidence; report/artifact cũ không
  có hai field này vẫn phải đọc được.
- Mistake capture chỉ chạy sau durable coach/review hoặc completed Mock v4.
  Với report mới, capture ưu tiên đúng ba `nextPracticeActions`; report cũ mới
  fallback theo missed criteria. Generated remediation luôn là DB-native draft
  chờ duyệt; không lưu candidate answer/hidden execution evidence và không tính
  card cá nhân vào content coverage.
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
  cppinterview Repair 3/5 thẻ không bị tách đôi hoặc duplicate.
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
- `AttemptArtifact` v1 là contract domain riêng tư cho Practice/Coach/Mock. Chỉ
  `EvidenceProjection` v2 không chứa answer/code/excerpt private mới được đưa vào
  read model. Self-rating có confidence thấp nên không tự xác minh competency;
  blank/reveal/hint hay hidden test fail không được tính là evidence thành công.
  Projection bỏ evidence nằm sau `asOf`; contradiction mới nhất hạ trạng thái về
  `learning`. Lỗi execution `failed` là contradiction, nhưng
  `infrastructure_error` phải là inconclusive; artifact lệch exact question identity
  phải là invalidated. Hai nhóm sau không được tính score/assessment, hạ trạng thái,
  tạo `repair` hoặc đổi fingerprint Mission. Các bucket artifact phải rời nhau và
  mọi projection phải qua invariant Zod. Content `missing` là trục độc lập, không
  được đổi thành learner weakness.
- WorldQuant account evidence chỉ SELECT `id`, question identity, feedback và
  `created_at` từ tối đa 250 `coach_attempts`; query phải có predicate `user_id`
  bên cạnh RLS và không được chọn `candidate_answer`. Mọi row/feedback phải qua Zod
  trước khi thành artifact; lỗi đọc trả projection rỗng, không đưa payload lỗi ra client.
- Coach/Mock artifact lệch question version/revision hiện hành không được xác minh
  và cũng không được thu hồi bằng chứng hiện hành từ attempt khác.
  Readiness chỉ nhận projection an toàn, giữ content coverage độc lập và giới hạn
  Coach/Mock ở một đơn vị mỗi competency. Focus chỉ ưu tiên `repair`/`refresh` cho
  exact question ID do projection đề xuất; Today’s Mission phải dùng cùng composer,
  ưu tiên `repair` trước `refresh`, rồi mới fallback về training gap/ít được luyện.
  Anki state vẫn quyết định lịch ôn thường. Fingerprint không được phụ thuộc `asOf`
  đơn thuần nhưng phải đổi khi evidence đã đánh giá hoặc hành động khuyến nghị đổi.
- Golden grading corpus chạy offline bằng `npm run eval:evidence`; không gọi AI
  hay ghi Supabase. Khi đổi grading contract, artifact schema hoặc policy evidence,
  cập nhật corpus theo version và giữ các case strong, thiếu ý bắt buộc, sai tinh
  vi, blank, prompt injection và hidden-test failure.
- Security overrides giữ `dompurify >= 3.4.14`, `nanoid >= 3.3.18`,
  `postcss >= 8.5.26` và `undici >= 7.29.0`; không hạ các mức này khi cập nhật
  lockfile. `npm audit` là gate dependency trước merge.

## Chọn validation theo phạm vi

- Logic thuần một domain: test file liên quan + `npm run typecheck`.
- Content/note/schema: `content:check` + content tests.
- Route/UI/cross-domain: lint + typecheck + tests liên quan.
- Trước handoff/merge: `npm run context:refresh`, rồi `npm run validate`.

Ghi chính xác command nào đã chạy và command nào chưa chạy; không nói “pass”
nếu chỉ suy luận.
