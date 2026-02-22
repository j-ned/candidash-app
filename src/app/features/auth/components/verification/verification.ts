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
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthStateService } from '@features/auth/application/auth-state.service';
import { startCooldownTimer, clearCooldownTimer } from '@shared/utils/cooldown';
import { verificationCodeValidator } from '@shared/validators/verification-code.validator';

type VerificationForm = {
  verificationCode: FormControl<string>;
};

@Component({
  selector: 'app-verification',
  imports: [ReactiveFormsModule, ButtonComponent, RouterLink],
  templateUrl: './verification.html',
  host: {
    class: 'block w-full max-w-sm mx-auto px-4 py-3 sm:max-w-md sm:px-6 sm:py-8 md:max-w-lg lg:max-w-xl xl:max-w-2xl',
    role: 'region',
    '[attr.aria-labelledby]': '"verification-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verification implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly authService = inject(AuthStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly email = input<string>('');
  readonly resendCooldown = signal<number>(0);

  readonly verificationForm = new FormGroup<VerificationForm>({
    verificationCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, verificationCodeValidator],
    }),
  });

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.email()) {
      this.router.navigate(['/auth/signup']);
    }
  }

  onSubmit(): void {
    if (this.verificationForm.valid && this.email()) {
      const { verificationCode } = this.verificationForm.getRawValue();

      this.authService
        .verifyRegistration({
          email: this.email(),
          verificationCode,
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
          next: () => {
            this.startCooldown();
          },
        });
    }
  }

  private startCooldown(): void {
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  isFieldInvalid(fieldName: keyof VerificationForm): boolean {
    const field = this.verificationForm.controls[fieldName];
    return field.invalid && field.touched;
  }

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }
}
