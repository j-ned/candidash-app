import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { Jobtrack } from '../../services/jobtrack';
import type { JobTrack, JobStatus } from '../../models/jobtrack';
import { ToastService } from '@shared/ui/toast/service/toast';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-jobtrack-list',
  imports: [ButtonComponent, NgOptimizedImage],
  templateUrl: './jobtrack-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackList {
  private readonly service = inject(Jobtrack);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly jobs = signal<JobTrack[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedStatus = signal<JobStatus | 'all'>('all');
  readonly jobToDelete = signal<string | null>(null);

  readonly statusFilters = [
    {
      value: 'all' as const,
      label: 'Toutes mes candidatures',
      icon: 'docs',
    },
    {
      value: 'APPLIED' as const,
      label: 'Candidatures envoyées',
      icon: 'applied',
    },
    {
      value: 'PENDING' as const,
      label: "En cours d'examen",
      icon: 'pending',
    },
    {
      value: 'INTERVIEW' as const,
      label: 'Entretiens',
      icon: 'entretien',
    },
    { value: 'ACCEPTED' as const, label: 'Acceptées', icon: 'star' },
    { value: 'REJECTED' as const, label: 'Refusées', icon: 'close' },
  ];

  constructor() {
    this.refresh();
  }

  getFilterButtonClass(status: JobStatus | 'all'): string {
    const isSelected = this.selectedStatus() === status;
    const baseClasses =
      'flex items-center justify-start px-3 py-2 text-left transition-all hover:scale-105 sm:px-4 sm:py-2.5';

    return isSelected ? `${baseClasses} shadow-lg` : `${baseClasses} hover:shadow-md`;
  }

  filteredJobs() {
    const status = this.selectedStatus();
    if (status === 'all') return this.jobs();
    return this.jobs().filter((job) => job.status === status);
  }

  filterByStatus(status: JobStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  getCountForStatus(status: JobStatus | 'all'): number {
    if (status === 'all') return this.jobs().length;
    return this.jobs().filter((job) => job.status === status).length;
  }

  getStatusLabel(status: JobStatus | 'all'): string {
    const mapping = {
      all: 'toutes',
      APPLIED: 'envoyée',
      PENDING: 'en cours',
      INTERVIEW: 'entretien',
      ACCEPTED: 'acceptée',
      REJECTED: 'refusée',
    };
    return mapping[status] || status;
  }

  getStatusEmoji(status: JobStatus): string {
    const mapping = {
      APPLIED: '📤',
      PENDING: '⏳',
      INTERVIEW: '🤝',
      ACCEPTED: '🎉',
      REJECTED: '❌',
    };
    return mapping[status] || '📋';
  }

  getStatusLabelLong(status: JobStatus): string {
    const mapping = {
      APPLIED: 'Candidature envoyée',
      PENDING: "En cours d'examen",
      INTERVIEW: 'Entretien',
      ACCEPTED: 'Acceptée',
      REJECTED: 'Refusée',
    };
    return mapping[status] || status;
  }

  getReminderLabel(frequency: number): string {
    const options = {
      3: 'Suivi rapide (3j)',
      7: 'Suivi standard (1sem)',
      14: 'Suivi patient (2sem)',
      30: 'Suivi long terme (1mois)',
    };
    return options[frequency as keyof typeof options] || `Tous les ${frequency} jours`;
  }

  getShortLabel(status: JobStatus | 'all'): string {
    const mapping = {
      all: 'Toutes',
      APPLIED: 'Envoyées',
      PENDING: 'Examen',
      INTERVIEW: 'Entretiens',
      ACCEPTED: 'Acceptées',
      REJECTED: 'Refusées',
    };
    return mapping[status] || status;
  }

  getStatusBadgeClass(status: JobStatus): string {
    const classes = {
      APPLIED: 'bg-blue-500/10 text-blue-600',
      PENDING: 'bg-yellow-500/10 text-yellow-600',
      INTERVIEW: 'bg-primary/10 text-primary',
      ACCEPTED: 'bg-green-500/10 text-green-600',
      REJECTED: 'bg-error/10 text-error',
    };
    return classes[status] || 'bg-surface text-muted';
  }

  // Build a compact list of present details to keep template simple
  getJobDetailItems(job: JobTrack): { icon: string; alt: string; label: string; value: string; bg: string }[] {
    const items: { icon: string; alt: string; label: string; value: string; bg: string }[] = [];

    if (job.company) {
      items.push({
        icon: 'company',
        alt: 'Entreprise',
        label: 'Entreprise',
        value: job.company,
        bg: 'bg-primary/10',
      });
    }

    if (job.contractType) {
      items.push({
        icon: 'docs',
        alt: 'Type de contrat',
        label: 'Contrat',
        value: job.contractType,
        bg: 'bg-accent/10',
      });
    }

    if (job.appliedAt) {
      items.push({
        icon: 'calendar',
        alt: 'Date de candidature',
        label: 'Candidature',
        value: this.formatDate(job.appliedAt),
        bg: 'bg-blue-500/10',
      });
    }

    if (job.reminder) {
      items.push({
        icon: 'timer',
        alt: 'Rappel',
        label: 'Suivi',
        value: this.getReminderLabel(job.reminder.frequency),
        bg: 'bg-orange-500/10',
      });
    }

    return items;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
    this.service.delete(job.id).subscribe({
      next: () => {
        this.toast.success('Candidature supprimée', 'La candidature a été supprimée avec succès');
        this.jobToDelete.set(null);
        this.refreshRequested();
      },
      error: () => {
        this.toast.danger('Erreur', 'Impossible de supprimer la candidature');
        this.jobToDelete.set(null);
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (items) => {
        this.jobs.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private refreshRequested(): void {
    this.refresh();
  }

  getEmptyStateEmoji(): string {
    const status = this.selectedStatus();
    const mapping = {
      all: '💼',
      APPLIED: '📤',
      PENDING: '⏳',
      INTERVIEW: '🤝',
      ACCEPTED: '🎉',
      REJECTED: '❌',
    };
    return mapping[status] || '📋';
  }

  getEmptyStateMessage(): string {
    const status = this.selectedStatus();
    const messages = {
      all: "Commencez par ajouter votre première candidature et organisez votre recherche d'emploi efficacement.",
      APPLIED: "Vous n'avez pas encore de candidatures envoyées. C'est le moment de postuler !",
      PENDING: "Aucune candidature en cours d'examen. Vos dossiers n'ont pas encore été étudiés.",
      INTERVIEW: "Pas d'entretiens programmés pour le moment. Continuez vos candidatures !",
      ACCEPTED: 'Aucune offre acceptée encore. Persévérez, le succès est proche !',
      REJECTED: "Aucune candidature refusée. C'est encourageant, continuez ainsi !",
    };
    return messages[status] || 'Aucune candidature correspondante trouvée.';
  }
}
