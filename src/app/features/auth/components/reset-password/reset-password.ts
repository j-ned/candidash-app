import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { AuthState } from '@features/auth/application/auth-state';

import { passwordMatchValidator } from '@shared/validators/password-match.validator';
import { Icon } from '@shared/ui/icon/icon';

type ResetPasswordForm = {
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
};

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, Button, Icon],
  templateUrl: './reset-password.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"reset-password-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);
  private readonly destroyRef = inject(DestroyRef);

  readonly token = input<string>('');

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordReset = signal(false);
  readonly currentPassword = signal('');

  readonly resetPasswordForm = new FormGroup<ResetPasswordForm>(
    {
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          ),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator('newPassword', 'confirmPassword') },
  );

  ngOnInit(): void {
    if (!this.token()) {
      void this.router.navigate(['/auth/forgot-password']);
    }
  }

  onSubmit(): void {
    const resetToken = this.token();
    if (this.resetPasswordForm.valid && resetToken) {
      const { newPassword } = this.resetPasswordForm.getRawValue();

      this.authService
        .resetPassword({
          token: resetToken,
          newPassword,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.passwordReset.set(true);
          },
        });
    }
  }

  private readonly newPasswordEvents = toSignal(
    this.resetPasswordForm.controls.newPassword.events,
  );
  private readonly confirmPasswordEvents = toSignal(
    this.resetPasswordForm.controls.confirmPassword.events,
  );

  protected readonly newPasswordInvalid = computed(() => {
    this.newPasswordEvents();
    const f = this.resetPasswordForm.controls.newPassword;
    return f.invalid && f.touched;
  });

  protected readonly confirmPasswordInvalid = computed(() => {
    this.confirmPasswordEvents();
    const f = this.resetPasswordForm.controls.confirmPassword;
    return f.invalid && f.touched;
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((show) => !show);
  }

  navigateToSignin(): void {
    void this.router.navigate(['/auth/signin']);
  }

  updateCurrentPassword(): void {
    this.currentPassword.set(this.resetPasswordForm.controls.newPassword.value);
  }

  protected readonly newPasswordError = computed(() => {
    this.newPasswordEvents();
    const ctrl = this.resetPasswordForm.controls.newPassword;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength'])
      return 'Le mot de passe doit contenir au moins 8 caractères';
    if (ctrl.errors['pattern'])
      return 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial';
    return null;
  });

  protected readonly confirmPasswordError = computed(() => {
    this.confirmPasswordEvents();
    this.newPasswordEvents(); // le mismatch dépend aussi de newPassword
    const ctrl = this.resetPasswordForm.controls.confirmPassword;
    if (!(ctrl.touched || ctrl.dirty)) return null;
    if (ctrl.errors?.['required'])
      return 'La confirmation du mot de passe est requise';
    if (this.resetPasswordForm.errors?.['passwordMismatch'])
      return 'Les mots de passe ne correspondent pas';
    return null;
  });

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading()
      ? 'Réinitialisation en cours...'
      : 'Réinitialiser le mot de passe',
  );

  protected readonly hasMinLength = computed(
    () => this.currentPassword().length >= 8,
  );
  protected readonly hasUppercase = computed(() =>
    /[A-Z]/.test(this.currentPassword()),
  );
  protected readonly hasLowercase = computed(() =>
    /[a-z]/.test(this.currentPassword()),
  );
  protected readonly hasNumber = computed(() =>
    /\d/.test(this.currentPassword()),
  );
  protected readonly hasSpecialChar = computed(() =>
    /[@$!%*?&]/.test(this.currentPassword()),
  );
}
