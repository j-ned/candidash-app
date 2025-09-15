export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface RegistrationResponse {
  message: string;
  email: string;
}

export interface VerifyRegistrationRequest {
  email: string;
  verificationCode: string;
}

export interface ResendCodeRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}
