import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  pattern,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { AuthState } from '@features/auth/application/auth-state';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { Toaster } from '@shared/ui/toast/service/toast';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';

type TotpSetupState = 'idle' | 'qrcode' | 'verify' | 'recovery-codes';
type VerifyModel = { token: string };
type DisableModel = { password: string };

const TOTP_CODE_LENGTH = 6;
const EMPTY_VERIFY: VerifyModel = { token: '' };
const EMPTY_DISABLE: DisableModel = { password: '' };

@Component({
  selector: 'app-profile-2fa',
  imports: [FormRoot, FormField, FieldError, Icon, Button],
  templateUrl: './profile-2fa.html',
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"2fa-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile2fa {
  private readonly authService = inject(AuthState);
  private readonly authGateway = inject(AuthGateway);
  private readonly toastService = inject(Toaster);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<TotpSetupState>('idle');
  readonly isLoading = signal(false);
  readonly qrCodeDataUri = signal<string | null>(null);
  readonly otpauthUri = signal<string | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly showDisableForm = signal(false);
  readonly showManualSetup = signal(false);

  protected readonly verifyForm = form(
    signal<VerifyModel>({ ...EMPTY_VERIFY }),
    (path) => {
      required(path.token, { message: 'Le code est requis' });
      pattern(path.token, /^\d{6}$/, { message: 'Le code doit contenir exactement 6 chiffres' });
      // Pose aussi l'attribut maxlength sur le champ
      maxLength(path.token, TOTP_CODE_LENGTH, {
        message: 'Le code doit contenir exactement 6 chiffres',
      });
    },
    {
      submission: {
        action: (field) => this.verifySetup(field),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly disableForm = form(
    signal<DisableModel>({ ...EMPTY_DISABLE }),
    (path) => {
      required(path.password, { message: 'Mot de passe requis' });
    },
    {
      submission: {
        action: (field) => this.disableTotp(field),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly isTotpEnabled = computed(
    () => this.authService.user()?.totpEnabled ?? false,
  );

  startSetup(): void {
    this.isLoading.set(true);
    this.authGateway.setupTotp()
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
    this.verifyForm().reset({ ...EMPTY_VERIFY });
  }

  private async verifySetup(field: FieldTree<VerifyModel>): Promise<void> {
    this.isLoading.set(true);
    const { token } = field().value();
    try {
      const response = await firstValueFrom(this.authGateway.verifyTotpSetup(token));
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
    } catch {
      this.isLoading.set(false);
      this.toastService.show(
        'danger',
        'Code invalide',
        'Le code TOTP est incorrect. Réessayez.',
        { duration: 5000, dismissible: true },
      );
    }
  }

  private async disableTotp(field: FieldTree<DisableModel>): Promise<void> {
    this.isLoading.set(true);
    const { password } = field().value();
    try {
      await firstValueFrom(this.authGateway.disableTotp(password));
      this.isLoading.set(false);
      this.showDisableForm.set(false);
      field().reset({ ...EMPTY_DISABLE });
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
    } catch {
      this.isLoading.set(false);
      this.toastService.show(
        'danger',
        'Erreur',
        'Mot de passe incorrect',
        { duration: 5000, dismissible: true },
      );
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
    this.verifyForm().reset({ ...EMPTY_VERIFY });
  }

  toggleDisableForm(): void {
    this.showDisableForm.update((v) => !v);
    this.disableForm().reset({ ...EMPTY_DISABLE });
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
}
