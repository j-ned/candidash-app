import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  OnInit,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, required, pattern, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { AuthState } from '@features/auth/application/auth-state';
import { startCooldownTimer, clearCooldownTimer } from '@shared/utils/cooldown';

@Component({
  selector: 'app-verification',
  imports: [FormField, Button, RouterLink],
  templateUrl: './verification.html',
  host: {
    class:
      'block w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"verification-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verification implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);
  private readonly destroyRef = inject(DestroyRef);

  readonly email = input<string>('');
  readonly resendCooldown = signal<number>(0);

  // Signal Forms (@angular/forms/signals) : modèle signal + schéma de validation déclaratif.
  protected readonly model = signal({ verificationCode: '' });
  protected readonly verificationForm = form(this.model, (path) => {
    required(path.verificationCode);
    pattern(path.verificationCode, /^\d{6}$/);
  });

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.email()) {
      this.router.navigate(['/auth/signup']);
    }
  }

  onSubmit(): void {
    if (this.verificationForm().valid() && this.email()) {
      this.authService
        .verifyRegistration({
          email: this.email(),
          verificationCode: this.model().verificationCode,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  resendCode(): void {
    if (this.email()) {
      this.authService
        .resendVerificationCode(this.email())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.startCooldown(),
        });
    }
  }

  private startCooldown(): void {
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }
}
