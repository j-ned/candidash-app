import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  FormField,
  FormRoot,
  email,
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
import type { RegisterData } from '@features/auth/domain/models/auth.model';
import { VerificationModal } from '@shared/ui/verification-modal/verification-modal';
import { Icon } from '@shared/ui/icon/icon';

const EMPTY_SIGNUP = { email: '', username: '', password: '', confirmPassword: '' };

@Component({
  selector: 'app-signup',
  imports: [FormRoot, FormField, FieldError, Button, Icon, RouterLink],
  templateUrl: './signup.html',
  host: {
    class:
      'block w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"signup-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);
  private readonly verificationModalService = inject(VerificationModal);
  private readonly destroyRef = inject(DestroyRef);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  private readonly model = signal({ ...EMPTY_SIGNUP });

  readonly signupForm = form(
    this.model,
    (path) => {
      required(path.email, { message: "L'email est requis" });
      email(path.email, { message: 'Veuillez entrer un email valide' });
      // Nom d'utilisateur optionnel : minLength et pattern ignorent la valeur vide
      minLength(path.username, 3, {
        message: "Le nom d'utilisateur doit contenir au moins 3 caractères",
      });
      pattern(path.username, /^[a-zA-Z0-9_]+$/, {
        message: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores",
      });
      required(path.password, { message: 'Le mot de passe est requis' });
      minLength(path.password, 6, {
        message: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      required(path.confirmPassword, {
        message: 'La confirmation du mot de passe est requise',
      });
      // Validation croisée : l'erreur vit sur la confirmation, le champ que l'utilisateur corrige
      validate(path.confirmPassword, ({ value, valueOf }) =>
        value() === valueOf(path.password)
          ? null
          : { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas' },
      );
    },
    {
      submission: {
        action: () => this.createAccount(),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading() ? 'Création en cours...' : 'Créer le compte',
  );

  private async createAccount(): Promise<void> {
    const { email, password, username } = this.model();
    const userData: RegisterData = {
      email,
      password,
      username: username || undefined,
    };
    try {
      await firstValueFrom(this.authService.signup(userData));
    } catch {
      // Erreur déjà signalée par AuthState (toast)
      return;
    }
    // Non attendu : la soumission se termine, la modale de vérification prend le relais
    void this.showVerificationModal(userData.email);
  }

  private async showVerificationModal(email: string): Promise<void> {
    const result = await this.verificationModalService.showVerificationModal({ email });

    if (result.verificationCode) {
      this.authService
        .verifyRegistration({
          email,
          verificationCode: result.verificationCode,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.showVerificationModal(email);
          },
        });
    } else if (result.resend) {
      this.authService
        .resendVerificationCode(email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showVerificationModal(email);
          },
          error: () => {
            this.showVerificationModal(email);
          },
        });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }

  navigateToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }
}
