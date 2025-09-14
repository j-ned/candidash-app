import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { ChangePasswordRequest } from '@features/dashboard/profile/models/profile-model';

@Component({
  selector: 'app-profile-security',
  imports: [ReactiveFormsModule, NgOptimizedImage, ButtonComponent],
  template: `
    <div class="bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6">
      <h2 class="text-lg font-semibold text-text mb-4 flex items-center mt-3 sm:text-xl sm:mb-6 sm:mt-5">
        <img
          [ngSrc]="'/icons/password.svg'"
          alt="Lock Icon"
          class="w-5 h-5 mr-2 icon-invert sm:w-6 sm:h-6"
          width="18"
          height="18"
        />
        Sécurité du compte
      </h2>

      <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-3 sm:space-y-4">
        <div class="space-y-1 sm:space-y-2">
          <div class="relative">
            <input
              id="currentPassword"
              [type]="showCurrentPassword() ? 'text' : 'password'"
              formControlName="currentPassword"
              class="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-text placeholder:text-muted text-sm sm:px-4 sm:py-3 sm:pr-12 sm:rounded-md sm:text-base"
              [class.border-error]="isPasswordFieldInvalid('currentPassword')"
              [class.border-border]="!isPasswordFieldInvalid('currentPassword')"
              placeholder="Mot de passe actuel"
            />
            <button
              type="button"
              (click)="toggleCurrentPasswordVisibility()"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors duration-200 sm:right-3"
              tabindex="-1"
            >
              @if (showCurrentPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('currentPassword')) {
            <p class="text-error text-xs mt-1 sm:text-sm">Mot de passe actuel requis</p>
          }
        </div>

        <div class="space-y-1 sm:space-y-2">
          <div class="relative">
            <input
              id="newPassword"
              [type]="showNewPassword() ? 'text' : 'password'"
              formControlName="newPassword"
              class="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-text placeholder:text-muted text-sm sm:px-4 sm:py-3 sm:pr-12 sm:rounded-md sm:text-base"
              [class.border-error]="isPasswordFieldInvalid('newPassword')"
              [class.border-border]="!isPasswordFieldInvalid('newPassword')"
              placeholder="Nouveau mot de passe"
            />
            <button
              type="button"
              (click)="toggleNewPasswordVisibility()"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors duration-200 sm:right-3"
              tabindex="-1"
            >
              @if (showNewPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('newPassword')) {
            <p class="text-error text-xs mt-1 sm:text-sm">
              @if (passwordForm.get('newPassword')?.errors?.['required']) {
                Nouveau mot de passe requis
              } @else if (passwordForm.get('newPassword')?.errors?.['minlength']) {
                Le mot de passe doit contenir au moins 8 caractères
              }
            </p>
          }
        </div>

        <div class="space-y-1 sm:space-y-2">
          <div class="relative">
            <input
              id="confirmPassword"
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-text placeholder:text-muted text-sm sm:px-4 sm:py-3 sm:pr-12 sm:rounded-md sm:text-base"
              [class.border-error]="
                isPasswordFieldInvalid('confirmPassword') || hasPasswordMismatch()
              "
              [class.border-border]="
                !isPasswordFieldInvalid('confirmPassword') && !hasPasswordMismatch()
              "
              placeholder="Confirmer le nouveau mot de passe"
            />
            <button
              type="button"
              (click)="toggleConfirmPasswordVisibility()"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors duration-200 sm:right-3"
              tabindex="-1"
            >
              @if (showConfirmPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-4 h-4 icon-invert sm:w-5 sm:h-5"
                  width="16"
                  height="16"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('confirmPassword')) {
            <p class="text-error text-xs mt-1 sm:text-sm">Confirmation du mot de passe requise</p>
          }
          @if (hasPasswordMismatch()) {
            <p class="text-error text-xs mt-1 sm:text-sm">Les mots de passe ne correspondent pas</p>
          }
        </div>

        <div class="pt-2 sm:pt-3">
          <app-button
            type="submit"
            color="red"
            [disabled]="passwordForm.invalid || profileService.isLoading()"
            [isLoading]="profileService.isLoading()"
            customClass="w-full px-4 py-2 text-sm sm:w-auto sm:px-6 sm:py-3 sm:text-base"
          >
            @if (profileService.isLoading()) {
              <span class="sm:hidden">Modification...</span>
              <span class="hidden sm:inline">Modification...</span>
            } @else {
              <span class="sm:hidden">Changer le mot de passe</span>
              <span class="hidden sm:inline">Changer le mot de passe</span>
            }
          </app-button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurityComponent {
  private readonly fb = inject(FormBuilder);
  readonly profileService = inject(ProfileService);

  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  onChangePassword(): void {
    if (this.passwordForm.valid && !this.hasPasswordMismatch()) {
      const passwordData: ChangePasswordRequest = {
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: this.passwordForm.get('newPassword')?.value,
      };

      this.profileService.changePassword(passwordData).subscribe({
        next: () => {
          // Reset password form on success
          this.passwordForm.reset();
        },
      });
    }
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  hasPasswordMismatch(): boolean {
    const newPassword = this.passwordForm.get('newPassword')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
    return (
      newPassword !== confirmPassword &&
      (this.passwordForm.get('confirmPassword')?.touched ?? false)
    );
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((show) => !show);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((show) => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }
}
