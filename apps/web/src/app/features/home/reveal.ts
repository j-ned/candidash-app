import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Révèle l'élément quand il entre dans le viewport.
 *
 * IntersectionObserver plutôt qu'un écouteur de scroll : pas de travail à chaque frame, pas de
 * re-rendu Angular. L'observateur se déconnecte après le premier passage, l'animation ne rejoue pas.
 * Sous `prefers-reduced-motion: reduce`, l'élément est visible d'emblée et rien n'est observé.
 */
@Directive({
  selector: '[appReveal]',
})
export class Reveal implements AfterViewInit, OnDestroy {
  /** Retard en millisecondes, pour décaler les éléments d'une même rangée. */
  readonly appReveal = input(0, { transform: numberAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  /**
   * Le masquage est posé ICI, par le script, et jamais dans la feuille de style : si le JavaScript
   * ne s'exécute pas ou si l'observateur ne se déclenche jamais, la page reste entièrement lisible.
   * L'inverse (masquer en CSS, révéler en JS) laisserait des sections vides.
   */
  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    el.style.setProperty('--reveal-delay', `${this.appReveal()}ms`);
    el.classList.add('reveal');
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        el.classList.add('is-revealed');
        this.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
