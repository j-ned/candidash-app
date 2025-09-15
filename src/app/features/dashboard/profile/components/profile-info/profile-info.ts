import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { AuthService } from '@core/services/auth';
import { UpdateProfileRequest } from '@features/dashboard/profile/models/profile-model';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-info',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  templateUrl: './profile-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfo implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showConfirm = signal(false);

  readonly profileForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    username: [''],
  });

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.profileForm.patchValue({
        email: user.email,
        username: user.username ?? '',
      });
    }
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      const updateData: UpdateProfileRequest = {
        email: this.profileForm.get('email')?.value,
        username: this.profileForm.get('username')?.value ?? undefined,
      };

      this.profileService.updateProfile(updateData).subscribe();
    }
  }

  confirmDelete(): void {
    const user = this.authService.user();
    if (!user) return;

    this.profileService.deleteAccount().subscribe({
      next: () => {
        this.showConfirm.set(false);
        this.authService.signout();
        this.router.navigate(['/']);
      },
      error: () => {
        // nothing more to do; toast handled in service
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
