import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, ButtonComponent, CommonModule, NgOptimizedImage],
  templateUrl: './reset-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordReset = signal(false);
  readonly currentPassword = signal('');
  private resetToken = '';

  readonly resetPasswordForm: FormGroup = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  ngOnInit(): void {
    // Récupérer le token depuis les query params
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      // Rediriger vers forgot-password si pas de token
      void this.router.navigate(['/auth/forgot-password']);
      return;
    }
    this.resetToken = token;
  }

  passwordMatchValidator(control: AbstractControl) {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
    } else {
      const errors = confirmPassword?.errors;
      if (errors) {
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.resetToken) {
      const newPassword = this.resetPasswordForm.value.newPassword;

      this.authService
        .resetPassword({
          token: this.resetToken,
          newPassword,
        })
        .subscribe({
          next: () => {
            this.passwordReset.set(true);
          },
          error: () => {
            // Le service gère déjà l'affichage des erreurs via toast
          },
        });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
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

  updateCurrentPassword(): void {
    const password = this.resetPasswordForm.get('newPassword')?.value ?? '';
    this.currentPassword.set(password);
  }

  // Helpers to reduce template cyclomatic complexity
  newPasswordError(): string | null {
    const ctrl = this.resetPasswordForm.get('newPassword');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (ctrl.errors['pattern'])
      return 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial';
    return null;
  }

  confirmPasswordError(): string | null {
    const ctrl = this.resetPasswordForm.get('confirmPassword');
    const touched = ctrl ? (ctrl.touched || ctrl.dirty) : false;
    if (!touched || !ctrl) return null;
    if (ctrl.errors?.['required']) return 'La confirmation du mot de passe est requise';
    if (ctrl.errors?.['mismatch']) return 'Les mots de passe ne correspondent pas';
    return null;
  }

  submitLabel(): string {
    return this.authService.isLoading() ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe';
  }

  // Méthodes pour les indicateurs de sécurité
  hasMinLength(): boolean {
    const password = this.currentPassword();
    return password.length >= 8;
  }

  hasUppercase(): boolean {
    const password = this.currentPassword();
    return /[A-Z]/.test(password);
  }

  hasLowercase(): boolean {
    const password = this.currentPassword();
    return /[a-z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.currentPassword();
    return /\d/.test(password);
  }

  hasSpecialChar(): boolean {
    const password = this.currentPassword();
    return /[@$!%*?&]/.test(password);
  }
}
