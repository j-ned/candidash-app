import { Injectable, signal, effect, DOCUMENT, PLATFORM_ID } from '@angular/core';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeManager {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _theme = signal<Theme>('light');

  readonly theme = this._theme.asReadonly();
  readonly isDark = () => this._theme() === 'dark';

  constructor() {
    const savedTheme = this.getSavedTheme();
    const systemTheme = this.getSystemTheme();
    const initialTheme = savedTheme ?? systemTheme;

    this._theme.set(initialTheme);

    effect(() => {
      const currentTheme = this._theme();
      this.applyTheme(currentTheme);
      this.saveTheme(currentTheme);
    });

    this.watchSystemTheme();
  }

  toggleTheme(): void {
    const newTheme = this._theme() === 'light' ? 'dark' : 'light';
    this._theme.set(newTheme);
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  private applyTheme(theme: Theme): void {
    const html = this.document.documentElement;

    html.classList.remove('light', 'dark');
    html.removeAttribute('data-theme');

    html.classList.add(theme);
    html.setAttribute('data-theme', theme);
  }

  private saveTheme(theme: Theme): void {
    if (!this.isBrowser) return; // SSR : pas de localStorage côté serveur
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage indisponible (mode privé, quota) : on ignore.
    }
  }

  private getSavedTheme(): Theme | null {
    if (!this.isBrowser) return null;
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }

  private getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  private watchSystemTheme(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', (e) => {
        // Ne changer que si aucun thème n'est explicitement sauvegardé
        if (!this.getSavedTheme()) {
          const systemTheme = e.matches ? 'dark' : 'light';
          this._theme.set(systemTheme);
        }
      });
    }
  }
}
