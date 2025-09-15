import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { SimpleAvatar } from '@features/dashboard/profile/components';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-simple-avatar-menu',
  imports: [SimpleAvatar, NgOptimizedImage],
  template: `
    <div class="relative">
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
        <div
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

          <div class="py-1">
            <button
              type="button"
              (click)="goToProfile()"
              class="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface/80 transition-colors"
            >
              <img
                [ngSrc]="'/icons/about.svg'"
                alt="Profil"
                class="w-4 h-4 mr-3 icon-invert"
                width="16"
                height="16"
              />
              Mon profil
            </button>

            <button
              type="button"
              (click)="goToDashboard()"
              class="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface/80 transition-colors"
            >
              <img
                [ngSrc]="'/icons/dashboard.svg'"
                alt="Dashboard"
                class="w-4 h-4 mr-3 icon-invert"
                width="16"
                height="16"
              />
              Dashboard
            </button>

            <div class="border-t border-border my-1"></div>

            <button
              type="button"
              (click)="logout()"
              class="w-full flex items-center px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
            >
              <img
                [ngSrc]="'/icons/logout.svg'"
                alt="Déconnexion"
                class="w-4 h-4 mr-3 icon-invert"
                width="16"
                height="16"
              />
              Se déconnecter
            </button>
          </div>
        </div>
      }

      @if (isMenuOpen()) {
        <div class="fixed inset-0 z-40" (click)="closeMenu()" aria-hidden="true"></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleAvatarMenuComponent {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

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
