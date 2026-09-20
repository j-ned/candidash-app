import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';
import { AuthState } from '@features/auth/application/auth-state';
import { SimpleAvatarMenu } from '../simple-avatar-menu/simple-avatar-menu';

/**
 * Enveloppe des écrans applicatifs : barre du haut, carte de contenu, pied de page.
 *
 * Le décor d'origine a été retiré : halo de curseur suivi à chaque mousemove (un signal réécrit à
 * chaque frame, donc une détection de changements par frame sur toute l'application), grille de
 * fond en animate-pulse, trois points en animate-ping et un dégradé en boucle. Rien de tout cela
 * ne portait d'information, et cela tournait sur chaque écran, y compris sur mobile.
 *
 * Reste une seule animation, l'entrée du contenu, neutralisée sous prefers-reduced-motion.
 */
@Component({
  selector: 'app-layout',
  imports: [ThemeToggle, SimpleAvatarMenu, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex min-h-[100dvh] flex-col bg-background">
      <header class="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-end gap-2 px-4 sm:px-6">
          @if (authService.isAuthenticated()) {
            <app-simple-avatar-menu />
          }
          <app-theme-toggle />
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div class="content-enter h-full rounded-2xl border border-border bg-card p-4 sm:p-8">
          <ng-content></ng-content>
        </div>
      </main>

      <footer class="border-t border-border">
        <div class="mx-auto w-full max-w-6xl px-4 py-5 text-center sm:px-6">
          <a
            routerLink="/terms-of-service"
            class="text-sm text-muted transition-colors hover:text-text"
            >Conditions d'utilisation</a
          >
        </div>
      </footer>
    </div>
  `,
  styles: `
    @media (prefers-reduced-motion: no-preference) {
      .content-enter {
        animation: content-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @keyframes content-enter {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    }
  `,
})
export class Layout {
  readonly authService = inject(AuthState);
}
