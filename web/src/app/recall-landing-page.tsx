import Link from "next/link";

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
      "Từ C++ hiện đại tới tick data, system design và mock interview cho WorldQuant.",
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
    <main data-recall-landing className="min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91] shadow-[0_12px_32px_rgb(23_63_53_/_18%)]">
              CI
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">cppinterview</span>
              <span className="block text-xs text-[#64736c]">
                Learn deliberately
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/learn"
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[#52645c] transition hover:bg-white/65 hover:text-[#173f35] sm:inline-flex"
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
            className="mt-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#fff1e8] px-5 py-4 text-sm font-semibold text-[#8e3825]"
          >
            {authNotice}
          </p>
        ) : null}

        <section className="grid gap-10 pb-14 pt-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,.92fr)] lg:items-center lg:pb-22 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#356b58]/16 bg-white/62 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.15em] text-[#356b58] uppercase">
              <span className="size-2 rounded-full bg-[#79b82a]" />
              C++ · Systems · Trading
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[#17221d] sm:text-6xl lg:text-7xl">
              Học từ ghi chú.
              <span className="block text-[#356b58]">Sẵn sàng để trả lời.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#52645c]">
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
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#173f35]/15 bg-white/70 px-5 py-3 text-sm font-bold text-[#245748] transition hover:border-[#356b58]/40 hover:bg-white focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
              >
                Thử luyện không cần tài khoản
              </Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#64736c]">
              Dùng email/mật khẩu, Google hoặc GitHub để lưu tiến độ riêng tư giữa các thiết bị.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -right-12 -top-8 size-44 rounded-full bg-[#d7ff91]/45 blur-3xl" />
            <div className="relative rounded-[2.2rem] border border-[#173f35]/12 bg-[#173f35] p-5 text-white shadow-[0_32px_100px_rgb(23_63_53_/_25%)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#f08a5d]" />
                  <span className="size-2 rounded-full bg-[#f4ce5b]" />
                  <span className="size-2 rounded-full bg-[#79b82a]" />
                </div>
                <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-white/45 uppercase">
                  Today&apos;s cppinterview
                </span>
              </div>
              <p className="mt-7 font-mono text-[10px] font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
                Phiên ôn tập trọng tâm
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                Tại sao không nên dùng một hàm chung để cập nhật cả book và
                bars?
              </h2>
              <div className="mt-6 rounded-2xl bg-white/8 p-4 text-sm leading-6 text-white/68">
                Bạn tự trả lời trước. Khi cần, AI chỉ ra phần đúng, phần thiếu và
                câu hỏi tiếp nối để bạn đào sâu.
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniMetric value="Lịch ôn" label="nhắc đúng lúc" />
                <MiniMetric value="AI coach" label="giải thích rõ" />
                <MiniMetric value="Mock" label="luyện như thật" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-[#173f35]/12 py-12 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
                Một vòng học có chủ đích
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Không chỉ đọc đáp án. Luyện cách trả lời.
              </h2>
            </div>
            <Link
              href="/worldquant"
              className="rounded-xl px-4 py-2 text-sm font-bold text-[#356b58] transition hover:bg-white/65"
            >
              Xem lộ trình chuẩn bị →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => (
              <article
                key={item.number}
                className="rounded-[1.75rem] border border-[#173f35]/12 bg-white/62 p-6 shadow-[0_16px_50px_rgb(23_63_53_/_6%)]"
              >
                <span className="font-mono text-xs font-bold text-[#ba4b2f]">
                  {item.number}
                </span>
                <h3 className="mt-7 text-xl font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-[#64736c]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 pb-16 lg:grid-cols-[.8fr_1.2fr] lg:pb-22">
          <div className="rounded-[2rem] bg-[#e5f6c5] p-6 sm:p-8">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#356b58] uppercase">
              Ngân hàng được quản lý kỹ
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Người học tập trung vào việc học.
            </h2>
            <p className="mt-4 leading-7 text-[#52645c]">
              Các câu hỏi xuất hiện trong lịch học đã được quản trị viên kiểm tra.
              Việc bổ sung nguồn kiến thức, tạo bản nháp và duyệt nội dung là khu vực
              quản trị riêng, không nằm trong tài khoản học viên.
            </p>
            <Link
              href="/learn"
              className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#245748] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
            >
              Khám phá thư viện
            </Link>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2">
            {workflow.map(([number, title, description]) => (
              <li
                key={number}
                className="flex gap-4 rounded-[1.5rem] border border-[#173f35]/12 bg-white/62 p-5"
              >
                <span className="font-mono text-xs font-bold text-[#ba4b2f]">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#64736c]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-[#173f35]/12 py-10 sm:py-12">
          <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-3" aria-label="Về trang chủ cppinterview">
                <span className="grid size-10 place-items-center rounded-xl bg-[#173f35] font-mono text-xs font-bold text-[#d7ff91]">CI</span>
                <span className="text-lg font-bold tracking-tight">cppinterview</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#64736c]">
                Nền tảng luyện phỏng vấn C++ với thẻ ôn tập, phản hồi AI và mock interview có cấu trúc.
              </p>
            </div>
            <FooterColumn title="Khám phá">
              <FooterLink href="/practice?guest=1">Thử luyện</FooterLink>
              <FooterLink href="/learn">Thư viện</FooterLink>
              <FooterLink href="/mock-interview">Phỏng vấn thử</FooterLink>
            </FooterColumn>
            <FooterColumn title="Tài khoản">
              <FooterLink href="/auth">Đăng nhập</FooterLink>
              <FooterLink href="/auth?mode=signup">Tạo tài khoản</FooterLink>
              <FooterLink href="/auth/reset-password">Quên mật khẩu</FooterLink>
            </FooterColumn>
            <FooterColumn title="Cách vận hành">
              <p>Câu hỏi được duyệt trước khi đưa vào lịch học.</p>
              <p>Tiến độ học chỉ thuộc về tài khoản của bạn.</p>
              <p>Khu quản trị dành riêng cho chủ sở hữu repo.</p>
            </FooterColumn>
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#173f35]/10 pt-5 font-mono text-[10px] font-bold tracking-[0.08em] text-[#78857f] uppercase">
            <span>© {new Date().getFullYear()} cppinterview</span>
            <span>C++ interview practice · Learn deliberately</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">{title}</h2>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-[#64736c]">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="w-fit font-semibold text-[#245748] transition hover:text-[#ba4b2f] hover:underline hover:underline-offset-4">{children}</Link>;
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
      ? "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold text-[#356b58] transition hover:bg-white/65 focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none sm:px-4"
      : tone === "hero"
        ? "inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-[#d7ff91] shadow-[0_14px_35px_rgb(23_63_53_/_20%)] transition hover:-translate-y-0.5 hover:bg-[#245748] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
        : "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#173f35] px-3 py-2 text-sm font-bold text-[#d7ff91] transition hover:bg-[#245748] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none sm:px-4";

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
    <div className="rounded-xl border border-white/10 bg-white/6 p-3">
      <p className="text-xs font-bold text-[#d7ff91]">{value}</p>
      <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-white/45 uppercase">
        {label}
      </p>
    </div>
  );
}
