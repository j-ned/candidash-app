import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';
import { Reveal } from '@features/home/reveal';
import { ExtensionShowcase } from '@features/home/extension-showcase';
import { DemoMedia } from '@features/home/demo-media';

/**
 * Page d'accueil publique.
 *
 * Elle n'utilise volontairement pas `app-layout` : ce shell est fait pour les écrans applicatifs
 * (carte flottante, halo de curseur suivi à la souris, points animés en boucle). Sur une page
 * d'entrée, ces effets coûtent des frames sans rien dire du produit. Les autres écrans continuent
 * de l'utiliser, il n'est pas modifié.
 *
 * La page lit les jetons `@theme` comme le reste de l'application : vert forêt pour la marque et
 * les actions, terracotta comme accent unique. Elle n'a plus de palette à elle.
 *
 * Échelle de rayons, appliquée partout : surfaces `rounded-2xl`, contrôles `rounded-xl`,
 * étiquettes `rounded-full`.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, Reveal, ThemeToggle, ExtensionShowcase, DemoMedia],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[100dvh] bg-background text-text' },
  template: `
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >Aller au contenu</a
    >

    <header class="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <nav
        class="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Navigation principale"
      >
        <a routerLink="/" class="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-on-primary"
            aria-hidden="true"
          >
            <app-icon name="lucide-bar-chart-3" cssClass="h-4 w-4" />
          </span>
          <span class="hidden sm:inline">Candidash</span>
          <span class="sr-only sm:hidden">Candidash</span>
        </a>

        <div class="flex items-center gap-1 sm:gap-2">
          <!-- Le sélecteur de thème vit ici : c'est lui qui instancie ThemeManager, donc ce qui
               applique le thème enregistré. Sans lui la page resterait bloquée en clair. -->
          <app-theme-toggle />
          <a
            routerLink="/features"
            class="hidden rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:text-text sm:inline-block"
            >La démo</a
          >
          <a
            routerLink="/auth/signin"
            class="rounded-xl px-2 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:text-text sm:px-3"
            >Se connecter</a
          >
          <a
            routerLink="/auth/signup"
            class="rounded-xl bg-primary px-3 py-2 text-sm font-medium whitespace-nowrap text-on-primary transition-transform active:scale-[0.98] sm:px-4"
            >Créer mon compte</a
          >
        </div>
      </nav>
    </header>

    <main id="contenu">
      <!-- Héros : la promesse centrée, puis le vrai tableau en mouvement, en grand. -->
      <section class="mx-auto max-w-[1180px] px-4 pt-12 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
        <div appReveal class="mx-auto max-w-3xl text-center">
          <h1
            class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]"
          >
            Toutes tes candidatures, au même endroit.
          </h1>
          <p class="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
            Garde une offre en un clic, suis chaque candidature sur ton tableau, reçois un rappel
            quand il est temps de relancer, et ajuste ton CV aux mots-clés de l'offre.
          </p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <a
              routerLink="/auth/signup"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-medium text-on-primary transition-transform active:scale-[0.98]"
            >
              Créer mon compte
              <app-icon name="lucide-arrow-right" cssClass="h-4 w-4" />
            </a>
            <a
              routerLink="/features"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3.5 text-base font-medium text-text transition-colors hover:border-primary"
            >
              <app-icon name="lucide-circle-play" cssClass="h-4 w-4" />
              Voir la visite complète
            </a>
          </div>
          <p class="mt-4 text-sm text-muted">Gratuit, sans carte bancaire.</p>
        </div>

        <app-demo-media
          appReveal="120"
          name="board"
          alt="Le tableau des candidatures : une offre glissée de « Repérées » à « Envoyées », et le rappel de relance programmé."
          width="1600"
          height="1000"
          priority
          class="mx-auto mt-12 max-w-[1080px] lg:mt-16"
        />
      </section>

      <!-- Extension : vraie vidéo du popup sur une annonce, badges officiels des stores. -->
      <section class="border-y border-border bg-surface-100" aria-labelledby="extension-titre">
        <app-extension-showcase appReveal />
      </section>

      <!-- Suivi : statistiques réelles, relances automatiques. -->
      <section
        class="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-24"
        aria-labelledby="suivi-titre"
      >
        <div appReveal class="max-w-3xl">
          <h2
            id="suivi-titre"
            class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Tu sais où tu en es. Les relances suivent.
          </h2>
        </div>
        <ul appReveal="60" class="mt-8 grid gap-6 md:grid-cols-3">
          @for (point of suivi; track point.titre) {
            <li>
              <app-icon [name]="point.icone" cssClass="h-6 w-6 text-primary" />
              <h3 class="mt-3 font-semibold text-text">{{ point.titre }}</h3>
              <p class="mt-1 leading-relaxed text-muted">{{ point.texte }}</p>
            </li>
          }
        </ul>
        <app-demo-media
          appReveal="120"
          name="stats"
          alt="Les statistiques de Candidash : candidatures par statut, taux d'entretien, envois par semaine et entonnoir de conversion."
          [width]="1400"
          [height]="statsHeight"
          [video]="false"
          class="mx-auto mt-12 max-w-[1080px]"
        />
      </section>

      <!-- Espace CV : vidéo de l'analyse qui réagit à la saisie. -->
      <section class="border-y border-border bg-surface-100" aria-labelledby="cv-titre">
        <div class="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-24">
          <div appReveal class="max-w-3xl">
            <h2
              id="cv-titre"
              class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              Un CV raccord avec chaque offre.
            </h2>
          </div>
          <ul appReveal="60" class="mt-8 grid gap-6 md:grid-cols-3">
            @for (point of cv; track point.titre) {
              <li>
                <app-icon [name]="point.icone" cssClass="h-6 w-6 text-primary" />
                <h3 class="mt-3 font-semibold text-text">{{ point.titre }}</h3>
                <p class="mt-1 leading-relaxed text-muted">{{ point.texte }}</p>
              </li>
            }
          </ul>
          <app-demo-media
            appReveal="120"
            name="cv"
            alt="L'éditeur de CV de Candidash : l'analyse liste les mots-clés de l'offre absents du CV, puis le score monte quand ils sont ajoutés."
            width="1600"
            height="1000"
            class="mx-auto mt-12 max-w-[1080px]"
          />
        </div>
      </section>

      <!-- Trois engagements, trois cellules. -->
      <section class="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-24">
        <div appReveal class="max-w-[46ch]">
          <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Simple, et sérieux avec tes données.
          </h2>
        </div>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <article
            appReveal
            class="rounded-2xl border border-border bg-accent-50 p-6 md:col-span-2 md:p-8"
          >
            <h3 class="text-xl font-semibold tracking-tight">Cinq statuts, pas trente.</h3>
            <p class="mt-2 max-w-[60ch] leading-relaxed text-accent-900">
              Une candidature avance ou elle s'arrête. Tu vois où en est chacune sans ouvrir quoi
              que ce soit.
            </p>
            <ul class="mt-6 flex flex-wrap gap-2" aria-label="Les statuts d'une candidature">
              @for (statut of statuts; track statut) {
                <li class="rounded-full border border-border bg-surface-100 px-3 py-1.5 text-sm">
                  {{ statut }}
                </li>
              }
            </ul>
          </article>

          <article
            appReveal="80"
            class="rounded-2xl border border-border bg-surface-100 p-6 md:p-8"
          >
            <app-icon name="lucide-shield-check" cssClass="h-6 w-6 text-accent" />
            <h3 class="mt-4 text-xl font-semibold tracking-tight">Compte protégé</h3>
            <p class="mt-2 leading-relaxed text-muted">
              Double authentification par application, mots de passe hachés avec Argon2.
            </p>
          </article>

          <article
            appReveal="160"
            class="rounded-2xl border border-border bg-primary-50 p-6 md:col-span-3 md:p-8"
          >
            <app-icon name="lucide-lock-keyhole" cssClass="h-6 w-6 text-primary-900" />
            <h3 class="mt-4 text-xl font-semibold tracking-tight">Rien ne part ailleurs.</h3>
            <p class="mt-2 max-w-[70ch] leading-relaxed text-primary-900">
              Pas de publicité ni de traceur. L'analyse de ton CV tourne dans ton navigateur, sans
              intelligence artificielle tierce, et l'extension n'envoie l'offre qu'au moment où tu
              cliques.
            </p>
          </article>
        </div>
      </section>

      <!-- Appel final : bande centrée, un seul geste. -->
      <section class="border-t border-border bg-surface-100">
        <div appReveal class="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Commence ta prochaine recherche au propre.
          </h2>
          <a
            routerLink="/auth/signup"
            class="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-medium text-on-primary transition-transform active:scale-[0.98]"
          >
            Créer mon compte
            <app-icon name="lucide-arrow-right" cssClass="h-4 w-4" />
          </a>
          <p class="mt-4 text-sm text-muted">Gratuit, sans carte bancaire.</p>
        </div>
      </section>
    </main>

    <footer class="border-t border-border">
      <div
        class="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <p>Candidash, {{ annee }}</p>
        <nav aria-label="Informations légales" class="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <a routerLink="/terms-of-service" class="transition-colors hover:text-text"
            >Conditions d'utilisation</a
          >
          <a routerLink="/extension-privacy" class="transition-colors hover:text-text"
            >Confidentialité de l'extension</a
          >
          <a routerLink="/contact" class="transition-colors hover:text-text">Contact</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    /* Révélation à l'entrée dans le viewport. Seuls opacity et transform sont animés.
       La classe .reveal est posée par la directive, jamais dans le HTML : sans JavaScript, rien
       n'est masqué. Sous prefers-reduced-motion, la directive ne pose rien du tout. */
    .reveal {
      opacity: 0;
      transform: translateY(18px);
      transition:
        opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms),
        transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
    }

    .reveal.is-revealed {
      opacity: 1;
      transform: none;
    }
  `,
})
export class Home {
  protected readonly annee = new Date().getFullYear();

  /** Hauteur intrinsèque de la capture des statistiques (largeur 1400, scripts/capture). */
  protected readonly statsHeight = 914;

  protected readonly suivi = [
    {
      icone: 'lucide-columns-3',
      titre: 'Un tableau en cinq colonnes',
      texte: "Glisse une carte d'un statut à l'autre, la date d'envoi se remplit toute seule.",
    },
    {
      icone: 'lucide-clock',
      titre: 'Les relances partent sans toi',
      texte:
        "Au passage à « Envoyée », un rappel est programmé à sept jours : tu reçois un e-mail quand il est temps de relancer l'entreprise.",
    },
    {
      icone: 'lucide-bar-chart-3',
      titre: 'Des chiffres qui parlent',
      texte: "Taux d'entretien, envois par semaine et entonnoir : tu vois ce qui marche.",
    },
  ];

  protected readonly cv = [
    {
      icone: 'lucide-upload',
      titre: 'Pars de ton CV actuel',
      texte: 'Importe ton PDF : le texte est repris, titres et puces compris.',
    },
    {
      icone: 'lucide-file-check',
      titre: "Compare-le à l'offre",
      texte:
        "L'analyse liste les mots-clés présents et absents, et vérifie ce que les logiciels de tri (ATS) lisent mal.",
    },
    {
      icone: 'lucide-download',
      titre: 'Exporte un PDF propre',
      texte: 'Texte sélectionnable, mise en page sobre, et joint à la candidature en un clic.',
    },
  ];

  protected readonly statuts = [
    'Repérée',
    'Candidature envoyée',
    'Entretien prévu',
    'Acceptée',
    'Refusée',
  ];
}
