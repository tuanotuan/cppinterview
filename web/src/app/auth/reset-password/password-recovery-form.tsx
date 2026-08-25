"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Link } from "@/i18n/navigation";

import { requestPasswordReset, updatePasswordFromRecovery, verifyPasswordRecoveryCode } from "../auth-actions";
import { initialAuthFormState } from "../auth-form-state";

export function PasswordRecoveryForm({
  stage,
  initialNotice,
}: {
  stage: "request" | "verify" | "update";
  initialNotice: string | null;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    stage === "request"
      ? requestPasswordReset
      : stage === "verify"
        ? verifyPasswordRecoveryCode
        : updatePasswordFromRecovery,
    initialAuthFormState,
  );
  const notice = state.status === "idle" ? initialNotice : state.message;

  return (
    <>
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
        {stage === "request"
          ? t("recovery.requestEyebrow")
          : stage === "verify"
            ? t("recovery.verifyEyebrow")
            : t("recovery.updateEyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {stage === "request"
          ? t("recovery.requestTitle")
          : stage === "verify"
            ? t("recovery.verifyTitle")
            : t("recovery.updateTitle")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#526276]">
        {stage === "request"
          ? t("recovery.requestDescription")
          : stage === "verify"
            ? t("recovery.verifyDescription")
            : t("recovery.updateDescription")}
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {stage === "request" ? (
          <label className="block text-sm font-bold text-[#16865a]">
            Email
            <input required name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[#0f3a69]/18 bg-white px-3 text-base font-normal outline-none transition placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/55" />
          </label>
        ) : stage === "verify" ? (
          <label className="block text-sm font-bold text-[#16865a]">
            {t("recovery.code")}
            <input required name="code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={t("recovery.codePlaceholder")} className="mt-2 min-h-12 w-full rounded-xl border border-[#0f3a69]/18 bg-white px-3 font-mono text-base font-normal tracking-[0.18em] outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/55" />
          </label>
        ) : (
          <>
            <PasswordInput name="password" label={t("recovery.newPassword")} value={password} visible={passwordsVisible} onChange={setPassword} onToggle={() => setPasswordsVisible((current) => !current)} />
            <PasswordInput name="passwordConfirmation" label={t("recovery.confirmNewPassword")} value={passwordConfirmation} visible={passwordsVisible} onChange={setPasswordConfirmation} onToggle={() => setPasswordsVisible((current) => !current)} />
          </>
        )}

        {notice ? <p aria-live="polite" className={(state.status === "success" ? "bg-[#e2f5ec] text-[#16865a]" : "bg-[#fff1f1] text-[#c43d3d]") + " rounded-xl px-3 py-3 text-sm leading-6"}>{notice}</p> : null}

        <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0f3a69] px-4 py-3 text-sm font-bold text-[#65e6d2] transition hover:bg-[#16865a] disabled:cursor-wait disabled:opacity-65 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none">
          {pending ? t("form.processing") : stage === "request" ? t("recovery.send") : stage === "verify" ? t("recovery.verify") : t("recovery.save")}
        </button>
      </form>
      {stage === "verify" ? <p className="mt-4 text-center text-sm text-[#526276]"><Link href="/auth/reset-password" className="font-bold text-[#16865a] underline underline-offset-4">{t("recovery.otherEmail")}</Link></p> : null}
      <p className="mt-6 text-center text-sm text-[#526276]"><Link href="/auth" className="font-bold text-[#16865a] underline underline-offset-4">{t("recovery.back")}</Link></p>
    </>
  );
}

function PasswordInput({ name, label, value, visible, onChange, onToggle }: { name: string; label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  const t = useTranslations("Auth.form");
  return <label className="block text-sm font-bold text-[#16865a]">{label}<span className="relative mt-2 block"><input required name={name} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder={t("passwordPlaceholder")} className="min-h-12 w-full rounded-xl border border-[#0f3a69]/18 bg-white py-2 pl-3 pr-16 text-base font-normal outline-none transition placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/55" /><button type="button" aria-label={visible ? t("hidePassword", { label }) : t("showPassword", { label })} aria-pressed={visible} onClick={onToggle} className="absolute inset-y-1 right-1 rounded-lg px-3 text-xs font-bold text-[#285f86] transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none">{visible ? t("hide") : t("show")}</button></span></label>;
}
