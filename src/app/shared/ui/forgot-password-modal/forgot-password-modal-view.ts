import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnDestroy,
  effect,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import type { ForgotPasswordModalData } from './forgot-password-modal';
import { clearCooldownTimer, startCooldownTimer } from '@shared/utils/cooldown';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-forgot-password-modal-view',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" (click)="onCancel()"></div>
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mot de passe oublié"
    >
      <div
        class="relative bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
      >
        <header class="flex items-center justify-between p-6 pb-0">
          <h2 class="text-xl font-bold text-text">Mot de passe oublié ?</h2>
          <button
            type="button"
            class="p-2 text-muted hover:text-text hover:bg-surface rounded-md transition-colors duration-200"
            (click)="onCancel()"
            aria-label="Fermer"
          >
            <img [ngSrc]="'/icons/close.svg'" alt="Fermer" class="w-5 h-5" width="24" height="24" />
          </button>
        </header>

        <section class="p-6">
          @if (!emailSent()) {
            <p class="text-center text-muted mb-6 leading-relaxed">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot
              de passe.
            </p>

            <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <div class="space-y-1">
                <label for="email" class="block text-sm font-medium text-text">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="w-full px-4 py-3 border rounded-lg bg-background text-text placeholder:text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  [class.border-error]="isFieldInvalid('email')"
                  [class.border-input]="!isFieldInvalid('email')"
                  placeholder="votre@email.com"
                />
                @if (isFieldInvalid('email')) {
                  <p class="text-error text-xs mt-1">
                    @if (forgotPasswordForm.get('email')?.errors?.['required']) {
                      L'email est requis
                    } @else if (forgotPasswordForm.get('email')?.errors?.['email']) {
                      Veuillez entrer un email valide
                    }
                  </p>
                }
              </div>

              <app-button
                type="submit"
                color="primary"
                [disabled]="forgotPasswordForm.invalid"
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
            <div class="text-center space-y-4">
              <div class="flex justify-center mb-4">
                <div class="bg-success/10 p-3 rounded-full">
                  <img
                    [ngSrc]="'/icons/check.svg'"
                    alt="Check"
                    class="w-6 h-6 text-success"
                    width="24"
                    height="24"
                  />
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
                (click)="resetForm()"
                [disabled]="resendCooldown() > 0"
                class="text-primary hover:text-primary-600 font-medium text-sm transition-colors duration-200 underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
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
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly data = input<ForgotPasswordModalData>({});
  readonly emailSubmitted = output<string>();
  readonly cancelled = output<void>();

  readonly emailSent = signal(false);
  readonly resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    effect(() => {
      const modalData = this.data();
      if (modalData?.email) {
        this.forgotPasswordForm.patchValue({ email: modalData.email });
      }
    });
  }

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword({ email }).subscribe({
        next: () => {
          this.emailSent.set(true);
          this.emailSubmitted.emit(email);
          this.startCooldown();
        },
        error: () => {
          this.emailSent.set(true);
          this.emailSubmitted.emit(email);
          this.startCooldown();
        },
      });
    }
  }

  resetForm(): void {
    if (this.resendCooldown() > 0) return;

    this.emailSent.set(false);
    this.forgotPasswordForm.markAsUntouched();

    if (this.forgotPasswordForm.valid) {
      this.onSubmit();
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  private startCooldown(): void {
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }
}
