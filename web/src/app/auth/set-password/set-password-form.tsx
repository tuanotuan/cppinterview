"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { initialAuthFormState } from "../auth-form-state";
import { setPasswordForSignedInUser } from "../auth-actions";

export function SetPasswordForm() {
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    setPasswordForSignedInUser,
    initialAuthFormState,
  );

  return (
    <>
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
        Bảo mật tài khoản
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Đặt mật khẩu đăng nhập</h1>
      <p className="mt-3 text-sm leading-6 text-[#64736c]">
        Tài khoản đăng nhập bằng Google hoặc GitHub có thể thêm mật khẩu tại đây.
        Bạn cần đăng nhập nhà cung cấp trước khi lưu mật khẩu.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <PasswordField
          name="password"
          label="Mật khẩu mới"
          value={password}
          visible={passwordsVisible}
          onChange={setPassword}
          onToggle={() => setPasswordsVisible((current) => !current)}
        />
        <PasswordField
          name="passwordConfirmation"
          label="Nhập lại mật khẩu mới"
          value={passwordConfirmation}
          visible={passwordsVisible}
          onChange={setPasswordConfirmation}
          onToggle={() => setPasswordsVisible((current) => !current)}
        />

        {state.status !== "idle" ? (
          <p
            aria-live="polite"
            className={
              "rounded-xl px-3 py-3 text-sm leading-6 " +
              (state.status === "success"
                ? "bg-[#e5f6c5] text-[#245748]"
                : "bg-[#fff1e8] text-[#8e3825]")
            }
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#173f35] px-4 py-3 text-sm font-bold text-[#d7ff91] transition hover:bg-[#245748] disabled:cursor-wait disabled:opacity-65 focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
        >
          {pending ? "Đang lưu…" : "Lưu mật khẩu"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#64736c]">
        <Link href="/profile" className="font-bold text-[#245748] underline underline-offset-4">
          Quay lại hồ sơ
        </Link>
      </p>
    </>
  );
}

function PasswordField({
  name,
  label,
  value,
  visible,
  onChange,
  onToggle,
}: {
  name: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block text-sm font-bold text-[#245748]">
      {label}
      <span className="relative mt-2 block">
        <input
          required
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ít nhất 8 ký tự"
          className="min-h-12 w-full rounded-xl border border-[#173f35]/18 bg-white py-2 pl-3 pr-16 text-base font-normal outline-none transition placeholder:text-[#839087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55"
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={onToggle}
          className="absolute inset-y-1 right-1 rounded-lg px-3 text-xs font-bold text-[#356b58] transition hover:bg-[#edf0e8] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </span>
    </label>
  );
}
