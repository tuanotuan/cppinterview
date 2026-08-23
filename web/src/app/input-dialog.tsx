"use client";

import { useCallback, useRef, useState } from "react";

import { useDialogAccessibility } from "./accessible-dialog";

export type InputDialogField = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  multiline?: boolean;
};

export function InputDialog({
  title,
  description,
  fields,
  submitLabel,
  busy = false,
  onCancel,
  onSubmit,
}: {
  title: string;
  description: string;
  fields: InputDialogField[];
  submitLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const firstInputRef = useRef<HTMLElement>(null);
  const setFirstInputRef = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      firstInputRef.current = element;
    },
    [],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, field.initialValue ?? ""])),
  );
  useDialogAccessibility({
    open: true,
    dialogRef,
    initialFocusRef: firstInputRef,
    onDismiss: () => {
      if (!busy) onCancel();
    },
  });

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#092c51]/55 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-dialog-title"
        aria-describedby="input-dialog-description"
        className="w-full max-w-lg rounded-[1.25rem] border border-white/35 bg-[#f8fafc] p-6 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
      >
        <h2 id="input-dialog-title" className="text-2xl font-semibold tracking-tight text-[#0f3a69]">
          {title}
        </h2>
        <p id="input-dialog-description" className="mt-3 text-sm leading-6 text-[#43546a]">
          {description}
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
        >
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="text-sm font-bold text-[#0f3a69]">{field.label}</span>
              {field.description ? (
                <span className="mt-1 block text-xs leading-5 text-[#526276]">
                  {field.description}
                </span>
              ) : null}
              {field.multiline ? (
                <textarea
                  ref={field === fields[0] ? setFirstInputRef : undefined}
                  required
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="mt-2 min-h-24 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#65e6d2]"
                />
              ) : (
                <input
                  ref={field === fields[0] ? setFirstInputRef : undefined}
                  required
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#0f3a69]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#65e6d2]"
                />
              )}
            </label>
          ))}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-[#0f3a69]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#285f86] transition hover:border-[#285f86]/35 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#0f3a69] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#16865a] disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? "Đang xử lý…" : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
