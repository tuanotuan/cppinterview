import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialAuthFormState } from "./auth-form-state";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => `translated:${key}`),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("next-intl/server", () => ({ getTranslations: mocks.getTranslations }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { setPasswordForSignedInUser } from "./auth-actions";

describe("setPasswordForSignedInUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes successfully when Supabase reports the password already matches", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      error: { code: "same_password" },
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "account-1", is_anonymous: false } },
          error: null,
        }),
        updateUser,
      },
    });

    await expect(
      setPasswordForSignedInUser(initialAuthFormState, passwordForm()),
    ).rejects.toThrow("NEXT_REDIRECT:/vi/auth?auth=password-updated");

    expect(updateUser).toHaveBeenCalledWith({ password: "correct horse battery" });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/vi/auth?auth=password-updated",
    );
  });

  it("returns actionable feedback for a rejected password", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "account-1", is_anonymous: false } },
          error: null,
        }),
        updateUser: vi.fn().mockResolvedValue({
          error: { code: "weak_password" },
        }),
      },
    });

    await expect(
      setPasswordForSignedInUser(initialAuthFormState, passwordForm()),
    ).resolves.toEqual({
      status: "error",
      code: "passwordWeak",
      message: "translated:passwordWeak",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not let an anonymous session attach a password", async () => {
    const updateUser = vi.fn();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "anonymous-1", is_anonymous: true } },
          error: null,
        }),
        updateUser,
      },
    });

    await expect(
      setPasswordForSignedInUser(initialAuthFormState, passwordForm()),
    ).resolves.toEqual({
      status: "error",
      code: "providerSignInRequired",
      message: "translated:providerSignInRequired",
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});

function passwordForm() {
  const formData = new FormData();
  formData.set("locale", "vi");
  formData.set("password", "correct horse battery");
  formData.set("passwordConfirmation", "correct horse battery");
  return formData;
}
