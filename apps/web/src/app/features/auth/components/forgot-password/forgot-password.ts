import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { AuthState } from '@features/auth/application/auth-state';

import { Icon } from '@shared/ui/icon/icon';

const EMPTY_REQUEST = { email: '' };

@Component({
  selector: 'app-forgot-password',
  imports: [FormRoot, FormField, FieldError, Button, Icon, RouterLink],
  templateUrl: './forgot-password.html',
  host: {
    class:
      'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"forgot-password-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);

  readonly emailSent = signal(false);

  private readonly model = signal({ ...EMPTY_REQUEST });

  readonly forgotPasswordForm = form(
    this.model,
    (path) => {
      required(path.email, { message: "L'email est requis" });
      email(path.email, { message: 'Veuillez entrer un email valide' });
    },
    {
      submission: {
        action: () => this.sendResetLink(),
        // Bouton actif sur un formulaire invalide : submit() révèle les erreurs, focus sur la première
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  resetForm(): void {
    this.emailSent.set(false);
    this.forgotPasswordForm().reset({ ...EMPTY_REQUEST });
  }

  navigateToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }

  private async sendResetLink(): Promise<void> {
    const { email } = this.model();
    try {
      await firstValueFrom(this.authService.forgotPassword({ email }));
    } catch {
      // Même écran en cas d'échec : ne pas révéler si un compte existe pour cette adresse
    }
    this.emailSent.set(true);
  }
}
