import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { ChangePasswordRequest } from '@features/dashboard/profile/models/profile-model';

@Component({
  selector: 'app-profile-security',
  imports: [ReactiveFormsModule, NgOptimizedImage, ButtonComponent],
  templateUrl: './profile-security.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurity {
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

  currentPasswordError(): string | null {
    const ctrl = this.passwordForm.get('currentPassword');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Mot de passe actuel requis';
    return null;
  }

  newPasswordError(): string | null {
    const ctrl = this.passwordForm.get('newPassword');
    if (!ctrl || !(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Nouveau mot de passe requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères';
    return null;
  }

  confirmPasswordError(): string | null {
    const ctrl = this.passwordForm.get('confirmPassword');
    const touched = ctrl ? ctrl.touched || ctrl.dirty : false;
    if (!touched) return null;
    if (ctrl?.errors?.['required']) return 'Confirmation du mot de passe requise';
    if (this.hasPasswordMismatch()) return 'Les mots de passe ne correspondent pas';
    return null;
  }

  submitLabel(): string {
    return this.profileService.isLoading() ? 'Modification...' : 'Changer le mot de passe';
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
