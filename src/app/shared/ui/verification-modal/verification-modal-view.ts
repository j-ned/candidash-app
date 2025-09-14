import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';
import { ThemeService } from '@shared/ui/theme-toggle/service/theme';
import type { VerificationModalData } from './verification-modal';

@Component({
  selector: 'app-verification-modal-view',
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <div class="cd-modal-backdrop" (click)="onCancel()"></div>
    <div class="cd-modal" role="dialog" aria-modal="true" aria-label="Validation de l'inscription">
      <header class="cd-modal__header">
        <h2 class="cd-modal__title">Validation de l'inscription</h2>
        <button
          type="button"
          class="cd-modal__close"
          (click)="onCancel()"
          aria-label="Fermer"
        >
          ×
        </button>
      </header>

      <section class="cd-modal__body">
        <p class="cd-modal__description">
          Un code de validation à 6 chiffres a été envoyé à votre adresse email :
          <br /><strong>{{ data().email }}</strong>
        </p>

        <form [formGroup]="verificationForm" (ngSubmit)="onSubmit()" class="verification-form">
          <div class="form-field">
            <label for="verificationCode" class="form-label">
              Code de validation <span class="required">*</span>
            </label>
            <input
              id="verificationCode"
              type="text"
              formControlName="verificationCode"
              maxlength="6"
              pattern="[0-9]{6}"
              class="form-input"
              [class.error]="isFieldInvalid('verificationCode')"
              placeholder="123456"
              autocomplete="one-time-code"
            />
            @if (isFieldInvalid('verificationCode')) {
              <p class="error-message">
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
            customClass="submit-button"
          >
            @if (authService.isLoading()) {
              Validation en cours...
            } @else {
              Valider
            }
          </app-button>
        </form>

        <div class="modal-actions">
          <p class="resend-text">Vous n'avez pas reçu le code ?</p>

          <button
            type="button"
            (click)="onResend()"
            [disabled]="authService.isLoading() || resendCooldown() > 0"
            class="resend-button"
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
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cd-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    .cd-modal {
      position: relative;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 500px;
      width: 90vw;
      margin: 1rem;
      overflow: hidden;
      color: var(--color-text);
    }

    .cd-modal__header {
      padding: 1.5rem 1.5rem 0 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cd-modal__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }

    .cd-modal__close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--color-muted);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
      line-height: 1;
    }

    .cd-modal__close:hover {
      background: var(--color-surface-100);
      color: var(--color-text);
    }

    .cd-modal__body {
      padding: 1.5rem;
    }

    .cd-modal__description {
      color: var(--color-muted);
      margin-bottom: 1.5rem;
      line-height: 1.5;
      text-align: center;
    }

    .cd-modal__description strong {
      color: var(--color-text);
    }

    .verification-form {
      margin-bottom: 1.5rem;
    }

    .form-field {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .required {
      color: var(--color-error);
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-input);
      border-radius: 0.5rem;
      background: var(--color-background);
      color: var(--color-text);
      font-size: 1.125rem;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      letter-spacing: 0.5em;
      text-align: center;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .form-input::placeholder {
      color: var(--color-muted);
      letter-spacing: 0.25em;
    }

    .form-input:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary);
      border-color: var(--color-primary);
    }

    .form-input.error {
      border-color: var(--color-error);
    }

    .error-message {
      color: var(--color-error);
      font-size: 0.75rem;
      margin: 0.25rem 0 0 0;
    }

    :host ::ng-deep .submit-button {
      width: 100%;
      padding: 0.875rem 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .modal-actions {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .resend-text {
      color: var(--color-muted);
      font-size: 0.875rem;
      margin: 0 0 0.75rem 0;
    }

    .resend-button {
      background: none;
      border: none;
      color: var(--color-primary);
      font-weight: 500;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 4px;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .resend-button:hover:not(:disabled) {
      color: var(--color-primary-600);
      background: rgba(var(--color-primary-rgb), 0.1);
      text-decoration: none;
    }

    .resend-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: none;
    }

    /* Dark theme specific adjustments */
    :host([data-theme="dark"]) .cd-modal {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationModalView implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  // Inputs/Outputs
  readonly data = input.required<VerificationModalData>();
  readonly verificationSubmitted = output<string>();
  readonly resendRequested = output<void>();
  readonly cancelled = output<void>();

  readonly resendCooldown = signal<number>(0);
  private cooldownInterval: NodeJS.Timeout | null = null;

  readonly verificationForm: FormGroup = this.fb.group({
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit(): void {
    // Apply current theme to host element
    const hostElement = document.querySelector('app-verification-modal-view') as HTMLElement;
    if (hostElement) {
      hostElement.setAttribute('data-theme', this.themeService.theme());
    }
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
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
    this.resendCooldown.set(60); // 60 seconds
    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        clearInterval(this.cooldownInterval);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}