export type EmailPasswordCredentials = {
  email: string;
  password: string;
};

export type CredentialsParseResult =
  | { ok: true; credentials: EmailPasswordCredentials }
  | { ok: false; message: string };

export type PasswordUpdateParseResult =
  | { ok: true; password: string }
  | { ok: false; message: string };

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
    return { ok: false, message: "Hãy nhập một địa chỉ email hợp lệ." };
  }
  if (normalizedPassword.length < 8) {
    return { ok: false, message: "Mật khẩu cần có ít nhất 8 ký tự." };
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
    return { ok: false, message: "Hai mật khẩu chưa trùng khớp." };
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
    return { ok: false, message: "Mật khẩu mới cần có ít nhất 8 ký tự." };
  }
  if (normalizedPassword !== stringValue(passwordConfirmation, false)) {
    return { ok: false, message: "Hai mật khẩu mới chưa trùng khớp." };
  }
  return { ok: true, password: normalizedPassword };
}

export function parseRecoveryEmail(email: FormDataEntryValue | null) {
  const normalizedEmail = stringValue(email).toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return { ok: false as const, message: "Hãy nhập một địa chỉ email hợp lệ." };
  }
  return { ok: true as const, email: normalizedEmail };
}

export function parseRecoveryCode(code: FormDataEntryValue | null) {
  const normalizedCode = stringValue(code);
  if (!/^\d{6,8}$/.test(normalizedCode)) {
    return { ok: false as const, message: "Hãy nhập mã xác minh gồm 6 đến 8 chữ số trong email." };
  }
  return { ok: true as const, code: normalizedCode };
}

export function safeAuthNext(value: FormDataEntryValue | string | null) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\")
    ? candidate
    : "/practice";
}

/**
 * Supabase deliberately returns `invalid_credentials` for both an unknown
 * email and an incorrect password. Keep that privacy boundary, while showing
 * precise recovery guidance for the other error codes it does expose.
 */
export function signInErrorMessage(code: string | undefined) {
  switch (code) {
    case "email_not_confirmed":
      return "Email này chưa được xác minh. Hãy mở email xác minh rồi đăng nhập lại.";
    case "over_request_rate_limit":
      return "Bạn đã thử đăng nhập quá nhiều lần. Hãy chờ một lát rồi thử lại.";
    case "user_banned":
      return "Tài khoản này hiện không thể đăng nhập. Hãy liên hệ quản trị viên nếu bạn cần hỗ trợ.";
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    default:
      return "Không thể đăng nhập lúc này. Hãy thử lại sau.";
  }
}

/** Preserve account-enumeration protection while surfacing genuine send failures. */
export function passwordRecoveryRequestErrorMessage(code: string | undefined) {
  switch (code) {
    case "over_email_send_rate_limit":
      return "Bạn đã yêu cầu email khôi phục quá nhiều lần. Hãy chờ một lúc rồi thử lại.";
    case "email_address_invalid":
      return "Địa chỉ email này không hợp lệ.";
    default:
      return "Chưa thể gửi email khôi phục lúc này. Hãy thử lại sau.";
  }
}

function stringValue(value: FormDataEntryValue | null, trim = true) {
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}
