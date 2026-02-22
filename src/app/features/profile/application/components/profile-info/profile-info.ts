import { Component, ChangeDetectionStrategy, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { ProfileStateService } from '@features/profile/application/profile-state.service';
import { AuthStateService } from '@features/auth/application/auth-state.service';
import type { UpdateProfileRequest } from '@features/profile/domain/models/profile.model';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon';

type ProfileInfoForm = {
  email: FormControl<string>;
  username: FormControl<string>;
};

@Component({
  selector: 'app-profile-info',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './profile-info.html',
  host: {
    class: 'block space-y-4 sm:space-y-6',
    role: 'region',
    '[attr.aria-labelledby]': '"profile-title"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfo implements OnInit {
  readonly profileService = inject(ProfileStateService);
  readonly authService = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly showConfirm = signal(false);

  readonly profileForm = new FormGroup<ProfileInfoForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    username: new FormControl('', { nonNullable: true }),
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
      const { email, username } = this.profileForm.getRawValue();
      const updateData: UpdateProfileRequest = {
        email,
        username: username || undefined,
      };

      this.profileService
        .updateProfile(updateData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  confirmDelete(): void {
    const user = this.authService.user();
    if (!user) return;

    this.profileService
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showConfirm.set(false);
          this.authService
            .signout()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.router.navigate(['/']));
        },
      });
  }

  isFieldInvalid(fieldName: keyof ProfileInfoForm): boolean {
    const field = this.profileForm.controls[fieldName];
    return field.invalid && field.touched;
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
