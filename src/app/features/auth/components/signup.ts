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
    <div class="max-w-md mx-auto bg-surface border border-border rounded-xl p-8 shadow-lg">
      <h2 class="text-3xl font-bold text-center mb-8 text-text">Créer un compte</h2>

      <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Email Field -->
        <div class="space-y-2">
          <label for="email" class="block text-sm font-medium text-text">
            Email <span class="text-error">*</span>
          </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground outline-none"
            [class.border-red-500]="isFieldInvalid('email')"
            [class.border-slate-300]="!isFieldInvalid('email')"
            placeholder="votre@email.com"
          />
          @if (isFieldInvalid('email')) {
            <p class="text-error text-sm mt-1">
              @if (signupForm.get('email')?.errors?.['required']) {
                L'email est requis
              } @else if (signupForm.get('email')?.errors?.['email']) {
                Veuillez entrer un email valide
              }
            </p>
          }
        </div>

        <!-- Username Field -->
        <div class="space-y-2">
          <label for="username" class="block text-sm font-medium text-text">
            Nom d'utilisateur
            <span class="text-muted text-xs">(optionnel)</span>
          </label>
          <input
            id="username"
            type="text"
            formControlName="username"
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground outline-none"
            [class.border-red-500]="isFieldInvalid('username')"
            [class.border-slate-300]="!isFieldInvalid('username')"
            placeholder="john_doe"
          />
          @if (isFieldInvalid('username')) {
            <p class="text-error text-sm mt-1">
              @if (signupForm.get('username')?.errors?.['minlength']) {
                Le nom d'utilisateur doit contenir au moins 3 caractères
              } @else if (signupForm.get('username')?.errors?.['pattern']) {
                Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores
              }
            </p>
          }
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <label for="password" class="block text-sm font-medium text-text">
            Mot de passe <span class="text-error">*</span>
          </label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground outline-none"
              [class.border-red-500]="isFieldInvalid('password')"
              [class.border-slate-300]="!isFieldInvalid('password')"
              placeholder="••••••••"
            />
            <button
              type="button"
              (click)="togglePasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors hover:scale-110"
              tabindex="-1"
            >
              @if (showPassword()) {
                👁️
              } @else {
                🙈
              }
            </button>
          </div>
          @if (isFieldInvalid('password')) {
            <p class="text-error text-sm mt-1">
              @if (signupForm.get('password')?.errors?.['required']) {
                Le mot de passe est requis
              } @else if (signupForm.get('password')?.errors?.['minlength']) {
                Le mot de passe doit contenir au moins 6 caractères
              }
            </p>
          }
        </div>

        <!-- Confirm Password Field -->
        <div class="space-y-2">
          <label for="confirmPassword" class="block text-sm font-medium text-text">
            Confirmer le mot de passe <span class="text-error">*</span>
          </label>
          <div class="relative">
            <input
              id="confirmPassword"
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground outline-none"
              [class.border-red-500]="
                isFieldInvalid('confirmPassword') || signupForm.errors?.['passwordMismatch']
              "
              [class.border-slate-300]="
                !isFieldInvalid('confirmPassword') && !signupForm.errors?.['passwordMismatch']
              "
              placeholder="••••••••"
            />
            <button
              type="button"
              (click)="toggleConfirmPasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors hover:scale-110"
              tabindex="-1"
            >
              @if (showConfirmPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Icône oeil ouvert"
                  class="object-contain absolute inset-0 w-full h-full icon-invert"
                  width="20"
                  height="20"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Icône oeil fermé"
                  class="object-contain absolute inset-0 w-full h-full icon-invert"
                  width="20"
                  height="20"
                />
              }
            </button>
          </div>
          @if (isFieldInvalid('confirmPassword') || signupForm.errors?.['passwordMismatch']) {
            <p class="text-error text-sm mt-1">
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
          customClass="w-full py-4 text-lg font-semibold"
        >
          @if (authService.isLoading()) {
            Création en cours...
          } @else {
            Créer le compte
          }
        </app-button>
      </form>

      <!-- Link to signin -->
      <div class="mt-6 text-center">
        <p class="text-muted">
          Déjà un compte ?
          <button
            type="button"
            (click)="navigateToSignin()"
            class="text-accent hover:text-accent/80 font-medium ml-1 transition-colors"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  `,
  styles: [],
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
