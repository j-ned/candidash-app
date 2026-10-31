import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { AuthState } from '@features/auth/application/auth-state';

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, Button, Icon],
  templateUrl: './profile-header.html',
  host: {
    class: 'flex flex-col space-y-3 py-3 sm:space-y-4 sm:py-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeader {
  readonly authService = inject(AuthState);

  protected readonly memberSince = computed(() => {
    const date = this.authService.user()?.createdAt;
    return date
      ? new Date(date).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '-';
  });
}
