import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpAdminGateway } from '../../infra/http-admin.gateway';
import { toAdminUsers } from '../../infra/admin.adapter';
import type { AdminUserApi } from '../../infra/admin.types';
import type { AdminUser, AnalyticsPeriod, AnalyticsStats } from '../../domain/models/admin.model';
import { AdminUsersTable } from './admin-users-table';
import { AdminTraffic } from './admin-traffic';

type AdminTab = 'users' | 'analytics';

const PERIODS: readonly AnalyticsPeriod[] = [7, 30, 90];

@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminUsersTable, AdminTraffic],
  host: { class: 'block' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight text-text">Administration</h1>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div class="inline-flex rounded-xl border border-border p-1" role="group" aria-label="Vue">
        <button
          type="button"
          data-testid="admin-tab-users"
          [attr.aria-pressed]="tab() === 'users'"
          (click)="tab.set('users')"
          class="rounded-lg px-4 py-2 text-sm text-muted transition-colors aria-pressed:bg-primary aria-pressed:text-on-primary"
        >
          Inscrits
        </button>
        <button
          type="button"
          data-testid="admin-tab-analytics"
          [attr.aria-pressed]="tab() === 'analytics'"
          (click)="tab.set('analytics')"
          class="rounded-lg px-4 py-2 text-sm text-muted transition-colors aria-pressed:bg-primary aria-pressed:text-on-primary"
        >
          Fréquentation
        </button>
      </div>

      @if (tab() === 'analytics') {
        <label class="flex items-center gap-2 text-sm text-muted">
          Période
          <select
            data-testid="admin-period"
            (change)="selectPeriod($event)"
            class="rounded-lg border border-border bg-background px-3 py-2 text-text"
          >
            @for (period of periods; track period) {
              <option [value]="period" [selected]="period === days()">{{ period }} jours</option>
            }
          </select>
        </label>
      }
    </div>

    <section class="mt-6" aria-live="polite">
      @if (tab() === 'users') {
        @if (users.hasValue()) {
          <app-admin-users-table [users]="users.value()" />
        } @else if (users.error()) {
          <p role="alert" class="text-error">Impossible de charger les comptes.</p>
        } @else {
          <p class="text-muted">Chargement des comptes…</p>
        }
      } @else {
        @if (stats.hasValue()) {
          <app-admin-traffic [stats]="stats.value()" />
        } @else if (stats.error()) {
          <p role="alert" class="text-error">Impossible de charger la fréquentation.</p>
        } @else {
          <p class="text-muted">Chargement de la fréquentation…</p>
        }
      }
    </section>
  `,
})
export class AdminDashboard {
  private readonly gateway = inject(HttpAdminGateway);

  protected readonly periods = PERIODS;
  protected readonly tab = signal<AdminTab>('users');
  protected readonly days = signal<AnalyticsPeriod>(30);

  protected readonly users = httpResource<AdminUser[]>(() => this.gateway.usersUrl(), {
    parse: (raw) => toAdminUsers(raw as AdminUserApi[]),
  });

  // Chargée seulement quand l'onglet est ouvert, puis à chaque changement de période
  protected readonly stats = httpResource<AnalyticsStats>(() =>
    this.tab() === 'analytics' ? this.gateway.analyticsUrl(this.days()) : undefined,
  );

  protected selectPeriod(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    const period = PERIODS.find((candidate) => candidate === value);
    if (period) this.days.set(period);
  }
}
