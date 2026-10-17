import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { Config } from '@core/services/config';
import { Icon } from '@shared/ui/icon/icon';
import { toChromeWebStoreUrl } from '@shared/ui/extension-banner/service/extension-detection';

type StoreLink = {
  id: 'chrome' | 'firefox';
  browser: string;
  url: string | null;
};

const STEPS = [
  "Tu es sur l'offre, tu ouvres l'extension.",
  "Le titre, l'entreprise et le lien sont déjà remplis.",
  'Un clic, et la candidature est dans ton tableau de bord.',
];

/**
 * Vitrine de l'extension sur la page d'accueil.
 *
 * Le navigateur est dessiné en CSS (pas d'image), le popup est une vraie capture de l'extension.
 * Les liens vers les stores ne sont connus qu'à l'exécution (`config.json`, lu dans le navigateur
 * seulement) : la page prérendue et la première passe d'hydratation affichent un emplacement
 * neutre, les liens arrivent après le premier rendu, sans écart d'hydratation.
 * Navigateurs nommés en toutes lettres : ni Google ni Mozilla n'autorisent leur logo seul.
 */
@Component({
  selector: 'app-extension-showcase',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <div
      class="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-24"
    >
      <div>
        <span
          class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted"
        >
          <app-icon name="lucide-plus" cssClass="h-3.5 w-3.5 text-accent" />
          Extension Chrome et Firefox
        </span>
        <h2
          id="extension-titre"
          class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          L'offre est sous tes yeux. Garde-la en un clic.
        </h2>
        <p class="mt-4 max-w-[46ch] text-base leading-relaxed text-muted sm:text-lg">
          Sur LinkedIn, Indeed, Welcome to the Jungle, France Travail ou HelloWork, l'extension lit
          l'annonce pour toi. Plus de copier-coller entre deux onglets.
        </p>

        <ol class="mt-8 space-y-4">
          @for (step of steps; track step; let i = $index) {
            <li class="flex items-start gap-4">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-900"
                aria-hidden="true"
                >{{ i + 1 }}</span
              >
              <p class="pt-1 leading-relaxed text-text">{{ step }}</p>
            </li>
          }
        </ol>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          @if (stores(); as links) {
            @for (store of links; track store.id) {
              @if (store.url; as url) {
                <a
                  [attr.data-testid]="'store-link-' + store.id"
                  [href]="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 sm:whitespace-nowrap text-base font-medium text-on-primary transition-transform active:scale-[0.98]"
                >
                  Ajouter à {{ store.browser }}
                  <app-icon name="lucide-external-link" cssClass="h-4 w-4" />
                  <span class="sr-only">(nouvel onglet)</span>
                </a>
              } @else {
                <span
                  [attr.data-testid]="'store-pending-' + store.id"
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 sm:whitespace-nowrap text-base text-muted"
                >
                  <app-icon name="lucide-timer" cssClass="h-4 w-4" />
                  {{ store.browser }} : en cours de validation
                </span>
              }
            }
          } @else {
            <span class="h-12 w-full rounded-xl bg-border/40 sm:w-48" aria-hidden="true"></span>
            <span class="h-12 w-full rounded-xl bg-border/40 sm:w-48" aria-hidden="true"></span>
          }
        </div>
      </div>

      <!-- Fenêtre de navigateur en CSS, ouverte sur une offre, l'extension dépliée sous son icône. -->
      <figure class="relative pb-10 sm:pb-0">
        <div
          class="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)]"
          aria-hidden="true"
        >
          <div class="flex items-center gap-3 border-b border-border bg-surface-100 px-4 py-3">
            <span class="flex gap-1.5">
              <span class="h-3 w-3 rounded-full bg-border"></span>
              <span class="h-3 w-3 rounded-full bg-border"></span>
              <span class="h-3 w-3 rounded-full bg-border"></span>
            </span>
            <span
              class="min-w-0 flex-1 truncate rounded-full bg-background px-3 py-1 text-xs text-muted"
              >welcometothejungle.com/fr/companies/acme/jobs/developpeur-angular</span
            >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary ring-4 ring-primary/25"
            >
              <app-icon name="lucide-file-check" cssClass="h-4 w-4" />
            </span>
          </div>

          <div class="space-y-5 p-6 pr-[50%] sm:p-8 sm:pr-[48%]">
            <div class="flex items-center gap-3">
              <span class="h-11 w-11 rounded-xl bg-accent-100"></span>
              <span class="space-y-1.5">
                <span class="block text-sm font-semibold text-text">Acme Software</span>
                <span class="block text-xs text-muted">Nantes · Hybride</span>
              </span>
            </div>
            <p class="text-lg font-semibold tracking-tight text-text">
              Développeur Angular confirmé (H/F)
            </p>
            <span class="flex flex-wrap gap-2">
              <span class="rounded-full bg-surface-100 px-3 py-1 text-xs text-muted">CDI</span>
              <span class="rounded-full bg-surface-100 px-3 py-1 text-xs text-muted">Bac +5</span>
              <span class="rounded-full bg-surface-100 px-3 py-1 text-xs text-muted">
                45 – 55 k€
              </span>
            </span>
            <span class="block space-y-2.5 pt-2">
              <span class="block h-2.5 w-full rounded-full bg-border/60"></span>
              <span class="block h-2.5 w-11/12 rounded-full bg-border/60"></span>
              <span class="block h-2.5 w-4/5 rounded-full bg-border/60"></span>
              <span class="block h-2.5 w-full rounded-full bg-border/60"></span>
              <span class="block h-2.5 w-2/3 rounded-full bg-border/60"></span>
            </span>
          </div>
        </div>

        <img
          data-testid="extension-popup"
          src="/screen/extension-popup-dark.webp"
          width="680"
          height="918"
          loading="lazy"
          decoding="async"
          alt="Le popup de l'extension Candidash ouvert sur une offre : titre, entreprise et lien pré-remplis, prêt à être ajouté."
          class="absolute top-14 right-3 w-[46%] max-w-[300px] rounded-xl border border-border shadow-[0_28px_60px_-20px_rgb(0_0_0/0.55)] sm:-right-4 lg:-right-8"
        />
      </figure>
    </div>
  `,
})
export class ExtensionShowcase {
  private readonly config = inject(Config);

  protected readonly steps = STEPS;
  private readonly _rendered = signal(false);

  protected readonly stores = computed<readonly StoreLink[] | null>(() => {
    if (!this._rendered()) return null;
    const extensionId = this.config.extensionId;
    return [
      {
        id: 'chrome',
        browser: 'Chrome',
        url: extensionId ? toChromeWebStoreUrl(extensionId) : null,
      },
      { id: 'firefox', browser: 'Firefox', url: this.config.firefoxAddonUrl ?? null },
    ];
  });

  constructor() {
    afterNextRender(() => this._rendered.set(true));
  }
}
