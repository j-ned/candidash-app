import { Injectable, signal, effect, DOCUMENT } from '@angular/core';
import { inject } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  // Signal pour l'état du thème
  private readonly _theme = signal<Theme>('light');

  // Signal public en lecture seule
  readonly theme = this._theme.asReadonly();

  // Signal computed pour savoir si on est en mode dark
  readonly isDark = () => this._theme() === 'dark';

  constructor() {
    // Récupérer le thème sauvegardé ou utiliser la préférence système
    const savedTheme = this.getSavedTheme();
    const systemTheme = this.getSystemTheme();
    const initialTheme = savedTheme ?? systemTheme;

    this._theme.set(initialTheme);

    // Effect pour appliquer le thème au DOM et le sauvegarder
    effect(() => {
      const currentTheme = this._theme();
      this.applyTheme(currentTheme);
      this.saveTheme(currentTheme);
    });

    // Écouter les changements de préférence système
    this.watchSystemTheme();
  }

  /**
   * Toggle entre les thèmes light et dark
   */
  toggleTheme(): void {
    const newTheme = this._theme() === 'light' ? 'dark' : 'light';
    this._theme.set(newTheme);
  }

  /**
   * Définir un thème spécifique
   */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  /**
   * Appliquer le thème au DOM
   */
  private applyTheme(theme: Theme): void {
    const html = this.document.documentElement;

    // Retirer les classes existantes
    html.classList.remove('light', 'dark');
    html.removeAttribute('data-theme');

    // Appliquer le nouveau thème
    html.classList.add(theme);
    html.setAttribute('data-theme', theme);
  }

  /**
   * Sauvegarder le thème dans localStorage
   */
  private saveTheme(theme: Theme): void {
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      // Gérer le cas où localStorage n'est pas disponible
      console.warn('Unable to save theme to localStorage:', error);
    }
  }

  /**
   * Récupérer le thème sauvegardé
   */
  private getSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }

  /**
   * Obtenir le thème préféré du système
   */
  private getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  /**
   * Écouter les changements de préférence système
   */
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
