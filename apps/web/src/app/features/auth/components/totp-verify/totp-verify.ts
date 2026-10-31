import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import { FormField, FormRoot, form, maxLength, pattern, required } from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { Icon } from '@shared/ui/icon/icon';
import { AuthState } from '@features/auth/application/auth-state';

const TOTP_LENGTH = 6;
const EMPTY_TOTP = { token: '' };
const EMPTY_RECOVERY = { recoveryCode: '' };

@Component({
  selector: 'app-totp-verify',
  imports: [FormRoot, FormField, FieldError, Button, Icon],
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
  readonly authService = inject(AuthState);

  readonly useRecoveryMode = signal(false);

  private readonly totpModel = signal({ ...EMPTY_TOTP });
  private readonly recoveryModel = signal({ ...EMPTY_RECOVERY });

  readonly totpForm = form(
    this.totpModel,
    (path) => {
      required(path.token, { message: 'Le code est requis' });
      pattern(path.token, /^\d{6}$/, { message: 'Le code doit contenir exactement 6 chiffres' });
      // Pose l'attribut natif maxlength : la saisie s'arrête à 6 caractères
      maxLength(path.token, TOTP_LENGTH, {
        message: 'Le code doit contenir exactement 6 chiffres',
      });
    },
    {
      submission: {
        action: () => this.settle(this.authService.validateTotp(this.totpModel().token)),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  readonly recoveryForm = form(
    this.recoveryModel,
    (path) => {
      required(path.recoveryCode, { message: 'Le code de récupération est requis' });
    },
    {
      submission: {
        action: () =>
          this.settle(this.authService.useRecoveryCode(this.recoveryModel().recoveryCode)),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  protected readonly submitLabel = computed(() =>
    this.authService.isLoading() ? 'Vérification...' : 'Vérifier',
  );

  ngOnInit(): void {
    if (!this.authService.hasPending2FA()) {
      this.router.navigate(['/auth/signin']);
    }
  }

  toggleRecoveryMode(): void {
    this.useRecoveryMode.update((v) => !v);
    this.totpForm().reset({ ...EMPTY_TOTP });
    this.recoveryForm().reset({ ...EMPTY_RECOVERY });
  }

  goBack(): void {
    this.authService.clearPending2FA();
    this.router.navigate(['/auth/signin']);
  }

  // Succès (navigation) et échec (toast) sont gérés par AuthState
  private async settle(request: Observable<unknown>): Promise<void> {
    try {
      await firstValueFrom(request);
    } catch {
      // Erreur déjà signalée par AuthState
    }
  }
}
