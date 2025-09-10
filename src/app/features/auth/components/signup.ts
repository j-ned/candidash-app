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

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  template: `
    <!-- Container responsive mobile-first -->
    <div class="w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl">
      <div class="bg-surface border border-border rounded-lg p-4 shadow-sm sm:rounded-xl sm:p-8 md:shadow-lg">
        
        <!-- Title responsive -->
        <h2 class="text-2xl font-bold text-center mb-4 text-text sm:text-3xl sm:mb-8 md:text-4xl">
          Créer un compte
        </h2>

        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-6">
          
          <!-- Email Field -->
          <div class="space-y-1 sm:space-y-2">
            <label for="email" class="block text-sm font-medium text-text sm:text-base">
              Email <span class="text-error">*</span>
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
                @if (signupForm.get('email')?.errors?.['required']) {
                  L'email est requis
                } @else if (signupForm.get('email')?.errors?.['email']) {
                  Veuillez entrer un email valide
                }
              </p>
            }
          </div>

          <!-- Username Field -->
          <div class="space-y-1 sm:space-y-2">
            <label for="username" class="block text-sm font-medium text-text sm:text-base">
              Nom d'utilisateur
              <span class="text-muted text-xs sm:text-sm">(optionnel)</span>
            </label>
            <input
              id="username"
              type="text"
              formControlName="username"
              class="w-full px-3 py-2 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:rounded-lg"
              [class.border-error]="isFieldInvalid('username')"
              [class.border-input]="!isFieldInvalid('username')"
              placeholder="john_doe"
            />
            @if (isFieldInvalid('username')) {
              <p class="text-error text-xs mt-1 sm:text-sm">
                @if (signupForm.get('username')?.errors?.['minlength']) {
                  Le nom d'utilisateur doit contenir au moins 3 caractères
                } @else if (signupForm.get('username')?.errors?.['pattern']) {
                  Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores
                }
              </p>
            }
          </div>

          <!-- Password Field -->
          <div class="space-y-1 sm:space-y-2">
            <label for="password" class="block text-sm font-medium text-text sm:text-base">
              Mot de passe <span class="text-error">*</span>
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
                @if (signupForm.get('password')?.errors?.['required']) {
                  Le mot de passe est requis
                } @else if (signupForm.get('password')?.errors?.['minlength']) {
                  Le mot de passe doit contenir au moins 6 caractères
                }
              </p>
            }
          </div>

          <!-- Confirm Password Field -->
          <div class="space-y-1 sm:space-y-2">
            <label for="confirmPassword" class="block text-sm font-medium text-text sm:text-base">
              Confirmer le mot de passe <span class="text-error">*</span>
            </label>
            <div class="relative">
              <input
                id="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                class="w-full px-3 py-2 pr-10 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:pr-12 sm:rounded-lg"
                [class.border-error]="
                  isFieldInvalid('confirmPassword') || signupForm.errors?.['passwordMismatch']
                "
                [class.border-input]="
                  !isFieldInvalid('confirmPassword') && !signupForm.errors?.['passwordMismatch']
                "
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="toggleConfirmPasswordVisibility()"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors duration-200 hover:scale-110 sm:right-3"
                tabindex="-1"
              >
                @if (showConfirmPassword()) {
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
            @if (isFieldInvalid('confirmPassword') || signupForm.errors?.['passwordMismatch']) {
              <p class="text-error text-xs mt-1 sm:text-sm">
                @if (signupForm.get('confirmPassword')?.errors?.['required']) {
                  La confirmation du mot de passe est requise
                } @else if (signupForm.errors?.['passwordMismatch']) {
                  Les mots de passe ne correspondent pas
                }
              </p>
            }
          </div>

          <!-- Submit Button -->
          <app-button
            type="submit"
            color="primary"
            [disabled]="signupForm.invalid"
            [isLoading]="authService.isLoading()"
            customClass="w-full py-3 text-base font-semibold mt-4 sm:py-4 sm:text-lg sm:mt-8"
          >
            @if (authService.isLoading()) {
              Création en cours...
            } @else {
              Créer le compte
            }
          </app-button>
        </form>

        <!-- Sign in link -->
        <div class="mt-3 text-center sm:mt-6">
          <p class="text-muted text-sm sm:text-base">
            Déjà un compte ?
            <button
              type="button"
              (click)="navigateToSignin()"
              class="text-primary hover:text-primary-600 font-medium ml-1 transition-colors duration-200 underline-offset-4 hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

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
          // Redirect to dashboard or home page after successful registration
          this.router.navigate(['/']);
        },
        error: () => {
          // Error is handled by the auth service and displayed in template
          // For now, this will show the "not implemented" message
        },
      });
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
