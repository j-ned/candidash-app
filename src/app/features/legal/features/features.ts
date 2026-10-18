import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';
import { Icon } from '@shared/ui/icon/icon';

type Variant = 'light' | 'dark';

const STEPS = [
  'Connexion au compte de démonstration.',
  "Le tableau de bord : statistiques, taux d'entretien et envois par semaine.",
  'Le tableau en cinq colonnes : une candidature glissée vers « Entretiens prévus ».',
  "L'espace « Mes documents » et le CV de démonstration.",
  "L'analyse du CV face à l'offre : mots-clés présents, absents, et contrôles de lecture par les ATS.",
  "L'export du CV en PDF.",
];

/**
 * Visite complète, enregistrée sur l'application réelle avec des données fictives
 * (scripts/capture). Une vidéo par thème, lue à la demande : rien n'est téléchargé avant le clic.
 * La vidéo est muette ; les étapes écrites en sont l'équivalent textuel.
 */
@Component({
  selector: 'app-features',
  imports: [Icon, ThemeToggle, RouterLink],
  host: { class: 'flex min-h-screen flex-col bg-background text-text' },
  template: `
    <header
      class="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-5 sm:px-6"
    >
      <a
        routerLink="/"
        class="inline-flex items-center gap-2 text-muted transition-colors hover:text-text"
      >
        <app-icon name="lucide-arrow-left" cssClass="h-5 w-5" />
        Retour à l'accueil
      </a>
      <app-theme-toggle />
    </header>

    <main class="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-16 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Candidash, de l'offre au CV
        </h1>
        <p class="mt-4 text-lg text-muted">
          Une minute dans l'application réelle, avec un compte de démonstration.
        </p>
      </div>

      <figure class="mt-10">
        <div
          class="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)]"
        >
          @for (variant of variants; track variant) {
            <video
              [attr.data-testid]="'tour-' + variant"
              [class]="variant === 'dark' ? 'hidden dark:block' : 'dark:hidden'"
              class="aspect-[16/10] w-full bg-surface-100"
              controls
              playsinline
              muted
              preload="none"
              [poster]="'/demo/board-' + variant + '.webp'"
              aria-describedby="visite-etapes"
            >
              <source [src]="'/demo/tour-' + variant + '.webm'" type="video/webm" />
            </video>
          }
        </div>
        <figcaption class="mt-3 text-center text-sm text-muted">
          Vidéo sans son. Compte, entreprises et candidatures sont fictifs.
        </figcaption>
      </figure>

      <section class="mx-auto mt-12 max-w-2xl" aria-labelledby="visite-titre">
        <h2 id="visite-titre" class="text-2xl font-semibold tracking-tight">
          Ce que montre la visite
        </h2>
        <ol id="visite-etapes" class="mt-4 space-y-3">
          @for (step of steps; track step; let i = $index) {
            <li class="flex gap-3">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-900"
                aria-hidden="true"
                >{{ i + 1 }}</span
              >
              <p class="pt-0.5 leading-relaxed text-muted">{{ step }}</p>
            </li>
          }
        </ol>
      </section>

      <div class="mt-14 text-center">
        <a
          routerLink="/auth/signup"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-medium text-on-primary transition-transform active:scale-[0.98]"
        >
          Créer mon compte
          <app-icon name="lucide-arrow-right" cssClass="h-4 w-4" />
        </a>
        <p class="mt-3 text-sm text-muted">Gratuit, sans carte bancaire.</p>
      </div>
    </main>
  `,
})
export class Features {
  protected readonly variants: readonly Variant[] = ['light', 'dark'];
  protected readonly steps = STEPS;
}
