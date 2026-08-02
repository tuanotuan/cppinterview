"use client";

import { useCallback, useState } from "react";

type ConfirmationRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
};

export function useConfirmation() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const requestConfirmation = useCallback((next: ConfirmationRequest) => {
    setRequest(next);
  }, []);

  const dialog = request ? (
    <ConfirmationDialog
      title={request.title}
      description={request.description}
      confirmLabel={request.confirmLabel}
      tone={request.tone}
      busy={busy}
      onCancel={() => {
        if (!busy) setRequest(null);
      }}
      onConfirm={() => {
        setBusy(true);
        Promise.resolve(request.onConfirm())
          .catch(() => undefined)
          .finally(() => {
            setBusy(false);
            setRequest(null);
          });
      }}
    />
  ) : null;

  return { requestConfirmation, confirmationDialog: dialog };
}

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  tone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmClass =
    tone === "danger"
      ? "bg-[#ba4b2f] text-white hover:bg-[#963a25] focus:ring-[#f8d1bc]"
      : "bg-[#173f35] text-white hover:bg-[#245748] focus:ring-[#d7ff91]";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] grid place-items-center bg-[#102d26]/55 p-4 backdrop-blur-sm"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        className="w-full max-w-lg rounded-[2rem] border border-white/35 bg-[#f7f5ed] p-6 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
      >
        <span
          aria-hidden="true"
          className={`grid size-11 place-items-center rounded-2xl font-mono text-lg font-bold ${tone === "danger" ? "bg-[#f8e8df] text-[#a53f27]" : "bg-[#eaf4df] text-[#245748]"}`}
        >
          {tone === "danger" ? "!" : "?"}
        </span>
        <h2 id="confirmation-dialog-title" className="mt-5 text-2xl font-semibold tracking-tight text-[#173f35]">
          {title}
        </h2>
        <p id="confirmation-dialog-description" className="mt-3 text-sm leading-6 text-[#52645c]">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#356b58] transition hover:border-[#356b58]/35 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:ring-4 focus:outline-none disabled:cursor-wait disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
