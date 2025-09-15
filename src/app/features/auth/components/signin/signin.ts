import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { LoginRequest } from '@features/auth/models/auth-model';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ForgotPasswordModalService } from '@shared/ui/forgot-password-modal';

@Component({
  selector: 'app-signin',
  imports: [ReactiveFormsModule, ButtonComponent, CommonModule, NgOptimizedImage],
  templateUrl: './signin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signin {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly forgotPasswordModalService = inject(ForgotPasswordModalService);
  readonly authService = inject(AuthService);

  readonly showPassword = signal(false);

  readonly signinForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Template helpers to reduce cyclomatic complexity
  emailError(): string | null {
    const ctrl = this.signinForm.get('email');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return "L'email est requis";
    if (ctrl.errors['email']) return 'Veuillez entrer un email valide';
    return null;
  }

  passwordError(): string | null {
    const ctrl = this.signinForm.get('password');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 6 caractères';
    return null;
  }

  submitLabel(): string {
    return this.authService.isLoading() ? 'Connexion en cours...' : 'Se connecter';
  }

  onSubmit(): void {
    if (this.signinForm.valid) {
      const credentials: LoginRequest = this.signinForm.value;

      this.authService.signin(credentials).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: () => {},
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signinForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  async openForgotPasswordModal(): Promise<void> {
    const currentEmail = this.signinForm.get('email')?.value ?? '';

    try {
      const result = await this.forgotPasswordModalService.showForgotPasswordModal({
        email: currentEmail,
      });

      if (result.email) {
        // Email envoyé avec succès
        console.log('Email de réinitialisation envoyé à:', result.email);
      } else if (result.cancelled) {
        // Utilisateur a annulé
        console.log('Modal annulé');
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture du modal:", error);
    }
  }
}
