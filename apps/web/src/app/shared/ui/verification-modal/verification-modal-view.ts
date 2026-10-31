import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength, pattern, required } from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { AuthState } from '@features/auth/application/auth-state';
import { startCooldownTimer, clearCooldownTimer } from '@shared/utils/cooldown';
import type { VerificationModalData } from './verification-modal';
import { Icon } from '@shared/ui/icon/icon';

const CODE_LENGTH = 6;

@Component({
  selector: 'app-verification-modal-view',
  imports: [FormRoot, FormField, FieldError, Button, Icon],
  template: `
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      (click)="onCancel()"
      aria-hidden="true"
    ></div>

    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div
        class="relative bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
      >
        <header class="flex items-center justify-between p-6 pb-0">
          <h2 id="verification-modal-title" class="text-xl font-bold text-text">
            Validation de l'inscription
          </h2>
          <button
            type="button"
            class="p-2 text-muted hover:text-text hover:bg-surface rounded-md transition-colors duration-200"
            data-testid="verification-modal-close"
            (click)="onCancel()"
            aria-label="Fermer"
          >
            <app-icon name="lucide-x" cssClass="w-5 h-5" />
          </button>
        </header>

        <section class="p-6">
          <p class="text-center text-muted mb-6 leading-relaxed">
            Un code de validation à 6 chiffres a été envoyé à votre adresse email :
            <br />
            <strong class="text-text font-semibold">{{ data().email }}</strong>
          </p>

          <form data-testid="verification-modal-form" [formRoot]="verificationForm" class="mb-6">
            <div class="mb-4">
              @let codeInError =
                verificationForm.verificationCode().touched() &&
                verificationForm.verificationCode().invalid();
              <label for="verificationCode" class="block text-sm font-medium text-text mb-2">
                Code de validation <span aria-hidden="true" class="text-error">*</span>
              </label>
              <input
                id="verificationCode"
                data-testid="verification-modal-code"
                type="text"
                [formField]="verificationForm.verificationCode"
                aria-required="true"
                [attr.aria-invalid]="codeInError"
                [attr.aria-describedby]="codeInError ? 'verification-modal-code-error' : null"
                class="w-full px-4 py-3 border border-input rounded-lg bg-background text-text text-center text-lg font-mono tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary aria-invalid:border-error"
                placeholder="123456"
                autocomplete="one-time-code"
              />
              <app-field-error
                [field]="verificationForm.verificationCode"
                errorId="verification-modal-code-error"
                testId="verification-modal-code-error"
              />
            </div>

            <app-button
              data-testid="verification-modal-submit"
              type="submit"
              color="primary"
              [disabled]="authService.isLoading() || verificationForm().submitting()"
              [isLoading]="authService.isLoading()"
              customClass="w-full py-3 text-base font-semibold"
            >
              @if (authService.isLoading()) {
                Validation en cours...
              } @else {
                Valider
              }
            </app-button>
          </form>

          <div class="text-center pt-4 border-t border-border">
            <p class="text-muted text-sm mb-3">Vous n'avez pas reçu le code ?</p>

            <button
              type="button"
              data-testid="verification-modal-resend"
              (click)="onResend()"
              [disabled]="authService.isLoading() || resendCooldown() > 0"
              class="text-primary-800 hover:text-primary-900 font-medium text-sm underline underline-offset-4 hover:no-underline px-4 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline hover:bg-primary/10"
            >
              @if (resendCooldown() > 0) {
                Renvoyer le code ({{ resendCooldown() }}s)
              } @else if (authService.isLoading()) {
                Envoi en cours...
              } @else {
                Renvoyer le code
              }
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  host: {
    class: 'fixed inset-0 z-50 flex items-center justify-center',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationModalView implements OnDestroy {
  readonly authService = inject(AuthState);

  readonly data = input.required<VerificationModalData>();
  readonly verificationSubmitted = output<string>();
  readonly resendRequested = output<void>();
  readonly cancelled = output<void>();

  readonly resendCooldown = signal<number>(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly model = signal({ verificationCode: '' });

  readonly verificationForm = form(
    this.model,
    (path) => {
      required(path.verificationCode, { message: 'Le code de validation est requis' });
      pattern(path.verificationCode, /^\d{6}$/, {
        message: 'Le code doit être composé de 6 chiffres',
      });
      // Pose l'attribut natif maxlength : la saisie s'arrête à 6 caractères
      maxLength(path.verificationCode, CODE_LENGTH, {
        message: 'Le code doit être composé de 6 chiffres',
      });
    },
    {
      submission: {
        action: async () => {
          this.verificationSubmitted.emit(this.model().verificationCode);
        },
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }

  onResend(): void {
    this.resendRequested.emit();
    this.startCooldown();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private startCooldown(): void {
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }
}
