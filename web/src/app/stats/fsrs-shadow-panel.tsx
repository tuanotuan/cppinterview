import {
  buildFsrsShadowCards,
  summarizeFsrsShadow,
} from "@/lib/practice/fsrs-shadow";
import type { Review } from "@/lib/practice/scheduler";

export function FsrsShadowPanel({
  questionIdentities,
  reviews,
  asOf,
}: {
  questionIdentities: Array<{
    id: string;
    version: number;
    sourceHash: string;
  }>;
  reviews: Review[];
  asOf: string;
}) {
  const shadowCards = buildFsrsShadowCards({
    questionIdentities,
    reviews,
    asOf,
  });
  const shadow = summarizeFsrsShadow(shadowCards);
  const largestDeltas = [...shadowCards]
    .filter(
      (
        card,
      ): card is (typeof shadowCards)[number] & {
        dueDeltaDays: number;
      } => card.dueDeltaDays !== null,
    )
    .sort(
      (left, right) =>
        Math.abs(right.dueDeltaDays) -
          Math.abs(left.dueDeltaDays) ||
        left.questionId.localeCompare(right.questionId),
    )
    .slice(0, 5);

  return (
    <section className="mt-5">
      <article className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/58 p-5 shadow-[0_18px_70px_rgb(15_58_105_/_7%)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              Đối chiếu bằng FSRS
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              So sánh lịch, chưa áp dụng
            </h2>
          </div>
          <span className="rounded-full border border-[#285f86]/20 bg-[#e6f8f5] px-3 py-1 font-mono text-[10px] font-bold text-[#16865a]">
            chỉ để đối chiếu
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#526276]">
          FSRS-6 chạy lại lịch sử ở chế độ quan sát. Lịch ôn hiện tại vẫn
          là nguồn quyết định duy nhất; phần này không thay đổi ngày đến hạn.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SmallMetric label="Số thẻ đã đối chiếu" value={`${shadow.cardCount}`} />
          <SmallMetric
            label="Khả năng nhớ lại trung bình"
            value={percent(shadow.averageRetrievabilityPercent)}
          />
          <SmallMetric
            label="Chênh lệch ngày đến hạn trung bình"
            value={
              shadow.averageDueDeltaDays === null
                ? "—"
                : signedDays(shadow.averageDueDeltaDays)
            }
          />
          <SmallMetric
            label="Sớm / bằng / muộn"
            value={`${shadow.earlierCount}/${shadow.sameCount}/${shadow.laterCount}`}
          />
        </div>
        {largestDeltas.length ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#0f3a69]/10">
            {largestDeltas.map((card) => (
              <div
                key={`${card.questionId}:${card.questionVersion}:${card.sourceHash}`}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#0f3a69]/8 bg-white/45 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-[#0f3a69]">
                    {card.questionId} · v{card.questionVersion}
                  </p>
                  <p className="mt-1 text-[11px] text-[#526276]">
                    Khả năng nhớ lại {card.retrievabilityPercent}% · Độ ổn định{" "}
                    {card.stability} · Độ khó {card.difficulty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">
                    {signedDays(card.dueDeltaDays)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#526276]">
                    FSRS {card.shadowDueOn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-[#0f3a69]/20 p-5 text-sm text-[#526276]">
            Chưa có lượt ôn để đối chiếu bằng FSRS.
          </p>
        )}
      </article>
    </section>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3">
      <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#526276] uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function percent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function signedDays(value: number) {
  if (value === 0) return "0 ngày";
  return `${value > 0 ? "+" : ""}${value} ngày`;
}
