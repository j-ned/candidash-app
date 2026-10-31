import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  minLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { ProfileState } from '@features/profile/application/profile-state';
import type { ChangePasswordRequest } from '@features/profile/domain/models/profile.model';

type PasswordChangeModel = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORDS: PasswordChangeModel = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const PASSWORD_MIN_LENGTH = 8;

@Component({
  selector: 'app-profile-security',
  imports: [FormRoot, FormField, FieldError, Icon, Button],
  templateUrl: './profile-security.html',
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"security-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurity {
  readonly profileService = inject(ProfileState);

  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  private readonly model = signal<PasswordChangeModel>({ ...EMPTY_PASSWORDS });

  protected readonly passwordForm = form(
    this.model,
    (path) => {
      required(path.currentPassword, { message: 'Mot de passe actuel requis' });
      required(path.newPassword, { message: 'Nouveau mot de passe requis' });
      minLength(path.newPassword, PASSWORD_MIN_LENGTH, {
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
      required(path.confirmPassword, { message: 'Confirmation du mot de passe requise' });
      // Validation croisée : l'erreur vit sur la confirmation, le champ que l'utilisateur corrige
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.newPassword)
          ? null
          : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas' },
      );
    },
    {
      submission: {
        action: (field) => this.changePassword(field),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  private async changePassword(field: FieldTree<PasswordChangeModel>): Promise<void> {
    const { currentPassword, newPassword } = field().value();
    const passwordData: ChangePasswordRequest = { currentPassword, newPassword };
    try {
      await firstValueFrom(this.profileService.changePassword(passwordData));
      field().reset({ ...EMPTY_PASSWORDS });
    } catch {
      // ProfileState affiche déjà l'erreur (toast) ; la saisie reste en place
    }
  }

  protected readonly submitLabel = computed(() =>
    this.profileService.isLoading()
      ? 'Modification...'
      : 'Changer le mot de passe',
  );

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((show) => !show);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((show) => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }
}
