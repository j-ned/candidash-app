import { Component, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { IconComponent } from '@shared/ui/icon/icon';
import { AuthStateService } from '@features/auth/application/auth-state.service';
import { SetupTotpUseCase } from '@features/auth/domain/use-cases/setup-totp.use-case';
import { VerifyTotpSetupUseCase } from '@features/auth/domain/use-cases/verify-totp-setup.use-case';
import { DisableTotpUseCase } from '@features/auth/domain/use-cases/disable-totp.use-case';
import { ToastService } from '@shared/ui/toast/service/toast';

type TotpSetupState = 'idle' | 'qrcode' | 'verify' | 'recovery-codes';

@Component({
  selector: 'app-profile-2fa',
  imports: [ReactiveFormsModule, IconComponent, ButtonComponent],
  templateUrl: './profile-2fa.html',
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"2fa-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile2fa {
  private readonly authService = inject(AuthStateService);
  private readonly setupTotpUseCase = inject(SetupTotpUseCase);
  private readonly verifyTotpSetupUseCase = inject(VerifyTotpSetupUseCase);
  private readonly disableTotpUseCase = inject(DisableTotpUseCase);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<TotpSetupState>('idle');
  readonly isLoading = signal(false);
  readonly qrCodeDataUri = signal<string | null>(null);
  readonly otpauthUri = signal<string | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly showDisableForm = signal(false);
  readonly showManualSetup = signal(false);

  readonly verifyForm = new FormGroup({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  readonly disableForm = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  get isTotpEnabled(): boolean {
    return this.authService.user()?.totpEnabled ?? false;
  }

  startSetup(): void {
    this.isLoading.set(true);
    this.setupTotpUseCase
      .execute()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.qrCodeDataUri.set(response.qrCodeDataUri);
          this.otpauthUri.set(response.otpauthUri);
          this.state.set('qrcode');
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.show(
            'danger',
            'Erreur',
            'Impossible de configurer la 2FA',
            { duration: 5000, dismissible: true },
          );
        },
      });
  }

  goToVerify(): void {
    this.state.set('verify');
    this.verifyForm.reset();
  }

  onVerifySetup(): void {
    if (this.verifyForm.valid) {
      this.isLoading.set(true);
      const { token } = this.verifyForm.getRawValue();
      this.verifyTotpSetupUseCase
        .execute(token)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.recoveryCodes.set(response.recoveryCodes);
            this.state.set('recovery-codes');
            this.isLoading.set(false);
            const user = this.authService.user();
            if (user) {
              this.authService.updateUserData({ ...user, totpEnabled: true });
            }
            this.toastService.show(
              'success',
              '2FA activée',
              "L'authentification à deux facteurs est maintenant active",
              { duration: 4000, dismissible: true },
            );
          },
          error: () => {
            this.isLoading.set(false);
            this.toastService.show(
              'danger',
              'Code invalide',
              'Le code TOTP est incorrect. Réessayez.',
              { duration: 5000, dismissible: true },
            );
          },
        });
    }
  }

  onDisableTotp(): void {
    if (this.disableForm.valid) {
      this.isLoading.set(true);
      const { password } = this.disableForm.getRawValue();
      this.disableTotpUseCase
        .execute(password)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isLoading.set(false);
            this.showDisableForm.set(false);
            this.disableForm.reset();
            const user = this.authService.user();
            if (user) {
              this.authService.updateUserData({ ...user, totpEnabled: false });
            }
            this.toastService.show(
              'success',
              '2FA désactivée',
              "L'authentification à deux facteurs a été désactivée",
              { duration: 4000, dismissible: true },
            );
          },
          error: () => {
            this.isLoading.set(false);
            this.toastService.show(
              'danger',
              'Erreur',
              'Mot de passe incorrect',
              { duration: 5000, dismissible: true },
            );
          },
        });
    }
  }

  finishSetup(): void {
    this.state.set('idle');
    this.recoveryCodes.set([]);
    this.qrCodeDataUri.set(null);
    this.otpauthUri.set(null);
  }

  cancelSetup(): void {
    this.state.set('idle');
    this.qrCodeDataUri.set(null);
    this.otpauthUri.set(null);
    this.verifyForm.reset();
  }

  toggleDisableForm(): void {
    this.showDisableForm.update((v) => !v);
    this.disableForm.reset();
  }

  toggleManualSetup(): void {
    this.showManualSetup.update((v) => !v);
  }

  copyRecoveryCodes(): void {
    const codes = this.recoveryCodes().join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      this.toastService.show(
        'success',
        'Copié',
        'Les codes de récupération ont été copiés',
        { duration: 3000, dismissible: true },
      );
    });
  }

  tokenError(): string | null {
    const ctrl = this.verifyForm.controls.token;
    if (!(ctrl.touched || ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le code est requis';
    if (ctrl.errors['pattern']) return 'Le code doit contenir exactement 6 chiffres';
    return null;
  }
}
