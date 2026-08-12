"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  initialAuthFormState,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from "./auth-actions";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({
  initialMode,
  initialNotice,
  next,
}: {
  initialMode: AuthMode;
  initialNotice: string | null;
  next: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmailPassword,
    initialAuthFormState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmailPassword,
    initialAuthFormState,
  );
  const state = mode === "sign-up" ? signUpState : signInState;
  const pending = mode === "sign-up" ? signUpPending : signInPending;

  return (
    <main className="min-h-screen bg-[#f5f6ed] px-4 py-7 text-[#17221d] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          aria-label="Về trang chủ Recall"
          title="Về trang chủ Recall"
          className="inline-flex items-center gap-3"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
            R
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">Recall</span>
            <span className="block text-xs text-[#64736c]">Học và chuẩn bị phỏng vấn</span>
          </span>
        </Link>

        <section className="mt-9 rounded-[2rem] border border-[#173f35]/12 bg-white/80 p-5 shadow-[0_20px_60px_rgb(23_63_53_/_10%)] sm:p-7">
          <div className="grid grid-cols-2 rounded-xl bg-[#edf0e8] p-1" role="tablist" aria-label="Tài khoản Recall">
            <ModeButton active={mode === "sign-in"} onClick={() => setMode("sign-in")}>
              Đăng nhập
            </ModeButton>
            <ModeButton active={mode === "sign-up"} onClick={() => setMode("sign-up")}>
              Tạo tài khoản
            </ModeButton>
          </div>

          <div className="mt-7">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
              {mode === "sign-up" ? "Tài khoản mới" : "Chào mừng trở lại"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {mode === "sign-up" ? "Tạo tài khoản Recall" : "Đăng nhập Recall"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#64736c]">
              {mode === "sign-up"
                ? "Dùng email và mật khẩu để lưu tiến độ riêng giữa các thiết bị."
                : "Đăng nhập để tiếp tục lịch học, thư viện và lịch sử của bạn."}
            </p>
          </div>

          {initialNotice ? (
            <p role="alert" className="mt-5 rounded-xl bg-[#fff1e8] px-3 py-3 text-sm leading-6 text-[#8e3825]">
              {initialNotice}
            </p>
          ) : null}

          <form
            action={mode === "sign-up" ? signUpAction : signInAction}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm font-bold text-[#245748]">
              Email
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="mt-2 min-h-12 w-full rounded-xl border border-[#173f35]/18 bg-white px-3 text-base font-normal outline-none transition placeholder:text-[#839087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55"
                placeholder="ban@example.com"
              />
            </label>
            <PasswordField
              name="password"
              label="Mật khẩu"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              visible={passwordsVisible}
              onToggle={() => setPasswordsVisible((current) => !current)}
            />
            {mode === "sign-up" ? (
              <PasswordField
                name="passwordConfirmation"
                label="Nhập lại mật khẩu"
                autoComplete="new-password"
                visible={passwordsVisible}
                onToggle={() => setPasswordsVisible((current) => !current)}
              />
            ) : null}

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
              {pending
                ? "Đang xử lý…"
                : mode === "sign-up"
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-medium text-[#839087]">
            <span className="h-px flex-1 bg-[#173f35]/12" />
            hoặc
            <span className="h-px flex-1 bg-[#173f35]/12" />
          </div>
          <form action={`/auth/login?next=${encodeURIComponent(next)}`} method="post">
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#173f35]/18 bg-white px-4 py-3 text-sm font-bold text-[#245748] transition hover:bg-[#edf0e8] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            >
              Tiếp tục với GitHub
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "min-h-10 rounded-lg px-2 text-sm font-bold transition focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none " +
        (active ? "bg-white text-[#173f35] shadow-sm" : "text-[#64736c]")
      }
    >
      {children}
    </button>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  visible,
  onToggle,
}: {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
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
          autoComplete={autoComplete}
          minLength={8}
          className="min-h-12 w-full rounded-xl border border-[#173f35]/18 bg-white py-2 pl-3 pr-16 text-base font-normal outline-none transition placeholder:text-[#839087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55"
          placeholder="Ít nhất 8 ký tự"
        />
        <button
          type="button"
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
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
