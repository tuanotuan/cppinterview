import type { Metadata } from "next";
import Link from "next/link";

import type { ContributionDay } from "@/lib/profile/contribution-activity";
import { formatActiveDuration } from "@/lib/profile/mobile-usage";
import { loadProfileActivity } from "@/lib/profile/profile-activity.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trang cá nhân — Recall",
  description:
    "Nhật ký học tập, chuỗi ngày hoạt động và contribution graph của bạn trên Recall.",
};

const contributionColors = {
  0: "border-[#173f35]/8 bg-[#173f35]/5",
  1: "border-[#b8dc78]/45 bg-[#dff6b7]",
  2: "border-[#91c94b]/50 bg-[#bde979]",
  3: "border-[#4f9a55]/55 bg-[#69b85b]",
  4: "border-[#245748]/60 bg-[#245748]",
} as const;

export default async function ProfilePage() {
  const profile = await loadProfileActivity();
  if (!profile.enabled) return <ProfileGate mode="not-configured" />;
  if (!profile.account) return <ProfileGate mode="login" />;

  const { account, calendar, mobileUsage } = profile;
  const weeks = chunkWeeks(calendar.days);
  const recentDays = calendar.days
    .filter((day) => day.date <= calendar.today && day.total > 0)
    .reverse()
    .slice(0, 8);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              R
            </span>
            <span>
              <span className="block text-lg font-bold">Recall</span>
              <span className="block text-xs text-[#64736c]">
                Nhật ký học tập cá nhân
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink href="/practice">Luyện hôm nay</NavLink>
            <NavLink href="/learn">Thư viện</NavLink>
            <NavLink href="/stats">Thống kê</NavLink>
            <NavLink href="/worldquant">Chuẩn bị phỏng vấn</NavLink>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border border-[#173f35]/15 bg-white/65 px-4 py-2 text-sm font-bold transition hover:border-[#356b58]/40"
              >
                Đăng xuất
              </button>
            </form>
          </nav>
        </header>

        <section className="grid gap-6 py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex items-center gap-5">
            <div className="grid size-20 shrink-0 place-items-center rounded-[1.7rem] bg-[#173f35] text-3xl font-semibold text-[#d7ff91] shadow-[0_18px_60px_rgb(23_63_53_/_20%)]">
              {account.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
                Trang cá nhân
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                {account.displayName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#64736c]">
                {account.login ? (
                  <a
                    href={`https://github.com/${account.login}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#356b58] hover:underline"
                  >
                    @{account.login}
                  </a>
                ) : null}
                <span>Tham gia Recall {formatMonthYear(account.joinedAt)}</span>
              </div>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#64736c] lg:text-right">
            Mỗi lượt ôn thẻ, lần nhờ AI coach và bài phỏng vấn thử hoàn tất đều
            được ghi thành một hoạt động. Dữ liệu chỉ hiển thị trong tài khoản
            của bạn.
          </p>
        </section>

        {profile.error ? (
          <div className="mb-5 rounded-2xl border border-[#ba4b2f]/20 bg-[#fff1e8] px-5 py-4 text-sm text-[#8e3825]">
            Một phần nhật ký chưa tải được. Graph bên dưới vẫn hiển thị các dữ
            liệu đã đọc thành công.
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Tổng hoạt động"
            value={calendar.totalContributions.toLocaleString("vi-VN")}
            note="Trong 53 tuần gần nhất"
          />
          <MetricCard
            label="Chuỗi hiện tại"
            value={`${calendar.currentStreak} ngày`}
            note="Các ngày hoạt động liên tiếp đến hôm nay"
          />
          <MetricCard
            label="Chuỗi dài nhất"
            value={`${calendar.longestStreak} ngày`}
            note={`${calendar.activeDays} ngày có hoạt động`}
          />
          <MetricCard
            label="Phỏng vấn thử"
            value={`${calendar.totals.mock} bài`}
            note={`${calendar.totals.review} lượt ôn · ${calendar.totals.coach} lần AI coach`}
          />
          {mobileUsage ? (
            <MetricCard
              label="Điện thoại hôm nay"
              value={formatActiveDuration(mobileUsage.todaySeconds)}
              note={`7 ngày: ${formatActiveDuration(mobileUsage.last7DaysSeconds)} · 30 ngày: ${formatActiveDuration(mobileUsage.last30DaysSeconds)}`}
            />
          ) : null}
        </section>

        {mobileUsage ? (
          <p className="mt-4 rounded-2xl border border-[#173f35]/12 bg-[#eaf8cf]/55 px-5 py-3 text-sm leading-6 text-[#356b58]">
            Thời gian điện thoại chỉ được tính khi tab Recall đang hiển thị và hoạt động. Dữ liệu không lưu địa chỉ IP, user-agent hay trang bạn đang xem.
          </p>
        ) : null}

        <section className="mt-5 rounded-[2rem] border border-[#173f35]/12 bg-white/62 p-5 shadow-[0_18px_70px_rgb(23_63_53_/_7%)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
                Contribution graph
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Hoạt động học tập trong 53 tuần
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#64736c]">
              <span>Ít</span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span
                  key={level}
                  className={`size-3 rounded-[3px] border ${contributionColors[level]}`}
                />
              ))}
              <span>Nhiều</span>
            </div>
          </div>

          <div className="mt-2 overflow-x-auto pt-12 pb-3">
            <div className="min-w-[760px]">
              <div className="ml-8 grid grid-cols-[repeat(53,minmax(0,1fr))] gap-1.5">
                {weeks.map((week, index) => (
                  <span
                    key={week[0]?.date}
                    className="h-5 font-mono text-[9px] text-[#64736c]"
                  >
                    {monthLabel(week, index)}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex">
                <div className="mr-2 grid w-6 grid-rows-7 gap-1.5 font-mono text-[9px] text-[#64736c]">
                  <span />
                  <span>T2</span>
                  <span />
                  <span>T4</span>
                  <span />
                  <span>T6</span>
                  <span />
                </div>
                <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1.5">
                  {calendar.days.map((day) => (
                    <ContributionCell
                      key={day.date}
                      day={day}
                      future={day.date > calendar.today}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#173f35]/10 pt-5 text-sm text-[#64736c]">
            <span>
              <strong className="text-[#17221d]">{calendar.totals.review}</strong>{" "}
              lượt ôn thẻ
            </span>
            <span>
              <strong className="text-[#17221d]">{calendar.totals.coach}</strong>{" "}
              lần AI coach
            </span>
            <span>
              <strong className="text-[#17221d]">{calendar.totals.mock}</strong>{" "}
              bài phỏng vấn thử
            </span>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[2rem] border border-[#173f35]/12 bg-[#173f35] p-6 text-white sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#d7ff91] uppercase">
              Nhịp học hiện tại
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {calendar.currentStreak
                ? `${calendar.currentStreak} ngày liên tiếp`
                : "Bắt đầu một chuỗi mới"}
            </h2>
            <p className="mt-3 leading-7 text-white/65">
              Chỉ cần hoàn thành một hoạt động học tập hôm nay để giữ nhịp. Graph
              không thưởng cho việc gọi AI nhiều; mục tiêu chính vẫn là luyện tập
              đều đặn.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex rounded-2xl bg-[#d7ff91] px-5 py-3 text-sm font-bold text-[#173f35] transition hover:bg-[#c8f27b]"
            >
              Luyện thẻ hôm nay →
            </Link>
          </section>

          <section className="rounded-[2rem] border border-[#173f35]/12 bg-white/62 p-6 sm:p-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              Nhật ký gần đây
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Những ngày có hoạt động
            </h2>
            {recentDays.length ? (
              <div className="mt-5 divide-y divide-[#173f35]/10">
                {recentDays.map((day) => (
                  <div
                    key={day.date}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-semibold">{formatLongDate(day.date)}</p>
                      <p className="mt-1 text-xs text-[#64736c]">
                        {activityBreakdown(day)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#eaf8cf] px-3 py-1 font-mono text-xs font-bold text-[#245748]">
                      {day.total} hoạt động
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-[#173f35]/20 p-6 text-sm text-[#64736c]">
                Chưa có hoạt động nào trong khoảng thời gian này.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function ContributionCell({
  day,
  future,
}: {
  day: ContributionDay;
  future: boolean;
}) {
  return (
    <div className="group relative aspect-square min-w-0">
      <div
        className={`size-full rounded-[3px] border ${
          future
            ? "border-transparent bg-transparent"
            : contributionColors[day.level]
        }`}
        title={future ? undefined : `${formatLongDate(day.date)}: ${day.total} hoạt động`}
      />
      {!future ? (
        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-max max-w-64 -translate-x-1/2 rounded-xl bg-[#102f27] px-3 py-2 text-center text-[10px] leading-4 text-white shadow-xl group-hover:block">
          <strong>{day.total} hoạt động</strong> · {formatLongDate(day.date)}
          {day.total ? (
            <span className="mt-0.5 block text-white/65">
              {activityBreakdown(day)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#173f35]/12 bg-white/62 p-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#64736c] uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[#64736c]">{note}</p>
    </article>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/70"
    >
      {children}
    </Link>
  );
}

function ProfileGate({ mode }: { mode: "login" | "not-configured" }) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#173f35]/15 bg-white/70 p-8 shadow-[0_24px_80px_rgb(23_63_53_/_10%)] sm:p-10">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#173f35] font-mono font-bold text-[#d7ff91]">
          R
        </div>
        <p className="mt-8 font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
          Trang cá nhân
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Nhật ký học tập của bạn
        </h1>
        <p className="mt-4 leading-7 text-[#64736c]">
          {mode === "login"
            ? "Đăng nhập GitHub để xem contribution graph và lịch sử hoạt động riêng tư."
            : "Supabase chưa được cấu hình nên chưa thể tải nhật ký hoạt động."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {mode === "login" ? (
            <form action="/auth/login?next=%2Fprofile" method="post">
              <button className="rounded-2xl bg-[#173f35] px-5 py-3 text-sm font-bold text-white">
                Đăng nhập GitHub
              </button>
            </form>
          ) : null}
          <Link
            href="/practice"
            className="rounded-2xl border border-[#173f35]/15 bg-white px-5 py-3 text-sm font-bold"
          >
            Về trang luyện tập
          </Link>
        </div>
      </section>
    </main>
  );
}

function chunkWeeks(days: ContributionDay[]) {
  return Array.from({ length: 53 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
}

function monthLabel(week: ContributionDay[], index: number) {
  const firstOfMonth = week.find((day) => day.date.endsWith("-01"));
  if (!firstOfMonth && index > 0) return "";
  const date = firstOfMonth?.date ?? week[0]?.date;
  if (!date) return "";
  return `Thg ${Number(date.slice(5, 7))}`;
}

function activityBreakdown(day: ContributionDay) {
  return [
    day.reviewCount ? `${day.reviewCount} ôn thẻ` : null,
    day.coachCount ? `${day.coachCount} AI coach` : null,
    day.mockCount ? `${day.mockCount} phỏng vấn thử` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatMonthYear(timestamp: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}
