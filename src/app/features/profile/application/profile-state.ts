import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Toaster } from '@shared/ui/toast/service/toast';
import { AuthState } from '@features/auth/application/auth-state';
import { ProfileGateway } from '../domain/gateways/profile.gateway';
import { toProfileData } from '../infra/profile.adapter';
import type { ProfileDataApi } from '../infra/profile.types';
import type {
  ChangePasswordRequest,
  ProfileData,
  ProfileStats,
  UpdateProfileRequest,
} from '../domain/models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileState {
  private readonly toastService = inject(Toaster);
  private readonly authService = inject(AuthState);
  private readonly profileGateway = inject(ProfileGateway);

  // Chargement full signal : la gateway fournit l'URL, httpResource fait le GET.
  // Pas d'effect impératif ni de subscribe — la requête se relance quand l'utilisateur change.
  private readonly profileResource = httpResource<ProfileData>(
    () => {
      const user = this.authService.user();
      return user && this.authService.isAuthenticated()
        ? this.profileGateway.getProfileUrl(user.id)
        : undefined;
    },
    { parse: (raw) => toProfileData(raw as ProfileDataApi) },
  );

  private readonly mutating = signal(false);
  private readonly mutationError = signal<string | null>(null);

  readonly stats = signal<ProfileStats | null>(null);

  // Profil = valeur chargée, sinon coquille dérivée de l'utilisateur le temps du chargement.
  readonly profile = computed<ProfileData | null>(() => {
    const loaded = this.profileResource.hasValue()
      ? this.profileResource.value()
      : null;
    if (loaded) return loaded;

    const user = this.authService.user();
    return user
      ? {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      : null;
  });

  readonly isLoading = computed(
    () => this.profileResource.isLoading() || this.mutating(),
  );

  readonly error = computed(
    () => this.mutationError() ?? (this.profileResource.error() ? 'Erreur lors du chargement du profil' : null),
  );

  /** Recharge explicitement le profil depuis l'API. */
  reload(): void {
    this.profileResource.reload();
  }

  updateProfile(updateData: UpdateProfileRequest): Observable<ProfileData> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    this.mutating.set(true);
    this.mutationError.set(null);

    return this.profileGateway.updateProfile(userId, updateData).pipe(
      tap((profile) => {
        this.mutating.set(false);
        this.authService.updateUserData({
          ...profile,
          totpEnabled: this.authService.user()?.totpEnabled ?? false,
        });
        this.profileResource.reload();
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

  changePassword(
    passwordData: ChangePasswordRequest,
  ): Observable<{ message: string }> {
    this.mutating.set(true);
    this.mutationError.set(null);

    return this.profileGateway.changePassword(passwordData).pipe(
      tap((response) => {
        this.mutating.set(false);
        this.toastService.show(
          'success',
          'Mot de passe modifié',
          response.message,
          { duration: 4000, dismissible: true },
        );
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

    this.mutating.set(true);
    this.mutationError.set(null);

    return this.profileGateway.deleteAccount(userId).pipe(
      tap((response) => {
        this.mutating.set(false);
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

    this.mutating.set(false);
    this.mutationError.set(errorMessage);

    this.toastService.show('danger', 'Erreur', errorMessage, {
      duration: 5000,
      dismissible: true,
    });
  }
}
