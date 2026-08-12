import { describe, expect, it } from "vitest";

import {
  parseEmailPasswordCredentials,
  parseSignUpCredentials,
  safeAuthNext,
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

  it("only accepts an internal destination after authentication", () => {
    expect(safeAuthNext("/practice?deck=cpp")).toBe("/practice?deck=cpp");
    expect(safeAuthNext("https://example.com")).toBe("/practice");
    expect(safeAuthNext("//example.com")).toBe("/practice");
    expect(safeAuthNext("/\\\\example.com")).toBe("/practice");
  });
});
