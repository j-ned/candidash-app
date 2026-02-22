import { Observable } from 'rxjs';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginCredentials,
  RefreshResponse,
  RegisterData,
  RegistrationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyRegistrationRequest,
} from '../models/auth.model';

export abstract class AuthGateway {
  abstract signin(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract signup(data: RegisterData): Observable<RegistrationResponse>;
  abstract verifyRegistration(data: VerifyRegistrationRequest): Observable<AuthResponse>;
  abstract resendVerificationCode(email: string): Observable<{ message: string }>;
  abstract forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse>;
  abstract resetPassword(request: ResetPasswordRequest): Observable<ResetPasswordResponse>;
  abstract signout(): Observable<void>;
  abstract refreshToken(): Observable<RefreshResponse>;
}
