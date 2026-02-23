import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { IconComponent } from '@shared/ui/icon/icon';
import { AuthStateService } from '@features/auth/application/auth-state.service';

type TotpForm = {
  token: FormControl<string>;
};

type RecoveryForm = {
  recoveryCode: FormControl<string>;
};

@Component({
  selector: 'app-totp-verify',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './totp-verify.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-6 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg',
    role: 'region',
    '[attr.aria-labelledby]': '"totp-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotpVerify implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthStateService);

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

  ngOnInit(): void {
    if (!this.authService.hasPending2FA()) {
      this.router.navigate(['/auth/signin']);
    }
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
      this.authService
        .useRecoveryCode(recoveryCode)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  toggleRecoveryMode(): void {
    this.useRecoveryMode.update((v) => !v);
    this.totpForm.reset();
    this.recoveryForm.reset();
  }

  submitLabel(): string {
    return this.authService.isLoading() ? 'Vérification...' : 'Vérifier';
  }

  goBack(): void {
    this.authService.clearPending2FA();
    this.router.navigate(['/auth/signin']);
  }

  tokenError(): string | null {
    const ctrl = this.totpForm.controls.token;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le code est requis';
    if (ctrl.errors['pattern']) return 'Le code doit contenir exactement 6 chiffres';
    return null;
  }

  recoveryCodeError(): string | null {
    const ctrl = this.recoveryForm.controls.recoveryCode;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le code de récupération est requis';
    return null;
  }
}
