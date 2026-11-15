import { DOCUMENT, DestroyRef, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// Origine publique du site, la même que celle de public/robots.txt et public/sitemap.xml : les
// pages sont prérendues au build, avant que le conteneur ne connaisse son adresse.
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  factory: () => 'https://candidash.nedellec-julien.fr',
});

/** Adresse de référence d'une page : sans paramètres, sans ancre, sans barre finale. */
export function canonicalUrl(origin: string, routerUrl: string): string {
  const path = routerUrl.replace(/[?#].*$/, '').replace(/\/+$/, '');
  return `${origin}${path === '' ? '/' : path}`;
}

/**
 * Une même page répond à plusieurs adresses (paramètres de campagne, barre finale) : chaque
 * navigation déclare la seule à indexer. Tourne aussi au prérendu, où les moteurs la lisent.
 */
export function startCanonicalLink(): void {
  const head = inject(DOCUMENT).head;
  const origin = inject(SITE_ORIGIN);

  inject(Router)
    .events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe((event) => {
      const link =
        head.querySelector('link[rel="canonical"]') ??
        head.appendChild(head.ownerDocument.createElement('link'));
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl(origin, event.urlAfterRedirects));
    });
}
