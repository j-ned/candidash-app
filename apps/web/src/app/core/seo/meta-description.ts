import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// Même texte que le <meta name="description"> de index.html, servi par la coquille CSR.
export const DEFAULT_DESCRIPTION =
  "Candidash - Centralisez et suivez vos candidatures d'emploi simplement et efficacement.";

function routeDescription(root: ActivatedRouteSnapshot): string {
  let route = root;
  while (route.firstChild) route = route.firstChild;
  const description: unknown = route.data['description'];
  return typeof description === 'string' ? description : DEFAULT_DESCRIPTION;
}

/**
 * Chaque page publique porte sa propre description (`data.description` de sa route) : c'est
 * l'extrait que les moteurs affichent sous le titre. Tourne aussi au prérendu, où ils la lisent.
 */
export function startMetaDescription(): void {
  const meta = inject(Meta);
  const router = inject(Router);

  router.events
    .pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe(() => {
      meta.updateTag({
        name: 'description',
        content: routeDescription(router.routerState.snapshot.root),
      });
    });
}
