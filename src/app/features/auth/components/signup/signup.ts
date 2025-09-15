import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { RegisterRequest } from '@features/auth/models/auth-model';
import { NgOptimizedImage } from '@angular/common';
import { VerificationModalService } from '@shared/ui/verification-modal/verification-modal';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  templateUrl: './signup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly verificationModalService = inject(VerificationModalService);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly signupForm: FormGroup = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  // Template helpers to reduce cyclomatic complexity
  emailError(): string | null {
    const ctrl = this.signupForm.get('email');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return "L'email est requis";
    if (ctrl.errors['email']) return 'Veuillez entrer un email valide';
    return null;
  }

  usernameError(): string | null {
    const ctrl = this.signupForm.get('username');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['minlength']) return "Le nom d'utilisateur doit contenir au moins 3 caractères";
    if (ctrl.errors['pattern'])
      return "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores";
    return null;
  }

  passwordError(): string | null {
    const ctrl = this.signupForm.get('password');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 6 caractères';
    return null;
  }

  confirmPasswordError(): string | null {
    const ctrl = this.signupForm.get('confirmPassword');
    const groupMismatch = this.signupForm.errors?.['passwordMismatch'];
    const touched = ctrl ? (ctrl.touched || ctrl.dirty) : false;
    if (!touched && !groupMismatch) return null;
    if (ctrl?.errors?.['required']) return 'La confirmation du mot de passe est requise';
    if (groupMismatch) return 'Les mots de passe ne correspondent pas';
    return null;
  }

  submitLabel(): string {
    return this.authService.isLoading() ? 'Création en cours...' : 'Créer le compte';
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      const formValue = this.signupForm.value;
      const userData: RegisterRequest = {
        email: formValue.email,
        password: formValue.password,
        username: formValue.username ?? undefined,
      };

      this.authService.signup(userData).subscribe({
        next: () => {
          this.showVerificationModal(userData.email);
        },
        error: () => {},
      });
    }
  }

  private async showVerificationModal(email: string): Promise<void> {
    const result = await this.verificationModalService.showVerificationModal({ email });

    if (result.verificationCode) {
      // Vérifier le code de validation
      this.authService
        .verifyRegistration({
          email,
          verificationCode: result.verificationCode,
        })
        .subscribe({
          next: () => {
            // La navigation est gérée dans le service AuthService
          },
          error: () => {
            // En cas d'erreur, réouvrir le modal
            this.showVerificationModal(email);
          },
        });
    } else if (result.resend) {
      // Renvoyer le code
      this.authService.resendVerificationCode(email).subscribe({
        next: () => {
          // Réouvrir le modal après avoir renvoyé le code
          this.showVerificationModal(email);
        },
        error: () => {
          // En cas d'erreur, réouvrir le modal
          this.showVerificationModal(email);
        },
      });
    } else if (result.cancelled) {
      // L'utilisateur a annulé, on peut rediriger vers signin ou rester sur signup
      // Pour l'instant, on ne fait rien (reste sur la page signup)
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
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

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }
}
