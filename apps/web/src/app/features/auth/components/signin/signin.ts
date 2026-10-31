import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  pattern,
  required,
} from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { AuthState } from '@features/auth/application/auth-state';
import type { LoginCredentials } from '@features/auth/domain/models/auth.model';

import { ForgotPasswordModal } from '@shared/ui/forgot-password-modal/service/forgot-password-modal';
import { Icon } from '@shared/ui/icon/icon';

const TOTP_LENGTH = 6;
const EMPTY_CREDENTIALS: LoginCredentials = { email: '', password: '' };
const EMPTY_TOTP = { token: '' };
const EMPTY_RECOVERY = { recoveryCode: '' };

@Component({
  selector: 'app-signin',
  imports: [FormRoot, FormField, FieldError, Button, Icon, RouterLink],
  templateUrl: './signin.html',
  host: {
    class:
      'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"signin-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signin {
  private readonly router = inject(Router);
  private readonly forgotPasswordModalService = inject(ForgotPasswordModal);
  readonly authService = inject(AuthState);

  readonly showPassword = signal(false);
  readonly useRecoveryMode = signal(false);

  private readonly credentials = signal<LoginCredentials>({ ...EMPTY_CREDENTIALS });
  private readonly totpModel = signal({ ...EMPTY_TOTP });
  private readonly recoveryModel = signal({ ...EMPTY_RECOVERY });

  readonly signinForm = form(
    this.credentials,
    (path) => {
      required(path.email, { message: "L'email est requis" });
      email(path.email, { message: 'Veuillez entrer un email valide' });
      required(path.password, { message: 'Le mot de passe est requis' });
      minLength(path.password, 6, {
        message: 'Le mot de passe doit contenir au moins 6 caractères',
      });
    },
    {
      submission: {
        // Navigation (succès) ou ouverture de la modale 2FA gérées par AuthState
        action: () => {
          const { email, password } = this.credentials();
          return this.settle(this.authService.signin({ email, password }));
        },
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  readonly totpForm = form(
    this.totpModel,
    (path) => {
      required(path.token, { message: 'Le code est requis' });
      pattern(path.token, /^\d{6}$/, { message: 'Le code doit contenir exactement 6 chiffres' });
      // Pose l'attribut natif maxlength : la saisie s'arrête à 6 caractères
      maxLength(path.token, TOTP_LENGTH, {
        message: 'Le code doit contenir exactement 6 chiffres',
      });
    },
    {
      submission: {
        action: () => this.settle(this.authService.validateTotp(this.totpModel().token)),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  readonly recoveryForm = form(
    this.recoveryModel,
    (path) => {
      required(path.recoveryCode, { message: 'Le code de récupération est requis' });
    },
    {
      submission: {
        action: () =>
          this.settle(this.authService.useRecoveryCode(this.recoveryModel().recoveryCode)),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading() ? 'Connexion en cours...' : 'Se connecter',
  );

  protected readonly totpSubmitLabel = computed(() =>
    this.authService.isLoading() ? 'Vérification...' : 'Vérifier',
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  toggleRecoveryMode(): void {
    this.useRecoveryMode.update((v) => !v);
    this.resetTwoFactorForms();
  }

  cancelTotp(): void {
    this.authService.clearPending2FA();
    this.useRecoveryMode.set(false);
    this.resetTwoFactorForms();
  }

  async openForgotPasswordModal(): Promise<void> {
    await this.forgotPasswordModalService.showForgotPasswordModal({
      email: this.credentials().email,
    });
  }

  private resetTwoFactorForms(): void {
    this.totpForm().reset({ ...EMPTY_TOTP });
    this.recoveryForm().reset({ ...EMPTY_RECOVERY });
  }

  private async settle(request: Observable<unknown>): Promise<void> {
    try {
      await firstValueFrom(request);
    } catch {
      // Erreur déjà signalée par AuthState (toast)
    }
  }
}
