import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';
import { STATUS_CONFIG } from '@features/jobtrack/domain/models/jobtrack.model';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import type {
  JobTrack,
  JobStatus,
} from '@features/jobtrack/domain/models/jobtrack.model';
import { Toaster } from '@shared/ui/toast/service/toast';
import { Icon } from '@shared/ui/icon/icon';

type StatusOrAll = JobStatus | 'all';

const STATUS_LABELS: Record<string, string> = {
  all: 'toutes',
  APPLIED: 'envoyée',
  INTERVIEW: 'entretien prévu',
  ACCEPTED: 'acceptée',
  REJECTED: 'refusée',
};
const SHORT_LABELS: Record<string, string> = {
  all: 'Toutes',
  APPLIED: 'Envoyées',
  INTERVIEW: 'Entretiens prévus',
  ACCEPTED: 'Acceptées',
  REJECTED: 'Refusées',
};
const EMPTY_STATE_MESSAGES: Record<string, string> = {
  all: "Commencez par ajouter votre première candidature et organisez votre recherche d'emploi efficacement.",
  APPLIED: "Vous n'avez pas encore de candidatures envoyées. C'est le moment de postuler !",
  INTERVIEW: "Pas d'entretiens prévus pour le moment. Continuez vos candidatures !",
  ACCEPTED: 'Aucune offre acceptée encore. Persévérez, le succès est proche !',
  REJECTED: "Aucune candidature refusée. C'est encourageant, continuez ainsi !",
};
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const DATE_FMT_SHORT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
});
const STATUS_FILTERS = [
  { value: 'all', activeClass: 'bg-primary text-background', inactiveClass: 'bg-card border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/15' },
  { value: 'APPLIED', activeClass: 'bg-blue-500 text-background', inactiveClass: 'bg-card border border-border text-muted hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-500/15' },
  { value: 'INTERVIEW', activeClass: 'bg-primary text-background', inactiveClass: 'bg-card border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/15' },
  { value: 'ACCEPTED', activeClass: 'bg-green-500 text-background', inactiveClass: 'bg-card border border-border text-muted hover:text-green-500 hover:border-green-500/40 hover:bg-green-500/15' },
  { value: 'REJECTED', activeClass: 'bg-error text-background', inactiveClass: 'bg-card border border-border text-muted hover:text-error hover:border-error/40 hover:bg-error/15' },
] as const satisfies readonly { value: StatusOrAll; activeClass: string; inactiveClass: string }[];

export type JobView = JobTrack & {
  statusBadgeClass: string;
  statusEmoji: string;
  statusLabelLong: string;
  statusLabelShort: string;
  appliedAtFormatted: string | null;
  reminderInactive: boolean;
  reminderOverdue: boolean;
  reminderStatusLabel: string;
  reminderNextFormatted: string | null;
  reminderIconName: string;
};

@Component({
  selector: 'app-jobtrack-list',
  imports: [Button, Icon, RouterLink],
  templateUrl: './jobtrack-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackList {
  private readonly router = inject(Router);
  private readonly jobtrackGateway = inject(JobtrackGateway);
  private readonly toast = inject(Toaster);
  private readonly destroyRef = inject(DestroyRef);

  // Composant présentationnel : les annonces et l'état de chargement sont
  // fournis par le parent (qui possède le httpResource). La suppression émet
  // `changed` pour que le parent recharge sa source full-signal.
  readonly jobs = input.required<JobTrack[]>();
  readonly loading = input(false);
  readonly changed = output<void>();

  protected readonly selectedStatus = signal<StatusOrAll>('all');
  protected readonly jobToDelete = signal<string | null>(null);

  private readonly statusCounts = computed(() => {
    const counts: Record<string, number> = { all: this.jobs().length };
    for (const job of this.jobs()) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  });

  protected readonly statusFilters = computed(() =>
    STATUS_FILTERS.map((filter) => ({
      ...filter,
      shortLabel: SHORT_LABELS[filter.value] ?? filter.value,
      count: this.statusCounts()[filter.value] ?? 0,
    })),
  );

  protected readonly filteredJobs = computed<JobView[]>(() => {
    const status = this.selectedStatus();
    const jobs =
      status === 'all'
        ? this.jobs()
        : this.jobs().filter((job) => job.status === status);
    return jobs.map((job) => this.toView(job));
  });

  protected readonly emptyStateEmoji = computed(() => {
    const status = this.selectedStatus();
    return status === 'all' ? '💼' : (STATUS_CONFIG[status]?.emoji ?? '📋');
  });

  protected readonly emptyStateMessage = computed(
    () =>
      EMPTY_STATE_MESSAGES[this.selectedStatus()] ??
      'Aucune candidature correspondante trouvée.',
  );

  private toView(job: JobTrack): JobView {
    const reminder = job.reminder ?? null;
    const now = new Date();
    const inactive = reminder !== null && !reminder.isActive;
    const overdue =
      reminder !== null &&
      reminder.isActive &&
      new Date(reminder.nextReminderAt) < now;

    return {
      ...job,
      statusBadgeClass:
        STATUS_CONFIG[job.status]?.badgeClass ?? 'bg-surface text-muted',
      statusEmoji: STATUS_CONFIG[job.status]?.emoji ?? '📋',
      statusLabelLong: STATUS_CONFIG[job.status]?.label ?? job.status,
      statusLabelShort: STATUS_LABELS[job.status] ?? job.status,
      appliedAtFormatted: job.appliedAt
        ? DATE_FMT.format(new Date(job.appliedAt))
        : null,
      reminderInactive: inactive,
      reminderOverdue: overdue,
      reminderStatusLabel: this.reminderStatusLabel(job),
      reminderNextFormatted: reminder
        ? DATE_FMT_SHORT.format(new Date(reminder.nextReminderAt))
        : null,
      reminderIconName: inactive
        ? 'lucide-circle-x'
        : overdue
          ? 'lucide-triangle-alert'
          : 'lucide-timer',
    };
  }

  private reminderStatusLabel(job: JobTrack): string {
    if (!job.reminder || !job.reminder.isActive) return '';
    const next = new Date(job.reminder.nextReminderAt);
    const now = new Date();
    if (next < now) return 'En retard';
    const days = Math.ceil(
      (next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return `Dans ${days}j`;
  }

  filterByStatus(status: StatusOrAll): void {
    this.selectedStatus.set(status);
  }

  goToCreate(): void {
    this.router.navigate(['/dashboard/jobtrack/new']);
  }

  edit(job: JobTrack): void {
    this.router.navigate(['/dashboard/jobtrack', job.id, 'edit']);
  }

  showDeleteConfirmation(job: JobTrack): void {
    this.jobToDelete.set(job.id);
  }

  cancelDelete(): void {
    this.jobToDelete.set(null);
  }

  confirmDelete(job: JobTrack): void {
    this.jobtrackGateway
      .delete(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(
            'Candidature supprimée',
            'La candidature a été supprimée avec succès',
          );
          this.jobToDelete.set(null);
          this.changed.emit();
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de supprimer la candidature');
          this.jobToDelete.set(null);
        },
      });
  }
}
