import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
  viewChildren,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Icon } from '@shared/ui/icon/icon';
import { ThemeManager, type Theme } from '@shared/ui/theme-toggle/service/theme';

const VARIANTS: readonly Theme[] = ['light', 'dark'];

/**
 * Capture de l'application, claire ou sombre selon le thème du site, et sa vidéo de démonstration.
 *
 * - Les deux posters sont dans la page, l'un masqué en CSS (`dark:`), le thème étant posé avant le
 *   premier rendu : le visiteur voit tout de suite le bon. Le poster sombre est en lazy, un poster
 *   masqué n'est donc jamais téléchargé ; seul le clair peut être l'image LCP (`priority`).
 * - La vidéo n'a pas de source tant qu'elle n'est pas à l'écran : seule celle du thème actif est
 *   téléchargée, puis lue en boucle, muette, et mise en pause hors de l'écran.
 * - Le visiteur peut la mettre en pause (WCAG 2.2.2) ; avec « réduire les animations », elle ne
 *   démarre que sur demande.
 */
@Component({
  selector: 'app-demo-media',
  imports: [NgOptimizedImage, Icon],
  host: { class: 'block' },
  template: `
    <figure
      class="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)]"
    >
      @if (frame()) {
        <div
          data-testid="demo-frame"
          class="flex items-center gap-1.5 border-b border-border bg-surface-100 px-4 py-2.5"
          aria-hidden="true"
        >
          <span class="h-2.5 w-2.5 rounded-full bg-border"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-border"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-border"></span>
        </div>
      }
      <div class="relative">
        @for (variant of variants(); track variant.theme) {
          <div class="relative" [class]="variant.visibility">
            <img
              [ngSrc]="variant.poster"
              [width]="width()"
              [height]="height()"
              [priority]="variant.priority"
              [alt]="alt()"
              class="block h-auto w-full"
            />
            @if (video()) {
              <video
                #clip
                [attr.data-variant]="variant.theme"
                muted
                loop
                playsinline
                preload="none"
                aria-hidden="true"
                tabindex="-1"
                class="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 data-[playing=true]:opacity-100"
                (playing)="markPlaying($event)"
              ></video>
            }
          </div>
        }
        @if (video()) {
          <button
            type="button"
            data-testid="demo-toggle"
            [attr.aria-label]="paused() ? 'Lire la démo' : 'Mettre la démo en pause'"
            class="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            (click)="toggle()"
          >
            <app-icon [name]="paused() ? 'lucide-play' : 'lucide-pause'" cssClass="h-4 w-4" />
          </button>
        }
      </div>
    </figure>
  `,
})
export class DemoMedia {
  private readonly theme = inject(ThemeManager).theme;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Nom des fichiers dans public/demo : `<name>-<thème>.webp` et `.webm`. */
  readonly name = input.required<string>();
  readonly alt = input.required<string>();
  /** Dimensions intrinsèques des posters. */
  readonly width = input.required({ transform: numberAttribute });
  readonly height = input.required({ transform: numberAttribute });
  readonly video = input(true, { transform: booleanAttribute });
  /** Barre de fenêtre au-dessus de la capture ; inutile quand la scène dessine déjà un navigateur. */
  readonly frame = input(true, { transform: booleanAttribute });
  /** Capture du héros : image LCP de la page. */
  readonly priority = input(false, { transform: booleanAttribute });

  private readonly clips = viewChildren<ElementRef<HTMLVideoElement>>('clip');

  // Le poster clair seul peut être l'image LCP ; le sombre, masqué en thème clair, reste en lazy.
  protected readonly variants = computed(() =>
    VARIANTS.map((theme) => ({
      theme,
      poster: `/demo/${this.name()}-${theme}.webp`,
      visibility: theme === 'dark' ? 'hidden dark:block' : 'dark:hidden',
      priority: this.priority() && theme === 'light',
    })),
  );
  protected readonly paused = signal(false);
  private readonly inView = signal(false);

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.paused.set(true);
      const observer = new IntersectionObserver(
        ([entry]) => this.inView.set(entry.isIntersecting),
        // Le héros n'est qu'en partie visible sous le titre au chargement
        { threshold: 0.15 },
      );
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    afterRenderEffect({
      write: () => {
        const active = this.theme();
        const shouldPlay = this.inView() && !this.paused();
        for (const { nativeElement: clip } of this.clips()) {
          if (shouldPlay && clip.dataset['variant'] === active) {
            if (!clip.getAttribute('src')) clip.src = `/demo/${this.name()}-${active}.webm`;
            clip.play().catch(() => this.paused.set(true));
          } else if (clip.getAttribute('src')) {
            clip.pause();
          }
        }
      },
    });
  }

  protected toggle(): void {
    this.paused.update((paused) => !paused);
  }

  protected markPlaying(event: Event): void {
    (event.target as HTMLVideoElement).dataset['playing'] = 'true';
  }
}
