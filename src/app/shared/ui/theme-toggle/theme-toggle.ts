import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ThemeService } from '@shared/ui/theme-toggle/service/theme';

@Component({
  selector: 'app-theme-toggle',
  imports: [CommonModule, NgOptimizedImage],
  template: `
    <button
      type="button"
      (click)="toggleTheme()"
      [class]="buttonClasses()"
      [attr.aria-label]="ariaLabel()"
      [title]="tooltipText()"
    >
      @if (!themeService.isDark()) {
        <img
          [ngSrc]="'icons/sun.svg'"
          alt="Sun"
          class="w-5 h-5 transition-transform duration-300 icon-invert"
          height="24"
          width="24"
        />
      }

      @if (themeService.isDark()) {
        <img
          [ngSrc]="'icons/moon.svg'"
          alt="Moon"
          class="w-5 h-5 transition-transform duration-300 icon-invert"
          height="24"
          width="24"
        />
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class ThemeToggle {
  readonly themeService = inject(ThemeService);

  readonly buttonClasses = computed(() =>
    [
      'relative',
      'inline-flex',
      'items-center',
      'justify-center',
      'p-2',
      'rounded-full',
      'text-text',
      'bg-background',
      'border',
      'border-border',
      'hover:bg-secondary/20',
      'hover:border-secondary',
      'active:bg-secondary/30',
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
    ].join(' '),
  );

  readonly ariaLabel = computed(() =>
    this.themeService.isDark() ? 'Passer en mode clair' : 'Passer en mode sombre',
  );

  readonly tooltipText = computed(() =>
    this.themeService.isDark() ? 'Mode clair' : 'Mode sombre',
  );

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
