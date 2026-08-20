import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-7 sm:py-12 lg:px-10">
      <div className="border-t border-[#173f35]/12 pt-10 sm:pt-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr_.8fr]">
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
          <FooterColumn title="Kết nối">
            <FooterExternalLink href="https://github.com/tuanotuan/cppinterview">GitHub repository ↗</FooterExternalLink>
            <FooterExternalLink href="https://www.facebook.com/HCMUS.k23">Facebook ↗</FooterExternalLink>
          </FooterColumn>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#173f35]/10 pt-5 font-mono text-[10px] font-bold tracking-[0.08em] text-[#78857f] uppercase">
          <span>© {new Date().getFullYear()} cppinterview</span>
          <span>C++ interview practice · Learn deliberately</span>
        </div>
      </div>
    </footer>
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

function FooterExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-fit font-semibold text-[#245748] transition hover:text-[#ba4b2f] hover:underline hover:underline-offset-4"
    >
      {children}
    </a>
  );
}