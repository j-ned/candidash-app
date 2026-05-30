import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { AuthState } from '@features/auth/application/auth-state';
import type { LoginCredentials } from '@features/auth/domain/models/auth.model';

import { ForgotPasswordModal } from '@shared/ui/forgot-password-modal/service/forgot-password-modal';
import { Icon } from '@shared/ui/icon/icon';

type SigninForm = {
  email: FormControl<string>;
  password: FormControl<string>;
};

type TotpForm = {
  token: FormControl<string>;
};

type RecoveryForm = {
  recoveryCode: FormControl<string>;
};

@Component({
  selector: 'app-signin',
  imports: [ReactiveFormsModule, Button, Icon, RouterLink],
  templateUrl: './signin.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"signin-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signin {
  private readonly router = inject(Router);
  private readonly forgotPasswordModalService = inject(ForgotPasswordModal);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthState);

  readonly showPassword = signal(false);
  readonly useRecoveryMode = signal(false);

  readonly totpForm = new FormGroup<TotpForm>({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  readonly recoveryForm = new FormGroup<RecoveryForm>({
    recoveryCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly signinForm = new FormGroup<SigninForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  private readonly emailEvents = toSignal(this.signinForm.controls.email.events);
  private readonly passwordEvents = toSignal(
    this.signinForm.controls.password.events,
  );
  private readonly tokenEvents = toSignal(this.totpForm.controls.token.events);
  private readonly recoveryEvents = toSignal(
    this.recoveryForm.controls.recoveryCode.events,
  );

  protected readonly emailError = computed(() => {
    this.emailEvents();
    const ctrl = this.signinForm.controls.email;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return "L'email est requis";
    if (ctrl.errors['email']) return 'Veuillez entrer un email valide';
    return null;
  });

  protected readonly passwordError = computed(() => {
    this.passwordEvents();
    const ctrl = this.signinForm.controls.password;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le mot de passe est requis';
    if (ctrl.errors['minlength'])
      return 'Le mot de passe doit contenir au moins 6 caractères';
    return null;
  });

  protected readonly emailInvalid = computed(() => {
    this.emailEvents();
    const f = this.signinForm.controls.email;
    return f.invalid && f.touched;
  });

  protected readonly passwordInvalid = computed(() => {
    this.passwordEvents();
    const f = this.signinForm.controls.password;
    return f.invalid && f.touched;
  });

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading() ? 'Connexion en cours...' : 'Se connecter',
  );

  onSubmit(): void {
    if (this.signinForm.valid) {
      const credentials: LoginCredentials = this.signinForm.getRawValue();

      this.authService.signin(credentials).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  onSubmitTotp(): void {
    if (this.totpForm.valid) {
      const { token } = this.totpForm.getRawValue();
      this.authService.validateTotp(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  onSubmitRecovery(): void {
    if (this.recoveryForm.valid) {
      const { recoveryCode } = this.recoveryForm.getRawValue();
      this.authService.useRecoveryCode(recoveryCode).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  toggleRecoveryMode(): void {
    this.useRecoveryMode.update((v) => !v);
    this.totpForm.reset();
    this.recoveryForm.reset();
  }

  cancelTotp(): void {
    this.authService.clearPending2FA();
    this.useRecoveryMode.set(false);
    this.totpForm.reset();
    this.recoveryForm.reset();
  }

  protected readonly totpSubmitLabel = computed(() =>
    this.authService.isLoading() ? 'Vérification...' : 'Vérifier',
  );

  protected readonly tokenError = computed(() => {
    this.tokenEvents();
    const ctrl = this.totpForm.controls.token;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le code est requis';
    if (ctrl.errors['pattern'])
      return 'Le code doit contenir exactement 6 chiffres';
    return null;
  });

  protected readonly recoveryCodeError = computed(() => {
    this.recoveryEvents();
    const ctrl = this.recoveryForm.controls.recoveryCode;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le code de récupération est requis';
    return null;
  });

  async openForgotPasswordModal(): Promise<void> {
    const currentEmail = this.signinForm.controls.email.value;

    await this.forgotPasswordModalService.showForgotPasswordModal({
      email: currentEmail,
    });
  }
}
