import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { FileUrlService } from '@features/dashboard/profile/services/file-url';
import { getUserInitials } from '@shared/utils/user-initials';

@Component({
  selector: 'app-avatar-menu',
  imports: [CommonModule, NgOptimizedImage],
  template: `
    <div class="relative">
      <!-- Avatar Button -->
      <button
        type="button"
        (click)="toggleMenu()"
        [class]="avatarClasses()"
        [attr.aria-label]="'Menu utilisateur'"
        [attr.aria-expanded]="isMenuOpen()"
      >
        <!-- Avatar Image -->
        @if (hasAvatarImage()) {
          <img
            [ngSrc]="avatarUrl()"
            [alt]="'Avatar de ' + (user()?.username || user()?.email || 'utilisateur')"
            class="w-full h-full object-cover rounded-full"
            fill
          />
        } @else {
          <!-- Avatar Initials Fallback -->
          <span class="text-sm font-semibold text-background">
            {{ userInitials() }}
          </span>
        }
      </button>

      <!-- Dropdown Menu -->
      @if (isMenuOpen()) {
        <div
          class="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-30"
          (click)="$event.stopPropagation()"
        >
          <!-- User Info -->
          @if (user()) {
            <div class="px-4 py-3 border-b border-border">
              <p class="text-sm font-medium text-text">{{ user()?.username || user()?.email }}</p>
              <p class="text-xs text-text/60">{{ user()?.email }}</p>
            </div>
          }

          <!-- Menu Items -->
          <div class="py-1">
            <button
              type="button"
              (click)="handleProfile()"
              class="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface-100 transition-colors duration-150 flex items-center space-x-2"
            >
              <img
                [ngSrc]="'icons/about.svg'"
                alt="User"
                class="w-4 h-4 icon-invert"
                height="24"
                width="24"
              />
              <span>Mon Profil</span>
            </button>

            <button
              type="button"
              (click)="handleSettings()"
              class="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface-100 transition-colors duration-150 flex items-center space-x-2"
            >
              <img
                [ngSrc]="'icons/settings.svg'"
                alt="Settings"
                class="w-4 h-4 icon-invert"
                height="24"
                width="24"
              />
              <span>Settings</span>
            </button>

            <button
              type="button"
              (click)="handleLogout()"
              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-surface-100 transition-colors duration-150 flex items-center space-x-2"
            >
              <img
                [ngSrc]="'icons/logout.svg'"
                alt="Logout"
                class="w-4 h-4"
                height="24"
                width="24"
              />
              <span>Logout</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class AvatarMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly fileUrlService = inject(FileUrlService);

  readonly isMenuOpen = signal(false);

  // Get user data from auth service
  readonly user = computed(() => this.authService.user());
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  // Get avatar URL from profile service
  readonly avatarUrl = computed(() => {
    const profile = this.profileService.profile();
    return this.fileUrlService.getAvatarUrl(profile?.avatarPath);
  });

  // Compute user initials for avatar fallback
  readonly userInitials = computed(() => {
    return getUserInitials(this.user());
  });

  // Check if avatar image should be shown
  readonly hasAvatarImage = computed(() => !!this.avatarUrl());

  readonly avatarClasses = computed(() =>
    [
      'relative',
      'inline-flex',
      'items-center',
      'justify-center',
      'w-10',
      'h-10',
      'rounded-full',
      'bg-primary',
      'border-2',
      'border-border',
      'hover:border-primary',
      'transition-all',
      'duration-300',
      'ease-in-out',
      'transform',
      'hover:scale-110',
      'active:scale-95',
      'shadow-lg',
      'hover:shadow-xl',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-accent/50',
      'focus:ring-offset-2',
      'focus:ring-offset-background',
      'overflow-hidden',
    ].join(' '),
  );

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  handleProfile(): void {
    this.closeMenu();
    this.router.navigate(['/dashboard/profile']);
  }

  handleSettings(): void {
    this.closeMenu();
    this.router.navigate(['/dashboard/settings']);
  }

  handleLogout(): void {
    this.closeMenu();
    this.authService.signout();
    this.router.navigate(['/']);
  }

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isMenuOpen()) return;

    const target = event.target as Element;
    const avatarMenu = target.closest('app-avatar-menu');

    if (!avatarMenu) {
      this.closeMenu();
    }
  }

  // Close menu on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    }
  }
}
