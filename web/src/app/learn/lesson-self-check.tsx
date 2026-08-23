"use client";

import { useState } from "react";

export function LessonSelfCheck({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  if (!items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#0f3a69]/20 p-5 text-sm text-[#526276]">
        Bài này chưa có danh sách tự kiểm tra trong nguồn.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {items.slice(0, 8).map((item, index) => (
          <label
            key={`${index}:${item}`}
            className="flex cursor-pointer gap-3 rounded-xl border border-[#0f3a69]/10 bg-white/65 p-3 text-sm leading-6"
          >
            <input
              type="checkbox"
              checked={checked.has(index)}
              onChange={(event) =>
                setChecked((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(index);
                  else next.delete(index);
                  return next;
                })
              }
              className="mt-1 size-4"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-[#526276]">
        Đã tự kiểm tra {checked.size}/{Math.min(8, items.length)} mục
      </p>
    </div>
  );
}
