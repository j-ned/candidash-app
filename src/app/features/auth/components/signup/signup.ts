import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { AuthState } from '@features/auth/application/auth-state';
import type { RegisterData } from '@features/auth/domain/models/auth.model';
import { VerificationModal } from '@shared/ui/verification-modal/verification-modal';
import { Icon } from '@shared/ui/icon/icon';
import { passwordMatchValidator } from '@shared/validators/password-match.validator';

type SignupForm = {
  email: FormControl<string>;
  username: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
};

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, Button, Icon, RouterLink],
  templateUrl: './signup.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
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

  readonly signupForm = new FormGroup<SignupForm>(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator('password', 'confirmPassword') },
  );

  emailError(): string | null {
    const ctrl = this.signupForm.controls.email;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return "L'email est requis";
    if (ctrl.errors['email']) return 'Veuillez entrer un email valide';
    return null;
  }

  usernameError(): string | null {
    const ctrl = this.signupForm.controls.username;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['minlength']) return "Le nom d'utilisateur doit contenir au moins 3 caractères";
    if (ctrl.errors['pattern'])
      return "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores";
    return null;
  }

  passwordError(): string | null {
    const ctrl = this.signupForm.controls.password;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 6 caractères';
    return null;
  }

  confirmPasswordError(): string | null {
    const ctrl = this.signupForm.controls.confirmPassword;
    const groupMismatch = this.signupForm.errors?.['passwordMismatch'];
    const touched = ctrl.touched || ctrl.dirty;
    if (!touched && !groupMismatch) return null;
    if (ctrl.errors?.['required']) return 'La confirmation du mot de passe est requise';
    if (groupMismatch) return 'Les mots de passe ne correspondent pas';
    return null;
  }

  submitLabel(): string {
    return this.authService.isLoading() ? 'Création en cours...' : 'Créer le compte';
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      const { email, password, username } = this.signupForm.getRawValue();
      const userData: RegisterData = {
        email,
        password,
        username: username || undefined,
      };

      this.authService
        .signup(userData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showVerificationModal(userData.email);
          },
        });
    }
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

  isFieldInvalid(fieldName: keyof SignupForm): boolean {
    const field = this.signupForm.controls[fieldName];
    return field.invalid && field.touched;
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
