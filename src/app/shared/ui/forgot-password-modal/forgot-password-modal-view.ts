import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  linkedSignal,
  OnDestroy,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormRoot, email, form, required, submit } from '@angular/forms/signals';
import { Button } from '@shared/ui/button/button';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { AuthState } from '@features/auth/application/auth-state';
import type { ForgotPasswordModalData } from './forgot-password-modal';
import { clearCooldownTimer, startCooldownTimer } from '@shared/utils/cooldown';
import { Icon } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-forgot-password-modal-view',
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
      aria-labelledby="forgot-password-modal-title"
    >
      <div
        class="relative bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
      >
        <header class="flex items-center justify-between p-6 pb-0">
          <h2 id="forgot-password-modal-title" class="text-xl font-bold text-text">
            Mot de passe oublié ?
          </h2>
          <button
            type="button"
            class="p-2 text-muted hover:text-text hover:bg-surface rounded-md transition-colors duration-200"
            (click)="onCancel()"
            aria-label="Fermer"
          >
            <app-icon name="lucide-x" cssClass="w-5 h-5" />
          </button>
        </header>

        <section class="p-6">
          @if (!emailSent()) {
            <p class="text-center text-muted mb-6 leading-relaxed">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot
              de passe.
            </p>

            <form
              data-testid="forgot-password-modal-form"
              [formRoot]="forgotPasswordForm"
              class="space-y-4"
            >
              <div class="space-y-1">
                @let emailInError =
                  forgotPasswordForm.email().touched() && forgotPasswordForm.email().invalid();
                <label
                  for="forgot-password-modal-email"
                  class="block text-sm font-medium text-text"
                >
                  Adresse email
                </label>
                <input
                  id="forgot-password-modal-email"
                  data-testid="forgot-password-modal-email"
                  type="email"
                  [formField]="forgotPasswordForm.email"
                  autocomplete="email"
                  aria-required="true"
                  [attr.aria-invalid]="emailInError"
                  [attr.aria-describedby]="
                    emailInError ? 'forgot-password-modal-email-error' : null
                  "
                  class="w-full px-4 py-3 border border-input rounded-lg bg-background text-text placeholder:text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary aria-invalid:border-error"
                  placeholder="votre@email.com"
                />
                <app-field-error
                  [field]="forgotPasswordForm.email"
                  errorId="forgot-password-modal-email-error"
                  testId="forgot-password-modal-email-error"
                />
              </div>

              <app-button
                data-testid="forgot-password-modal-submit"
                type="submit"
                color="primary"
                [disabled]="authService.isLoading() || forgotPasswordForm().submitting()"
                [isLoading]="authService.isLoading()"
                customClass="w-full py-3 text-base font-semibold"
              >
                @if (authService.isLoading()) {
                  Envoi en cours...
                } @else {
                  Envoyer le lien de réinitialisation
                }
              </app-button>
            </form>
          } @else {
            <div data-testid="forgot-password-modal-sent" class="text-center space-y-4">
              <div class="flex justify-center mb-4">
                <div class="bg-success/10 p-3 rounded-full">
                  <app-icon name="lucide-check" cssClass="w-6 h-6 text-success" />
                </div>
              </div>

              <div class="bg-success/10 border border-success/20 rounded-lg p-4">
                <h3 class="font-semibold text-success mb-2">Email envoyé !</h3>
                <p class="text-success/80 text-sm">
                  Si un compte existe avec cette adresse email, vous recevrez un lien de
                  réinitialisation dans quelques minutes.
                </p>
              </div>

              <button
                type="button"
                data-testid="forgot-password-modal-resend"
                (click)="resetForm()"
                [disabled]="resendCooldown() > 0"
                class="text-primary-800 hover:text-primary-900 font-medium text-sm transition-colors duration-200 underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                @if (resendCooldown() > 0) {
                  Renvoyer dans {{ resendCooldown() }}s
                } @else {
                  Envoyer à nouveau
                }
              </button>
            </div>
          }
        </section>

        @if (!emailSent()) {
          <div class="p-6 pt-0 border-t border-border text-center">
            <button
              type="button"
              data-testid="forgot-password-modal-cancel"
              (click)="onCancel()"
              class="text-muted hover:text-text font-medium text-sm transition-colors duration-200 underline-offset-4 hover:underline"
            >
              Annuler
            </button>
          </div>
        }
      </div>
    </div>
  `,
  host: {
    class: 'fixed inset-0 z-50 flex items-center justify-center',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordModalView implements OnDestroy {
  readonly authService = inject(AuthState);

  readonly data = input<ForgotPasswordModalData>({});
  readonly emailSubmitted = output<string>();
  readonly cancelled = output<void>();

  readonly emailSent = signal(false);
  readonly resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  // Pré-rempli par l'email transmis à l'ouverture, modifiable ensuite
  private readonly model = linkedSignal(() => ({ email: this.data()?.email ?? '' }));

  readonly forgotPasswordForm = form(
    this.model,
    (path) => {
      required(path.email, { message: "L'email est requis" });
      email(path.email, { message: 'Veuillez entrer un email valide' });
    },
    {
      submission: {
        action: () => this.sendResetLink(),
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }

  resetForm(): void {
    if (this.resendCooldown() > 0) return;

    this.emailSent.set(false);
    this.forgotPasswordForm().reset();

    if (this.forgotPasswordForm().valid()) {
      void submit(this.forgotPasswordForm);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private async sendResetLink(): Promise<void> {
    const { email } = this.model();
    try {
      await firstValueFrom(this.authService.forgotPassword({ email }));
    } catch {
      // Même issue en cas d'échec : ne pas révéler si un compte existe pour cette adresse
    }
    this.emailSent.set(true);
    this.emailSubmitted.emit(email);
    this.startCooldown();
  }

  private startCooldown(): void {
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }
}
