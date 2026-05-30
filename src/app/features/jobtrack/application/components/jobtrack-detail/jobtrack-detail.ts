import { Component, ChangeDetectionStrategy, inject, signal, computed, linkedSignal, input, DestroyRef } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { toJobTrack } from '@features/jobtrack/infra/jobtrack.adapter';
import type { JobTrackApi } from '@features/jobtrack/infra/jobtrack.types';
import { Layout } from '@shared/ui/layout/layout';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { Toaster } from '@shared/ui/toast/service/toast';
import { STATUS_CONFIG, ALL_STATUSES } from '@features/jobtrack/domain/models/jobtrack.model';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import type { JobTrack, JobStatus, DocumentType } from '@features/jobtrack/domain/models/jobtrack.model';
import { PdfViewerModal } from '@shared/ui/pdf-viewer-modal/pdf-viewer-modal';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-jobtrack-detail',
  imports: [Layout, Button, Icon],
  templateUrl: './jobtrack-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackDetail {
  private readonly toast = inject(Toaster);
  private readonly jobtrackGateway = inject(JobtrackGateway);
  private readonly pdfViewerModal = inject(PdfViewerModal);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  // Chargement full signal (la gateway fournit l'URL ; rechargé via reload()).
  private readonly jobResource = httpResource<JobTrack>(
    () => this.jobtrackGateway.getUrl(this.id()),
    { parse: (raw) => toJobTrack(raw as JobTrackApi) },
  );

  readonly job = computed(() => this.jobResource.value() ?? null);
  readonly loading = computed(() => this.jobResource.isLoading());
  readonly error = computed(() =>
    this.jobResource.error() ? 'Impossible de charger la candidature' : null,
  );

  readonly statusUpdating = signal(false);
  readonly allStatuses = ALL_STATUSES;
  readonly statusConfig = STATUS_CONFIG;

  readonly cvUploading = signal(false);
  readonly lmUploading = signal(false);
  readonly cvDragOver = signal(false);
  readonly lmDragOver = signal(false);

  private readonly dateFmt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  protected readonly jobView = computed(() => {
    const j = this.job();
    if (!j) return null;
    const reminder = j.reminder ?? null;
    const overdue =
      !!reminder?.isActive && new Date(reminder.nextReminderAt) < new Date();
    const inactive = reminder !== null && !reminder.isActive;
    return {
      ...j,
      appliedAtFormatted: j.appliedAt
        ? this.dateFmt.format(new Date(j.appliedAt))
        : null,
      createdAtFormatted: this.dateFmt.format(new Date(j.createdAt)),
      updatedAtFormatted: this.dateFmt.format(new Date(j.updatedAt)),
      reminderNextFormatted: reminder
        ? this.dateFmt.format(new Date(reminder.nextReminderAt))
        : null,
      reminderStatusLabel: this.reminderStatusLabel(j),
      reminderFrequencyLabel: reminder
        ? this.reminderFrequencyLabel(reminder.frequency)
        : '',
      reminderOverdue: overdue,
      reminderInactive: inactive,
    };
  });

  // État dérivé MODIFIABLE : se resync sur le resource, mais set()-able pour
  // l'optimistic UI (changement de statut instantané + rollback si l'API échoue).
  protected readonly status = linkedSignal(
    () => this.jobResource.value()?.status ?? null,
  );

  protected readonly statusOptions = computed(() => {
    const current = this.status();
    return this.allStatuses.map((s) => ({
      status: s,
      isCurrent: current === s,
      badgeClass:
        current === s
          ? this.statusConfig[s].badgeClass + ' cursor-default'
          : 'bg-transparent text-muted border-border/40 ' +
            this.statusConfig[s].hoverClass +
            ' cursor-pointer',
      emoji: this.statusConfig[s].emoji,
      label: this.statusConfig[s].label,
      labelShort: this.statusConfig[s].labelShort,
    }));
  });

  // ── Drag & Drop ──────────────────────────────────────

  onDragOver(event: DragEvent, type: DocumentType): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'cv') this.cvDragOver.set(true);
    else this.lmDragOver.set(true);
  }

  onDragLeave(event: DragEvent, type: DocumentType): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'cv') this.cvDragOver.set(false);
    else this.lmDragOver.set(false);
  }

  onDrop(event: DragEvent, type: DocumentType): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'cv') this.cvDragOver.set(false);
    else this.lmDragOver.set(false);

    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file, type);
  }

  onFileSelected(event: Event, type: DocumentType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file, type);
    input.value = '';
  }

  private handleFile(file: File, type: DocumentType): void {
    if (file.type !== 'application/pdf') {
      this.toast.danger('Format invalide', 'Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.toast.danger('Fichier trop volumineux', 'Le fichier ne doit pas dépasser 5 Mo');
      return;
    }

    const uploading = type === 'cv' ? this.cvUploading : this.lmUploading;
    uploading.set(true);

    this.jobtrackGateway.uploadDocument(this.id(), type, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          uploading.set(false);
          const label = type === 'cv' ? 'CV' : 'Lettre de motivation';
          this.toast.success(`${label} uploadé`, `${file.name} a été enregistré`);
          this.jobResource.reload();
        },
        error: () => {
          uploading.set(false);
          this.toast.danger('Erreur', "Impossible d'uploader le fichier");
        },
      });
  }

  downloadDocument(type: DocumentType): void {
    const currentJob = this.job();
    if (!currentJob) return;

    this.jobtrackGateway.downloadDocument(this.id(), type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const fileName = type === 'cv' ? currentJob.cvFileName : currentJob.lmFileName;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName ?? `${type}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de télécharger le fichier');
        },
      });
  }

  viewDocument(type: DocumentType): void {
    const currentJob = this.job();
    if (!currentJob) return;

    this.jobtrackGateway.downloadDocument(this.id(), type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const fileName = type === 'cv' ? currentJob.cvFileName : currentJob.lmFileName;
          const blobUrl = URL.createObjectURL(blob);
          this.pdfViewerModal.open(
            { blobUrl, fileName: fileName ?? `${type}.pdf` },
            () => this.downloadDocument(type),
          );
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de charger le document');
        },
      });
  }

  async deleteDocument(type: DocumentType): Promise<void> {
    const label = type === 'cv' ? 'le CV' : 'la lettre de motivation';
    const confirmed = await this.toast.confirm({
      title: 'Supprimer le document',
      message: `Voulez-vous vraiment supprimer ${label} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });

    if (!confirmed) return;

    this.jobtrackGateway.deleteDocument(this.id(), type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Document supprimé', `${label} a été supprimé`);
          this.jobResource.reload();
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de supprimer le fichier');
        },
      });
  }

  // ── Status change ───────────────────────────────────

  changeStatus(status: JobStatus): void {
    const previous = this.status();
    if (!previous || previous === status || this.statusUpdating()) return;

    // Optimistic : l'UI bascule immédiatement, on confirme/rollback ensuite.
    this.status.set(status);
    this.statusUpdating.set(true);
    this.jobtrackGateway
      .updateWithReminder(this.id(), { status }, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.statusUpdating.set(false);
          this.toast.success('Statut mis à jour', STATUS_CONFIG[status].label);
          this.jobResource.reload();
        },
        error: () => {
          this.statusUpdating.set(false);
          this.status.set(previous); // rollback
          this.toast.danger('Erreur', 'Impossible de mettre à jour le statut');
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────

  private reminderFrequencyLabel(frequency: number): string {
    const options = {
      3: 'Suivi rapide (3j)',
      7: 'Suivi standard (1sem)',
      14: 'Suivi patient (2sem)',
      30: 'Suivi long terme (1mois)',
    };
    return (
      options[frequency as keyof typeof options] ??
      `Tous les ${frequency} jours`
    );
  }

  private reminderStatusLabel(job: JobTrack): string {
    if (!job.reminder) return '';
    if (!job.reminder.isActive) return 'Désactivé';
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

  goToEdit(): void {
    this.router.navigate(['/dashboard/jobtrack', this.id(), 'edit']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
