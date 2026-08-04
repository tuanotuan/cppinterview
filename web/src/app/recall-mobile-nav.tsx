"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/practice", label: "Học hôm nay", icon: "⌂" },
  { href: "/worldquant/mission", label: "Nhiệm vụ", icon: "✓" },
  { href: "/worldquant", label: "Chuẩn bị", icon: "◇" },
  { href: "/learn", label: "Thư viện", icon: "▤" },
  { href: "/profile", label: "Hồ sơ", icon: "◉" },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/practice") return pathname === "/practice";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RecallMobileNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/mock-interview") ||
    pathname.startsWith("/worldquant/full-round")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="recall-mobile-nav fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl border border-white/40 bg-[#173f35]/95 px-2 py-2 text-white shadow-[0_18px_50px_rgba(10,36,29,0.32)] backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const active = isCurrent(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`grid min-h-11 min-w-13 place-items-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none ${
              active
                ? "bg-[#d7ff91] text-[#173f35]"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="font-mono text-base leading-none">
              {item.icon}
            </span>
            <span className="text-[9px] font-bold leading-3">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
