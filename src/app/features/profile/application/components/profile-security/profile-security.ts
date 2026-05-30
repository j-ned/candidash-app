import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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

  private readonly currentEvents = toSignal(
    this.passwordForm.controls.currentPassword.events,
  );
  private readonly newEvents = toSignal(
    this.passwordForm.controls.newPassword.events,
  );
  private readonly confirmEvents = toSignal(
    this.passwordForm.controls.confirmPassword.events,
  );

  protected readonly currentPasswordInvalid = computed(() => {
    this.currentEvents();
    const f = this.passwordForm.controls.currentPassword;
    return f.invalid && f.touched;
  });
  protected readonly newPasswordInvalid = computed(() => {
    this.newEvents();
    const f = this.passwordForm.controls.newPassword;
    return f.invalid && f.touched;
  });
  protected readonly confirmPasswordInvalid = computed(() => {
    this.confirmEvents();
    const f = this.passwordForm.controls.confirmPassword;
    return f.invalid && f.touched;
  });

  protected readonly currentPasswordError = computed(() => {
    this.currentEvents();
    const ctrl = this.passwordForm.controls.currentPassword;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Mot de passe actuel requis';
    return null;
  });

  protected readonly newPasswordError = computed(() => {
    this.newEvents();
    const ctrl = this.passwordForm.controls.newPassword;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Nouveau mot de passe requis';
    if (ctrl.errors['minlength'])
      return 'Le mot de passe doit contenir au moins 8 caractères';
    return null;
  });

  protected readonly confirmPasswordError = computed(() => {
    this.confirmEvents();
    this.newEvents(); // le mismatch dépend aussi de newPassword
    const ctrl = this.passwordForm.controls.confirmPassword;
    if (!(ctrl.touched || ctrl.dirty)) return null;
    if (ctrl.errors?.['required']) return 'Confirmation du mot de passe requise';
    if (this.passwordForm.errors?.['passwordMismatch'])
      return 'Les mots de passe ne correspondent pas';
    return null;
  });

  protected readonly submitLabel = computed(() =>
    this.profileService.isLoading()
      ? 'Modification...'
      : 'Changer le mot de passe',
  );

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
