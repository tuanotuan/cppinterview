"use server";

import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import {
  defaultLocale,
  isLocale,
  localeFromPathname,
  localizeHref,
  type Locale,
} from "@/i18n/routing";
import {
  parseEmailPasswordCredentials,
  parsePasswordUpdate,
  parseRecoveryCode,
  parseRecoveryEmail,
  passwordRecoveryRequestErrorCode,
  passwordSaveFailureCode,
  parseSignUpCredentials,
  safeAuthNext,
  signInErrorCode,
} from "@/lib/supabase/email-password";
import { readPasswordCapability } from "@/lib/supabase/password-capability.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthActionCode, AuthFormState } from "./auth-form-state";

const passwordRecoveryEmailCookie = "cppinterview_recovery_email";
const passwordRecoveryCookiePath = "/";

export async function signInWithEmailPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parseEmailPasswordCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.credentials);
  if (error) {
    return localizedState(locale, "error", signInErrorCode(error?.code));
  }

  redirect(safeAuthNext(formData.get("next"), locale));
}

export async function signUpWithEmailPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parseSignUpCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const next = safeAuthNext(formData.get("next"), locale);
  const supabase = await createSupabaseServerClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.credentials,
    options: origin
      ? { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` }
      : undefined,
  });
  if (error || !data.user) {
    return localizedState(locale, "error", "signUpFailed");
  }
  if (data.session) redirect(next);

  return localizedState(locale, "success", "verificationSent");
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parseRecoveryEmail(formData.get("email"));
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const origin = await requestOrigin();
  if (!origin) {
    return localizedState(locale, "error", "recoveryPrepareFailed");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(localizeHref("/auth/reset-password?stage=update", locale))}`,
  });
  if (error) {
    return localizedState(
      locale,
      "error",
      passwordRecoveryRequestErrorCode(error.code),
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(passwordRecoveryEmailCookie, parsed.email, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: passwordRecoveryCookiePath,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(localizeHref("/auth/reset-password?stage=verify", locale));
}

export async function verifyPasswordRecoveryCode(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parseRecoveryCode(formData.get("code"));
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const cookieStore = await cookies();
  const email = cookieStore.get(passwordRecoveryEmailCookie)?.value;
  if (!email) {
    return localizedState(locale, "error", "recoveryExpired");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.code,
    type: "recovery",
  });
  if (error) {
    return localizedState(locale, "error", "recoveryOtpInvalid");
  }

  cookieStore.set(passwordRecoveryEmailCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: passwordRecoveryCookiePath,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(localizeHref("/auth/reset-password?stage=update", locale));
}

export async function updatePasswordFromRecovery(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parsePasswordUpdate({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return localizedState(locale, "error", "recoveryLinkInvalid");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    return localizedState(locale, "error", "passwordUpdateFailed");
  }

  await supabase.auth.signOut();
  redirect(localizeHref("/auth?auth=password-updated", locale));
}

/** Let an authenticated account add or change its password in place. */
export async function setPasswordForSignedInUser(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = actionLocale(formData);
  const parsed = parsePasswordUpdate({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.ok) return localizedState(locale, "error", parsed.code);

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) {
    return localizedState(locale, "error", "providerSignInRequired");
  }

  const passwordCapability = await readPasswordCapability(
    supabase,
    authData.user,
  );
  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    const failureCode = passwordSaveFailureCode(error.code);
    if (failureCode) return localizedState(locale, "error", failureCode);
  }

  const successCode =
    passwordCapability.hasPassword || error?.code === "same_password"
      ? "passwordChanged"
      : "passwordAdded";
  return localizedState(locale, "success", successCode);
}

function actionLocale(formData: FormData): Locale {
  const requested = formData.get("locale");
  if (typeof requested === "string" && isLocale(requested)) return requested;
  const next = formData.get("next");
  if (typeof next === "string") {
    return localeFromPathname(next) ?? defaultLocale;
  }
  return defaultLocale;
}

async function localizedState(
  locale: Locale,
  status: "error" | "success",
  code: AuthActionCode,
): Promise<AuthFormState> {
  const t = await getTranslations({ locale, namespace: "Auth.actions" });
  return { status, code, message: t(code) };
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const fromOrigin = parseHttpOrigin(requestHeaders.get("origin"));
  if (fromOrigin) return fromOrigin;

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host || /[\s/\\]/.test(host)) return null;
  const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  return parseHttpOrigin(`${protocol}://${host}`);
}

function parseHttpOrigin(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}
