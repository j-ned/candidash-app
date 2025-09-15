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
import { startCooldownTimer, clearCooldownTimer } from '@shared/utils/cooldown';

@Component({
  selector: 'app-verification',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './verification.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verification implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  readonly email = signal<string>('');
  readonly resendCooldown = signal<number>(0);

  readonly verificationForm: FormGroup = this.fb.group({
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

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
    this.cooldownInterval = startCooldownTimer(this.resendCooldown, 60);
  }

  navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  ngOnDestroy(): void {
    clearCooldownTimer(this.cooldownInterval);
  }
}
