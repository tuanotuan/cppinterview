"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  parseEmailPasswordCredentials,
  parseSignUpCredentials,
  safeAuthNext,
} from "@/lib/supabase/email-password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthFormState } from "./auth-form-state";

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
      message:
        "Email hoặc mật khẩu chưa đúng. Chưa có tài khoản? Chọn “Tạo tài khoản”. Vừa đăng ký? Hãy xác minh email trước.",
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
