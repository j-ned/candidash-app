import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { AuthService } from '@core/services/auth';
import { FileUrlService } from '@features/dashboard/profile/services/file-url';
import {
  AvatarUploadComponent,
  AvatarUploadEvent,
} from '@features/dashboard/profile/components/avatar-upload/avatar-upload';
import {
  CvUploadComponent,
  CvUploadEvent,
} from '@features/dashboard/profile/components/cv-upload/cv-upload';
import { getUserInitials } from '@shared/utils/user-initials';

@Component({
  selector: 'app-profile-uploads',
  imports: [AvatarUploadComponent, CvUploadComponent],
  template: `
    <div class="lg:col-span-1 space-y-6">
      <!-- Card Avatar -->
      <div class="bg-card border border-border rounded-lg p-6">
        <app-avatar-upload
          [currentAvatarPath]="profileService.profile()?.avatarPath"
          [userInitials]="getUserInitials()"
          [userName]="
            profileService.profile()?.username || profileService.profile()?.email || 'Utilisateur'
          "
          [disabled]="profileService.isLoading()"
          (avatarSelected)="onAvatarSelected($event)"
          (avatarRemoved)="onAvatarRemoved()"
        />
      </div>

      <!-- Card CV -->
      <div class="bg-card border border-border rounded-lg p-6">
        <app-cv-upload
          [currentCvPath]="profileService.profile()?.cvPath"
          [disabled]="profileService.isLoading()"
          (cvSelected)="onCvSelected($event)"
          (cvRemoved)="onCvRemoved()"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileUploadsComponent {
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly fileUrlService = inject(FileUrlService);

  // Computed properties
  readonly getUserInitials = computed(() => {
    return getUserInitials(this.authService.user());
  });

  onAvatarSelected(event: AvatarUploadEvent): void {
    if (event.isValid) {
      this.profileService.uploadAvatar(event.file).subscribe();
    }
  }

  onAvatarRemoved(): void {
    this.profileService.deleteAvatar().subscribe();
  }

  onCvSelected(event: CvUploadEvent): void {
    if (event.isValid) {
      this.profileService.uploadCv(event.file).subscribe();
    }
  }

  onCvRemoved(): void {
    this.profileService.deleteCv().subscribe();
  }

  getAvatarUrl(): string {
    const avatarPath = this.profileService.profile()?.avatarPath;
    return this.fileUrlService.getAvatarUrl(avatarPath);
  }

  getCvUrl(): string {
    const cvPath = this.profileService.profile()?.cvPath;
    return this.fileUrlService.getCvUrl(cvPath);
  }

  getCvFileName(): string {
    const cvPath = this.profileService.profile()?.cvPath;
    return this.fileUrlService.getFileName(cvPath, 'CV.pdf');
  }
}
