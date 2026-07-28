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
      <article className="rounded-[2rem] border border-[#173f35]/12 bg-white/58 p-5 shadow-[0_18px_70px_rgb(23_63_53_/_7%)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              FSRS shadow
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              So lịch, chưa đổi lịch
            </h2>
          </div>
          <span className="rounded-full border border-[#356b58]/20 bg-[#eaf8cf] px-3 py-1 font-mono text-[10px] font-bold text-[#245748]">
            shadow only
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#64736c]">
          FSRS-6 chạy lại lịch sử ở chế độ quan sát. Lịch Anki hiện tại vẫn
          là nguồn quyết định duy nhất; panel này không ghi due date.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SmallMetric label="Thẻ so được" value={`${shadow.cardCount}`} />
          <SmallMetric
            label="Retrievability TB"
            value={percent(shadow.averageRetrievabilityPercent)}
          />
          <SmallMetric
            label="Delta TB"
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
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#173f35]/10">
            {largestDeltas.map((card) => (
              <div
                key={`${card.questionId}:${card.questionVersion}:${card.sourceHash}`}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#173f35]/8 bg-white/45 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-[#173f35]">
                    {card.questionId} · v{card.questionVersion}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64736c]">
                    R {card.retrievabilityPercent}% · S {card.stability} · D{" "}
                    {card.difficulty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">
                    {signedDays(card.dueDeltaDays)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#64736c]">
                    FSRS {card.shadowDueOn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-[#173f35]/20 p-5 text-sm text-[#64736c]">
            Chưa có review để chạy shadow.
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
    <div className="rounded-2xl bg-[#f4f3ec] p-3">
      <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#64736c] uppercase">
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
