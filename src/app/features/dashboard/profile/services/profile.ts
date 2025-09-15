import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { environment } from '@environments/environment';
import {
  ProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ProfileStats,
} from '@features/dashboard/profile/models/profile-model';
import { ToastService } from '@shared/ui/toast/service/toast';
import { AuthService } from '@core/services/auth';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface ProfileState {
  profile: ProfileData | null;
  stats: ProfileStats | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private readonly profileState = signal<ProfileState>({
    profile: null,
    stats: null,
    isLoading: false,
    error: null,
  });

  readonly profile = computed(() => this.profileState().profile);
  readonly stats = computed(() => this.profileState().stats);
  readonly isLoading = computed(() => this.profileState().isLoading);
  readonly error = computed(() => this.profileState().error);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      const isAuthenticated = this.authService.isAuthenticated();
      const token = this.authService.token();

      if (user && isAuthenticated && token) {
        this.profileState.update((state) => ({
          ...state,
          profile: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            cvPath: state.profile?.cvPath ?? undefined,
            avatarPath: state.profile?.avatarPath ?? undefined,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        }));

        this.getProfile().subscribe({
          error: (error) => {
            console.warn('Failed to load profile data on initialization:', error);
          },
        });
      }
    });
  }

  getProfile(): Observable<ProfileData> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    this.setLoading(true);
    this.clearError();

    return this.http.get<ProfileData>(`${this.baseUrl}/accounts/profile/${userId}`).pipe(
      tap((profile) => {
        this.profileState.update((state) => ({
          ...state,
          profile,
          isLoading: false,
          error: null,
        }));
      }),
      catchError((error) => {
        this.handleError(error, 'Erreur lors du chargement du profil');
        return throwError(() => error);
      }),
    );
  }

  updateProfile(updateData: UpdateProfileRequest): Observable<ProfileData> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    this.setLoading(true);
    this.clearError();

    return this.http
      .put<ProfileData>(`${this.baseUrl}/accounts/profile-update/${userId}`, updateData)
      .pipe(
        tap((profile) => {
          this.profileState.update((state) => ({
            ...state,
            profile,
            isLoading: false,
            error: null,
          }));

          this.authService.updateUserData({
            ...profile,
          });

          this.toastService.show(
            'success',
            'Profil mis à jour',
            'Vos informations ont été sauvegardées avec succès',
            {
              duration: 4000,
              dismissible: true,
            },
          );
        }),
        catchError((error) => {
          this.handleError(error, 'Erreur lors de la mise à jour du profil');
          return throwError(() => error);
        }),
      );
  }

  changePassword(passwordData: ChangePasswordRequest): Observable<{ message: string }> {
    this.setLoading(true);
    this.clearError();

    return this.http
      .put<{ message: string }>(`${this.baseUrl}/accounts/change-password`, passwordData)
      .pipe(
        tap((response) => {
          this.profileState.update((state) => ({
            ...state,
            isLoading: false,
            error: null,
          }));

          this.toastService.show('success', 'Mot de passe modifié', response.message, {
            duration: 4000,
            dismissible: true,
          });
        }),
        catchError((error) => {
          this.handleError(error, 'Erreur lors du changement de mot de passe');
          return throwError(() => error);
        }),
      );
  }

  private setLoading(loading: boolean): void {
    this.profileState.update((state) => ({
      ...state,
      isLoading: loading,
    }));
  }

  private clearError(): void {
    this.profileState.update((state) => ({
      ...state,
      error: null,
    }));
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    const backendMessage = error?.error?.message as
      | string
      | string[]
      | { message: string }
      | undefined;
    if (backendMessage) {
      if (Array.isArray(backendMessage)) {
        errorMessage = backendMessage.join('\n');
      } else if (typeof backendMessage === 'string') {
        errorMessage = backendMessage;
      } else if (typeof backendMessage === 'object' && backendMessage.message) {
        errorMessage = String(backendMessage.message);
      }
    } else if (error.status === 400) {
      errorMessage = 'Données invalides';
    } else if (error.status === 401) {
      errorMessage = 'Vous devez être connecté pour effectuer cette action';
    } else if (error.status === 403) {
      errorMessage = "Vous n'avez pas les permissions nécessaires";
    } else if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur';
    }

    this.profileState.update((state) => ({
      ...state,
      isLoading: false,
      error: errorMessage,
    }));

    this.toastService.show('danger', 'Erreur', errorMessage, {
      duration: 5000,
      dismissible: true,
    });
  }

  deleteAccount(): Observable<{ message: string } | void> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    this.setLoading(true);
    this.clearError();

    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/accounts/deactivation/${userId}`)
      .pipe(
        tap((response) => {
          this.profileState.update((state) => ({
            ...state,
            profile: null,
            isLoading: false,
            error: null,
          }));

          this.toastService.show(
            'success',
            'Compte supprimé',
            response?.message ?? 'Votre compte a été supprimé avec succès.',
          );
        }),
        catchError((error) => {
          this.handleError(error, 'Erreur lors de la suppression du compte');
          return throwError(() => error);
        }),
      );
  }
}
