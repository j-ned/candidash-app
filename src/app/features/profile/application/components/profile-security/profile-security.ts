import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { ProfileState } from '@features/profile/application/profile-state';
import type { ChangePasswordRequest } from '@features/profile/domain/models/profile.model';
import { passwordMatchValidator } from '@shared/validators/password-match.validator';

type PasswordChangeForm = {
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
};

@Component({
  selector: 'app-profile-security',
  imports: [ReactiveFormsModule, Icon, Button],
  templateUrl: './profile-security.html',
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"security-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurity {
  readonly profileService = inject(ProfileState);
  private readonly destroyRef = inject(DestroyRef);

  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly passwordForm = new FormGroup<PasswordChangeForm>(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator('newPassword', 'confirmPassword') },
  );

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword } = this.passwordForm.getRawValue();
      const passwordData: ChangePasswordRequest = {
        currentPassword,
        newPassword,
      };

      this.profileService
        .changePassword(passwordData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.passwordForm.reset();
          },
        });
    }
  }

  isPasswordFieldInvalid(fieldName: keyof PasswordChangeForm): boolean {
    const field = this.passwordForm.controls[fieldName];
    return field.invalid && field.touched;
  }

  currentPasswordError(): string | null {
    const ctrl = this.passwordForm.controls.currentPassword;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Mot de passe actuel requis';
    return null;
  }

  newPasswordError(): string | null {
    const ctrl = this.passwordForm.controls.newPassword;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Nouveau mot de passe requis';
    if (ctrl.errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères';
    return null;
  }

  confirmPasswordError(): string | null {
    const ctrl = this.passwordForm.controls.confirmPassword;
    const touched = ctrl.touched || ctrl.dirty;
    if (!touched) return null;
    if (ctrl.errors?.['required']) return 'Confirmation du mot de passe requise';
    if (this.passwordForm.errors?.['passwordMismatch'])
      return 'Les mots de passe ne correspondent pas';
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
