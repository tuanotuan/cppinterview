import Link from "next/link";
import Image from "next/image";

type LandingPageProps = {
  authNotice: string | null;
  cloudEnabled: boolean;
};

const capabilities = [
  {
    title: "Ngân hàng câu hỏi đã được duyệt",
    description:
      "Học trực tiếp từ các thẻ C++ đã được kiểm tra nội dung, đáp án và tiêu chí chấm trước khi đưa vào lịch ôn.",
    number: "01",
  },
  {
    title: "Ôn đều, thấy rõ tiến bộ",
    description:
      "Lịch ôn lặp lại ưu tiên đúng phần cần nhớ lại. Tài khoản giúp lưu tiến độ riêng tư giữa các thiết bị.",
    number: "02",
  },
  {
    title: "Luyện đúng kiểu phỏng vấn kỹ sư",
    description:
      "Từ C++ hiện đại tới đọc code, debugging, system design và mock interview cho các vị trí kỹ sư C++.",
    number: "03",
  },
];

const workflow = [
  ["01", "Chọn phiên học", "Bắt đầu từ các thẻ đã có sẵn trong ngân hàng câu hỏi."],
  ["02", "Tự trả lời", "Làm trước như trong phỏng vấn, rồi mới xem gợi ý hoặc đáp án."],
  ["03", "Nhận phản hồi", "AI coach giúp chỉ ra phần đúng, phần còn thiếu và câu hỏi tiếp nối."],
  ["04", "Ôn đúng lúc", "Lịch ôn nhắc lại các chủ đề cần củng cố để kiến thức bền hơn."],
];

export function RecallLandingPage({
  authNotice,
  cloudEnabled,
}: LandingPageProps) {
  return (
    <main data-recall-landing className="ui-landing-background min-h-screen overflow-x-hidden">
      <div className="ui-page-width px-4 py-5 sm:px-7 lg:px-10">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex items-center gap-3"
          >
            <Image
              src="/icon.svg"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              unoptimized
              className="size-10 rounded-xl"
            />
            <span>
              <span className="block text-base font-bold tracking-[-0.025em] sm:text-lg">cppinterview</span>
              <span className="block text-xs text-[color:var(--ink-muted)]">
                Luyện phỏng vấn C++
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/learn"
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[color:var(--ink-subtle)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--pine)] sm:inline-flex"
            >
              Thư viện
            </Link>
            <AuthLink
              cloudEnabled={cloudEnabled}
              label="Đăng nhập"
              href="/auth?next=%2Fpractice"
              tone="quiet"
            />
            <AuthLink
              cloudEnabled={cloudEnabled}
              label="Tạo tài khoản"
              href="/auth?mode=signup&next=%2Fpractice"
              tone="primary"
            />
          </div>
        </header>

        {authNotice ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-[#a65c0e]/20 bg-[#fff1f1] px-5 py-4 text-sm font-semibold text-[#c43d3d]"
          >
            {authNotice}
          </p>
        ) : null}

        <section className="grid gap-10 pb-16 pt-16 lg:grid-cols-[minmax(0,1.04fr)_minmax(25rem,.96fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-24">
          <div>
            <p className="ui-panel-label flex items-center gap-2 text-[color:var(--success)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#138f8c]" />
              Luyện phỏng vấn C++
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.055em] text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
              Học C++ có hệ thống.
              <span className="block text-[color:var(--success)]">Trả lời có cơ sở.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[color:var(--ink-subtle)]">
              cppinterview là nơi luyện phỏng vấn C++ với ngân hàng câu hỏi đã được
              duyệt, lịch ôn có chủ đích, AI coach và mock interview — để mỗi lần học
              đều phục vụ cho lần phỏng vấn tiếp theo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AuthLink
                cloudEnabled={cloudEnabled}
                label="Tạo tài khoản miễn phí"
                href="/auth?mode=signup&next=%2Fpractice"
                tone="hero"
              />
              <Link
                href="/practice?guest=1"
                className="ui-action-secondary focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
              >
                Thử luyện không cần tài khoản
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-[color:var(--border-subtle)] pt-5 text-sm text-[color:var(--ink-subtle)]">
              <span><strong className="text-[color:var(--foreground)]">Tự trả lời</strong> trước khi xem đáp án</span>
              <span><strong className="text-[color:var(--foreground)]">Lưu riêng tư</strong> giữa các thiết bị</span>
            </div>
          </div>

          <div className="relative isolate">
            <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[1.25rem] bg-[color:var(--accent)]/24 blur-3xl" />
            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[color:var(--pine)] text-white shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
                <span className="ui-panel-label text-[color:var(--accent)]">Phiên học hôm nay</span>
                <span className="font-mono text-xs text-white/60">01 / 07</span>
              </div>
              <div className="p-5 sm:p-7">
                <p className="ui-panel-label text-white/55">Câu hỏi trọng tâm</p>
                <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
                  Khi nào dùng reference, khi nào dùng pointer trong API C++?
                </h2>
                <div className="mt-7 rounded-xl border border-white/10 bg-black/12 p-4 font-mono text-sm leading-7 text-[#e6f8f5]">
                  <p className="text-white/45">Câu trả lời của bạn</p>
                  <p className="mt-3">Reference biểu đạt đối tượng luôn tồn tại; pointer phù hợp khi…</p>
                  <span className="mt-3 block h-px w-4/5 bg-white/15" />
                  <span className="mt-3 block h-px w-3/5 bg-white/15" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  <MiniMetric value="Lịch ôn" label="đúng lúc" />
                  <MiniMetric value="AI coach" label="sau khi trả lời" />
                  <MiniMetric value="Mock" label="luyện như thật" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-[color:var(--border-subtle)] py-12 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="ui-eyebrow text-[#a65c0e]">
                Một vòng học có chủ đích
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Không chỉ đọc đáp án. Luyện cách trả lời.
              </h2>
            </div>
            <Link
              href="/mock-interview"
              className="rounded-xl px-4 py-2 text-sm font-bold text-[color:var(--pine)] transition hover:bg-[color:var(--surface-muted)]"
            >
              Xem phòng phỏng vấn thử →
            </Link>
          </div>
          <div className="mt-10 grid gap-0 border-t border-[color:var(--border-subtle)] pt-8 md:grid-cols-3 md:gap-8">
            {capabilities.map((item) => (
              <article
                key={item.number}
                className="group border-t border-[color:var(--border-subtle)] py-6 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:px-0 md:py-0 md:pl-5 md:first:border-l-0 md:first:pl-0"
              >
                <span className="ui-panel-label text-[#a65c0e]">
                  {item.number}
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] group-hover:text-[color:var(--pine)]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-[color:var(--ink-muted)]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] pb-0 lg:grid-cols-[.82fr_1.18fr] lg:pb-0">
          <div className="bg-[color:var(--pine)] p-7 text-white sm:p-9">
            <p className="ui-panel-label text-[color:var(--accent)]">
              Ngân hàng được quản lý kỹ
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em]">
              Người học tập trung vào việc học.
            </h2>
            <p className="text-on-dark-muted mt-4 leading-7">
              Các câu hỏi xuất hiện trong lịch học đã được quản trị viên kiểm tra.
              Việc bổ sung nguồn kiến thức, tạo bản nháp và duyệt nội dung là khu vực
              quản trị riêng, không nằm trong tài khoản học viên.
            </p>
            <Link
              href="/learn"
              className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-bold text-[color:var(--pine-strong)] transition hover:bg-[#8eebdc] focus-visible:ring-4 focus-visible:ring-white/30 focus-visible:outline-none"
            >
              Khám phá thư viện
            </Link>
          </div>

          <ol className="grid gap-px bg-[color:var(--border-subtle)] sm:grid-cols-2">
            {workflow.map(([number, title, description]) => (
              <li
                key={number}
                className="flex gap-4 bg-[color:var(--surface-raised)] p-6 sm:p-7"
              >
                <span className="ui-panel-label text-[#a65c0e]">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-muted)]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </div>
    </main>
  );
}

function AuthLink({
  cloudEnabled,
  label,
  href,
  tone,
}: {
  cloudEnabled: boolean;
  label: string;
  href: string;
  tone: "quiet" | "primary" | "hero";
}) {
  const className =
    tone === "quiet"
      ? "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-[color:var(--pine)] transition hover:bg-[color:var(--surface-muted)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none sm:px-4"
      : tone === "hero"
        ? "ui-action-primary min-h-12 px-5 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none"
        : "ui-action-primary min-h-11 px-3 focus-visible:ring-4 focus-visible:ring-[color:var(--accent)] focus-visible:outline-none sm:px-4";

  if (!cloudEnabled) {
    return (
      <span
        aria-disabled="true"
        className={className + " cursor-not-allowed opacity-45"}
        title="Đăng nhập đang được cấu hình."
      >
        {label}
      </span>
    );
  }

  return <Link href={href} className={className}>{label}</Link>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/12 p-3 sm:p-4">
      <p className="text-xs font-bold text-[color:var(--accent)]">{value}</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-white/65 uppercase">
        {label}
      </p>
    </div>
  );
}
