import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  FormField,
  FormRoot,
  form,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { AuthState } from '@features/auth/application/auth-state';

import { Icon } from '@shared/ui/icon/icon';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const EMPTY_RESET = { newPassword: '', confirmPassword: '' };

@Component({
  selector: 'app-reset-password',
  imports: [FormRoot, FormField, FieldError, Button, Icon],
  templateUrl: './reset-password.html',
  host: {
    class:
      'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"reset-password-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);

  readonly token = input<string>('');

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordReset = signal(false);

  private readonly model = signal({ ...EMPTY_RESET });

  readonly resetPasswordForm = form(
    this.model,
    (path) => {
      required(path.newPassword, { message: 'Le mot de passe est requis' });
      minLength(path.newPassword, PASSWORD_MIN_LENGTH, {
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
      pattern(path.newPassword, PASSWORD_COMPLEXITY, {
        message:
          'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
      });
      required(path.confirmPassword, {
        message: 'La confirmation du mot de passe est requise',
      });
      // Validation croisée : l'erreur vit sur la confirmation, le champ que l'utilisateur corrige
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.newPassword)
          ? null
          : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas' },
      );
    },
    {
      submission: {
        action: () => this.resetPassword(),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading() ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe',
  );

  // Indicateurs de sécurité dérivés du modèle, mis à jour à chaque frappe
  private readonly currentPassword = computed(() => this.model().newPassword);
  protected readonly hasMinLength = computed(
    () => this.currentPassword().length >= PASSWORD_MIN_LENGTH,
  );
  protected readonly hasUppercase = computed(() => /[A-Z]/.test(this.currentPassword()));
  protected readonly hasLowercase = computed(() => /[a-z]/.test(this.currentPassword()));
  protected readonly hasNumber = computed(() => /\d/.test(this.currentPassword()));
  protected readonly hasSpecialChar = computed(() => /[@$!%*?&]/.test(this.currentPassword()));

  ngOnInit(): void {
    if (!this.token()) {
      void this.router.navigate(['/auth/forgot-password']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }

  navigateToSignin(): void {
    void this.router.navigate(['/auth/signin']);
  }

  private async resetPassword(): Promise<void> {
    const resetToken = this.token();
    if (!resetToken) return;

    try {
      await firstValueFrom(
        this.authService.resetPassword({
          token: resetToken,
          newPassword: this.model().newPassword,
        }),
      );
      this.passwordReset.set(true);
    } catch {
      // Erreur déjà signalée par AuthState (toast)
    }
  }
}
