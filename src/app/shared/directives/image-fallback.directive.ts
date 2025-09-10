import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  Renderer2,
} from '@angular/core';

/**
 * Directive pour gérer le fallback automatique des images
 * Suit les guidelines Angular 20+ avec les nouvelles APIs input() et inject()
 *
 * @example
 * <img
 *   src="avatar-url"
 *   appImageFallback
 *   [fallbackInitials]="userInitials"
 *   alt="Avatar"
 * />
 */
@Directive({
  selector: '[appImageFallback]',
})
export class ImageFallbackDirective {
  private readonly el = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);

  // Input pour les initiales à afficher en cas d'erreur
  readonly fallbackInitials = input<string>('?');

  // Input pour personnaliser le style du fallback
  readonly fallbackBgColor = input<string>('var(--color-primary)');
  readonly fallbackTextColor = input<string>('var(--color-background)');

  private hasErrored = false;

  @HostListener('error')
  onImageError(): void {
    if (this.hasErrored) return; // Éviter les boucles infinies

    this.hasErrored = true;
    this.createFallback();
  }

  @HostListener('load')
  onImageLoad(): void {
    // Reset l'état d'erreur si l'image se charge correctement
    this.hasErrored = false;
    this.restoreImage();
  }

  private createFallback(): void {
    const img = this.el.nativeElement;
    const initials = this.fallbackInitials();

    // Récupérer les dimensions actuelles de l'image
    const computedStyle = window.getComputedStyle(img);
    const width = computedStyle.width || '40px';
    const height = computedStyle.height || '40px';

    // Créer un canvas pour générer le fallback
    const canvas = this.renderer.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.warn('Canvas context not available for image fallback');
      return;
    }

    // Configuration du canvas
    const size = Math.min(parseInt(width), parseInt(height));
    canvas.width = size;
    canvas.height = size;

    // Dessiner le background
    ctx.fillStyle = this.fallbackBgColor();
    ctx.fillRect(0, 0, size, size);

    // Dessiner le texte (initiales)
    ctx.fillStyle = this.fallbackTextColor();
    ctx.font = `bold ${Math.floor(size * 0.4)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);

    // Convertir en data URL et l'assigner à l'image
    const dataUrl = canvas.toDataURL();
    this.renderer.setAttribute(img, 'src', dataUrl);

    // Ajouter une classe CSS pour le styling
    this.renderer.addClass(img, 'image-fallback-active');
  }

  private restoreImage(): void {
    const img = this.el.nativeElement;
    this.renderer.removeClass(img, 'image-fallback-active');
  }
}
