"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  parseEmailPasswordCredentials,
  parsePasswordUpdate,
  parseRecoveryCode,
  parseRecoveryEmail,
  passwordRecoveryRequestErrorMessage,
  parseSignUpCredentials,
  safeAuthNext,
  signInErrorMessage,
} from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthFormState } from "./auth-form-state";

const passwordRecoveryEmailCookie = "cppinterview_recovery_email";
const passwordRecoveryCookiePath = "/auth/reset-password";

export async function signInWithEmailPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseEmailPasswordCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.credentials);
  if (error) {
    return {
      status: "error",
      message: signInErrorMessage(error?.code),
    };
  }

  redirect(safeAuthNext(formData.get("next")));
}

export async function signUpWithEmailPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseSignUpCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const next = safeAuthNext(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.credentials,
    options: origin
      ? { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` }
      : undefined,
  });
  if (error || !data.user) {
    return {
      status: "error",
      message: "Chưa thể tạo tài khoản. Hãy kiểm tra lại thông tin và thử lại sau.",
    };
  }
  if (data.session) redirect(next);

  return {
    status: "success",
    message: "Hãy mở email để xác minh tài khoản, rồi quay lại đăng nhập.",
  };
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseRecoveryEmail(formData.get("email"));
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const origin = await requestOrigin();
  if (!origin) {
    return {
      status: "error",
      message: "Chưa thể chuẩn bị liên kết khôi phục. Hãy thử lại sau.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/auth/reset-password?stage=update")}`,
  });
  if (error) {
    return { status: "error", message: passwordRecoveryRequestErrorMessage(error.code) };
  }

  const cookieStore = await cookies();
  cookieStore.set(passwordRecoveryEmailCookie, parsed.email, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: passwordRecoveryCookiePath,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/auth/reset-password?stage=verify");
}

export async function verifyPasswordRecoveryCode(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseRecoveryCode(formData.get("code"));
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const cookieStore = await cookies();
  const email = cookieStore.get(passwordRecoveryEmailCookie)?.value;
  if (!email) {
    return {
      status: "error",
      message: "Phiên khôi phục đã hết hạn. Hãy yêu cầu gửi mã mới.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.code,
    type: "recovery",
  });
  if (error) {
    return {
      status: "error",
      message: "Mã không đúng hoặc đã hết hạn. Hãy kiểm tra lại email hoặc yêu cầu mã mới.",
    };
  }

  cookieStore.set(passwordRecoveryEmailCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: passwordRecoveryCookiePath,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/auth/reset-password?stage=update");
}

export async function updatePasswordFromRecovery(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parsePasswordUpdate({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      status: "error",
      message: "Liên kết khôi phục không còn hợp lệ. Hãy yêu cầu một email khôi phục mới.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    return {
      status: "error",
      message: "Chưa thể đổi mật khẩu. Liên kết có thể đã hết hạn; hãy yêu cầu email khôi phục mới.",
    };
  }

  await supabase.auth.signOut();
  redirect("/auth?auth=password-updated");
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
