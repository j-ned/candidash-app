import { Component, computed, input } from '@angular/core';
import type { AnalyticsStats, RankedEntry } from '../../domain/models/admin.model';

const CHART_HEIGHT = 160;
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const DIRECT_LABEL = 'Accès direct ou origine masquée';
const TAG_EXAMPLES = [
  'https://candidash.nedellec-julien.fr/?utm_source=linkedin',
  'https://candidash.nedellec-julien.fr/?utm_source=whatsapp',
  'https://candidash.nedellec-julien.fr/?utm_source=cv',
];

/** Histogramme en SVG fait main : une barre par jour, doublé d'un tableau pour les lecteurs d'écran. */
@Component({
  selector: 'app-admin-traffic',
  host: { class: 'block space-y-8 text-text' },
  template: `
    @let s = stats();
    <dl class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-border bg-surface-100 p-4">
        <dt class="text-sm text-muted">Visiteurs</dt>
        <dd class="mt-1 text-3xl font-semibold tabular-nums" data-testid="admin-visitors">
          {{ s.visitors }}
        </dd>
        <dd class="mt-1 text-xs text-muted">Uniques par jour, cumulés</dd>
      </div>
      <div class="rounded-xl border border-border bg-surface-100 p-4">
        <dt class="text-sm text-muted">Pages vues</dt>
        <dd class="mt-1 text-3xl font-semibold tabular-nums" data-testid="admin-pageviews">
          {{ s.pageviews }}
        </dd>
      </div>
      <div class="rounded-xl border border-border bg-surface-100 p-4">
        <dt class="text-sm text-muted">Pages par visite</dt>
        <dd class="mt-1 text-3xl font-semibold tabular-nums">{{ pagesPerVisit() }}</dd>
      </div>
    </dl>

    <figure>
      <figcaption class="mb-3 text-sm font-medium text-text">
        Visiteurs par jour, {{ s.days }} derniers jours
      </figcaption>
      <svg
        [attr.viewBox]="'0 0 ' + chart().width + ' ' + chartHeight"
        class="h-40 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        @for (bar of chart().bars; track bar.date) {
          <rect
            [attr.x]="bar.x"
            [attr.y]="bar.y"
            [attr.width]="bar.width"
            [attr.height]="bar.height"
            rx="1.5"
            class="fill-primary"
          >
            <title>{{ bar.label }} : {{ bar.visitors }} visiteur(s)</title>
          </rect>
        }
      </svg>
      <details class="mt-3 text-sm">
        <summary class="cursor-pointer text-muted hover:text-text">Détail par jour</summary>
        <table class="mt-2 w-full text-left">
          <thead class="text-muted">
            <tr>
              <th scope="col" class="py-1 font-medium">Jour</th>
              <th scope="col" class="py-1 text-right font-medium">Visiteurs</th>
              <th scope="col" class="py-1 text-right font-medium">Pages vues</th>
            </tr>
          </thead>
          <tbody>
            @for (bar of chart().bars; track bar.date) {
              <tr data-testid="admin-day-row" class="border-t border-border">
                <td class="py-1">{{ bar.label }}</td>
                <td class="py-1 text-right tabular-nums">{{ bar.visitors }}</td>
                <td class="py-1 text-right tabular-nums">{{ bar.pageviews }}</td>
              </tr>
            }
          </tbody>
        </table>
      </details>
    </figure>

    <div class="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="admin-top-pages-title">
        <h3 id="admin-top-pages-title" class="mb-3 text-sm font-medium text-text">
          Pages les plus vues
        </h3>
        <ol class="space-y-2" data-testid="admin-top-pages">
          @for (entry of topPages(); track entry.label) {
            <li class="relative overflow-hidden rounded-lg border border-border px-3 py-2 text-sm">
              <span
                class="absolute inset-y-0 left-0 bg-primary/10"
                [style.width.%]="entry.share"
                aria-hidden="true"
              ></span>
              <span class="relative flex justify-between gap-3">
                <span class="truncate">{{ entry.label }}</span>
                <span class="tabular-nums text-muted">{{ entry.count }}</span>
              </span>
            </li>
          } @empty {
            <li class="text-sm text-muted">Aucune page vue sur la période.</li>
          }
        </ol>
      </section>

      <section aria-labelledby="admin-sources-title">
        <h3 id="admin-sources-title" class="mb-3 text-sm font-medium text-text">
          D'où viennent les visiteurs
        </h3>
        <ol class="space-y-2" data-testid="admin-sources">
          @for (entry of sources(); track entry.name) {
            <li class="relative overflow-hidden rounded-lg border border-border px-3 py-2 text-sm">
              <span
                class="absolute inset-y-0 left-0"
                [class]="entry.direct ? 'bg-border/40' : 'bg-accent/10'"
                [style.width.%]="entry.share"
                aria-hidden="true"
              ></span>
              <span class="relative flex justify-between gap-3">
                <span class="truncate" [class.text-muted]="entry.direct">{{ entry.name }}</span>
                <span class="tabular-nums text-muted">{{ entry.count }}</span>
              </span>
            </li>
          } @empty {
            <li class="text-sm text-muted">Aucun visiteur sur la période.</li>
          }
        </ol>
        <details class="mt-3 text-sm text-muted">
          <summary class="cursor-pointer hover:text-text">Pourquoi « accès direct » ?</summary>
          <div class="mt-2 space-y-2 leading-relaxed">
            <p>
              Les applis (LinkedIn, Gmail, WhatsApp…), les favoris et les adresses tapées à la main
              ne transmettent pas leur origine. Pour la connaître, ajoute un tag aux liens que tu
              partages :
            </p>
            <ul class="space-y-1">
              @for (example of tagExamples; track example) {
                <li>
                  <code class="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-text">{{
                    example
                  }}</code>
                </li>
              }
            </ul>
          </div>
        </details>
      </section>
    </div>
  `,
})
export class AdminTraffic {
  readonly stats = input.required<AnalyticsStats>();

  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly pagesPerVisit = computed(() => {
    const { visitors, pageviews } = this.stats();
    return visitors ? (pageviews / visitors).toFixed(1).replace('.', ',') : '0';
  });

  protected readonly chart = computed(() => {
    const daily = this.stats().daily;
    const slot = 10;
    const max = Math.max(1, ...daily.map((day) => day.visitors));
    return {
      width: daily.length * slot,
      bars: daily.map((day, index) => {
        // Une barre fine reste visible pour un jour à zéro
        const height = Math.max(1, (day.visitors / max) * (CHART_HEIGHT - 4));
        return {
          date: day.date,
          label: DAY_FORMAT.format(new Date(`${day.date}T12:00:00`)),
          visitors: day.visitors,
          pageviews: day.pageviews,
          x: index * slot + 1.5,
          width: slot - 3,
          y: CHART_HEIGHT - height,
          height,
        };
      }),
    };
  });

  protected readonly topPages = computed(() => withShare(this.stats().topPages));
  protected readonly sources = computed(() => {
    const max = Math.max(1, ...this.stats().topSources.map((entry) => entry.count));
    return this.stats().topSources.map((entry) => ({
      name: entry.label ?? DIRECT_LABEL,
      direct: entry.label === null,
      count: entry.count,
      share: Math.round((entry.count / max) * 100),
    }));
  });

  protected readonly tagExamples = TAG_EXAMPLES;
}

function withShare(entries: RankedEntry[]): (RankedEntry & { share: number })[] {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return entries.map((entry) => ({ ...entry, share: Math.round((entry.count / max) * 100) }));
}
