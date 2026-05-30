import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, EMPTY, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { TokenStore } from '@core/services/token';
import { Toaster } from '@shared/ui/toast/service/toast';
import type {
  AuthResponse,
  AuthState as AuthStateModel,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RefreshResponse,
  VerifyRegistrationRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RegistrationResponse,
  User,
} from '../domain/models/auth.model';
import { AuthGateway } from '../domain/gateways/auth.gateway';

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly tokenService = inject(TokenStore);
  private readonly toastService = inject(Toaster);
  private readonly router = inject(Router);
  private readonly authGateway = inject(AuthGateway);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly authState = signal<AuthStateModel>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  });

  private readonly refreshInProgress = signal(false);
  private readonly autoLoginInProgress = signal(false);

  readonly pendingTwoFactorToken = signal<string | null>(null);
  readonly hasPending2FA = computed(() => this.pendingTwoFactorToken() !== null);

  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly user = computed(() => this.authState().user);
  readonly isLoading = computed(() => this.authState().isLoading);
  readonly error = computed(() => this.authState().error);

  constructor() {
    this.initializeAuthFromStorage();
  }

  signin(credentials: LoginCredentials): Observable<LoginResponse> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.signin(credentials).pipe(
      tap((response) => {
        if ('requires2FA' in response && response.requires2FA) {
          this.pendingTwoFactorToken.set((response as { tempToken: string }).tempToken);
          this.setLoading(false);
        } else {
          this.handleAuthSuccess(response as AuthResponse);
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  validateTotp(token: string): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    const tempToken = this.pendingTwoFactorToken();
    if (!tempToken) {
      this.setLoading(false);
      return throwError(() => new Error('No pending 2FA token'));
    }

    return this.authGateway.validateTotp({ tempToken, token }).pipe(
      tap((response) => {
        this.pendingTwoFactorToken.set(null);
        this.handleAuthSuccess(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  useRecoveryCode(code: string): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    const tempToken = this.pendingTwoFactorToken();
    if (!tempToken) {
      this.setLoading(false);
      return throwError(() => new Error('No pending 2FA token'));
    }

    return this.authGateway
      .useRecoveryCode({ tempToken, recoveryCode: code })
      .pipe(
        tap((response) => {
          this.pendingTwoFactorToken.set(null);
          this.handleAuthSuccess(response);
          this.toastService.show(
            'warning',
            'Code de récupération utilisé',
            'Pensez à vérifier vos codes de récupération restants dans votre profil.',
            { duration: 6000, dismissible: true },
          );
          this.router.navigate(['/dashboard']);
        }),
        catchError((error) => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
      );
  }

  clearPending2FA(): void {
    this.pendingTwoFactorToken.set(null);
  }

  signup(userData: RegisterData): Observable<RegistrationResponse> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.signup(userData).pipe(
      tap(() => {
        this.setLoading(false);
        this.toastService.show(
          'success',
          'Code de validation envoyé',
          'Vérifiez votre boîte mail pour le code de validation',
          { duration: 5000, dismissible: true },
        );
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  verifyRegistration(verificationData: VerifyRegistrationRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.verifyRegistration(verificationData).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
        this.router.navigate(['/dashboard']);
        this.toastService.show(
          'success',
          'Inscription validée',
          'Votre compte a été créé avec succès !',
          { duration: 4000, dismissible: true },
        );
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  resendVerificationCode(email: string): Observable<{ message: string }> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.resendVerificationCode(email).pipe(
      tap((response) => {
        this.setLoading(false);
        this.toastService.show('success', 'Code renvoyé', response.message, {
          duration: 4000,
          dismissible: true,
        });
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.forgotPassword(request).pipe(
      tap(() => {
        this.setLoading(false);
        this.toastService.show(
          'success',
          'Email envoyé',
          'Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation',
          { duration: 6000, dismissible: true },
        );
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    this.setLoading(true);
    this.clearError();

    return this.authGateway.resetPassword(request).pipe(
      tap(() => {
        this.setLoading(false);
        this.toastService.show(
          'success',
          'Mot de passe réinitialisé',
          'Votre mot de passe a été mis à jour avec succès',
          { duration: 4000, dismissible: true },
        );
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  signout(): Observable<void> {
    return this.authGateway.signout().pipe(
      tap(() => this.clearAuthData()),
      catchError(() => {
        this.clearAuthData();
        return EMPTY;
      }),
    );
  }

  refreshToken(): Observable<RefreshResponse> {
    if (this.refreshInProgress()) {
      return EMPTY;
    }

    if (!this.tokenService.hasValidRefreshToken()) {
      this.handleRefreshError();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInProgress.set(true);

    return this.authGateway.refreshToken().pipe(
      tap(() => {
        this.refreshInProgress.set(false);
      }),
      catchError((error) => {
        this.refreshInProgress.set(false);
        this.handleRefreshError();
        return throwError(() => error);
      }),
    );
  }

  checkAuthStatus(): boolean {
    return this.tokenService.hasValidRefreshToken();
  }

  autoLogin(): Observable<boolean> {
    if (!this.tokenService.hasValidRefreshToken()) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.autoLoginInProgress()) {
      return EMPTY;
    }

    this.autoLoginInProgress.set(true);

    return this.refreshToken().pipe(
      switchMap(() => {
        const user = this.getStoredUser();
        if (user) {
          this.authState.update((state) => ({
            ...state,
            isAuthenticated: true,
            user,
          }));
          this.autoLoginInProgress.set(false);
          return [true];
        }
        this.autoLoginInProgress.set(false);
        return throwError(() => new Error('No user data available'));
      }),
      catchError(() => {
        this.autoLoginInProgress.set(false);
        this.clearAuthData();
        return [false];
      }),
    );
  }

  updateUserData(user: User): void {
    this.authState.update((state) => ({
      ...state,
      user,
    }));
    this.storeUserData(user);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeUserData(response.user);

    this.authState.update((state) => ({
      ...state,
      isAuthenticated: true,
      user: response.user,
      isLoading: false,
      error: null,
    }));

    this.toastService.show(
      'success',
      'Connexion réussie',
      `Bienvenue ${response.user.username ?? response.user.email}!`,
      { duration: 4000, dismissible: true },
    );
  }

  private handleAuthError(error: HttpErrorResponse): void {
    let errorMessage = "Une erreur s'est produite lors de l'authentification";

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Identifiants invalides';
    } else if (error.status === 400) {
      errorMessage = 'Données de saisie invalides';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur';
    }

    this.authState.update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: errorMessage,
    }));

    this.toastService.show('danger', "Erreur d'authentification", errorMessage, {
      duration: 5000,
      dismissible: true,
    });
  }

  private setLoading(loading: boolean): void {
    this.authState.update((state) => ({
      ...state,
      isLoading: loading,
    }));
  }

  private clearError(): void {
    this.authState.update((state) => ({
      ...state,
      error: null,
    }));
  }

  private storeUserData(user: User): void {
    if (!this.isBrowser) return;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem('auth_user');
    if (!userStr || userStr === 'undefined') {
      return null;
    }
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  clearAuthData(): void {
    if (this.isBrowser) localStorage.removeItem('auth_user');

    this.authState.update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    }));

    const currentUrl = this.router.url;
    if (!currentUrl.includes('/auth/')) {
      this.router.navigate(['/auth/signin']);
    }
  }

  private handleRefreshError(): void {
    this.clearAuthData();
    this.toastService.show('warning', 'Session expirée', 'Veuillez vous reconnecter', {
      duration: 4000,
      dismissible: true,
    });
  }

  private initializeAuthFromStorage(): void {
    const user = this.getStoredUser();
    const hasRefreshToken = this.tokenService.hasValidRefreshToken();

    if (user && hasRefreshToken) {
      this.authState.update((state) => ({
        ...state,
        user,
        isAuthenticated: true,
      }));
    } else if (!hasRefreshToken) {
      if (this.isBrowser) localStorage.removeItem('auth_user');
      this.authState.update((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      }));
    }
  }
}
