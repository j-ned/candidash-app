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
      <div class="relative flex items-center justify-center">
        <h1 class="font-bold text-9xl custom-stroke">
          {{ title }}
        </h1>
      </div>

      <p class="text-xl text-text/80 max-w-2xl mx-auto">
        {{ subtitle }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
        @for (button of buttons; track button.label) {
          @if (button.routerLink) {
            <a
              [routerLink]="button.routerLink"
              class="inline-block transition-transform duration-300 ease-in-out hover:translate-y-[-3px]"
            >
              <app-button
                [color]="button.color"
                [customClass]="
                  button.customClass ||
                  'px-8 py-4 shadow-lg shadow-accent border-2 border-text hover:text-background'
                "
              >
                {{ button.label }}
              </app-button>
            </a>
          } @else {
            <app-button
              [color]="button.color"
              [customClass]="
                button.customClass ||
                'px-8 py-4 shadow-lg shadow-accent border-2 border-text hover:text-background'
              "
              (buttonClick)="handleButtonClick(button)"
            >
              {{ button.label }}
            </app-button>
          }
        }
      </div>
    </app-layout>
  `,
  styles: `
    h1 {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
      position: relative;
    }

    h1:hover {
      transform: scale(1.05);
      text-shadow:
        0 0 20px var(--color-accent-500),
        0 0 40px var(--color-accent-400),
        0 0 60px var(--color-accent-300);
      filter: brightness(1.1);
    }

    p {
      transition: all 0.3s ease-in-out;
      cursor: default;
    }

    p:hover {
      color: var(--color-accent-500);
      transform: translateY(-2px);
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    app-button {
      display: inline-block;
      transition: transform 0.3s ease-in-out;
    }

    app-button:hover {
      transform: translateY(-3px);
    }

    app-button button {
      position: relative;
      overflow: hidden;
    }

    app-button button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      background: radial-gradient(circle, var(--color-accent-300) 0%, transparent 70%);
      transition: all 0.6s ease-out;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      z-index: 0;
    }

    app-button button:hover::before {
      width: 300px;
      height: 300px;
    }

    app-button button > * {
      position: relative;
      z-index: 1;
    }

    .custom-stroke {
      -webkit-text-stroke: 2px #10b981;
      -webkit-text-fill-color: var(--color-background);
    }
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
      label: 'Créer ton espace',
      color: 'primary',
      routerLink: '/auth/signup',
    },
    {
      label: 'Se connecter',
      color: 'secondary',
      routerLink: '/auth/signin',
    },
  ];

  handleButtonClick(button: PageButton): void {
    if (button.action) {
      button.action();
    }
  }
}
