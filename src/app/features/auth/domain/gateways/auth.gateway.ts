import { Observable } from 'rxjs';
import type {
  AuthResponse,
  DisableTotpRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginCredentials,
  LoginResponse,
  RefreshResponse,
  RegisterData,
  RegistrationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  TotpRecoveryRequest,
  TotpSetupResponse,
  TotpVerifySetupResponse,
  ValidateTotpRequest,
  VerifyRegistrationRequest,
} from '../models/auth.model';

export abstract class AuthGateway {
  abstract signin(credentials: LoginCredentials): Observable<LoginResponse>;
  abstract signup(data: RegisterData): Observable<RegistrationResponse>;
  abstract verifyRegistration(data: VerifyRegistrationRequest): Observable<AuthResponse>;
  abstract resendVerificationCode(email: string): Observable<{ message: string }>;
  abstract forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse>;
  abstract resetPassword(request: ResetPasswordRequest): Observable<ResetPasswordResponse>;
  abstract signout(): Observable<void>;
  abstract refreshToken(): Observable<RefreshResponse>;
  abstract setupTotp(): Observable<TotpSetupResponse>;
  abstract verifyTotpSetup(token: string): Observable<TotpVerifySetupResponse>;
  abstract disableTotp(password: string): Observable<{ message: string }>;
  abstract validateTotp(request: ValidateTotpRequest): Observable<AuthResponse>;
  abstract useRecoveryCode(request: TotpRecoveryRequest): Observable<AuthResponse>;
}
