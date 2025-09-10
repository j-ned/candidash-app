import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { ButtonComponent } from '@shared/ui/button/button';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, NgOptimizedImage, ButtonComponent],
  template: `
    <div class="flex flex-col space-y-4 py-4">
      <!-- Header avec span et button alignés -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <!-- Gauche -->
        <div class="flex flex-col">
          <div class="flex items-center">
            <span
              class="inline-flex items-center rounded-md bg-accent px-6 py-3 text-xl font-medium text-text inset-ring inset-ring-gray-400/20"
            >
              <img
                [ngSrc]="'/icons/about.svg'"
                alt="About"
                width="20"
                height="20"
                priority
                class="w-6 h-6 mr-2 icon-invert"
              />
              {{ authService.user()?.username || 'Utilisateur' }}
            </span>
          </div>
        </div>

        <!-- Droite -->
        <div class="flex items-center">
          <app-button
            color="primary"
            [routerLink]="['/dashboard']"
            customClass="px-6 py-3 flex items-center"
          >
            <img
              [ngSrc]="'/icons/arrow-left.svg'"
              alt="Retour"
              width="24"
              height="24"
              priority
              class="w-6 h-6 icon-invert mr-2"
            />
            <span>Retour au Dashboard</span>
          </app-button>
        </div>
      </div>

      <!-- Paragraphe centré en dessous -->
      <div class="text-start">
        <p class="text-text text-xl mt-4">
          Gérez vos informations personnelles et paramètres de compte
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent {
  readonly authService = inject(AuthService);
}
