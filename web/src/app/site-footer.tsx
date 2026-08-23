import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="ui-page-width px-4 py-10 sm:px-7 sm:py-12 lg:px-10">
      <div className="border-t border-[color:var(--border-subtle)] pt-10 sm:pt-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr_.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Về trang chủ cppinterview">
              <Image
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-xl"
              />
              <span className="text-lg font-bold tracking-tight">cppinterview</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--ink-muted)]">
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
            <FooterExternalLink href="https://www.facebook.com/CNTT.HCMUS.K23">Facebook ↗</FooterExternalLink>
          </FooterColumn>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-5 font-mono text-[11px] font-bold tracking-[0.08em] text-[color:var(--ink-muted)] uppercase">
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
      <h2 className="ui-eyebrow text-[color:var(--pine)]">{title}</h2>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-[color:var(--ink-muted)]">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="w-fit font-semibold text-[color:var(--pine)] transition hover:text-[color:var(--focus-ring)] hover:underline hover:underline-offset-4">{children}</Link>;
}

function FooterExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-fit font-semibold text-[color:var(--pine)] transition hover:text-[color:var(--focus-ring)] hover:underline hover:underline-offset-4"
    >
      {children}
    </a>
  );
}
