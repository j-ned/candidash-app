import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthStateService } from '@features/auth/application/auth-state.service';

import { IconComponent } from '@shared/ui/icon/icon';

type ForgotPasswordForm = {
  email: FormControl<string>;
};

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, RouterLink],
  templateUrl: './forgot-password.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"forgot-password-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly router = inject(Router);
  readonly authService = inject(AuthStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly emailSent = signal(false);

  readonly forgotPasswordForm = new FormGroup<ForgotPasswordForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.getRawValue();

      this.authService
        .forgotPassword({ email })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.emailSent.set(true);
          },
          error: () => {
            this.emailSent.set(true);
          },
        });
    }
  }

  resetForm(): void {
    this.emailSent.set(false);
    this.forgotPasswordForm.reset();
  }

  isFieldInvalid(fieldName: keyof ForgotPasswordForm): boolean {
    const field = this.forgotPasswordForm.controls[fieldName];
    return field.invalid && field.touched;
  }

  navigateToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }
}
