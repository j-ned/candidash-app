import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, NgOptimizedImage, ButtonComponent],
  templateUrl: './profile-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeader {
  readonly authService = inject(AuthService);

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
