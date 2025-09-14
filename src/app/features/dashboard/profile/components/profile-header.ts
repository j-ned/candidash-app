import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, NgOptimizedImage, ButtonComponent],
  template: `
    <div class="flex flex-col space-y-3 py-3 sm:space-y-4 sm:py-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
        <!-- Gauche -->
        <div class="flex flex-col">
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center rounded bg-primary/10 px-3 py-2 text-sm font-medium text-text border border-border sm:rounded-md sm:px-4 sm:py-3 sm:text-lg"
            >
              <img
                [ngSrc]="'/icons/about.svg'"
                alt="About"
                width="16"
                height="16"
                priority
                class="w-4 h-4 mr-2 icon-invert sm:w-5 sm:h-5"
              />
              {{ authService.user()?.username || 'Utilisateur' }}
            </span>
            <div
              class="flex flex-col gap-1 py-2 border-b border-border/50 sm:flex-row sm:justify-between sm:items-center sm:py-3"
            >
              <span
                class="inline-flex items-center rounded bg-primary/10 px-3 py-2 text-sm font-medium text-text border border-border sm:rounded-md sm:px-4 sm:py-3 sm:text-lg"
              >
                {{ authService.user()?.role === 'ADMIN' ? 'Administrateur' : 'Membre' }} depuis le
                {{ formatDate(authService.user()?.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Droite -->
        <div class="flex items-center">
          <app-button
            color="primary"
            [routerLink]="['/dashboard']"
            customClass="px-3 py-2 flex items-center text-xs sm:px-4 sm:py-3 sm:text-sm"
          >
            <img
              [ngSrc]="'/icons/arrow-left.svg'"
              alt="Retour"
              width="16"
              height="16"
              priority
              class="w-4 h-4 icon-invert mr-1 sm:w-5 sm:h-5 sm:mr-2"
            />
            <span class="hidden sm:inline">Retour au Dashboard</span>
            <span class="sm:hidden">Retour</span>
          </app-button>
        </div>
      </div>

      <!-- Paragraphe centré en dessous -->
      <div class="text-start">
        <p class="text-text text-sm mt-2 leading-relaxed sm:text-base sm:mt-3 lg:text-lg">
          Gérez vos informations personnelles et paramètres de compte
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent {
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
