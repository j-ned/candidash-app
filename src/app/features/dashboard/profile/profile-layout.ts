import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import {
  ProfileHeaderComponent,
  ProfileInfoComponent,
  ProfileSecurityComponent,
  ProfileUploadsComponent,
  ProfileAccountInfoComponent,
} from './components';

@Component({
  selector: 'app-profile-layout',
  imports: [
    LayoutComponent,
    ProfileHeaderComponent,
    ProfileInfoComponent,
    ProfileSecurityComponent,
    ProfileUploadsComponent,
    ProfileAccountInfoComponent,
  ],
  template: `
    <app-layout>
      <div class="max-w-8xl mx-auto space-y-8">
        <app-profile-header />
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-6">
            <app-profile-info />
          </div>

          <div class="space-y-6">
            <app-profile-security />
          </div>
        </div>

        <!-- Card Informations du compte sur une ligne -->
        <div class="mt-6">
          <app-profile-account-info />
        </div>

        <div class="mt-6">
          <app-profile-uploads />
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
