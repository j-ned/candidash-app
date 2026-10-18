import { Component } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import { DemoMedia } from './demo-media';
import { StoreBadges } from './store-badges';

const STEPS = [
  "Tu es sur l'offre, tu ouvres l'extension.",
  "Le titre, l'entreprise, le contrat et le texte de l'offre sont déjà lus.",
  'Un clic, et la candidature est dans ton tableau.',
];

/**
 * Vitrine de l'extension : la vraie vidéo du popup sur une annonce (enregistrée par
 * scripts/capture), les étapes, et les badges officiels des stores.
 */
@Component({
  selector: 'app-extension-showcase',
  imports: [Icon, DemoMedia, StoreBadges],
  host: { class: 'block' },
  template: `
    <div class="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-24">
      <div class="max-w-3xl">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted"
        >
          <app-icon name="lucide-plus" cssClass="h-3.5 w-3.5 text-accent" />
          Extension navigateur
        </span>
        <h2
          id="extension-titre"
          class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          L'offre est sous tes yeux. Garde-la en un clic.
        </h2>
        <p class="mt-4 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">
          Sur LinkedIn, Indeed, Welcome to the Jungle, France Travail ou HelloWork, l'extension lit
          l'annonce pour toi. Plus de copier-coller entre deux onglets.
        </p>
      </div>

      <ol class="mt-8 grid gap-6 md:grid-cols-3">
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

      <app-demo-media
        name="extension"
        alt="Le popup de l'extension Candidash ouvert sur une offre d'emploi : titre, entreprise et contrat déjà remplis, puis l'annonce ajoutée."
        width="1600"
        height="1000"
        [frame]="false"
        class="mx-auto mt-12 block max-w-[1080px]"
      />

      <div class="mt-10 flex flex-col items-center gap-3 text-center">
        <p class="text-sm text-muted">Pour Google Chrome™ et Firefox :</p>
        <app-store-badges class="justify-center" />
      </div>
    </div>
  `,
})
export class ExtensionShowcase {
  protected readonly steps = STEPS;
}
