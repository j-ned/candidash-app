import { Component, computed, input } from '@angular/core';
import { ALL_STATUSES, type JobStatus } from '@features/jobtrack/domain/models/jobtrack.model';
import { COLUMN_TITLES } from '@features/jobtrack/domain/job-board';
import type { JobStats } from '@features/jobtrack/domain/job-stats';

const CHART_HEIGHT = 120;
const BAR_SLOT = 10;
const PERCENT = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });
const WEEK_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const STATUS_TONES: Record<JobStatus, string> = {
  TO_APPLY: 'text-muted',
  APPLIED: 'text-info',
  INTERVIEW: 'text-accent',
  ACCEPTED: 'text-success',
  REJECTED: 'text-error',
};

/**
 * Statistiques personnelles (composant de présentation) : compteurs, taux d'entretien,
 * activité hebdomadaire en SVG fait main doublé d'un tableau, entonnoir de conversion.
 */
@Component({
  selector: 'app-dashboard-stats',
  host: { class: 'block space-y-6 text-text' },
  template: `
    @let s = stats();
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="rounded-xl border border-border bg-card p-4">
        <dt class="text-sm text-muted">Total</dt>
        <dd class="mt-1 text-2xl font-bold tabular-nums" data-testid="stat-total">{{ s.total }}</dd>
      </div>
      @for (tile of statusTiles(); track tile.status) {
        <div class="rounded-xl border border-border bg-card p-4">
          <dt class="text-sm text-muted">{{ tile.label }}</dt>
          <dd
            class="mt-1 text-2xl font-bold tabular-nums"
            [class]="tile.tone"
            [attr.data-testid]="'stat-status-' + tile.status"
          >
            {{ tile.count }}
          </dd>
        </div>
      }
    </dl>

    <dl class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-border bg-card p-4">
        <dt class="text-sm text-muted">Taux d'entretien</dt>
        <dd
          class="mt-1 text-2xl font-bold tabular-nums text-primary"
          data-testid="stat-interview-rate"
        >
          {{ interviewRate() }}
        </dd>
        <dd class="mt-1 text-xs text-muted" data-testid="stat-interview-rate-help">
          Entretiens prévus + acceptées, divisés par les candidatures envoyées (envoyées,
          entretiens, acceptées et refusées). Sans historique des statuts, une candidature refusée
          après entretien compte comme sans entretien.
        </dd>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <dt class="text-sm text-muted">Envoyées cette semaine</dt>
        <dd class="mt-1 text-2xl font-bold tabular-nums" data-testid="stat-sent-week">
          {{ s.sentThisWeek }}
        </dd>
        <dd class="mt-1 text-xs text-muted">Depuis lundi, selon la date de candidature</dd>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <dt class="text-sm text-muted">Envoyées ce mois-ci</dt>
        <dd class="mt-1 text-2xl font-bold tabular-nums" data-testid="stat-sent-month">
          {{ s.sentThisMonth }}
        </dd>
        <dd class="mt-1 text-xs text-muted">
          Sans date de candidature, la date d'ajout est retenue
        </dd>
      </div>
    </dl>

    <div class="grid gap-6 lg:grid-cols-2">
      <figure class="min-w-0 rounded-xl border border-border bg-card p-4">
        <figcaption class="mb-3 text-sm font-medium">
          Candidatures envoyées par semaine, 8 dernières semaines
        </figcaption>
        <svg
          [attr.viewBox]="'0 0 ' + chart().width + ' ' + chartHeight"
          class="h-32 w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          @for (bar of chart().bars; track bar.weekStart) {
            <rect
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.width"
              [attr.height]="bar.height"
              rx="1"
              [class]="bar.tone"
            >
              <title>Semaine du {{ bar.label }} : {{ bar.count }}</title>
            </rect>
          }
        </svg>
        <div class="mt-1 grid grid-cols-8 text-center text-[0.65rem] text-muted" aria-hidden="true">
          @for (bar of chart().bars; track bar.weekStart) {
            <span>{{ bar.label }}</span>
          }
        </div>
        <details class="mt-3 text-sm">
          <summary class="cursor-pointer text-muted hover:text-text">Détail par semaine</summary>
          <table class="mt-2 w-full text-left">
            <thead class="text-muted">
              <tr>
                <th scope="col" class="py-1 font-medium">Semaine du</th>
                <th scope="col" class="py-1 text-right font-medium">Envoyées</th>
              </tr>
            </thead>
            <tbody>
              @for (bar of chart().bars; track bar.weekStart) {
                <tr data-testid="stat-week-row" class="border-t border-border">
                  <td class="py-1">{{ bar.label }}</td>
                  <td class="py-1 text-right tabular-nums">{{ bar.count }}</td>
                </tr>
              }
            </tbody>
          </table>
        </details>
      </figure>

      <section
        aria-labelledby="stat-funnel-title"
        class="min-w-0 rounded-xl border border-border bg-card p-4"
      >
        <h3 id="stat-funnel-title" class="mb-3 text-sm font-medium">Entonnoir de conversion</h3>
        <ol class="space-y-2">
          @for (step of s.funnel; track step.key) {
            <li
              data-testid="stat-funnel-step"
              class="relative overflow-hidden rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span
                class="absolute inset-y-0 left-0 bg-primary/15"
                [style.width.%]="step.share"
                aria-hidden="true"
              ></span>
              <span class="relative flex justify-between gap-3">
                <span data-testid="stat-funnel-label">{{ step.label }}</span>
                <span class="tabular-nums text-muted" data-testid="stat-funnel-count">{{
                  step.count
                }}</span>
              </span>
            </li>
          }
        </ol>
        <p class="mt-3 text-xs text-muted">
          Chaque étape compte les candidatures arrivées au moins à ce stade, d'après leur statut
          actuel.
        </p>
      </section>
    </div>
  `,
})
export class DashboardStats {
  readonly stats = input.required<JobStats>();

  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly statusTiles = computed(() =>
    ALL_STATUSES.map((status) => ({
      status,
      label: COLUMN_TITLES[status],
      tone: STATUS_TONES[status],
      count: this.stats().byStatus[status],
    })),
  );

  protected readonly interviewRate = computed(() => {
    const rate = this.stats().interviewRate;
    return rate === null ? '—' : PERCENT.format(rate);
  });

  protected readonly chart = computed(() => {
    const weekly = this.stats().weekly;
    const max = Math.max(1, ...weekly.map((week) => week.count));
    return {
      width: weekly.length * BAR_SLOT,
      bars: weekly.map((week, index) => {
        // Une barre fine reste visible pour une semaine à zéro
        const height = Math.max(1, (week.count / max) * (CHART_HEIGHT - 4));
        return {
          weekStart: week.weekStart,
          label: WEEK_FORMAT.format(new Date(`${week.weekStart}T12:00:00`)),
          count: week.count,
          tone: week.count > 0 ? 'fill-primary' : 'fill-border',
          x: index * BAR_SLOT + 1.5,
          width: BAR_SLOT - 3,
          y: CHART_HEIGHT - height,
          height,
        };
      }),
    };
  });
}
