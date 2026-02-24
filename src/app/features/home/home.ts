import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { Layout } from '@shared/ui/layout/layout';
import { PageButton } from '@features/home/model/home-model';
import { AuthState } from '@features/auth/application/auth-state';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Button, Layout, Icon],
  template: `
    <app-layout>
      <div
        class="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto px-4 py-8 space-y-6 text-center sm:max-w-md sm:py-12 sm:space-y-8 md:max-w-2xl md:py-16 md:space-y-10 lg:max-w-4xl lg:py-20 lg:space-y-12 xl:max-w-6xl"
      >
        <div class="relative">
          <h1
            class="font-bold text-text transition-all duration-500 hover:scale-105 hover:text-primary cursor-default select-none text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
          >
            {{ title }}
          </h1>
          <div
            class="absolute inset-0 font-bold text-primary/20 -z-10 blur-sm text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
          >
            {{ title }}
          </div>
        </div>
        <p
          class="text-muted leading-relaxed transition-all duration-300 hover:text-text hover:-translate-y-1 cursor-default text-sm max-w-xs mx-auto sm:text-base sm:max-w-sm md:text-lg md:max-w-md lg:text-xl lg:max-w-lg xl:text-2xl xl:max-w-2xl"
        >
          {{ subtitle }}
        </p>

        <div
          class="flex flex-col gap-3 items-center sm:gap-4 md:flex-row md:justify-center md:gap-6 lg:gap-8"
        >
          @for (button of buttons; track button.label) {
            @if (button.routerLink) {
              <a
                [routerLink]="button.routerLink"
                class="inline-block w-full transition-all duration-300 hover:-translate-y-1 hover:scale-105 sm:w-auto"
              >
                <app-button [color]="button.color" [customClass]="getButtonClasses(button.color)">
                  {{ button.label }}
                </app-button>
              </a>
            } @else {
              <div class="w-full sm:w-auto">
                <app-button
                  [color]="button.color"
                  [customClass]="getButtonClasses(button.color)"
                  (buttonClick)="handleButtonClick(button)"
                >
                  {{ button.label }}
                </app-button>
              </div>
            }
          }
        </div>

        <div class="flex justify-center pt-4 sm:pt-6 md:pt-8">
          <div class="w-12 h-1 bg-primary/20 rounded-full sm:w-16 md:w-20 lg:w-24"></div>
        </div>

        <div class="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3 sm:gap-4 md:gap-6 sm:pt-4">
          @for (feature of features; track feature.title) {
            <div
              class="flex flex-row items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 sm:flex-col sm:items-center sm:gap-2 sm:p-4 md:p-6"
            >
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 sm:w-12 sm:h-12 sm:rounded-xl">
                <app-icon [name]="feature.icon" cssClass="w-5 h-5 text-primary sm:w-6 sm:h-6" />
              </div>
              <div class="sm:text-center">
                <h3 class="text-sm font-semibold text-text sm:text-base">{{ feature.title }}</h3>
                <p class="text-xs text-muted sm:text-sm">{{ feature.description }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  constructor() {
    if (this.authState.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  readonly title = 'Candidash';
  readonly subtitle =
    "Centralise tes candidatures, gagne du temps et reste toujours organisé dans ta recherche d'emploi.";
  readonly badgeText = 'Application';

  readonly features = [
    {
      icon: 'lucide-timer',
      title: 'Rappels automatiques',
      description: 'Recevez un email de relance selon la fréquence choisie.',
    },
    {
      icon: 'lucide-file-text',
      title: 'CV & lettres joints',
      description: 'Attachez vos documents PDF à chaque candidature.',
    },
    {
      icon: 'lucide-lock',
      title: 'Sécurisé (2FA)',
      description: 'Protégez votre compte avec l\'authentification à deux facteurs.',
    },
  ];

  readonly buttons: PageButton[] = [
    {
      label: 'Démo',
      color: 'primary',
      routerLink: '/features',
    },
    {
      label: 'Commencer gratuitement',
      color: 'secondary',
      routerLink: '/auth/signup',
    },
  ];

  getButtonClasses(_color: 'primary' | 'secondary' | 'accent' | 'red'): string {
    return 'w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 sm:w-auto sm:px-6 sm:py-3 sm:text-base sm:rounded-xl md:px-8 md:py-3.5 md:text-lg lg:px-10 lg:py-4';
  }

  handleButtonClick(button: PageButton): void {
    if (button.action) {
      button.action();
    }
  }
}
