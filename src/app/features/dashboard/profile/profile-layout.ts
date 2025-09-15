import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { ProfileHeader, ProfileInfo, ProfileSecurity } from './components';

@Component({
  selector: 'app-profile-layout',
  imports: [LayoutComponent, ProfileHeader, ProfileInfo, ProfileSecurity],
  template: `
    <app-layout>
      <div
        class="w-full max-w-6xl mx-auto px-3 py-4 space-y-3 sm:px-4 sm:py-6 sm:space-y-4 md:px-6 md:space-y-6 lg:max-w-7xl lg:px-8 lg:py-8 lg:space-y-8"
      >
        <app-profile-header />
        <div class="space-y-3 sm:space-y-4 md:space-y-6 xl:space-y-8">
          <div class="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 md:grid-cols-2">
            <div class="order-1">
              <app-profile-info />
            </div>
            <div class="order-2">
              <app-profile-security />
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileLayoutComponent implements OnInit {
  private readonly profileService = inject(ProfileService);

  ngOnInit(): void {
    this.profileService.getProfile().subscribe();
  }
}
