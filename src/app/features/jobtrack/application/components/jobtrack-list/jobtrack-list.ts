import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { ListJobtracksUseCase } from '@features/jobtrack/domain/use-cases/list-jobtracks.use-case';
import { DeleteJobtrackUseCase } from '@features/jobtrack/domain/use-cases/delete-jobtrack.use-case';
import { STATUS_CONFIG } from '@features/jobtrack/domain/models/jobtrack.model';
import type { JobTrack, JobStatus } from '@features/jobtrack/domain/models/jobtrack.model';
import { ToastService } from '@shared/ui/toast/service/toast';
import { IconComponent } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-jobtrack-list',
  imports: [ButtonComponent, IconComponent, RouterLink],
  templateUrl: './jobtrack-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackList {
  private readonly listJobtracksUseCase = inject(ListJobtracksUseCase);
  private readonly deleteJobtrackUseCase = inject(DeleteJobtrackUseCase);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly jobs = signal<JobTrack[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedStatus = signal<JobStatus | 'all'>('all');
  readonly jobToDelete = signal<string | null>(null);

  readonly statusFilters = [
    { value: 'all' as const, label: 'Toutes mes candidatures', icon: 'lucide-file-text' },
    { value: 'APPLIED' as const, label: 'Candidatures envoyées', icon: 'lucide-file-check' },
    { value: 'PENDING' as const, label: "En cours d'examen", icon: 'lucide-clock' },
    { value: 'INTERVIEW' as const, label: 'Entretiens', icon: 'lucide-users' },
    { value: 'ACCEPTED' as const, label: 'Acceptées', icon: 'lucide-star' },
    { value: 'REJECTED' as const, label: 'Refusées', icon: 'lucide-x' },
  ];

  // Static lookup maps — avoid re-creating objects on every CD cycle
  private static readonly STATUS_LABELS: Record<string, string> = {
    all: 'toutes', APPLIED: 'envoyée', PENDING: 'en cours',
    INTERVIEW: 'entretien', ACCEPTED: 'acceptée', REJECTED: 'refusée',
  };
  private static readonly SHORT_LABELS: Record<string, string> = {
    all: 'Toutes', APPLIED: 'Envoyées', PENDING: 'Examen',
    INTERVIEW: 'Entretiens', ACCEPTED: 'Acceptées', REJECTED: 'Refusées',
  };
  private static readonly EMPTY_STATE_MESSAGES: Record<string, string> = {
    all: "Commencez par ajouter votre première candidature et organisez votre recherche d'emploi efficacement.",
    APPLIED: "Vous n'avez pas encore de candidatures envoyées. C'est le moment de postuler !",
    PENDING: "Aucune candidature en cours d'examen. Vos dossiers n'ont pas encore été étudiés.",
    INTERVIEW: "Pas d'entretiens programmés pour le moment. Continuez vos candidatures !",
    ACCEPTED: 'Aucune offre acceptée encore. Persévérez, le succès est proche !',
    REJECTED: "Aucune candidature refusée. C'est encourageant, continuez ainsi !",
  };

  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  private readonly dateFormatterShort = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short',
  });

  constructor() {
    this.refresh();
  }

  readonly filteredJobs = computed(() => {
    const status = this.selectedStatus();
    if (status === 'all') return this.jobs();
    return this.jobs().filter((job) => job.status === status);
  });

  // Computed counts — recalculated only when jobs() changes
  readonly statusCounts = computed(() => {
    const counts: Record<string, number> = { all: 0 };
    const allJobs = this.jobs();
    counts['all'] = allJobs.length;
    for (const job of allJobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  });

  filterByStatus(status: JobStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  getCountForStatus(status: JobStatus | 'all'): number {
    return this.statusCounts()[status] ?? 0;
  }

  getStatusLabel(status: JobStatus | 'all'): string {
    return JobtrackList.STATUS_LABELS[status] ?? status;
  }

  getStatusEmoji(status: JobStatus): string {
    return STATUS_CONFIG[status]?.emoji ?? '📋';
  }

  getStatusLabelLong(status: JobStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  getReminderLabel(frequency: number): string {
    const options: Record<number, string> = {
      3: 'Suivi rapide (3j)', 7: 'Suivi standard (1sem)',
      14: 'Suivi patient (2sem)', 30: 'Suivi long terme (1mois)',
    };
    return options[frequency] ?? `Tous les ${frequency} jours`;
  }

  getReminderStatusLabel(job: JobTrack): string {
    if (!job.reminder) return '';
    if (!job.reminder.isActive) return 'Désactivé';
    const next = new Date(job.reminder.nextReminderAt);
    const now = new Date();
    if (next < now) return 'En retard';
    const days = Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return `Dans ${days}j`;
  }

  isReminderOverdue(job: JobTrack): boolean {
    if (!job.reminder?.isActive) return false;
    return new Date(job.reminder.nextReminderAt) < new Date();
  }

  isReminderInactive(job: JobTrack): boolean {
    return job.reminder !== null && job.reminder !== undefined && !job.reminder.isActive;
  }

  getShortLabel(status: JobStatus | 'all'): string {
    return JobtrackList.SHORT_LABELS[status] ?? status;
  }

  getStatusBadgeClass(status: JobStatus): string {
    return STATUS_CONFIG[status]?.badgeClass ?? 'bg-surface text-muted';
  }

  formatDate(dateString: string): string {
    return this.dateFormatter.format(new Date(dateString));
  }

  formatDateShort(dateString: string): string {
    return this.dateFormatterShort.format(new Date(dateString));
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
    this.deleteJobtrackUseCase.execute(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Candidature supprimée', 'La candidature a été supprimée avec succès');
        this.jobToDelete.set(null);
        this.refresh();
      },
      error: () => {
        this.toast.danger('Erreur', 'Impossible de supprimer la candidature');
        this.jobToDelete.set(null);
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.listJobtracksUseCase.execute().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.jobs.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getEmptyStateEmoji(): string {
    const status = this.selectedStatus();
    if (status === 'all') return '💼';
    return STATUS_CONFIG[status]?.emoji ?? '📋';
  }

  getEmptyStateMessage(): string {
    return JobtrackList.EMPTY_STATE_MESSAGES[this.selectedStatus()]
      ?? 'Aucune candidature correspondante trouvée.';
  }
}
