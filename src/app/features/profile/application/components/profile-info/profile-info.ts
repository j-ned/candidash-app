import { Component, ChangeDetectionStrategy, inject, computed, signal, DestroyRef, linkedSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, FormRoot, email, form, required, type FieldTree } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { ProfileState } from '@features/profile/application/profile-state';
import { AuthState } from '@features/auth/application/auth-state';
import type { UpdateProfileRequest } from '@features/profile/domain/models/profile.model';
import { Router } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';

type ProfileInfoModel = {
  email: string;
  username: string;
};

@Component({
  selector: 'app-profile-info',
  imports: [FormRoot, FormField, FieldError, Button, Icon],
  templateUrl: './profile-info.html',
  host: {
    class: 'block space-y-4 sm:space-y-6',
    role: 'region',
    '[attr.aria-labelledby]': '"profile-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfo {
  readonly profileService = inject(ProfileState);
  readonly authService = inject(AuthState);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly showConfirm = signal(false);

  // Brouillon lié à l'utilisateur connecté : repart de ses valeurs quand il change (ex. après sauvegarde)
  private readonly model = linkedSignal<ProfileInfoModel>(() => {
    const user = this.authService.user();
    return { email: user?.email ?? '', username: user?.username ?? '' };
  });

  protected readonly profileForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Email invalide' });
      email(path.email, { message: 'Email invalide' });
    },
    {
      submission: {
        action: (field) => this.save(field),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  private async save(field: FieldTree<ProfileInfoModel>): Promise<void> {
    const { email, username } = field().value();
    const updateData: UpdateProfileRequest = {
      email,
      username: username || undefined,
    };
    try {
      await firstValueFrom(this.profileService.updateProfile(updateData));
    } catch {
      // ProfileState affiche déjà l'erreur (toast) ; la saisie reste en place
    }
  }

  confirmDelete(): void {
    const user = this.authService.user();
    if (!user) return;

    this.profileService
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showConfirm.set(false);
          this.authService
            .signout()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.router.navigate(['/']));
        },
      });
  }

  protected readonly lastUpdated = computed(() => {
    const date = this.authService.user()?.updatedAt;
    return date
      ? new Date(date).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '-';
  });
}
