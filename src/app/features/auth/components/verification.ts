import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-verification',
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <div
      class="w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl"
    >
      <div
        class="bg-background border border-border rounded-lg p-4 shadow-sm sm:rounded-xl sm:p-8 md:shadow-lg"
      >
        <h2 class="text-2xl font-bold text-center mb-4 text-text sm:text-3xl sm:mb-8 md:text-4xl">
          Validation de l'inscription
        </h2>

        <p class="text-center text-muted mb-6 text-sm sm:text-base">
          Un code de validation à 6 chiffres a été envoyé à votre adresse email :
          <br /><strong class="text-text">{{ email() }}</strong>
        </p>

        <form [formGroup]="verificationForm" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-6">
          <div class="space-y-1 sm:space-y-2">
            <label for="verificationCode" class="block text-sm font-medium text-text sm:text-base">
              Code de validation <span class="text-error">*</span>
            </label>
            <input
              id="verificationCode"
              type="text"
              formControlName="verificationCode"
              maxlength="6"
              pattern="[0-9]{6}"
              class="w-full px-3 py-2 border rounded-md bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 sm:px-4 sm:py-3 sm:rounded-lg text-center text-lg sm:text-xl font-mono tracking-widest"
              [class.border-error]="isFieldInvalid('verificationCode')"
              [class.border-input]="!isFieldInvalid('verificationCode')"
              placeholder="123456"
              autocomplete="one-time-code"
            />
            @if (isFieldInvalid('verificationCode')) {
              <p class="text-error text-xs mt-1 sm:text-sm">
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
            customClass="w-full py-3 text-base font-semibold mt-4 sm:py-4 sm:text-lg sm:mt-8"
          >
            @if (authService.isLoading()) {
              Validation en cours...
            } @else {
              Valider
            }
          </app-button>
        </form>

        <div class="mt-4 text-center sm:mt-6">
          <p class="text-muted text-sm sm:text-base mb-3">Vous n'avez pas reçu le code ?</p>

          <button
            type="button"
            (click)="resendCode()"
            [disabled]="authService.isLoading() || resendCooldown() > 0"
            class="text-primary hover:text-primary-600 font-medium transition-colors duration-200 underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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

        <div class="mt-4 text-center sm:mt-6">
          <button
            type="button"
            (click)="navigateToSignup()"
            class="text-muted hover:text-text font-medium transition-colors duration-200 underline-offset-4 hover:underline text-sm sm:text-base"
          >
            Modifier les informations
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  readonly email = signal<string>('');
  readonly resendCooldown = signal<number>(0);

  readonly verificationForm: FormGroup = this.fb.group({
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private cooldownInterval: NodeJS.Timeout | null = null;

  ngOnInit(): void {
    // Récupérer l'email depuis les query params
    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) {
      this.email.set(emailParam);
    } else {
      // Rediriger vers la page d'inscription si pas d'email
      this.router.navigate(['/auth/signup']);
    }
  }

  onSubmit(): void {
    if (this.verificationForm.valid && this.email()) {
      const verificationCode = this.verificationForm.value.verificationCode;

      this.authService
        .verifyRegistration({
          email: this.email(),
          verificationCode,
        })
        .subscribe({
          next: () => {
            // La navigation est gérée dans le service
          },
          error: () => {
            // La gestion d'erreur est gérée dans le service
          },
        });
    }
  }

  resendCode(): void {
    if (this.email()) {
      this.authService.resendVerificationCode(this.email()).subscribe({
        next: () => {
          this.startCooldown();
        },
        error: () => {
          // La gestion d'erreur est gérée dans le service
        },
      });
    }
  }

  private startCooldown(): void {
    this.resendCooldown.set(60); // 60 secondes
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

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }
}
