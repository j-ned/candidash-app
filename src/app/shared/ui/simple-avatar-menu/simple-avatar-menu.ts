import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthState } from '@features/auth/application/auth-state';
import { SimpleAvatar } from '@features/profile/application/components';
import { Icon } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-simple-avatar-menu',
  imports: [SimpleAvatar, Icon],
  host: { class: 'relative block' },
  template: `
      <button
        type="button"
        (click)="toggleMenu()"
        class="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full transition-all hover:scale-105"
        [attr.aria-expanded]="isMenuOpen()"
        aria-label="Menu utilisateur"
      >
        <app-simple-avatar [username]="authService.user()?.username || 'Utilisateur'" size="md" />
      </button>

      @if (isMenuOpen()) {
        <nav
          aria-label="Menu utilisateur"
          class="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-border bg-surface/50">
            <p class="text-sm font-medium text-text truncate">
              {{ authService.user()?.username || 'Utilisateur' }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ authService.user()?.email }}
            </p>
          </div>

          <ul class="py-1 list-none m-0 p-0">
            <li>
              <button
                type="button"
                (click)="goToProfile()"
                class="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface/80 transition-colors"
              >
                <app-icon name="lucide-user" cssClass="w-4 h-4 mr-3" />
                Mon profil
              </button>
            </li>

            <li>
              <button
                type="button"
                (click)="goToDashboard()"
                class="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface/80 transition-colors"
              >
                <app-icon name="lucide-layout-grid" cssClass="w-4 h-4 mr-3" />
                Dashboard
              </button>
            </li>

            <li aria-hidden="true"><hr class="border-t border-border my-1" /></li>

            <li>
              <button
                type="button"
                (click)="logout()"
                class="w-full flex items-center px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <app-icon name="lucide-log-out" cssClass="w-4 h-4 mr-3" />
                Se déconnecter
              </button>
            </li>
          </ul>
        </nav>
      }

      @if (isMenuOpen()) {
        <div class="fixed inset-0 z-40" (click)="closeMenu()" aria-hidden="true"></div>
      }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleAvatarMenu {
  private readonly router = inject(Router);
  readonly authService = inject(AuthState);

  readonly isMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  goToProfile(): void {
    this.closeMenu();
    this.router.navigate(['/dashboard/profile']);
  }

  goToDashboard(): void {
    this.closeMenu();
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.closeMenu();
    this.authService.signout().subscribe({
      next: () => {},
      error: () => {
        console.error();
        this.router.navigate(['/auth/signin']);
      },
    });
  }
}
