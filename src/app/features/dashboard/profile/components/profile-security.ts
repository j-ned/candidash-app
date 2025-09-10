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
    <div class="bg-card border border-border rounded-lg p-6">
      <h2 class="text-xl font-semibold text-text mb-6 flex items-center mt-5">
        <img
          [ngSrc]="'/icons/password.svg'"
          alt="Lock Icon"
          class="w-6 h-6 mr-2 icon-invert"
          width="20"
          height="20"
        />
        Sécurité du compte
      </h2>

      <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
        <div class="space-y-2">
          <div class="relative">
            <input
              id="currentPassword"
              [type]="showCurrentPassword() ? 'text' : 'password'"
              formControlName="currentPassword"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground"
              [class.border-error]="isPasswordFieldInvalid('currentPassword')"
              [class.border-input]="!isPasswordFieldInvalid('currentPassword')"
              placeholder="Mot de passe actuel"
            />
            <button
              type="button"
              (click)="toggleCurrentPasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors"
              tabindex="-1"
            >
              @if (showCurrentPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('currentPassword')) {
            <p class="text-error text-sm mt-1">Mot de passe actuel requis</p>
          }
        </div>

        <div class="space-y-2">
          <div class="relative">
            <input
              id="newPassword"
              [type]="showNewPassword() ? 'text' : 'password'"
              formControlName="newPassword"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground"
              [class.border-error]="isPasswordFieldInvalid('newPassword')"
              [class.border-input]="!isPasswordFieldInvalid('newPassword')"
              placeholder="Nouveau mot de passe"
            />
            <button
              type="button"
              (click)="toggleNewPasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors"
              tabindex="-1"
            >
              @if (showNewPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('newPassword')) {
            <p class="text-error text-sm mt-1">
              @if (passwordForm.get('newPassword')?.errors?.['required']) {
                Nouveau mot de passe requis
              } @else if (passwordForm.get('newPassword')?.errors?.['minlength']) {
                Le mot de passe doit contenir au moins 6 caractères
              }
            </p>
          }
        </div>

        <div class="space-y-2">
          <div class="relative">
            <input
              id="confirmPassword"
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground"
              [class.border-error]="
                isPasswordFieldInvalid('confirmPassword') || hasPasswordMismatch()
              "
              [class.border-input]="
                !isPasswordFieldInvalid('confirmPassword') && !hasPasswordMismatch()
              "
              placeholder="Confirmer le nouveau mot de passe"
            />
            <button
              type="button"
              (click)="toggleConfirmPasswordVisibility()"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors"
              tabindex="-1"
            >
              @if (showConfirmPassword()) {
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="Hide"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              } @else {
                <img
                  [ngSrc]="'/icons/eye-off.svg'"
                  alt="Show"
                  class="w-5 h-5 icon-invert"
                  width="20"
                  height="20"
                />
              }
            </button>
          </div>
          @if (isPasswordFieldInvalid('confirmPassword')) {
            <p class="text-error text-sm mt-1">Confirmation du mot de passe requise</p>
          }
          @if (hasPasswordMismatch()) {
            <p class="text-error text-sm mt-1">Les mots de passe ne correspondent pas</p>
          }
        </div>

        <app-button
          type="submit"
          color="red"
          [disabled]="passwordForm.invalid || profileService.isLoading()"
          [isLoading]="profileService.isLoading()"
          customClass="px-6 py-3"
        >
          @if (profileService.isLoading()) {
            Modification...
          } @else {
            Changer le mot de passe
          }
        </app-button>
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
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  onChangePassword(): void {
    if (this.passwordForm.valid && !this.hasPasswordMismatch()) {
      const passwordData: ChangePasswordRequest = {
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: this.passwordForm.get('newPassword')?.value,
        confirmPassword: this.passwordForm.get('confirmPassword')?.value,
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
