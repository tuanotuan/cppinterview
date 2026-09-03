"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

import { initialAuthFormState } from "../auth-form-state";
import { setPasswordForSignedInUser } from "../auth-actions";

export function SetPasswordForm({
  initialHasPassword,
}: {
  initialHasPassword: boolean;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [state, action, pending] = useActionState(
    setPasswordForSignedInUser,
    initialAuthFormState,
  );
  const hasPassword =
    initialHasPassword ||
    state.code === "passwordAdded" ||
    state.code === "passwordChanged";

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
  }, [state.code, state.status]);

  return (
    <>
      <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
        {t("setPassword.eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t(hasPassword ? "setPassword.changeTitle" : "setPassword.setTitle")}
      </h1>

      <form ref={formRef} action={action} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <PasswordField
          name="password"
          label={t("recovery.newPassword")}
          visible={passwordsVisible}
          onToggle={() => setPasswordsVisible((current) => !current)}
        />
        <PasswordField
          name="passwordConfirmation"
          label={t("recovery.confirmNewPassword")}
          visible={passwordsVisible}
          onToggle={() => setPasswordsVisible((current) => !current)}
        />

        {state.status !== "idle" ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            aria-atomic="true"
            className={
              "rounded-xl px-3 py-3 text-sm leading-6 " +
              (state.status === "success"
                ? "bg-[#e2f5ec] text-[#16865a]"
                : "bg-[#fff1f1] text-[#c43d3d]")
            }
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0f3a69] px-4 py-3 text-sm font-bold text-[#65e6d2] transition hover:bg-[#16865a] disabled:cursor-wait disabled:opacity-65 focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          {pending
            ? t("setPassword.saving")
            : t(hasPassword ? "setPassword.change" : "setPassword.add")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#526276]">
        <Link href="/profile" className="font-bold text-[#16865a] underline underline-offset-4">
          {t("setPassword.back")}
        </Link>
      </p>
    </>
  );
}

function PasswordField({
  name,
  label,
  visible,
  onToggle,
}: {
  name: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Auth.form");
  return (
    <label className="block text-sm font-bold text-[#16865a]">
      {label}
      <span className="relative mt-2 block">
        <input
          required
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          placeholder={t("passwordPlaceholder")}
          className="min-h-12 w-full rounded-xl border border-[#0f3a69]/18 bg-white py-2 pl-3 pr-16 text-base font-normal outline-none transition placeholder:text-[#718096] focus:border-[#285f86] focus:ring-4 focus:ring-[#65e6d2]/55"
        />
        <button
          type="button"
          aria-label={visible ? t("hidePassword", { label }) : t("showPassword", { label })}
          aria-pressed={visible}
          onClick={onToggle}
          className="absolute inset-y-1 right-1 rounded-lg px-3 text-xs font-bold text-[#285f86] transition hover:bg-[#eaf2f8] focus-visible:ring-4 focus-visible:ring-[#65e6d2] focus-visible:outline-none"
        >
          {visible ? t("hide") : t("show")}
        </button>
      </span>
    </label>
  );
}
