# Current state

File này chỉ giữ việc đang bàn giao, giới hạn chưa xác minh và validation gần
nhất. Kiến trúc ổn định nằm trong `PROJECT_MAP.md`; command và invariant phát
triển nằm trong `DEVELOPMENT.md`; số liệu máy sinh nằm trong
`GENERATED_SNAPSHOT.md`. Luôn kiểm tra Git trực tiếp ở đầu session, không suy ra
trạng thái từ tên nhánh.

## Handoff hiện tại

- Bộ lọc thư viện `/learn` hiển thị riêng C++98, C++11, C++14, C++17, C++20
  và C++23, không còn gộp nhiều chuẩn trong một chip. Catalog hiện có lesson
  C++98/C++11/C++14/C++17/C++20 nên chỉ C++23 còn ở trạng thái disabled; chip
  tự xuống dòng và giữ vùng bấm tối thiểu 44 px trên màn hình hẹp. Nhãn điều
  hướng roadmap bám theo chuẩn đang lọc; ở `Tất cả` chỉ hiện `Roadmap`. C++11,
  C++14 và C++17 mở route riêng, còn chuẩn chưa có roadmap mở bộ chọn phiên bản và được
  đánh dấu `Sắp có` thay vì bị chuyển nhầm sang roadmap khác.
- Roadmap C++11 có 53 ngày/8 chặng; roadmap C++14 và C++17 đều có 50 ngày/7 chặng; mỗi
  roadmap giữ thứ tự riêng với `lesson.order` và mọi node đều `ready`. Các lesson
  C++11 được đánh số `01`–`53`, C++14/C++17 được đánh số `01`–`50`; mỗi lesson có canonical `vi.md`,
  companion `en.md` và `main.cpp` theo cùng cấu trúc 10 phần như Toolchain;
  loader vẫn nhận `knowledge.md` cho lesson cũ, pipeline sinh overlay lesson
  exact-revision và giữ section ID canonical khi đổi locale. Coverage `ready` không lặp
  nhãn trên từng node hay trong legend; legend chỉ xuất hiện khi thật sự có ngày
  `partial`/`planned`, và các trạng thái chỉ là coverage nội dung, không phải tiến độ cá
  nhân. Trang dùng YAML Git-owned song ngữ; sơ đồ compact dùng node/connector
  ba cột ziczac trên desktop và một trục dọc trên tablet/mobile. Node có học liệu
  mở lesson chính (`lessonIds[0]`) theo locale trong tab mới; node chưa có lesson giữ vị
  trí nhưng disabled và không tạo điều hướng rỗng. Trang không đọc Supabase,
  localStorage hay scheduler.
- Learner app hỗ trợ song ngữ Việt/Anh qua prefix bắt buộc `/vi` và `/en`; route
  không prefix tự chuyển theo cookie/browser với mặc định `vi`. Switcher giữ
  pathname, query và hash; `html lang`, metadata canonical/hreflang, navigation,
  footer, landing, Auth và thư viện dùng locale hiện tại. Admin, WorldQuant, API
  và callback Auth kỹ thuật vẫn không prefix. Các lối tắt Admin trong Practice,
  Stats và guide tick dùng `next/link` trực tiếp nên luôn mở `/admin`, không bị
  navigation theo locale đổi thành route 404 `/vi/admin` hoặc `/en/admin`.
- Catalog hiện có 473 question Git-owned: 4 verified và 469 draft. Mỗi lesson
  C++11/C++14/C++17 có ba draft beginner/intermediate/advanced với taxonomy
  `standard::cpp11`, `standard::cpp14` hoặc `standard::cpp17`; 459 English copy tương ứng xuất hiện thành mục duyệt riêng
  trong Admin nhưng giữ nguyên canonical ID/version/hash/taxonomy. Cả 4 question verified
  cũng có overlay tiếng Anh; `/en/practice` chỉ xếp question và English copy đã duyệt vào hàng học. Question được duyệt
  nhưng chưa dịch không còn fallback sang tiếng Việt, còn source excerpt/title
  lesson chưa dịch được ẩn hoặc thay bằng nhãn chủ đề trung tính. Stable identity,
  version, source hash, taxonomy, source và code không thay đổi. Toàn bộ control,
  trạng thái, modal quản trị trong Practice và AI Coach dùng locale request. Mock
  đóng băng locale khi bắt đầu session và lưu locale trong report artifact/history
  mới để chuyển URL giữa phiên không làm đổi ngôn ngữ báo cáo.
- Hàng đợi Admin có nút “Từ chối” tách biệt với “Duyệt”: modal cảnh báo đây là
  hành động không thể hoàn tác, API kiểm tra lại exact GitHub admin cùng
  version/source hash, rồi RPC ghi tombstone toàn cục theo question ID. Loader
  loại tombstone khỏi cả store Git, shadow và DB nên content sync không làm câu
  sống lại; revision/source append-only vẫn được giữ tối thiểu cho audit.
- Hàng đợi cũng có card “Bản dịch · English” và duyệt hàng loạt chung với câu
  gốc. Approval translation chỉ ghi copy catalog server cho exact revision;
  publication không tạo question/history mới và tự hết hiệu lực khi copy đổi.
- Reader lesson mở các câu đã duyệt của exact lesson bằng lesson-check riêng;
  Toolchain hiện có ba question tương ứng. Mode này luôn đi hết tập câu đã duyệt
  dù đã ôn trong ngày. Mỗi lần bấm CTA sẽ xóa snapshot đúng bài/tài khoản để bắt
  đầu lượt mới; marker restart được bỏ sau khi hydrate nên F5 vẫn tiếp tục lượt
  hiện tại. Mode không hiện lựa chọn interval và không ghi review/scheduler; hết
  câu sẽ báo hoàn thành. Reader có cùng CTA ở đầu/cuối bài, không còn CTA
  “Xem mã mẫu”, ghi chú tình trạng kho hay checklist “Tự kiểm tra · không chấm điểm”.
- Question DB-owned của revision bài học cũ vẫn được giữ làm `needs_review` để
  audit. Practice chỉ resolve source excerpt khi `question.sourceHash` khớp
  revision lesson hiện hành; section ID cũ không còn làm sập workspace của tài
  khoản đã đăng nhập và cũng không bị gắn nhầm vào nội dung mới.

- Nền tảng UI đã được chuẩn hóa: có skip link, ring focus dùng chung, modal
  keyboard-safe (focus trap/Escape/trả focus), token semantic cho surface và
  color, cùng mobile navigation grid bám đáy không đè control sticky. Các không
  gian Practice, thư viện, mock, stats và profile dùng cùng content width và
  hierarchy heading/metadata; validation cần chạy typecheck, ESLint, test,
  build và context gate sau mỗi thay đổi UI.

- Favicon dùng badge C++ dạng SVG cục bộ, tối ưu cho kích thước tab trình duyệt;
  không phụ thuộc ảnh raster hay CDN bên ngoài.

- Proxy SSR xác minh/làm mới phiên Supabase bằng `getClaims()` thay vì tải user
  record ở mỗi request. Điều này giữ kiểm tra chữ ký JWT và cookie refresh, đồng
  thời giảm độ trễ khi chuyển trang trên dự án dùng khóa JWT bất đối xứng.

- Điều hướng động giữ route segment trong client cache 30 giây. Landing và
  WorldQuant guard chỉ tải account/session tối thiểu; nếu WorldQuant page cần
  full context thì session đã xác minh được dùng lại trong cùng request. Practice,
  Mock và Tiến độ khởi tạo các truy vấn độc lập song song; quota AI và lịch sử
  mock không còn chờ full context. Cloud context vẫn đọc review trước state để
  giữ reset history nhất quán, còn Tiến độ bỏ truy vấn mistake queue không dùng.
  Lịch sử Mock gửi xuống client chỉ gồm dữ liệu đang hiển thị, không kèm toàn bộ
  báo cáo, câu trả lời và execution records cũ.

- cppinterview đã chuyển sang C++-only: web không còn discovery root, deck,
  route học, code-runner hay mock-question language cho Python/CMake. Thư mục
  `python/` ở repo root vẫn giữ nguyên như ghi chú cá nhân.
- Sau deploy, chạy migration
  `20260818110000_archive_non_cpp_content.sql` để archive lesson/question
  Python/CMake và dead-letter job sinh câu hỏi còn chờ; revision history vẫn
  được giữ lại.
- Loader DB bỏ qua an toàn row Python/CMake legacy trước khi validate C++
  metadata, do đó OAuth user mới không thể làm SSR `/practice` crash trong khi
  migration archive chưa kịp chạy.
- Email/password dùng Server Actions chỉ export async action; shared form state
  nằm trong module client-safe để Next.js không reject POST `/auth` ở runtime.
  Khi xác thực thất bại, form giữ nguyên email và mật khẩu trong tab hiện tại
  để người dùng sửa rồi thử lại; Supabase code cho email chưa xác minh, rate
  limit và account bị khóa được hiển thị đúng, còn `invalid_credentials` vẫn
  gộp email không tồn tại/mật khẩu sai để chống dò tài khoản.
  Luồng Quên mật khẩu gửi mã OTP recovery qua Supabase, giữ email ngắn hạn
  trong HttpOnly cookie chỉ ở `/auth/reset-password`, rồi xác minh `recovery`
  OTP trước khi cho đặt hai lần mật khẩu mới; không tiết lộ email nào đang sở
  hữu tài khoản. Template **Reset Password** của Supabase phải in `{{ .Token }}`
  theo `web/supabase/README.md`; app không được báo gửi thành công nếu Supabase
  trả lỗi gửi.
  OAuth-only account (như `providers = ["google"]`) có `recovery_sent_at = NULL`
  và không nhận recovery email; người dùng phải đăng nhập Google/GitHub rồi dùng
  `/auth/set-password` để thêm mật khẩu. Đây là hành vi của Supabase, không phải
  lỗi SMTP.

- Giao diện Practice/Admin chỉ biểu diễn hai nhãn phân loại của thẻ: `Dễ`/`Trung bình`/`Khó` và `Text`/`Code`. Filter theo bộ thẻ, lộ trình, loại câu và chủ đề đã được gỡ khỏi UI; taxonomy, `type`, `interviewCategory`, `interviewFormat` và `assessmentSkills` vẫn nằm trong data model để scheduler, tạo nội dung, coverage và WorldQuant/mock dùng nội bộ. `code_review` hiển thị workspace chọn dòng và lưu comment có số dòng vào candidate answer, không lộ comment/rubric mẫu. Trang `/admin/coverage` theo dõi mục tiêu C++ 300 câu verified theo sáu dạng; draft/approval riêng không được làm tăng số verified.

- Báo cáo Mock v4 mới tách tám tiêu chí: correctness, complexity, idiomatic C++, lifetime/ownership, testing/debugging, communication, requirement clarification và trade-off reasoning. Server tạo evidence catalog từ exact câu trả lời, mã, mã trong đề và tổng hợp hidden-test; AI chỉ cite ID trong catalog rồi server resolve trước khi lưu. Cuối report có đúng ba việc luyện tiếp priority 1–3, được capture vào Mistake Inbox sau durable history theo chế độ `ask`/`auto`/`off`; các artifact Mock cũ vẫn đọc được nhưng hiển thị fallback cũ.

- Evidence Engine đợt 4 dùng `EvidenceProjection` v2 để harden chất lượng read model
  thống nhất của Hub và Today’s Mission. WorldQuant server đọc
  tối đa 250 Coach attempt theo account/RLS mà không SELECT `candidate_answer`, kết
  hợp Mock v4 history qua cùng một composer rồi chỉ gửi projection an toàn xuống client. Readiness nhận
  đóng góp Coach/Mock có giới hạn nhưng không làm tăng content coverage; Focus planner
  và Mission đưa exact câu bị contradiction hoặc stale vào hàng `repair`/`refresh`,
  ưu tiên evidence hành động được trước training gap cũ. Mission snapshot v2 giữ
  fingerprint không chứa câu trả lời và tự rebuild khi evidence thay đổi; snapshot v2
  cũ vẫn đọc được khi chưa có assessed evidence. Lỗi runner hạ tầng được ghi là
  inconclusive, artifact lệch version/revision được ghi là invalidated; cả hai không
  tính điểm, không thu hồi verification hiện hành và không tạo nhiệm vụ sửa lỗi oan.
  Anki vẫn là nguồn lịch ôn trực tiếp để không
  đếm đôi Practice evidence; không có migration, biến môi trường hay provider call mới.

- Câu hỏi thủ công trong Admin dùng DB-native revision/audit, không phải override của question Git. Form chỉ cần đề bài và đáp án tham khảo; lesson nội bộ không có file `.md` giữ revision/approval và không bị repository sync archive. Migration `20260809100000_create_standalone_admin_manual_questions.sql` phải chạy sau khi deploy app mới; trước đó API fail an toàn và không tạo row nào.

- Luna “Làm rõ câu hỏi” hiện dành cho admin `tuanotuan` trên Practice. Route dùng budget ledger sẵn có, không cần migration hay biến môi trường mới; prompt chỉ nhận đề và mã trong đề, không nhận đáp án/rubric/tài liệu nguồn. Kết quả nói nôm na bằng tình huống gần gũi, không dựng từ điển thuật ngữ; dữ liệu local cũ vẫn đọc được và kết quả lưu theo exact question version/hash để tồn tại qua F5.

- Nhánh hiện hành bổ sung thống kê riêng cho admin `tuanotuan`: thời gian cppinterview
  hoạt động trên điện thoại hôm nay, 7 ngày và 30 ngày. Migration
  `20260806100000_create_admin_mobile_usage.sql` chưa được áp dụng lên Supabase;
  app phải deploy trước rồi mới chạy migration. Bộ đếm chỉ cộng heartbeat quan
  sát được của tab phone đang visible, không thu thập IP/user-agent/URL.
- Đợt nâng cấp đang gom sáu chức năng học tập: phiên ôn tập trọng tâm từ
  Stats/thư viện bài học; Tick Replay Lab; thư viện bài học có
  tự kiểm tra; Toolchain Dojo; Legacy → Modern C++ Capstone; và đồng bộ nền cho
  bằng chứng WorldQuant cùng Nhiệm vụ. Capstone là sáu checkpoint tuần tự về
  provenance, golden output, adapter, toolchain, reconciliation và rollout.
- Training state vẫn lưu tại máy trước để dùng được khi mất mạng. Khi tài khoản đã
  đăng nhập, state account-scoped được hợp nhất với cloud bằng revision CAS; dữ liệu
  anonymous không tự chuyển vào tài khoản. Mission cloud giữ bản đầu tiên theo
  ngày/vị trí/thời lượng để các thiết bị dùng cùng một kế hoạch; nếu cloud lỗi,
  bản trên thiết bị vẫn là bản làm việc.

## Giới hạn và trạng thái chưa xác minh

- Phạm vi review hiện hành là đúng 459 canonical question C++11/C++14/C++17 và 459
  English draft khớp exact revision, tương ứng ba câu mỗi ngôn ngữ cho từng bài
  trong 53 bài C++11, 50 bài C++14 và 50 bài C++17. Bốn English overlay ngoài ba lộ trình vẫn
  có trong catalog lịch sử nhưng bị
  tombstone theo canonical ID; migration
  `20260828223000_retire_pre_curriculum_questions.sql` mã hóa đúng 90 ID legacy
  cần loại khỏi cả vùng đã duyệt và chưa duyệt mà không xóa audit history.
  Tiếng Anh dùng thêm source
  revision transport do server sinh để tách hẳn fingerprint/cache khỏi tiếng
  Việt, còn provider vẫn nhận source revision và candidate answer canonical.
  Sau migration app tự dùng fingerprint locale-aware chuẩn. Các route Coach
  evaluate/follow-up/clarify và Mock report localize manifest theo
  `responseLocale`; English chỉ nhận question có overlay exact-revision và mọi
  provider đều có output contract tiếng Anh. Practice và các route AI/Mock đọc
  verified publication từ view translation DB rồi đối chiếu exact copy Git.
- Hai migration `20260829100000_add_cpp14_content_track.sql` và
  `20260829130000_add_cpp17_content_track.sql` chưa được chứng minh là đã áp dụng
  remote. Chúng phải chạy đúng thứ tự trước lần content sync đầu tiên chứa lesson
  C++14/C++17; nếu không, check constraint hiện hành sẽ từ chối track mới. Cả hai
  chỉ thay check constraint, không đổi dữ liệu, RLS, grant, view hay RPC.

- Kho câu hỏi đã duyệt chưa bao phủ đều tick data, Linux/mạng, hệ
  thống phân tán và kỹ năng chịu trách nhiệm đầu cuối. Giao diện phải gọi đây là
  “phần học liệu còn thiếu”, không diễn giải thành điểm yếu của người học khi
  chưa có bằng chứng.
- Guide `/learn/tick-data-order-book` vẫn còn, nhưng năm lesson tick tự tạo và
  sáu câu hỏi Git-owned phụ thuộc đã bị gỡ. Khi sync thực sự chạy, lesson và
  question repository-owned vắng manifest được chuyển sang `archived` mà không
  xóa revision/audit history. Ownership guard giữ lifecycle của row DB-owned;
  current-question view vẫn biểu diễn nó là `archived` khi lesson cha đã
  archive. Repo không chứng minh remote hiện có DB-owned draft nào.
- Migration `20260801090000_add_worldquant_cloud_state.sql` mới có hai bảng/RPC
  cloud state và chưa được xác minh trên Supabase production. Triển khai app mới
  trước, sau đó mới chạy migration; khi migration chưa có, API trả lỗi an toàn và
  browser tiếp tục giữ tiến độ cục bộ.
- Hồ sơ phỏng vấn WorldQuant hiện hành là v4, local snapshot nằm dưới exact
  account UUID và danh mục bài luyện là v2. Mọi transition dùng Web Lock +
  revision CAS; answer intent chỉ được rebase trong cùng session/status, còn
  freeze/complete/reset giữ CAS nghiêm ngặt. Phiên đúng owner nhưng stale theo
  question revision được thay nguyên tử khi tạo buổi mới. Hub chỉ đọc local v4
  theo account hoặc server history v4; không nhận shared v3/ownerless state.
- Targeted Mock hiện hành dùng role profile v2: C++ hiện đại 22%, tick/order book
  22%, migration/replay 10%, build/test/CI 10%, concurrency 8%, performance 8%,
  ownership/English 7%, algorithms 6%, scripting 5% và Linux 2%. Người học chọn
  scenario `new-feed` hoặc `migration-incident`; lịch sử profile/plan v1 vẫn đọc
  được nhưng có nhãn không so trực tiếp với v2. Report thêm ba gate deterministic
  C++/market-data/migration ngưỡng 65 (không đánh giá thì không phải 0) và nêu
  rõ không phải verdict role-ready. Câu curated mới phủ CMake+sanitizer,
  reconciliation script, event time cross-asset và concurrency review. Guided
  Full Round chỉ mở follow-up/rubric theo tiến trình; Strict Mock không lộ hint.
- Supabase project `cpp-recall` đã áp đủ migration đến `20260730220000`; lịch
  sử remote đã được đối chiếu với local. Bootstrap xử lý hai view cũ không có
  lịch sử (`content_current_questions` và
  `content_current_repository_questions`) bằng drop tường minh không
  `CASCADE`, và xoá riêng metadata `current_standard` cache không hợp lệ để
  content sync điền lại từ manifest. Repo vẫn không chứng minh trạng thái
  deploy Vercel, `QUESTION_STORE`, secret hay quota production.
- Main workflow serialize content generation và sync exact generator version.
  Không chạy đồng thời worker service-role từ hai bản deploy. Conflict giữa các
  version phải được đóng rõ trong Admin của bản hiện hành; outcome AI chưa xác
  định vẫn cần xác nhận riêng trước khi mở lại hoặc đóng row.
- Hàm content backfill legacy từng có thể cấp `content_admins` từ
  `raw_user_meta_data`; migration mới thay thân hàm bằng lỗi SQLSTATE `55000` và
  thu hồi mọi quyền gọi, nhưng không thể xác minh dữ liệu remote. Khi deploy cần
  kiểm tra membership hiện hữu trong `content_admins` và xóa row không thuộc
  owner bằng quy trình vận hành có audit.

## Hành vi cần giữ khi sửa tiếp

- Nội dung người dùng nhìn thấy dùng “bạn” hoặc câu trung tính theo
  `web/AGENTS.md`; không sửa máy móc câu hỏi đã duyệt mà bỏ qua version/hash.
- Thao tác xác nhận, xóa, reset hay nhập metadata trong client phải dùng dialog
  của cppinterview; không quay lại hộp thoại native `alert`/`confirm`/`prompt` vì chúng
  thiếu ngữ cảnh và phá vỡ trải nghiệm trên mobile.
- Giao diện learner-facing theo hướng technical editorial light theme: navy là
  màu hành động/chữ cấu trúc, turquoise dành cho focus/active/progress, còn success
  dùng xanh lá riêng. Workspace dùng nền phẳng, card trắng, border mảnh, shadow ngắn
  và thang bo góc 12/16/20 px; gradient chỉ dành cho landing. Navigation active dùng
  tonal background + indicator, không dùng pill tối. Landing, Today workspace, thư
  viện, Mock, Stats và Profile dùng header/card/CTA nhất quán; shell mobile, session
  rail và sticky action vẫn giữ nguyên. Practice chỉ có một bộ C++ nên header dùng
  metadata số câu đã duyệt thay control chuyển bộ câu. Mobile chỉ hiện tiến độ/account
  ở header và bottom nav cho workspace;
  landing/auth/admin không mang bottom nav. Practice có Chế độ tập trung cục bộ
  (Esc thoát, Alt+A mở/ẩn đáp án) để ẩn shell/sidebar; feedback AI trình bày
  ba bước đúng/cần cải thiện/làm tiếp, rubric chi tiết được thu gọn. Thay đổi UI
  không chạm scheduler, AI admission hay dữ liệu học.
- UI dùng chung có reduced-motion fallback; skeleton loading có thông báo cho
  screen reader và thanh điều hướng mobile giữ vùng chạm/focus rõ ràng.
- Header, footer, trạng thái tải và cổng truy cập dùng chung logo C++ SVG thay cho
  badge chữ theo từng màn hình. Biểu tượng ở góc trái luôn mở trang chủ `/`; reader
  lesson còn đặt bộ đổi VI/EN ngay trước các link điều hướng để đổi ngôn ngữ tại bài.
- Trang chủ `/` là landing giới thiệu cppinterview cho khách; account đã đăng nhập được
  chuyển sang `/practice` trừ khi URL mang thông báo auth. `/auth` hỗ trợ email/mật khẩu
  cùng Google và GitHub OAuth, còn workspace Today nằm ở `/practice` cho cả local practice
  lẫn account đã đăng nhập. Đăng ký email cần xác nhận mật khẩu phía browser và
  server; nút hiện/ẩn dùng chung cho cả hai ô mật khẩu, rồi xác minh email qua
  `/auth/confirm`.
- Landing công khai chỉ giới thiệu ngân hàng câu hỏi đã duyệt và trải nghiệm học/luyện
  của người dùng. Thao tác nguồn kiến thức, bản nháp AI, queue duyệt và quản lý ngân hàng
  là workspace riêng của admin GitHub `tuanotuan`. Footer learner là surface midnight
  full-width riêng biệt: có điều hướng nhanh tới các route học thật, CTA guest, trust
  points, tài khoản, GitHub/Facebook và bộ đổi ngôn ngữ dark-tone mở lên; footer không
  đọc auth/Supabase và không thêm asset hay dependency mạng.
- cppinterview phục vụ việc luyện C++ cho nhiều công ty: tên và entry point WorldQuant
  đã được gỡ khỏi landing, Practice, Thư viện và Mock. Workspace `/worldquant/*` cũ
  vẫn được giữ trong source nhưng layout chỉ cho admin `tuanotuan` vào; người học thường
  được chuyển về `/practice`.
- CTA “Thử luyện không cần tài khoản” mở `/practice?guest=1`: vẫn luyện thẻ
  local nhưng header không hiện lời mời đăng nhập như một điều kiện bắt buộc.
- Guest mode mở Luna AI Coach mà không cần tài khoản, qua giới hạn public ba
  lượt/24 giờ. Practice đọc quota hiệu dụng theo IP/device/account khi tải trang
  và cập nhật lại từ route sau mỗi lượt; trạng thái chưa đọc được không được giả
  thành `3/3`. Mở đáp án, gợi ý và đánh giá local vẫn dùng được.
- Câu trả lời trống nghĩa là chưa biết và vẫn gọi được AI. Luồng
  Trợ giúp → Làm lại khóa rating cho tới khi người học tự trả lời lại; retry và
  cppinterview Repair vẫn đi qua scheduler chuẩn, không tạo review trùng.
- Contribution graph `/profile` đọc review, coach attempt và mock attempt đã
  hoàn tất qua RLS; không gọi AI, không tạo bảng activity và không trừ quota.
- WorldQuant coverage, learning evidence và mock evidence là ba tín hiệu khác
  nhau. Draft, personal remediation hoặc content gap không được biến thành điểm
  yếu hay bằng chứng đã xác nhận.

## Google OAuth workspace access

- Google OAuth uses the same Supabase PKCE callback as GitHub. Run
  `20260818090000_allow_authenticated_content_store_state.sql` before allowing
  a non-admin OAuth account into the DB-native workspace: it grants only
  authenticated read access to immutable content snapshot metadata, while all
  content mutations and per-user learning data remain protected.
- `/admin` and `/admin/coverage` require `cloud.canManageQuestionBank`, not
  merely a signed-in account; ordinary learners receive the focused Practice /
  Mock routes and the Practice header does not render the Admin link.
- The public landing route `/` redirects an authenticated account to
  `/practice` (unless it carries an auth-result notice), so the shared brand
  link cannot look like it logged the learner out.

## Lesson AI assistant rollout

- Mỗi reader lesson VI/EN có đúng một panel “Học với AI” / “Learn with AI”.
  Mobile/tablet đặt panel sau hero và trước mục lục; desktop dùng rail sticky rộng
  24–28rem, cao theo viewport. Nút mở rộng chuyển panel thành dialog focus tối đa
  40rem, hỗ trợ focus trap và Escape. Transcript chỉ ở memory, tối đa bốn lượt hỏi
  và reset theo lesson/locale/content hash.
- `/api/coach/lesson` tự dựng toàn bộ lesson đúng locale từ manifest, gồm mọi
  section và code mẫu; client không thể thay context. Luna trả structured answer
  cùng section citation đã kiểm tra, dùng đúng ngôn ngữ UI, không nhận question
  bank/rubric/answer key và không fallback Gemini.
- Public/non-admin chia sẻ quota AI ba lượt rolling 24 giờ hiện hữu; owner dùng
  daily/monthly budget cùng durable ambiguity barrier. Migration
  `20260829130024_add_lesson_ai_assistant.sql` và bản sửa kế tiếp
  `20260830021455_fix_lesson_ai_dispatch_coalesce.sql` phải được áp theo thứ tự
  trước khi deploy UI/API mới. Bản sửa thay schema-qualified `COALESCE` không hợp
  lệ trong dispatch RPC; nếu preflight vẫn lỗi, endpoint trả `provider_not_started`
  và fail closed trước khi gọi provider. Repo không tự suy diễn migration remote
  hay deployment đã diễn ra. Local Supabase migration runtime chưa kiểm tra được
  trên máy không có Docker/Podman; static SQL security tests vẫn là gate bắt buộc.

## Public AI quota rollout

- Public Luna admission is working in production after the response-shape and
  UUIDv8 fixes. The original RPC enforces IP, device, and optional account
  independently, but returned a device-only counter; Practice also rendered an
  unknown initial snapshot as a false `3/3`.
- The current change adds
  `20260809120000_add_public_ai_quota_status.sql`: server-side Practice hydration
  reads the effective minimum allowance, and admission v2 returns the same
  effective counter after reserve. A fresh incognito profile has no device
  cookie but still reads/enforces the HMAC network identity; no fingerprint is
  collected. Deploy the compatible app first, then apply this migration and
  smoke-test a second incognito profile on the same network. Before migration,
  admission falls back to the enforcing v1 RPC and the UI shows “Đang kiểm tra”
  instead of claiming a fresh limit.

## Validation gần nhất

- Lesson tutor đạt toàn bộ `npm run validate`: content/context check, ESLint,
  TypeScript, 129 file/769 Vitest test và Next.js production build sinh 376
  static page cùng route `/api/coach/lesson`. Targeted tests phủ context đầy đủ
  của mọi lesson VI/EN, locale/prompt-injection boundary, quota/idempotency,
  reservation terminal, SQL grants/RLS và UI responsive/accessibility. Audit
  production dependency báo 0 vulnerability; migration runtime local chưa chạy
  được vì máy không có Docker/Podman và không có remote mutation nào được thực hiện.
- Hotfix Practice cho question DB stale đạt `content:check`, `context:check`,
  ESLint, TypeScript, 111 file/656 Vitest test và Next.js production build 67
  page. Regression test giữ question revision cũ trong hàng `needs_review` nhưng
  không resolve section ID cũ vào lesson revision hiện hành.
- Roadmap C++11 cùng điều hướng bám theo bộ lọc chuẩn đạt toàn bộ
  `npm run validate`: content/context check, ESLint, TypeScript, 116 file/690
  Vitest test và Next.js production build, gồm route
  `/[locale]/learn/roadmap/cpp11`. Visual smoke 1440 px xác nhận đường ziczac ba
  cột; 768 px chuyển đúng sang trục dọc không tràn ngang. Smoke VI/EN xác nhận
  node có học liệu sinh đúng route locale tới lesson chính với `target="_blank"`
  và `rel="noopener noreferrer"`; node chưa có bài không sinh `href` rỗng,
  popup cũ không còn trong HTML và response không có payload Supabase.
- Google OAuth ở `/auth` dùng cùng callback PKCE của Supabase như GitHub; trước
  khi nút hoạt động cần bật provider, điền Google Client ID/Secret và đăng ký
  callback/origin theo `web/supabase/README.md`. Thay đổi UI/route đã đạt
  `content:check`, TypeScript, ESLint các file đổi và `context:check`.
- Mobile usage cho admin dùng `document.visibilityState`, không dùng
  `document.hasFocus()` vì Safari/Chrome mobile có thể trả về false khi tab vẫn
  đang hiện. Heartbeat fix đạt typecheck, ESLint các file liên quan và targeted
  profile test; migration `20260806100000_create_admin_mobile_usage.sql` đã là
  điều kiện để production ghi số liệu.
- Public AI effective-quota hydration đạt targeted 33/33 test và full validation:
  content/context check, lint, typecheck, 106 file/663 Vitest test, cùng Next.js
  production build 63 route. Sau merge/deploy vẫn phải chạy migration
  `20260809120000_add_public_ai_quota_status.sql`, rồi smoke-test hai profile ẩn
  danh mới trên cùng mạng để xác nhận lượt thứ hai đọc lại đúng counter IP.
- Mở quyền cppinterview qua email/mật khẩu và GitHub OAuth đạt `content:check`,
  `context:check`, ESLint, TypeScript, 107 file/661 Vitest test và Next.js
  production build 64 route. Đăng ký mới cần Email provider/Site URL/Redirect
  URLs của Supabase đúng như `web/supabase/README.md`; GitHub `tuanotuan` vẫn là
  điều kiện bất biến duy nhất cho quyền Admin. Cảnh báo retry tác vụ AI vẫn được
  kiểm thử như một contract vì người dùng phải thấy rõ khả năng phát sinh chi
  phí; toàn bộ client không còn gọi `window.alert`/`confirm`/`prompt`.
- Format bài phỏng vấn, code-review workspace và lớp song ngữ đạt `content:check`,
  `context:check`, ESLint, TypeScript, 105 file/632 Vitest test và Next.js
  production build tạo 113 static page. Mười câu C++ mẫu mới vẫn là `draft`, nên phải duyệt
  trong Admin trước khi xuất hiện trong lịch học hay coverage verified.
- `npm audit --omit=dev --audit-level=moderate` hiện báo 0 lỗ hổng production sau
  khi thêm dependency `next-intl` được khóa ở 4.13.7. Lockfile được chuẩn hóa
  bằng npm 10 của GitHub Actions và clean `npm ci` đã xác nhận dependency peer
  `@swc/helpers` của SWC được cài đầy đủ. Source guard đa dòng chuẩn hóa CRLF/LF
  để cùng một test chạy nhất quán trên Windows và Linux.
- Lần smoke production gần nhất dùng Chrome 1440×1200 và mobile CDP 390×844:
  Practice, WorldQuant, guide tick và Full Round không tràn ngang ở cấp
  trang. Đây không phải bằng chứng deployment hiện tại đang hoạt động.

## Quy tắc cập nhật

Thay fact cũ thay vì nối changelog. Chỉ giữ task, blocker, giới hạn hoặc kết quả
validation có ích cho session kế tiếp; fact đếm được phải nằm trong generator.
