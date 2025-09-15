import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { startCooldownTimer, clearCooldownTimer } from '@shared/utils/cooldown';
import type { VerificationModalData } from './verification-modal';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-verification-modal-view',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" (click)="onCancel()"></div>

    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Validation de l'inscription"
    >
      <div
        class="relative bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
      >
        <header class="flex items-center justify-between p-6 pb-0">
          <h2 class="text-xl font-bold text-text">Validation de l'inscription</h2>
          <button
            type="button"
            class="p-2 text-muted hover:text-text hover:bg-surface rounded-md transition-colors duration-200"
            (click)="onCancel()"
            aria-label="Fermer"
          >
            <img
              [ngSrc]="'/icons/close.svg'"
              alt="Fermer"
              class="w-5 h-5 icon-invert"
              width="24"
              height="24"
            />
          </button>
        </header>

        <section class="p-6">
          <p class="text-center text-muted mb-6 leading-relaxed">
            Un code de validation à 6 chiffres a été envoyé à votre adresse email :
            <br />
            <strong class="text-text font-semibold">{{ data().email }}</strong>
          </p>

          <form [formGroup]="verificationForm" (ngSubmit)="onSubmit()" class="mb-6">
            <div class="mb-4">
              <label for="verificationCode" class="block text-sm font-medium text-text mb-2">
                Code de validation <span class="text-error">*</span>
              </label>
              <input
                id="verificationCode"
                type="text"
                formControlName="verificationCode"
                maxlength="6"
                pattern="[0-9]{6}"
                class="w-full px-4 py-3 border rounded-lg bg-background text-text text-center text-lg font-mono tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                [class.border-error]="isFieldInvalid('verificationCode')"
                [class.border-input]="!isFieldInvalid('verificationCode')"
                placeholder="123456"
                autocomplete="one-time-code"
              />
              @if (isFieldInvalid('verificationCode')) {
                <p class="text-error text-xs mt-1">
                  @if (verificationForm.get('verificationCode')?.errors?.['required']) {
                    Le code de validation est requis
                  } @else if (verificationForm.get('verificationCode')?.errors?.['pattern']) {
                    Le code doit être composé de 6 chiffres
                  }
                </p>
              }
            </div>

            <app-button
              type="submit"
              color="primary"
              [disabled]="verificationForm.invalid"
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
              (click)="onResend()"
              [disabled]="authService.isLoading() || resendCooldown() > 0"
              class="text-primary hover:text-primary-600 font-medium text-sm underline underline-offset-4 hover:no-underline px-4 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline hover:bg-primary/10"
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
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly data = input.required<VerificationModalData>();
  readonly verificationSubmitted = output<string>();
  readonly resendRequested = output<void>();
  readonly cancelled = output<void>();

  readonly resendCooldown = signal<number>(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly verificationForm: FormGroup = this.fb.group({
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }

  onSubmit(): void {
    if (this.verificationForm.valid) {
      const verificationCode = this.verificationForm.value.verificationCode;
      this.verificationSubmitted.emit(verificationCode);
    }
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
