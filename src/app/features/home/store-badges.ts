import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Config } from '@core/services/config';
import { toChromeWebStoreUrl } from '@shared/ui/extension-banner/service/extension-detection';

/**
 * Badges officiels des stores, non modifiés et liés à la fiche de l'extension, comme l'exigent
 * Google (« Available in the Chrome Web Store ») et Mozilla (« Get the add-on »). Ils
 * n'existent qu'en anglais : le texte alternatif est en français.
 *
 * Les liens ne sont connus qu'à l'exécution (`config.json`, lu dans le navigateur seulement) :
 * la page prérendue et la première passe d'hydratation affichent un emplacement de même taille.
 */
@Component({
  selector: 'app-store-badges',
  imports: [NgOptimizedImage],
  host: { class: 'flex flex-wrap items-center gap-x-6 gap-y-3' },
  template: `
    @if (links(); as stores) {
      @if (stores.chrome; as url) {
        <a
          data-testid="store-link-chrome"
          [href]="url"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <img
            ngSrc="/badges/chrome-web-store.png"
            width="496"
            height="150"
            alt="Disponible sur le Chrome Web Store"
            class="h-12 w-auto"
          />
          <span class="sr-only">(nouvel onglet)</span>
        </a>
      } @else {
        <span data-testid="store-pending-chrome" [class]="pendingClass">
          Chrome : bientôt disponible
        </span>
      }
      @if (stores.firefox; as url) {
        <a
          data-testid="store-link-firefox"
          [href]="url"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <img
            ngSrc="/badges/firefox-get-the-addon.svg"
            width="172"
            height="60"
            alt="Disponible sur les modules complémentaires Firefox"
            class="h-12 w-auto"
          />
          <span class="sr-only">(nouvel onglet)</span>
        </a>
      } @else {
        <span data-testid="store-pending-firefox" [class]="pendingClass">
          Firefox : bientôt disponible
        </span>
      }
    } @else {
      <span class="h-12 w-40 rounded-md bg-border/40" aria-hidden="true"></span>
      <span class="h-12 w-36 rounded-md bg-border/40" aria-hidden="true"></span>
    }
  `,
})
export class StoreBadges {
  private readonly config = inject(Config);

  protected readonly pendingClass =
    'inline-flex h-12 items-center rounded-md border border-dashed border-border px-4 text-sm text-muted';
  private readonly _rendered = signal(false);

  protected readonly links = computed(() => {
    if (!this._rendered()) return null;
    const extensionId = this.config.extensionId;
    return {
      chrome: extensionId ? toChromeWebStoreUrl(extensionId) : null,
      firefox: this.config.firefoxAddonUrl ?? null,
    };
  });

  constructor() {
    afterNextRender(() => this._rendered.set(true));
  }
}
