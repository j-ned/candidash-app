import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import {
  AuthResponse,
  AuthState,
  LoginRequest,
  RegisterRequest,
  RefreshResponse,
  User,
} from '@features/auth/models/auth-model';
import { ToastService } from '@shared/ui/toast/service/toast';
import { TokenService } from './token';
import { Observable, BehaviorSubject, throwError, EMPTY } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}`;

  private readonly authState = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null,
  });

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private refreshInProgress = false;
  private autoLoginInProgress = false;

  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly user = computed(() => this.authState().user);
  readonly token = computed(() => this.authState().token);
  readonly isLoading = computed(() => this.authState().isLoading);
  readonly error = computed(() => this.authState().error);
  readonly user$ = this.userSubject.asObservable();

  constructor() {
    this.initializeAuthFromStorage();
  }

  signin(credentials: LoginRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  signup(userData: RegisterRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<AuthResponse>(`${this.baseUrl}/accounts/registration`, userData).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  signout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearAuthData()),
      catchError(() => {
        this.clearAuthData();
        return EMPTY;
      }),
    );
  }

  refreshToken(): Observable<RefreshResponse> {
    if (this.refreshInProgress) {
      return EMPTY;
    }

    if (!this.tokenService.hasValidRefreshToken()) {
      this.handleRefreshError();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInProgress = true;

    return this.http.post<RefreshResponse>(`${this.baseUrl}/auth/refresh`, {}).pipe(
      tap((response) => {
        // Stocker uniquement l'access token en mémoire
        this.tokenService.setAccessToken(response.access_token);
        this.authState.update((state) => ({
          ...state,
          token: response.access_token,
        }));
        this.refreshInProgress = false;
      }),
      catchError((error) => {
        this.refreshInProgress = false;
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

    if (this.autoLoginInProgress) {
      return EMPTY;
    }

    this.autoLoginInProgress = true;

    return this.refreshToken().pipe(
      switchMap(() => {
        const user = this.getStoredUser();
        if (user) {
          this.authState.update((state) => ({
            ...state,
            isAuthenticated: true,
            user,
            token: this.tokenService.getAccessToken(),
          }));
          this.userSubject.next(user);
          this.autoLoginInProgress = false;
          return [true];
        }
        this.autoLoginInProgress = false;
        return throwError(() => new Error('No user data available'));
      }),
      catchError(() => {
        this.autoLoginInProgress = false;
        this.clearAuthData();
        return [false];
      }),
    );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenService.setAccessToken(response.access_token);
    this.storeUserData(response.user);

    this.authState.update((state) => ({
      ...state,
      isAuthenticated: true,
      user: response.user,
      token: response.access_token,
      isLoading: false,
      error: null,
    }));

    this.userSubject.next(response.user);

    this.toastService.show(
      'success',
      'Connexion réussie',
      `Bienvenue ${response.user.username ?? response.user.email}!`,
      {
        duration: 4000,
        dismissible: true,
      },
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
      token: null,
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
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private getStoredUser(): User | null {
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

  private clearAuthData(): void {
    this.tokenService.clearAccessToken();
    localStorage.removeItem('auth_user');

    this.authState.update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    }));

    this.userSubject.next(null);

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

  updateUserData(user: User): void {
    this.authState.update((state) => ({
      ...state,
      user,
    }));

    this.userSubject.next(user);
    this.storeUserData(user);
  }

  private initializeAuthFromStorage(): void {
    const user = this.getStoredUser();
    const hasRefreshToken = this.tokenService.hasValidRefreshToken();

    if (user && hasRefreshToken) {
      this.authState.update((state) => ({
        ...state,
        user,
        // Pas encore authentifié - l'access token sera récupéré via refresh
        isAuthenticated: false,
        token: null,
      }));
      this.userSubject.next(user);
    } else if (!hasRefreshToken) {
      this.tokenService.clearAccessToken();
      localStorage.removeItem('auth_user');
      this.authState.update((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      }));
      this.userSubject.next(null);
    }
  }
}
