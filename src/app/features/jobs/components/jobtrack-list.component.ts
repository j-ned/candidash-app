import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { JobTrackService } from '../services/jobtrack.service';
import type { JobTrack, JobStatus } from '../models/jobtrack.types';
import { ToastService } from '@shared/ui/toast/service/toast';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-jobtrack-list',
  imports: [ButtonComponent, NgOptimizedImage],
  template: `
    <div class="mb-8 sm:mb-12">
      <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
        <div class="space-y-2">
          <h2 class="text-xl font-bold text-text sm:text-2xl lg:text-3xl">Mes candidatures</h2>
          <p class="text-sm text-muted sm:text-base">
            Gérez et suivez l'évolution de vos candidatures
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {{ jobs().length }} candidature{{ jobs().length > 1 ? 's' : '' }}
          </div>
        </div>
      </div>

      <div class="relative">
        <div
          class="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-2xl -z-10"
        ></div>
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            @for (status of statusFilters; track status.value) {
              <app-button
                [color]="selectedStatus() === status.value ? 'primary' : 'secondary'"
                [customClass]="getFilterButtonClass(status.value)"
                (buttonClick)="filterByStatus(status.value)"
              >
                <div class="flex flex-col items-center gap-2 p-2 sm:p-3">
                  <div class="relative">
                    <img
                      [ngSrc]="'/icons/' + status.icon + '.svg'"
                      [alt]="status.label"
                      class="w-6 h-6 sm:w-7 sm:h-7"
                      [class.brightness-0]="selectedStatus() === status.value"
                      [class.invert]="selectedStatus() === status.value"
                      height="24"
                      width="24"
                    />
                    @if (getCountForStatus(status.value) > 0) {
                      <div
                        class="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold rounded-full"
                        [class]="
                          selectedStatus() === status.value
                            ? 'bg-background text-primary'
                            : 'bg-primary text-background'
                        "
                      >
                        {{ getCountForStatus(status.value) }}
                      </div>
                    }
                  </div>
                  <div class="text-center">
                    <div class="text-xs font-medium whitespace-nowrap sm:text-sm">
                      {{ getShortLabel(status.value) }}
                    </div>
                  </div>
                </div>
              </app-button>
            }
          </div>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="flex items-center justify-center py-8 sm:py-12">
        <div class="text-muted text-sm sm:text-base">Chargement des candidatures...</div>
      </div>
    } @else {
      @if (filteredJobs().length === 0) {
        <div
          class="text-center py-8 bg-card border border-border rounded-lg sm:py-12 sm:rounded-xl"
        >
          <div class="text-4xl mb-3 sm:text-5xl sm:mb-4">
            {{ getEmptyStateEmoji() }}
          </div>
          <p class="text-xs text-muted mb-4 max-w-md mx-auto sm:text-sm sm:mb-6">
            {{ getEmptyStateMessage() }}
          </p>
          @if (selectedStatus() === 'all') {
            <app-button
              color="primary"
              [customClass]="'!w-auto inline-flex items-center px-3 py-2 text-sm font-medium sm:px-4 sm:py-2.5'"
              (buttonClick)="goToCreate()"
            >
              <img
                [ngSrc]="'/icons/add.svg'"
                alt="Ajouter"
                class="w-4 h-4 mr-1.5 sm:w-5 sm:h-5 sm:mr-2 icon-invert"
                width="16"
                height="16"
              />
              Ajouter ma première candidature
            </app-button>
          } @else {
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <app-button
                color="primary"
                [customClass]="'px-4 py-2 text-sm sm:px-6 sm:py-3'"
                (buttonClick)="goToCreate()"
              >
                Ajouter une candidature
              </app-button>
              <app-button
                color="secondary"
                [customClass]="'px-4 py-2 text-sm sm:px-6 sm:py-3'"
                (buttonClick)="filterByStatus('all')"
              >
                Voir toutes les candidatures
              </app-button>
            </div>
          }
        </div>
      } @else {
        <!-- Modern Cards Grid -->
        <div class="space-y-6 sm:space-y-8">
          @for (job of filteredJobs(); track job.id) {
            <div class="relative pl-4 pt-4">
              <!-- External Tab Extension - Completely Outside -->
              <div class="absolute -top-5 right-1 z-30">
                <div
                  class="flex rounded-lg overflow-hidden shadow-lg border border-border bg-background"
                >
                  <app-button
                    [customClass]="
                      '!w-auto !px-3 !py-2 !shadow-none !transform-none !hover:scale-100 !active:scale-100 flex items-center justify-center gap-2 bg-background hover:bg-muted border-none rounded-none transition-all'
                    "
                    (buttonClick)="edit(job)"
                    title="Modifier"
                  >
                    <img
                      [ngSrc]="'/icons/edit.svg'"
                      alt="Modifier"
                      class="w-4 h-4 icon-invert flex-shrink-0"
                      height="16"
                      width="16"
                    />
                    <span class="text-sm font-medium text-text whitespace-nowrap">Modifier</span>
                  </app-button>

                  <div class="w-px bg-border"></div>

                  <app-button
                    color="red"
                    [customClass]="
                      '!w-auto !px-3 !py-2 !shadow-none !transform-none !hover:scale-100 !active:scale-100 flex items-center justify-center gap-2 bg-background hover:bg-error/10 text-error border-none rounded-none transition-all'
                    "
                    (buttonClick)="showDeleteConfirmation(job)"
                    title="Supprimer"
                  >
                    <img
                      [ngSrc]="'/icons/delete.svg'"
                      alt="Supprimer"
                      class="w-4 h-4 icon-invert flex-shrink-0"
                      height="16"
                      width="16"
                    />
                    <span class="text-sm font-medium whitespace-nowrap">Supprimer</span>
                  </app-button>
                </div>
              </div>

              <!-- Modern Card Design -->
              <div class="relative overflow-hidden">
                <!-- Gradient Background -->
                <div
                  class="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3"
                ></div>

                <!-- Main Card -->
                <div
                  class="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group-hover:border-primary/20"
                >
                  @if (jobToDelete() === job.id) {
                    <div class="bg-error/5 border border-error/20 rounded p-3 sm:rounded-lg sm:p-4">
                      <div class="flex items-start gap-2 sm:gap-3">
                        <div class="flex-shrink-0">
                          <img
                            [ngSrc]="'/icons/delete.svg'"
                            alt="Supprimer"
                            class="w-6 h-6 sm:w-7 sm:h-7 icon-invert"
                            height="24"
                            width="24"
                          />
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="font-medium text-error mb-1 text-sm sm:text-base">
                            Supprimer cette candidature ?
                          </h4>
                          <p class="text-xs text-error/80 mb-2 sm:text-sm sm:mb-3">
                            Êtes-vous sûr de vouloir supprimer la candidature "{{ job.title }}"{{
                              job.company ? ' chez ' + job.company : ''
                            }}
                            ?
                          </p>
                          <div class="flex flex-col gap-1 sm:flex-row">
                            <app-button
                              color="red"
                              class="px-3 py-1.5 text-xs rounded text-background transition-all sm:py-2 sm:text-sm sm:rounded-md"
                              (buttonClick)="confirmDelete(job)"
                            >
                              Supprimer
                            </app-button>
                            <app-button
                              class="px-3 py-1.5 text-xs rounded text-text  transition-all sm:py-2 sm:text-sm sm:rounded-md"
                              (buttonClick)="cancelDelete()"
                            >
                              Annuler
                            </app-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <!-- Modern Card Content -->
                    <div class="p-4 sm:p-5">
                      <!-- Compact Header with Title and Status -->
                      <div class="flex items-center justify-between gap-4 mb-4">
                        <h3
                          class="text-lg font-bold text-text sm:text-xl group-hover:text-primary transition-colors flex-1 min-w-0"
                        >
                          {{ job.title }}
                        </h3>
                        <span
                          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
                          [class]="getStatusBadgeClass(job.status)"
                        >
                          <span class="text-base">{{ getStatusEmoji(job.status) }}</span>
                          <span class="hidden sm:inline">{{ getStatusLabelLong(job.status) }}</span>
                          <span class="sm:hidden">{{ getStatusLabel(job.status) }}</span>
                        </span>
                      </div>

                      <!-- Details Row -->
                      <div class="flex items-center justify-center gap-4 mb-4 sm:gap-6">
                        @if (job.company) {
                          <div
                            class="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30 flex-1 min-w-0"
                          >
                            <div class="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                              <img
                                [ngSrc]="'/icons/company.svg'"
                                alt="Entreprise"
                                class="w-5 h-5 icon-invert"
                                height="24"
                                width="24"
                              />
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-xs text-muted font-medium mb-0.5">Entreprise</div>
                              <div class="text-sm font-semibold text-text truncate">
                                {{ job.company }}
                              </div>
                            </div>
                          </div>
                        }

                        @if (job.contractType) {
                          <div
                            class="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30 flex-1 min-w-0"
                          >
                            <div class="p-2 bg-accent/10 rounded-lg flex-shrink-0">
                              <img
                                [ngSrc]="'/icons/docs.svg'"
                                alt="Type de contrat"
                                class="w-5 h-5 icon-invert"
                                height="24"
                                width="24"
                              />
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-xs text-muted font-medium mb-0.5">Contrat</div>
                              <div class="text-sm font-semibold text-text truncate">
                                {{ job.contractType }}
                              </div>
                            </div>
                          </div>
                        }

                        @if (job.appliedAt) {
                          <div
                            class="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30 flex-1 min-w-0"
                          >
                            <div class="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                              <img
                                [ngSrc]="'/icons/calendar.svg'"
                                alt="Date de candidature"
                                class="w-5 h-5 icon-invert"
                                height="24"
                                width="24"
                              />
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-xs text-muted font-medium mb-0.5">Candidature</div>
                              <div class="text-sm font-semibold text-text truncate">
                                {{ formatDate(job.appliedAt) }}
                              </div>
                            </div>
                          </div>
                        }

                        @if (job.reminder) {
                          <div
                            class="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30 flex-1 min-w-0"
                          >
                            <div class="p-2 bg-orange-500/10 rounded-lg flex-shrink-0">
                              <img
                                [ngSrc]="'/icons/timer.svg'"
                                alt="Rappel"
                                class="w-5 h-5 icon-invert"
                                height="24"
                                width="24"
                              />
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-xs text-muted font-medium mb-0.5">Suivi</div>
                              <div class="text-sm font-semibold text-text truncate">
                                {{ getReminderLabel(job.reminder.frequency) }}
                              </div>
                            </div>
                          </div>
                        }
                      </div>

                      <!-- Footer with Link -->
                      @if (job.jobUrl) {
                        <div class="pt-4 border-t border-border/30">
                          <a
                            [href]="job.jobUrl"
                            target="_blank"
                            rel="noreferrer"
                            class="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 group/link"
                          >
                            <span>Voir l'annonce originale</span>
                            <img
                              [ngSrc]="'/icons/open_in_new_tab.svg'"
                              alt="Lien externe"
                              class="w-4 h-4 icon-invert group-hover/link:translate-x-0.5 transition-transform"
                              height="24"
                              width="24"
                            />
                          </a>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobTrackListComponent {
  private readonly service = inject(JobTrackService);
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
