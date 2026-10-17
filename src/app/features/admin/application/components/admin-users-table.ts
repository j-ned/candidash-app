import { Component, computed, input } from '@angular/core';
import type { AdminUser } from '../../domain/models/admin.model';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

@Component({
  selector: 'app-admin-users-table',
  host: { class: 'block' },
  template: `
    <p class="mb-4 text-sm text-muted" data-testid="admin-users-count">
      {{ users().length }} compte(s) inscrit(s)
    </p>
    <div class="overflow-x-auto rounded-xl border border-border">
      <table class="w-full min-w-[640px] text-left text-sm text-text">
        <caption class="sr-only">
          Comptes inscrits, du plus récent au plus ancien
        </caption>
        <thead class="bg-surface-100 text-muted">
          <tr>
            <th scope="col" class="px-4 py-3 font-medium">Compte</th>
            <th scope="col" class="px-4 py-3 font-medium">Inscription</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Candidatures</th>
            <th scope="col" class="px-4 py-3 font-medium">Dernière activité</th>
            <th scope="col" class="px-4 py-3 font-medium">2FA</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr data-testid="admin-user-row" class="border-t border-border">
              <td class="px-4 py-3">
                <span class="block font-medium text-text">{{ row.email }}</span>
                @if (row.username) {
                  <span class="block text-xs text-muted">{{ row.username }}</span>
                }
                @if (row.isAdmin) {
                  <span
                    class="mt-1 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-900"
                    >Admin</span
                  >
                }
              </td>
              <td class="px-4 py-3 text-muted">{{ row.createdAt }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ row.applicationsCount }}</td>
              <td class="px-4 py-3 text-muted">{{ row.lastActivity }}</td>
              <td class="px-4 py-3">{{ row.totp }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-6 text-center text-muted">Aucun compte.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminUsersTable {
  readonly users = input.required<AdminUser[]>();

  protected readonly rows = computed(() =>
    this.users().map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.role === 'ADMIN',
      createdAt: DATE_FORMAT.format(user.createdAt),
      applicationsCount: user.applicationsCount,
      lastActivity: user.lastActivityAt ? DATE_FORMAT.format(user.lastActivityAt) : '—',
      totp: user.totpEnabled ? 'Activée' : 'Non',
    })),
  );
}
