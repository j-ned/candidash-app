import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { PageButton } from '@features/home/model/home-model';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ButtonComponent, LayoutComponent],
  template: `
    <app-layout>
      <div
        class="w-full max-w-sm mx-auto px-4 py-8 space-y-6 text-center sm:max-w-md sm:py-12 sm:space-y-8 md:max-w-2xl md:py-16 md:space-y-10 lg:max-w-4xl lg:py-20 lg:space-y-12 xl:max-w-6xl"
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

        <!-- Sous-titre responsive -->
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
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly title = 'Candidash';
  readonly subtitle =
    "Centralise tes candidatures, gagne du temps et reste toujours organisé dans ta recherche d'emploi.";
  readonly badgeText = 'Application';

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
