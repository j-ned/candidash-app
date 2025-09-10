import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { LoginRequest } from '@features/auth/models/auth-model';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-signin',
  imports: [ReactiveFormsModule, ButtonComponent, CommonModule, NgOptimizedImage],
  template: `
    <div class="max-w-md mx-auto bg-surface border border-border rounded-xl p-8 shadow-lg">
      <h2 class="text-3xl font-bold text-center mb-8 text-text">Se connecter</h2>

      <form [formGroup]="signinForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Email Field -->
        <div class="space-y-2">
          <label for="email" class="block text-sm font-medium text-text"> Email </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
            [class.border-error]="isFieldInvalid('email')"
            [class.border-input]="!isFieldInvalid('email')"
            placeholder="votre@email.com"
          />
          @if (isFieldInvalid('email')) {
            <p class="text-error text-sm mt-1">
              @if (signinForm.get('email')?.errors?.['required']) {
                L'email est requis
              } @else if (signinForm.get('email')?.errors?.['email']) {
                Veuillez entrer un email valide
              }
            </p>
          }
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <label for="password" class="block text-sm font-medium text-text"> Mot de passe </label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              [class.border-error]="isFieldInvalid('password')"
              [class.border-input]="!isFieldInvalid('password')"
              placeholder="••••••••"
            />
            <button
              type="button"
              (click)="togglePasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors"
              tabindex="-1"
            >
              @if (showPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Icône oeil ouvert"
                  class="w-5 h-5 object-contain icon-invert"
                  width="20"
                  height="20"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Icône oeil fermé"
                  class="w-5 h-5 object-contain icon-invert"
                  width="20"
                  height="20"
                />
              }
            </button>
          </div>
          @if (isFieldInvalid('password')) {
            <p class="text-error text-sm mt-1">
              @if (signinForm.get('password')?.errors?.['required']) {
                Le mot de passe est requis
              } @else if (signinForm.get('password')?.errors?.['minlength']) {
                Le mot de passe doit contenir au moins 6 caractères
              }
            </p>
          }
        </div>

        <!-- Submit Button -->
        <app-button
          type="submit"
          color="primary"
          [disabled]="signinForm.invalid"
          [isLoading]="authService.isLoading()"
          customClass="w-full py-4 text-lg font-semibold"
        >
          @if (authService.isLoading()) {
            Connexion en cours...
          } @else {
            Se connecter
          }
        </app-button>
      </form>

      <!-- Link to signup -->
      <div class="mt-6 text-center">
        <p class="text-muted">
          Pas encore de compte ?
          <button
            type="button"
            (click)="navigateToSignup()"
            class="text-accent hover:text-accent/80 font-medium ml-1 transition-colors"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  `,
  styles: `
    input {
      background-color: var(--color-background);
      color: var(--color-text);
    }

    input:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-accent);
    }

    input::placeholder {
      color: var(--color-muted-foreground);
    }

    .border-input {
      border-color: var(--color-input);
    }

    .border-error {
      border-color: var(--color-error);
    }

    button[type='button']:hover {
      transform: scale(1.1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SigninComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly showPassword = signal(false);

  readonly signinForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.signinForm.valid) {
      const credentials: LoginRequest = this.signinForm.value;

      this.authService.signin(credentials).subscribe({
        next: () => {
          // Redirect to dashboard after successful login
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          // Error is handled by the auth service and displayed in template
        },
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
}
