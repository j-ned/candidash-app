import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { IconComponent } from '@shared/ui/icon/icon';
import { AuthStateService } from '@features/auth/application/auth-state.service';

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, ButtonComponent, IconComponent],
  templateUrl: './profile-header.html',
  host: {
    class: 'flex flex-col space-y-3 py-3 sm:space-y-4 sm:py-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeader {
  readonly authService = inject(AuthStateService);

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
