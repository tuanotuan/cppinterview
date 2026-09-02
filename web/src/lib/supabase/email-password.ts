import {
  defaultLocale,
  localeFromPathname,
  localizeHref,
  type Locale,
} from "@/i18n/routing";

export type EmailPasswordCredentials = {
  email: string;
  password: string;
};

export type CredentialsParseResult =
  | { ok: true; credentials: EmailPasswordCredentials }
  | { ok: false; code: AuthInputErrorCode; message: string };

export type PasswordUpdateParseResult =
  | { ok: true; password: string }
  | { ok: false; code: AuthInputErrorCode; message: string };

export type AuthInputErrorCode =
  | "invalidEmail"
  | "passwordTooShort"
  | "passwordMismatch"
  | "newPasswordTooShort"
  | "newPasswordMismatch"
  | "recoveryCodeInvalid";

export type PasswordSaveFailureCode =
  | "passwordWeak"
  | "passwordReauthenticationRequired"
  | "passwordSaveRateLimited"
  | "passwordSaveFailed";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailPasswordCredentials({
  email,
  password,
}: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
}): CredentialsParseResult {
  const normalizedEmail = stringValue(email).toLowerCase();
  const normalizedPassword = stringValue(password, false);

  if (!emailPattern.test(normalizedEmail)) {
    return {
      ok: false,
      code: "invalidEmail",
      message: "Hãy nhập một địa chỉ email hợp lệ.",
    };
  }
  if (normalizedPassword.length < 8) {
    return {
      ok: false,
      code: "passwordTooShort",
      message: "Mật khẩu cần có ít nhất 8 ký tự.",
    };
  }

  return {
    ok: true,
    credentials: { email: normalizedEmail, password: normalizedPassword },
  };
}

export function parseSignUpCredentials({
  email,
  password,
  passwordConfirmation,
}: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  passwordConfirmation: FormDataEntryValue | null;
}): CredentialsParseResult {
  const parsed = parseEmailPasswordCredentials({ email, password });
  if (!parsed.ok) return parsed;

  if (parsed.credentials.password !== stringValue(passwordConfirmation, false)) {
    return {
      ok: false,
      code: "passwordMismatch",
      message: "Hai mật khẩu chưa trùng khớp.",
    };
  }

  return parsed;
}

export function parsePasswordUpdate({
  password,
  passwordConfirmation,
}: {
  password: FormDataEntryValue | null;
  passwordConfirmation: FormDataEntryValue | null;
}): PasswordUpdateParseResult {
  const normalizedPassword = stringValue(password, false);
  if (normalizedPassword.length < 8) {
    return {
      ok: false,
      code: "newPasswordTooShort",
      message: "Mật khẩu mới cần có ít nhất 8 ký tự.",
    };
  }
  if (normalizedPassword !== stringValue(passwordConfirmation, false)) {
    return {
      ok: false,
      code: "newPasswordMismatch",
      message: "Hai mật khẩu mới chưa trùng khớp.",
    };
  }
  return { ok: true, password: normalizedPassword };
}

export function parseRecoveryEmail(email: FormDataEntryValue | null) {
  const normalizedEmail = stringValue(email).toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return {
      ok: false as const,
      code: "invalidEmail" as const,
      message: "Hãy nhập một địa chỉ email hợp lệ.",
    };
  }
  return { ok: true as const, email: normalizedEmail };
}

export function parseRecoveryCode(code: FormDataEntryValue | null) {
  const normalizedCode = stringValue(code);
  if (!/^\d{6,8}$/.test(normalizedCode)) {
    return {
      ok: false as const,
      code: "recoveryCodeInvalid" as const,
      message: "Hãy nhập mã xác minh gồm 6 đến 8 chữ số trong email.",
    };
  }
  return { ok: true as const, code: normalizedCode };
}

export function safeAuthNext(
  value: FormDataEntryValue | string | null,
  locale: Locale = defaultLocale,
) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/u.test(candidate)
  ) {
    return localizeHref("/practice", locale);
  }
  if (
    candidate === "/admin" ||
    candidate.startsWith("/admin/") ||
    candidate === "/worldquant" ||
    candidate.startsWith("/worldquant/")
  ) {
    return candidate;
  }
  return localeFromPathname(candidate)
    ? candidate
    : localizeHref(candidate, locale);
}

/**
 * Supabase deliberately returns `invalid_credentials` for both an unknown
 * email and an incorrect password. Keep that privacy boundary, while showing
 * precise recovery guidance for the other error codes it does expose.
 */
export function signInErrorMessage(code: string | undefined) {
  switch (signInErrorCode(code)) {
    case "emailNotConfirmed":
      return "Email này chưa được xác minh. Hãy mở email xác minh rồi đăng nhập lại.";
    case "signInRateLimited":
      return "Bạn đã thử đăng nhập quá nhiều lần. Hãy chờ một lát rồi thử lại.";
    case "userBanned":
      return "Tài khoản này hiện không thể đăng nhập. Hãy liên hệ quản trị viên nếu bạn cần hỗ trợ.";
    case "invalidCredentials":
      return "Email hoặc mật khẩu không đúng.";
    default:
      return "Không thể đăng nhập lúc này. Hãy thử lại sau.";
  }
}

export function signInErrorCode(code: string | undefined) {
  switch (code) {
    case "email_not_confirmed":
      return "emailNotConfirmed" as const;
    case "over_request_rate_limit":
      return "signInRateLimited" as const;
    case "user_banned":
      return "userBanned" as const;
    case "invalid_credentials":
      return "invalidCredentials" as const;
    default:
      return "signInFailed" as const;
  }
}

/** Preserve account-enumeration protection while surfacing genuine send failures. */
export function passwordRecoveryRequestErrorMessage(code: string | undefined) {
  switch (passwordRecoveryRequestErrorCode(code)) {
    case "recoveryEmailRateLimited":
      return "Bạn đã yêu cầu email khôi phục quá nhiều lần. Hãy chờ một lúc rồi thử lại.";
    case "recoveryEmailInvalid":
      return "Địa chỉ email này không hợp lệ.";
    default:
      return "Chưa thể gửi email khôi phục lúc này. Hãy thử lại sau.";
  }
}

export function passwordRecoveryRequestErrorCode(code: string | undefined) {
  switch (code) {
    case "over_email_send_rate_limit":
      return "recoveryEmailRateLimited" as const;
    case "email_address_invalid":
      return "recoveryEmailInvalid" as const;
    default:
      return "recoverySendFailed" as const;
  }
}

/**
 * Resolve a Supabase Auth error from adding or changing a password while the
 * user is signed in. `same_password` means the requested end state already
 * exists, so callers can complete the operation idempotently.
 */
export function passwordSaveFailureCode(
  code: string | undefined,
): PasswordSaveFailureCode | null {
  switch (code) {
    case "same_password":
      return null;
    case "weak_password":
      return "passwordWeak";
    case "reauthentication_needed":
      return "passwordReauthenticationRequired";
    case "over_request_rate_limit":
      return "passwordSaveRateLimited";
    default:
      return "passwordSaveFailed";
  }
}

function stringValue(value: FormDataEntryValue | null, trim = true) {
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}
