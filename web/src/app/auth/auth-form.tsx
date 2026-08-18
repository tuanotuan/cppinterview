"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import { signInWithEmailPassword, signUpWithEmailPassword } from "./auth-actions";
import { initialAuthFormState } from "./auth-form-state";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
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
          aria-label="Về trang chủ cppinterview"
          title="Về trang chủ cppinterview"
          className="inline-flex items-center gap-3"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
            CI
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">cppinterview</span>
            <span className="block text-xs text-[#64736c]">Học và chuẩn bị phỏng vấn</span>
          </span>
        </Link>

        <section className="mt-9 rounded-[2rem] border border-[#173f35]/12 bg-white/80 p-5 shadow-[0_20px_60px_rgb(23_63_53_/_10%)] sm:p-7">
          <div className="grid grid-cols-2 rounded-xl bg-[#edf0e8] p-1" role="tablist" aria-label="Tài khoản cppinterview">
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
              {mode === "sign-up" ? "Tạo tài khoản cppinterview" : "Đăng nhập cppinterview"}
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              value={password}
              onChange={setPassword}
            />
            {mode === "sign-up" ? (
              <PasswordField
                name="passwordConfirmation"
                label="Nhập lại mật khẩu"
                autoComplete="new-password"
                visible={passwordsVisible}
                onToggle={() => setPasswordsVisible((current) => !current)}
                value={passwordConfirmation}
                onChange={setPasswordConfirmation}
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
          <div className="grid gap-3">
            <OAuthButton provider="google" next={next}>
              <GoogleMark />
              Tiếp tục với Google
            </OAuthButton>
            <OAuthButton provider="github" next={next}>
              <GitHubMark />
              Tiếp tục với GitHub
            </OAuthButton>
          </div>
        </section>
      </div>
    </main>
  );
}

function OAuthButton({
  provider,
  next,
  children,
}: {
  provider: "github" | "google";
  next: string;
  children: ReactNode;
}) {
  return (
    <form
      action={`/auth/login?provider=${provider}&next=${encodeURIComponent(next)}`}
      method="post"
    >
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#173f35]/18 bg-white px-4 py-3 text-sm font-bold text-[#245748] transition hover:bg-[#edf0e8] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
      >
        {children}
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 12.2c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
      <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.22l-3.14-2.51c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.59A9.74 9.74 0 0 0 12 21.7Z" />
      <path fill="#FBBC05" d="M6.54 13.86A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.86V7.55H3.3A9.68 9.68 0 0 0 2.3 12c0 1.61.39 3.14 1 4.45l3.24-2.59Z" />
      <path fill="#EA4335" d="M12 6.11c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.17 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.25l3.24 2.59C7.31 7.83 9.46 6.11 12 6.11Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.54 1.04 1.54 1.04.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.64-1.35-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-2 1.04-2.71-.1-.25-.45-1.28.1-2.67 0 0 .85-.27 2.75 1.04a9.58 9.58 0 0 1 5 0c1.9-1.31 2.75-1.04 2.75-1.04.55 1.39.2 2.42.1 2.67.65.71 1.04 1.61 1.04 2.71 0 3.85-2.35 4.7-4.58 4.95.36.31.68.9.68 1.82v2.7c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
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
  value,
  onChange,
}: {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  onToggle: () => void;
  value: string;
  onChange: (value: string) => void;
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
