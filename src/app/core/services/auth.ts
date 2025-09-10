import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import {
  AuthResponse,
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
} from '@features/auth/models/auth-model';
import { ToastService } from '@shared/ui/toast/service/toast';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly baseUrl = `${environment.apiUrl}`;

  private readonly authState = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null,
  });

  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly user = computed(() => this.authState().user);
  readonly token = computed(() => this.authState().token);
  readonly isLoading = computed(() => this.authState().isLoading);
  readonly error = computed(() => this.authState().error);

  constructor() {
    // Restore authentication state from localStorage on app startup
    this.initializeAuthFromStorage();
  }

  signin(credentials: LoginRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
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
      }),
      catchError((error) => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
    );
  }

  signout(): void {
    this.clearAuthStorage();
    this.authState.update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    }));

    // Show logout success toast
    this.toastService.show(
      'success',
      'Déconnexion réussie',
      'Vous avez été déconnecté avec succès',
      {
        duration: 3000,
        dismissible: true,
      },
    );
  }

  /**
   * Check if user is authenticated
   */
  checkAuthStatus(): boolean {
    const token = this.getStoredToken();
    return !!token;
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeAuthData(response.access_token, response.user);
    this.authState.update((state) => ({
      ...state,
      isAuthenticated: true,
      user: response.user,
      token: response.access_token,
      isLoading: false,
      error: null,
    }));

    // Show success toast
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

    // Show error toast
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

  private storeAuthData(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    // Vérifie que la valeur n'est pas null, vide ou 'undefined'
    if (!userStr || userStr === 'undefined') {
      return null;
    }
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private clearAuthStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * Update user data in auth state and storage
   */
  updateUserData(user: User): void {
    this.authState.update((state) => ({
      ...state,
      user,
    }));

    // Update stored user data
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private initializeAuthFromStorage(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.authState.update((state) => ({
        ...state,
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
        error: null,
      }));
    }
  }
}
