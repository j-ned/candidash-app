import { Component, ChangeDetectionStrategy, inject, signal, input, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Layout } from '@shared/ui/layout/layout';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { Toaster } from '@shared/ui/toast/service/toast';
import { GetJobtrackUseCase } from '@features/jobtrack/domain/use-cases/get-jobtrack.use-case';
import { UpdateJobtrackUseCase } from '@features/jobtrack/domain/use-cases/update-jobtrack.use-case';
import { UploadDocumentUseCase } from '@features/jobtrack/domain/use-cases/upload-document.use-case';
import { DownloadDocumentUseCase } from '@features/jobtrack/domain/use-cases/download-document.use-case';
import { DeleteDocumentUseCase } from '@features/jobtrack/domain/use-cases/delete-document.use-case';
import { STATUS_CONFIG, ALL_STATUSES } from '@features/jobtrack/domain/models/jobtrack.model';
import type { JobTrack, JobStatus, DocumentType } from '@features/jobtrack/domain/models/jobtrack.model';
import { PdfViewerModal } from '@shared/ui/pdf-viewer-modal/pdf-viewer-modal';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-jobtrack-detail',
  imports: [Layout, Button, Icon],
  templateUrl: './jobtrack-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackDetail implements OnInit {
  private readonly getJobtrackUseCase = inject(GetJobtrackUseCase);
  private readonly updateJobtrackUseCase = inject(UpdateJobtrackUseCase);
  private readonly uploadDocumentUseCase = inject(UploadDocumentUseCase);
  private readonly downloadDocumentUseCase = inject(DownloadDocumentUseCase);
  private readonly deleteDocumentUseCase = inject(DeleteDocumentUseCase);
  private readonly toast = inject(Toaster);
  private readonly pdfViewerModal = inject(PdfViewerModal);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  readonly job = signal<JobTrack | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly statusUpdating = signal(false);
  readonly allStatuses = ALL_STATUSES;
  readonly statusConfig = STATUS_CONFIG;

  readonly cvUploading = signal(false);
  readonly lmUploading = signal(false);
  readonly cvDragOver = signal(false);
  readonly lmDragOver = signal(false);

  ngOnInit(): void {
    this.loadJob();
  }

  private loadJob(): void {
    this.getJobtrackUseCase
      .execute(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => {
          this.job.set(job);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger la candidature');
          this.loading.set(false);
        },
      });
  }

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

    this.uploadDocumentUseCase
      .execute(this.id(), type, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          uploading.set(false);
          const label = type === 'cv' ? 'CV' : 'Lettre de motivation';
          this.toast.success(`${label} uploadé`, `${file.name} a été enregistré`);
          this.refreshJob();
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

    this.downloadDocumentUseCase
      .execute(this.id(), type)
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

    this.downloadDocumentUseCase
      .execute(this.id(), type)
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

    this.deleteDocumentUseCase
      .execute(this.id(), type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Document supprimé', `${label} a été supprimé`);
          this.refreshJob();
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de supprimer le fichier');
        },
      });
  }

  private refreshJob(): void {
    this.getJobtrackUseCase
      .execute(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => this.job.set(job),
      });
  }

  // ── Status change ───────────────────────────────────

  changeStatus(status: JobStatus): void {
    const currentJob = this.job();
    if (!currentJob || currentJob.status === status || this.statusUpdating()) return;

    this.statusUpdating.set(true);
    this.updateJobtrackUseCase
      .execute(currentJob.id, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.statusUpdating.set(false);
          this.toast.success('Statut mis à jour', STATUS_CONFIG[status].label);
          this.refreshJob();
        },
        error: () => {
          this.statusUpdating.set(false);
          this.toast.danger('Erreur', 'Impossible de mettre à jour le statut');
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  getReminderLabel(frequency: number): string {
    const options = {
      3: 'Suivi rapide (3j)',
      7: 'Suivi standard (1sem)',
      14: 'Suivi patient (2sem)',
      30: 'Suivi long terme (1mois)',
    };
    return options[frequency as keyof typeof options] ?? `Tous les ${frequency} jours`;
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

  goToEdit(): void {
    this.router.navigate(['/dashboard/jobtrack', this.id(), 'edit']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
