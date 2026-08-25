"use client";

import { useCallback, useRef, useState } from "react";

import { useDialogAccessibility } from "./accessible-dialog";

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
  cancelLabel = "Hủy",
  busyLabel = "Đang xử lý…",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  cancelLabel?: string;
  busyLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dismiss = () => {
    if (!busy) onCancel();
  };
  useDialogAccessibility({
    open: true,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    onDismiss: dismiss,
  });

  const confirmClass =
    tone === "danger"
      ? "bg-[#a65c0e] text-white hover:bg-[#c43d3d] focus:ring-[#f8d1bc]"
      : "bg-[#0f3a69] text-white hover:bg-[#16865a] focus:ring-[#65e6d2]";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] grid place-items-center bg-[#092c51]/55 p-4 backdrop-blur-sm"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        className="w-full max-w-lg rounded-[1.25rem] border border-white/35 bg-[#f8fafc] p-6 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
      >
        <span
          aria-hidden="true"
          className={`grid size-11 place-items-center rounded-2xl font-mono text-lg font-bold ${tone === "danger" ? "bg-[#fff1f1] text-[#a53f27]" : "bg-[#e6f8f5] text-[#16865a]"}`}
        >
          {tone === "danger" ? "!" : "?"}
        </span>
        <h2 id="confirmation-dialog-title" className="mt-5 text-2xl font-semibold tracking-tight text-[#0f3a69]">
          {title}
        </h2>
        <p id="confirmation-dialog-description" className="mt-3 text-sm leading-6 text-[#43546a]">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#285f86] transition hover:border-[#285f86]/35 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:ring-4 focus:outline-none disabled:cursor-wait disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
