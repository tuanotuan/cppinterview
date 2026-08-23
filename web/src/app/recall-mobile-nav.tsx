"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/practice", label: "Học hôm nay", icon: HomeIcon },
  { href: "/mock-interview", label: "Phỏng vấn", icon: InterviewIcon },
  { href: "/learn", label: "Thư viện", icon: LibraryIcon },
  { href: "/profile", label: "Hồ sơ", icon: ProfileIcon },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/practice") return pathname === "/practice";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RecallMobileNav() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mock-interview") ||
    pathname.startsWith("/worldquant/full-round")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="recall-mobile-nav fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-md grid-cols-4 items-center rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-2 py-2 shadow-[0_10px_30px_rgb(15_58_105_/_16%)] lg:hidden"
    >
      {items.map((item) => {
        const active = isCurrent(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative grid min-h-11 min-w-0 place-items-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none ${
              active
                ? "bg-[color:var(--accent-soft)] text-[color:var(--pine)] after:absolute after:inset-x-4 after:top-0 after:h-0.5 after:rounded-full after:bg-[color:var(--accent)]"
                : "text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--pine)]"
            }`}
          >
            <Icon />
            <span className="text-[10px] font-bold leading-3 sm:text-[11px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <IconFrame>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </IconFrame>
  );
}

function InterviewIcon() {
  return (
    <IconFrame>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m9 9 6 3-6 3V9Z" />
    </IconFrame>
  );
}

function LibraryIcon() {
  return (
    <IconFrame>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h6" />
    </IconFrame>
  );
}

function ProfileIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </IconFrame>
  );
}
