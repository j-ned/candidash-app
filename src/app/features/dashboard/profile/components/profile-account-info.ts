import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '@core/services/auth';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-profile-account-info',
  template: `
    <!-- Card Informations du compte -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold text-text mb-6 flex items-center">
        <img
          [ngSrc]="'/icons/info.svg'"
          alt="Informations"
          width="20"
          height="20"
          priority
          class="w-6 h-6 mr-2 icon-invert"
        />
        Informations du compte
      </h3>

      <div class="space-y-4">
        <div class="flex justify-between items-center py-3 border-b border-border/50">
          <span class="text-text/70 font-medium">Membre depuis</span>
          <span class="text-text font-semibold">
            {{ formatDate(authService.user()?.createdAt) }}
          </span>
        </div>

        <div class="flex justify-between items-center py-3">
          <span class="text-text/70 font-medium">Dernière mise à jour</span>
          <span class="text-text font-semibold">
            {{ formatDate(authService.user()?.updatedAt) }}
          </span>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class ProfileAccountInfoComponent {
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
