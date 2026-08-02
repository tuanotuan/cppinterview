"use client";

import { useState } from "react";

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
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, field.initialValue ?? ""])),
  );

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102d26]/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-dialog-title"
        aria-describedby="input-dialog-description"
        className="w-full max-w-lg rounded-[2rem] border border-white/35 bg-[#f7f5ed] p-6 shadow-[0_28px_90px_rgba(7,33,26,0.35)] sm:p-7"
      >
        <h2 id="input-dialog-title" className="text-2xl font-semibold tracking-tight text-[#173f35]">
          {title}
        </h2>
        <p id="input-dialog-description" className="mt-3 text-sm leading-6 text-[#52645c]">
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
              <span className="text-sm font-bold text-[#173f35]">{field.label}</span>
              {field.description ? (
                <span className="mt-1 block text-xs leading-5 text-[#64736c]">
                  {field.description}
                </span>
              ) : null}
              {field.multiline ? (
                <textarea
                  required
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="mt-2 min-h-24 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#d7ff91]"
                />
              ) : (
                <input
                  required
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#d7ff91]"
                />
              )}
            </label>
          ))}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#356b58] transition hover:border-[#356b58]/35 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#173f35] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#245748] disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? "Đang xử lý…" : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
