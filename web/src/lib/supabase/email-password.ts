export type EmailPasswordCredentials = {
  email: string;
  password: string;
};

export type CredentialsParseResult =
  | { ok: true; credentials: EmailPasswordCredentials }
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

export function safeAuthNext(value: FormDataEntryValue | string | null) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\")
    ? candidate
    : "/practice";
}

function stringValue(value: FormDataEntryValue | null, trim = true) {
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}
