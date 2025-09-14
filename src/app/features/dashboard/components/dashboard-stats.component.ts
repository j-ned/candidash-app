import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export interface DashboardStats {
  total: number;
  applied: number;
  pending: number;
  interview: number;
  accepted: number;
  rejected: number;
}

@Component({
  selector: 'app-dashboard-stats',
  template: `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-2">
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-text">{{ stats().total }}</div>
        <div class="text-sm text-muted mt-1">Total</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-info">{{ stats().applied }}</div>
        <div class="text-sm text-muted mt-1">Envoyées</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-warning">{{ stats().pending }}</div>
        <div class="text-sm text-muted mt-1">En attente</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-primary">{{ stats().interview }}</div>
        <div class="text-sm text-muted mt-1">Entretiens</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-success">{{ stats().accepted }}</div>
        <div class="text-sm text-muted mt-1">Acceptées</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <div class="text-3xl font-bold text-error">{{ stats().rejected }}</div>
        <div class="text-sm text-muted mt-1">Refusées</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatsComponent {
  stats = input.required<DashboardStats>();
}
