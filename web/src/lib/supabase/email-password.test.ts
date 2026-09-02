import { describe, expect, it } from "vitest";

import {
  parseEmailPasswordCredentials,
  parsePasswordUpdate,
  parseRecoveryCode,
  parseRecoveryEmail,
  parseSignUpCredentials,
  passwordSaveFailureCode,
  safeAuthNext,
  signInErrorMessage,
} from "./email-password";

describe("email/password credentials", () => {
  it("requires a valid email and a password with at least eight characters", () => {
    expect(
      parseEmailPasswordCredentials({ email: "not-an-email", password: "password123" }),
    ).toMatchObject({ ok: false, message: "Hãy nhập một địa chỉ email hợp lệ." });
    expect(
      parseEmailPasswordCredentials({ email: "user@example.com", password: "short" }),
    ).toMatchObject({ ok: false, message: "Mật khẩu cần có ít nhất 8 ký tự." });
  });

  it("requires confirmation to match before a registration reaches Supabase", () => {
    expect(
      parseSignUpCredentials({
        email: "User@Example.com",
        password: "password123",
        passwordConfirmation: "different123",
      }),
    ).toMatchObject({ ok: false, message: "Hai mật khẩu chưa trùng khớp." });
    expect(
      parseSignUpCredentials({
        email: "User@Example.com",
        password: "password123",
        passwordConfirmation: "password123",
      }),
    ).toEqual({
      ok: true,
      credentials: { email: "user@example.com", password: "password123" },
    });
  });

  it("validates a recovery email and the replacement password without requiring an email again", () => {
    expect(parseRecoveryEmail("not-an-email")).toMatchObject({ ok: false });
    expect(parseRecoveryEmail("User@Example.com")).toEqual({
      ok: true,
      email: "user@example.com",
    });
    expect(parseRecoveryCode("123456")).toEqual({ ok: true, code: "123456" });
    expect(parseRecoveryCode("12345678")).toEqual({ ok: true, code: "12345678" });
    expect(parseRecoveryCode("abc123")).toMatchObject({ ok: false });
    expect(
      parsePasswordUpdate({ password: "short", passwordConfirmation: "short" }),
    ).toMatchObject({ ok: false, message: "Mật khẩu mới cần có ít nhất 8 ký tự." });
    expect(
      parsePasswordUpdate({ password: "password123", passwordConfirmation: "different123" }),
    ).toMatchObject({ ok: false, message: "Hai mật khẩu mới chưa trùng khớp." });
    expect(
      parsePasswordUpdate({ password: "password123", passwordConfirmation: "password123" }),
    ).toEqual({ ok: true, password: "password123" });
  });

  it("only accepts an internal destination after authentication", () => {
    expect(safeAuthNext("/practice?deck=cpp")).toBe("/vi/practice?deck=cpp");
    expect(safeAuthNext("/practice?deck=cpp", "en")).toBe(
      "/en/practice?deck=cpp",
    );
    expect(safeAuthNext("/en/practice?deck=cpp", "vi")).toBe(
      "/en/practice?deck=cpp",
    );
    expect(safeAuthNext("https://example.com")).toBe("/vi/practice");
    expect(safeAuthNext("//example.com")).toBe("/vi/practice");
    expect(safeAuthNext("/\\\\example.com")).toBe("/vi/practice");
    expect(safeAuthNext("/en/\\\\example.com")).toBe("/vi/practice");
    expect(safeAuthNext("/en/practice\nLocation: //example.com")).toBe(
      "/vi/practice",
    );
  });

  it("uses precise safe guidance from Supabase auth codes", () => {
    expect(signInErrorMessage("email_not_confirmed")).toContain(
      "chưa được xác minh",
    );
    expect(signInErrorMessage("over_request_rate_limit")).toContain(
      "quá nhiều lần",
    );
    expect(signInErrorMessage("invalid_credentials")).toBe(
      "Email hoặc mật khẩu không đúng.",
    );
  });

  it("treats an already-matching password as an idempotent success", () => {
    expect(passwordSaveFailureCode("same_password")).toBeNull();
    expect(passwordSaveFailureCode("weak_password")).toBe("passwordWeak");
    expect(passwordSaveFailureCode("reauthentication_needed")).toBe(
      "passwordReauthenticationRequired",
    );
    expect(passwordSaveFailureCode("over_request_rate_limit")).toBe(
      "passwordSaveRateLimited",
    );
    expect(passwordSaveFailureCode("unexpected_failure")).toBe(
      "passwordSaveFailed",
    );
  });
});
