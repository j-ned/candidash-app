import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, ButtonComponent, CommonModule, NgOptimizedImage],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly emailSent = signal(false);

  readonly forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword({ email }).subscribe({
        next: () => {
          this.emailSent.set(true);
        },
        error: () => {
          // Le service gère déjà l'affichage des erreurs via toast
          // Mais on peut définir emailSent à true pour des raisons de sécurité
          // (ne pas révéler si l'email existe ou non)
          this.emailSent.set(true);
        },
      });
    }
  }

  resetForm(): void {
    this.emailSent.set(false);
    this.forgotPasswordForm.reset();
    this.forgotPasswordForm.get('email')?.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  navigateToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }
}
