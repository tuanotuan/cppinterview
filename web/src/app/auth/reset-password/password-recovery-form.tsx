"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { requestPasswordReset, updatePasswordFromRecovery } from "../auth-actions";
import { initialAuthFormState } from "../auth-form-state";

export function PasswordRecoveryForm({
  stage,
  initialNotice,
}: {
  stage: "request" | "update";
  initialNotice: string | null;
}) {
  const [email, setEmail] = useState("");
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    stage === "request" ? requestPasswordReset : updatePasswordFromRecovery,
    initialAuthFormState,
  );
  const notice = state.status === "idle" ? initialNotice : state.message;

  return (
    <>
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
        {stage === "request" ? "Khôi phục tài khoản" : "Đặt mật khẩu mới"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {stage === "request" ? "Quên mật khẩu?" : "Tạo mật khẩu mới"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#64736c]">
        {stage === "request"
          ? "Nhập email đã đăng ký. Nếu tài khoản tồn tại, bạn sẽ nhận được email khôi phục."
          : "Chọn mật khẩu mới cho tài khoản của bạn."}
      </p>

      <form action={action} className="mt-6 space-y-4">
        {stage === "request" ? (
          <label className="block text-sm font-bold text-[#245748]">
            Email
            <input required name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[#173f35]/18 bg-white px-3 text-base font-normal outline-none transition placeholder:text-[#839087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55" />
          </label>
        ) : (
          <>
            <PasswordInput name="password" label="Mật khẩu mới" value={password} visible={passwordsVisible} onChange={setPassword} onToggle={() => setPasswordsVisible((current) => !current)} />
            <PasswordInput name="passwordConfirmation" label="Nhập lại mật khẩu mới" value={passwordConfirmation} visible={passwordsVisible} onChange={setPasswordConfirmation} onToggle={() => setPasswordsVisible((current) => !current)} />
          </>
        )}

        {notice ? <p aria-live="polite" className={(state.status === "success" ? "bg-[#e5f6c5] text-[#245748]" : "bg-[#fff1e8] text-[#8e3825]") + " rounded-xl px-3 py-3 text-sm leading-6"}>{notice}</p> : null}

        <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#173f35] px-4 py-3 text-sm font-bold text-[#d7ff91] transition hover:bg-[#245748] disabled:cursor-wait disabled:opacity-65 focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none">
          {pending ? "Đang xử lý…" : stage === "request" ? "Gửi email khôi phục" : "Lưu mật khẩu mới"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#64736c]"><Link href="/auth" className="font-bold text-[#245748] underline underline-offset-4">Quay lại đăng nhập</Link></p>
    </>
  );
}

function PasswordInput({ name, label, value, visible, onChange, onToggle }: { name: string; label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return <label className="block text-sm font-bold text-[#245748]">{label}<span className="relative mt-2 block"><input required name={name} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ít nhất 8 ký tự" className="min-h-12 w-full rounded-xl border border-[#173f35]/18 bg-white py-2 pl-3 pr-16 text-base font-normal outline-none transition placeholder:text-[#839087] focus:border-[#356b58] focus:ring-4 focus:ring-[#d7ff91]/55" /><button type="button" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible} onClick={onToggle} className="absolute inset-y-1 right-1 rounded-lg px-3 text-xs font-bold text-[#356b58] transition hover:bg-[#edf0e8] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none">{visible ? "Ẩn" : "Hiện"}</button></span></label>;
}
