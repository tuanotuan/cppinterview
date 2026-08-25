export type AuthActionCode =
  | "invalidEmail"
  | "passwordTooShort"
  | "passwordMismatch"
  | "newPasswordTooShort"
  | "newPasswordMismatch"
  | "recoveryCodeInvalid"
  | "emailNotConfirmed"
  | "signInRateLimited"
  | "userBanned"
  | "invalidCredentials"
  | "signInFailed"
  | "signUpFailed"
  | "verificationSent"
  | "recoveryPrepareFailed"
  | "recoveryEmailRateLimited"
  | "recoveryEmailInvalid"
  | "recoverySendFailed"
  | "recoveryExpired"
  | "recoveryOtpInvalid"
  | "recoveryLinkInvalid"
  | "passwordUpdateFailed"
  | "providerSignInRequired"
  | "passwordSaveFailed";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  code: AuthActionCode | null;
  message: string;
};

export const initialAuthFormState: AuthFormState = {
  status: "idle",
  code: null,
  message: "",
};
