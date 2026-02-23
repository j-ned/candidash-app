export type UserRole = 'USER' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
};

export type AuthResponse = {
  access_token?: string;
  user: User;
};

export type RefreshResponse = {
  access_token?: string;
};

export type RegistrationResponse = {
  message: string;
  email: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  username?: string;
};

export type VerifyRegistrationRequest = {
  email: string;
  verificationCode: string;
};

export type ResendCodeRequest = {
  email: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type TwoFactorPendingResponse = {
  requires2FA: true;
  tempToken: string;
  message: string;
};

export type LoginResponse = AuthResponse | TwoFactorPendingResponse;

export type TotpSetupResponse = {
  qrCodeDataUri: string;
  otpauthUri: string;
};

export type TotpVerifySetupResponse = {
  recoveryCodes: string[];
};

export type ValidateTotpRequest = {
  tempToken: string;
  token: string;
};

export type TotpRecoveryRequest = {
  tempToken: string;
  recoveryCode: string;
};

export type DisableTotpRequest = {
  password: string;
};
