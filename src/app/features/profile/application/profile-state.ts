import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Toaster } from '@shared/ui/toast/service/toast';
import { AuthState } from '@features/auth/application/auth-state';
import { GetProfileUseCase } from '../domain/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../domain/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from '../domain/use-cases/change-password.use-case';
import { DeleteAccountUseCase } from '../domain/use-cases/delete-account.use-case';
import type {
  ChangePasswordRequest,
  ProfileData,
  ProfileState as ProfileStateModel,
  UpdateProfileRequest,
} from '../domain/models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileState {
  private readonly toastService = inject(Toaster);
  private readonly authService = inject(AuthState);
  private readonly getProfileUseCase = inject(GetProfileUseCase);
  private readonly updateProfileUseCase = inject(UpdateProfileUseCase);
  private readonly changePasswordUseCase = inject(ChangePasswordUseCase);
  private readonly deleteAccountUseCase = inject(DeleteAccountUseCase);

  private readonly profileState = signal<ProfileStateModel>({
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

      if (user && isAuthenticated) {
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

    return this.getProfileUseCase.execute(userId).pipe(
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

    return this.updateProfileUseCase.execute(userId, updateData).pipe(
      tap((profile) => {
        this.profileState.update((state) => ({
          ...state,
          profile,
          isLoading: false,
          error: null,
        }));

        this.authService.updateUserData({ ...profile, totpEnabled: this.authService.user()?.totpEnabled ?? false });

        this.toastService.show(
          'success',
          'Profil mis à jour',
          'Vos informations ont été sauvegardées avec succès',
          { duration: 4000, dismissible: true },
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

    return this.changePasswordUseCase.execute(passwordData).pipe(
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

  deleteAccount(): Observable<{ message: string } | void> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    this.setLoading(true);
    this.clearError();

    return this.deleteAccountUseCase.execute(userId).pipe(
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
}
