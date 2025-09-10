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
    <div
      class="w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl"
    >
      <div
        class="bg-surface border border-border rounded-lg p-6 shadow-sm sm:rounded-xl sm:p-8 md:shadow-lg"
      >
        <h2 class="text-2xl font-bold text-center mb-6 text-text sm:text-3xl sm:mb-8 md:text-4xl">
          Se connecter
        </h2>

        <form [formGroup]="signinForm" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-6">
          <div class="space-y-1 sm:space-y-2">
            <label for="email" class="block text-sm font-medium text-text sm:text-base">
              Email
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="w-full px-3 py-2 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:rounded-lg"
              [class.border-error]="isFieldInvalid('email')"
              [class.border-input]="!isFieldInvalid('email')"
              placeholder="votre@email.com"
            />
            @if (isFieldInvalid('email')) {
              <p class="text-error text-xs mt-1 sm:text-sm">
                @if (signinForm.get('email')?.errors?.['required']) {
                  L'email est requis
                } @else if (signinForm.get('email')?.errors?.['email']) {
                  Veuillez entrer un email valide
                }
              </p>
            }
          </div>

          <div class="space-y-1 sm:space-y-2">
            <label for="password" class="block text-sm font-medium text-text sm:text-base">
              Mot de passe
            </label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                class="w-full px-3 py-2 pr-10 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:pr-12 sm:rounded-lg"
                [class.border-error]="isFieldInvalid('password')"
                [class.border-input]="!isFieldInvalid('password')"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors duration-200 hover:scale-110 sm:right-3"
                tabindex="-1"
              >
                @if (showPassword()) {
                  <img
                    [ngSrc]="'/icons/eye.svg'"
                    alt="Icône oeil ouvert"
                    class="w-4 h-4 object-contain icon-invert sm:w-5 sm:h-5"
                    width="16"
                    height="16"
                  />
                } @else {
                  <img
                    [ngSrc]="'/icons/eye-off.svg'"
                    alt="Icône oeil fermé"
                    class="w-4 h-4 object-contain icon-invert sm:w-5 sm:h-5"
                    width="16"
                    height="16"
                  />
                }
              </button>
            </div>
            @if (isFieldInvalid('password')) {
              <p class="text-error text-xs mt-1 sm:text-sm">
                @if (signinForm.get('password')?.errors?.['required']) {
                  Le mot de passe est requis
                } @else if (signinForm.get('password')?.errors?.['minlength']) {
                  Le mot de passe doit contenir au moins 6 caractères
                }
              </p>
            }
          </div>

          <app-button
            type="submit"
            color="primary"
            [disabled]="signinForm.invalid"
            [isLoading]="authService.isLoading()"
            customClass="w-full py-3 text-base font-semibold mt-6 sm:py-4 sm:text-lg sm:mt-8"
          >
            @if (authService.isLoading()) {
              Connexion en cours...
            } @else {
              Se connecter
            }
          </app-button>
        </form>

        <div class="mt-4 text-center sm:mt-6">
          <p class="text-muted text-sm sm:text-base">
            Pas encore de compte ?
            <button
              type="button"
              (click)="navigateToSignup()"
              class="text-primary hover:text-primary-600 font-medium ml-1 transition-colors duration-200 underline-offset-4 hover:underline"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
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
}
