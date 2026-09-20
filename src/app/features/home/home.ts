import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';
import { Reveal } from '@features/home/reveal';

/**
 * Page d'accueil publique.
 *
 * Elle n'utilise volontairement pas `app-layout` : ce shell est fait pour les écrans applicatifs
 * (carte flottante, halo de curseur suivi à la souris, points animés en boucle). Sur une page
 * d'entrée, ces effets coûtent des frames sans rien dire du produit. Les autres écrans continuent
 * de l'utiliser, il n'est pas modifié.
 *
 * Palette portée par l'hôte, pas par `@theme` : la refonte des jetons de toute l'application est un
 * chantier séparé, le tableau de bord garde donc son terracotta. Le vert profond structure la page,
 * le terracotta reste l'accent unique, ce qui raccorde la page aux captures du produit.
 *
 * Échelle de rayons, appliquée partout : surfaces `rounded-2xl`, contrôles `rounded-xl`,
 * étiquettes `rounded-full`.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, Reveal, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[100dvh] bg-[var(--ld-paper)] text-[var(--ld-ink)]' },
  template: `
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-xl focus:bg-[var(--ld-forest)] focus:px-4 focus:py-2 focus:text-[var(--ld-on-forest)]"
      >Aller au contenu</a
    >

    <header
      class="sticky top-0 z-40 border-b border-[var(--ld-line)] bg-[var(--ld-paper)]/85 backdrop-blur"
    >
      <nav
        class="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Navigation principale"
      >
        <a routerLink="/" class="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--ld-forest)] text-[var(--ld-on-forest)]"
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
            class="hidden rounded-xl px-3 py-2 text-sm text-[var(--ld-muted)] transition-colors hover:text-[var(--ld-ink)] sm:inline-block"
            >La démo</a
          >
          <a
            routerLink="/auth/signin"
            class="rounded-xl px-2 py-2 text-sm whitespace-nowrap text-[var(--ld-muted)] transition-colors hover:text-[var(--ld-ink)] sm:px-3"
            >Se connecter</a
          >
          <a
            routerLink="/auth/signup"
            class="rounded-xl bg-[var(--ld-forest)] px-3 py-2 text-sm font-medium whitespace-nowrap text-[var(--ld-on-forest)] transition-transform active:scale-[0.98] sm:px-4"
            >Créer mon compte</a
          >
        </div>
      </nav>
    </header>

    <main id="contenu">
      <!-- Héros : split asymétrique, le produit à droite. -->
      <section
        class="mx-auto grid max-w-[1180px] gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-16"
      >
        <div appReveal>
          <h1
            class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[2.85rem] lg:leading-[1.1]"
          >
            Toutes tes candidatures, au même endroit.
          </h1>
          <p class="mt-5 max-w-[46ch] text-base leading-relaxed text-[var(--ld-muted)] sm:text-lg">
            Chaque candidature, sa date, son statut et sa relance. Sans tableur, sans post-it, sans
            rien oublier.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              routerLink="/auth/signup"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ld-forest)] px-6 py-3.5 text-base font-medium text-[var(--ld-on-forest)] transition-transform active:scale-[0.98]"
            >
              Créer mon compte
              <app-icon name="lucide-arrow-right" cssClass="h-4 w-4" />
            </a>
            <a
              routerLink="/features"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--ld-line)] px-6 py-3.5 text-base font-medium text-[var(--ld-ink)] transition-colors hover:border-[var(--ld-forest)]"
            >
              Voir la démo
            </a>
          </div>
        </div>

        <!-- Une seule image, en thème sombre : le thème se change par un bouton, pas seulement par
             la préférence système, donc une source conditionnée à prefers-color-scheme se
             tromperait la moitié du temps. Cadrée, elle se lit comme une fenêtre du produit sur
             les deux fonds. -->
        <div appReveal="120" class="lg:-mr-6 xl:-mr-16">
          <img
            src="/screen/app-dark.webp"
            width="2281"
            height="1548"
            [attr.fetchpriority]="'high'"
            decoding="async"
            alt="Le tableau de bord Candidash : huit candidatures avec leur entreprise, leur date et leur statut."
            class="w-full rounded-2xl border border-[var(--ld-line)] shadow-[0_24px_60px_-28px_var(--ld-shadow)]"
          />
        </div>
      </section>

      <!-- Relances : split inversé, image à gauche, pour ne pas rejouer la composition du héros. -->
      <section class="border-y border-[var(--ld-line)] bg-[var(--ld-surface)]">
        <div
          class="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 lg:py-24"
        >
          <div appReveal class="order-2 lg:order-1">
            <img
              src="/screen/relance-dark.webp"
              width="1951"
              height="1269"
              loading="lazy"
              decoding="async"
              alt="Le choix de la fréquence de relance, avec la date du prochain rappel calculée."
              class="w-full rounded-2xl border border-[var(--ld-line)] shadow-[0_18px_44px_-24px_var(--ld-shadow)]"
            />
          </div>
          <div appReveal="100" class="order-1 lg:order-2">
            <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Les relances partent sans toi.
            </h2>
            <p
              class="mt-4 max-w-[46ch] text-base leading-relaxed text-[var(--ld-muted)] sm:text-lg"
            >
              Tu choisis la fréquence en enregistrant l'annonce. Candidash calcule la date et
              t'envoie le mail quand il est temps de relancer.
            </p>
          </div>
        </div>
      </section>

      <!-- Trois sujets, trois cellules, tailles et fonds différents. -->
      <section class="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-24">
        <div appReveal class="max-w-[46ch]">
          <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ce que tu ne veux plus chercher.
          </h2>
        </div>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <article
            appReveal
            class="rounded-2xl border border-[var(--ld-line)] bg-[var(--ld-forest-soft)] p-6 md:col-span-2 md:p-8"
          >
            <app-icon name="lucide-paperclip" cssClass="h-6 w-6 text-[var(--ld-forest-ink)]" />
            <h3 class="mt-4 text-xl font-semibold tracking-tight">
              Le CV que tu as vraiment envoyé
            </h3>
            <p class="mt-2 max-w-[52ch] leading-relaxed text-[var(--ld-forest-ink)]">
              Le CV et la lettre partent avec la candidature et restent attachés à sa fiche. Trois
              semaines plus tard, tu sais encore quelle version l'entreprise a reçue.
            </p>
          </article>

          <article
            appReveal="80"
            class="rounded-2xl border border-[var(--ld-line)] bg-[var(--ld-surface)] p-6 md:p-8"
          >
            <app-icon name="lucide-shield-check" cssClass="h-6 w-6 text-[var(--ld-clay)]" />
            <h3 class="mt-4 text-xl font-semibold tracking-tight">Compte protégé</h3>
            <p class="mt-2 leading-relaxed text-[var(--ld-muted)]">
              Double authentification par application, au même endroit que le reste de tes réglages.
            </p>
          </article>

          <article
            appReveal="160"
            class="rounded-2xl border border-[var(--ld-line)] bg-[var(--ld-clay-soft)] p-6 md:col-span-3 md:p-8"
          >
            <h3 class="text-xl font-semibold tracking-tight">Cinq statuts, pas trente.</h3>
            <p class="mt-2 max-w-[60ch] leading-relaxed text-[var(--ld-clay-ink)]">
              Une candidature avance ou elle s'arrête. Tu vois où en est chacune sans ouvrir quoi
              que ce soit.
            </p>
            <ul class="mt-6 flex flex-wrap gap-2" aria-label="Les statuts d'une candidature">
              @for (statut of statuts; track statut) {
                <li
                  class="rounded-full border border-[var(--ld-line)] bg-[var(--ld-surface)] px-3 py-1.5 text-sm"
                >
                  {{ statut }}
                </li>
              }
            </ul>
          </article>
        </div>
      </section>

      <!-- Extension : split inversé, annoncée comme à venir. -->
      <section class="border-y border-[var(--ld-line)] bg-[var(--ld-surface)]">
        <div
          class="mx-auto grid max-w-[1180px] items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-14 lg:py-24"
        >
          <div appReveal class="order-2 lg:order-1">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-[var(--ld-line)] px-3 py-1 text-sm text-[var(--ld-muted)]"
            >
              <app-icon name="lucide-timer" cssClass="h-3.5 w-3.5" />
              En préparation
            </span>
            <h2 class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Bientôt, sans quitter l'offre.
            </h2>
            <p
              class="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--ld-muted)] sm:text-lg"
            >
              Une extension Chrome pour envoyer l'annonce dans Candidash depuis la page où tu l'as
              trouvée. Elle n'est pas encore disponible.
            </p>
          </div>
          <div appReveal="100" class="order-1 lg:order-2">
            <div class="rounded-2xl border border-[var(--ld-line)] bg-[var(--ld-paper)] p-6 sm:p-8">
              <ol class="grid gap-4 sm:grid-cols-3">
                @for (etape of etapes; track etape.texte) {
                  <li class="flex gap-3 sm:flex-col sm:gap-2">
                    <app-icon
                      [name]="etape.icone"
                      cssClass="h-5 w-5 shrink-0 text-[var(--ld-clay)]"
                    />
                    <p class="text-sm leading-relaxed text-[var(--ld-muted)]">{{ etape.texte }}</p>
                  </li>
                }
              </ol>
            </div>
          </div>
        </div>
      </section>

      <!-- Appel final : bande centrée, un seul geste. -->
      <section class="mx-auto max-w-[1180px] px-4 py-20 text-center sm:px-6 lg:py-28">
        <div appReveal class="mx-auto max-w-2xl">
          <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Commence ta prochaine recherche au propre.
          </h2>
          <a
            routerLink="/auth/signup"
            class="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ld-forest)] px-7 py-3.5 text-base font-medium text-[var(--ld-on-forest)] transition-transform active:scale-[0.98]"
          >
            Créer mon compte
            <app-icon name="lucide-arrow-right" cssClass="h-4 w-4" />
          </a>
          <p class="mt-4 text-sm text-[var(--ld-muted)]">Gratuit, sans carte bancaire.</p>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--ld-line)]">
      <div
        class="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-8 text-sm text-[var(--ld-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <p>Candidash, {{ annee }}</p>
        <a routerLink="/terms-of-service" class="transition-colors hover:text-[var(--ld-ink)]"
          >Conditions d'utilisation</a
        >
      </div>
    </footer>
  `,
  styles: `
    /* Palette de la page, verrouillée sur un seul thème par mode. Vert profond = structure,
       terracotta = accent unique. Les valeurs claires et sombres sont appariées pour garder le
       même rapport de contraste. */
    :host {
      --ld-paper: oklch(97.5% 0.008 95);
      --ld-surface: oklch(99.2% 0.004 95);
      --ld-ink: oklch(21% 0.018 155);
      --ld-muted: oklch(45% 0.015 150);
      --ld-line: oklch(88% 0.012 120);
      --ld-forest: oklch(37% 0.068 155);
      --ld-on-forest: oklch(98% 0.005 95);
      --ld-forest-soft: oklch(94% 0.022 155);
      --ld-forest-ink: oklch(32% 0.045 155);
      --ld-clay: oklch(50% 0.115 38);
      --ld-clay-soft: oklch(95% 0.022 38);
      --ld-clay-ink: oklch(38% 0.075 38);
      --ld-shadow: oklch(21% 0.018 155 / 0.35);
    }

    :host-context([data-theme='dark']),
    :host-context(.dark) {
      --ld-paper: oklch(16.5% 0.014 155);
      --ld-surface: oklch(20.5% 0.016 155);
      --ld-ink: oklch(95.5% 0.008 95);
      --ld-muted: oklch(73% 0.014 120);
      --ld-line: oklch(29% 0.014 155);
      --ld-forest: oklch(76% 0.098 155);
      --ld-on-forest: oklch(17% 0.02 155);
      --ld-forest-soft: oklch(24% 0.032 155);
      --ld-forest-ink: oklch(86% 0.04 155);
      --ld-clay: oklch(72% 0.105 38);
      --ld-clay-soft: oklch(24% 0.035 38);
      --ld-clay-ink: oklch(86% 0.045 38);
      --ld-shadow: oklch(0% 0 0 / 0.6);
    }

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

  protected readonly statuts = [
    'Repérée',
    'Candidature envoyée',
    'Entretien prévu',
    'Acceptée',
    'Refusée',
  ];

  protected readonly etapes = [
    { icone: 'lucide-external-link', texte: "Tu es sur l'offre, tu cliques sur l'extension." },
    { icone: 'lucide-file-text', texte: "Le titre, l'entreprise et le lien sont repris." },
    { icone: 'lucide-check', texte: 'La candidature apparaît dans ton tableau de bord.' },
  ];
}
