import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ButtonComponent } from '@shared/ui/button/button';
import { GetJobtrackUseCase } from '@features/jobtrack/domain/use-cases/get-jobtrack.use-case';
import { CreateJobtrackUseCase } from '@features/jobtrack/domain/use-cases/create-jobtrack.use-case';
import { UpdateJobtrackUseCase } from '@features/jobtrack/domain/use-cases/update-jobtrack.use-case';
import { UploadDocumentUseCase } from '@features/jobtrack/domain/use-cases/upload-document.use-case';
import { DownloadDocumentUseCase } from '@features/jobtrack/domain/use-cases/download-document.use-case';
import { DeleteDocumentUseCase } from '@features/jobtrack/domain/use-cases/delete-document.use-case';
import { STATUS_CONFIG, ALL_STATUSES } from '@features/jobtrack/domain/models/jobtrack.model';
import type {
  CreateJobTrackWithReminderDto,
  DocumentType,
  JobTrack,
  JobStatus,
  ContractType,
  Reminder,
  UpdateJobTrackWithReminderDto,
} from '@features/jobtrack/domain/models/jobtrack.model';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '@shared/ui/toast/service/toast';
import { IconComponent } from '@shared/ui/icon/icon';
import { PdfViewerModalService } from '@shared/ui/pdf-viewer-modal/pdf-viewer-modal';

type JobtrackForm = {
  title: FormControl<string>;
  company: FormControl<string>;
  jobUrl: FormControl<string>;
  status: FormControl<JobStatus>;
  contractType: FormControl<ContractType | null>;
  appliedAt: FormControl<string>;
  notes: FormControl<string>;
  frequency: FormControl<number>;
  isReminderActive: FormControl<boolean>;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Statuses where reminders no longer make sense */
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(['ACCEPTED', 'REJECTED']);

@Component({
  selector: 'app-jobtrack-form-page',
  imports: [LayoutComponent, ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './jobtrack-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobTrackFormPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly getJobtrackUseCase = inject(GetJobtrackUseCase);
  private readonly createJobtrackUseCase = inject(CreateJobtrackUseCase);
  private readonly updateJobtrackUseCase = inject(UpdateJobtrackUseCase);
  private readonly uploadDocumentUseCase = inject(UploadDocumentUseCase);
  private readonly downloadDocumentUseCase = inject(DownloadDocumentUseCase);
  private readonly deleteDocumentUseCase = inject(DeleteDocumentUseCase);
  private readonly toast = inject(ToastService);
  private readonly pdfViewerModal = inject(PdfViewerModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input<string>();

  readonly submitting = signal(false);
  readonly isEdit = signal(false);
  readonly allStatuses = ALL_STATUSES;
  readonly statusConfig = STATUS_CONFIG;

  /** Original reminder from backend (edit mode only) */
  private readonly existingReminder = signal<Reminder | null>(null);

  /** Tracks whether the user changed reminder-related fields */
  private readonly originalFrequency = signal<number>(7);
  private readonly originalAppliedAt = signal<string>('');

  // ── Documents ────────────────────────────────────────
  readonly showDocuments = signal(false);
  readonly cvDragOver = signal(false);
  readonly lmDragOver = signal(false);
  readonly cvUploading = signal(false);
  readonly lmUploading = signal(false);

  /** Pending files for create mode (uploaded after jobtrack creation) */
  readonly pendingCvFile = signal<File | null>(null);
  readonly pendingLmFile = signal<File | null>(null);

  /** Existing file names from backend (edit mode) */
  readonly existingCvFileName = signal<string | null>(null);
  readonly existingLmFileName = signal<string | null>(null);

  readonly reminderOptions = [
    { value: 3, label: 'Suivi rapide (3 jours)', description: 'Pour les opportunités urgentes' },
    {
      value: 7,
      label: 'Suivi standard (1 semaine)',
      description: 'Recommandé pour la plupart des candidatures',
    },
    {
      value: 14,
      label: 'Suivi patient (2 semaines)',
      description: 'Pour les grandes entreprises',
    },
    {
      value: 30,
      label: 'Suivi long terme (1 mois)',
      description: 'Pour les postes très spécifiques',
    },
  ];

  readonly form = new FormGroup<JobtrackForm>({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    company: new FormControl('', { nonNullable: true }),
    jobUrl: new FormControl('', { nonNullable: true }),
    status: new FormControl<JobStatus>('APPLIED', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    contractType: new FormControl<ContractType | null>(null),
    appliedAt: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    frequency: new FormControl(7, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    isReminderActive: new FormControl(true, { nonNullable: true }),
  });

  /** Reactive signals tracking form values for computed properties */
  private readonly currentFrequency = signal(7);
  private readonly currentAppliedAt = signal('');
  private readonly currentIsActive = signal(true);
  private readonly currentStatus = signal<JobStatus>('APPLIED');

  /** Whether the current status is terminal (ACCEPTED/REJECTED) */
  readonly isTerminalStatus = computed(() => TERMINAL_STATUSES.has(this.currentStatus()));

  /** Computed next reminder date based on current form values */
  readonly nextReminderDate = computed(() => {
    if (!this.currentIsActive() || this.isTerminalStatus()) return null;
    return this.computeNextReminderAt(this.currentAppliedAt(), this.currentFrequency());
  });

  /** Formatted next reminder date for display */
  readonly nextReminderFormatted = computed(() => {
    const date = this.nextReminderDate();
    if (!date) return null;
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  /** Days remaining until the next reminder */
  readonly daysUntilReminder = computed(() => {
    const date = this.nextReminderDate();
    if (!date) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  });

  /** Whether the computed reminder date is in the past */
  readonly isReminderInPast = computed(() => {
    const days = this.daysUntilReminder();
    return days !== null && days < 0;
  });

  /** Existing reminder's next date (edit mode) for display */
  readonly existingNextReminderFormatted = computed(() => {
    const reminder = this.existingReminder();
    if (!reminder?.nextReminderAt) return null;
    return new Date(reminder.nextReminderAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  /** Whether the existing reminder is overdue */
  readonly isExistingReminderOverdue = computed(() => {
    const reminder = this.existingReminder();
    if (!reminder?.nextReminderAt) return false;
    return new Date(reminder.nextReminderAt) < new Date();
  });

  /** Whether reminder fields (frequency or appliedAt) have changed from original values */
  readonly hasReminderChanged = computed(() => {
    return (
      this.currentFrequency() !== this.originalFrequency() ||
      this.currentAppliedAt() !== this.originalAppliedAt()
    );
  });

  constructor() {
    // Sync form value changes to signals for computed reactivity
    this.form.get('frequency')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.currentFrequency.set(v));
    this.form.get('appliedAt')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.currentAppliedAt.set(v));
    this.form.get('isReminderActive')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.currentIsActive.set(v));
    this.form.get('status')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.currentStatus.set(v));
  }

  ngOnInit(): void {
    const jobId = this.id();
    if (jobId) {
      this.isEdit.set(true);
      this.getJobtrackUseCase.execute(jobId).subscribe((job) => this.patchForm(job));
    }
  }

  private patchForm(job: JobTrack): void {
    const frequency = job.reminder?.frequency ?? 7;
    const appliedAt = job.appliedAt ? job.appliedAt.substring(0, 10) : '';
    const isActive = job.reminder?.isActive ?? true;

    this.form.patchValue({
      title: job.title ?? '',
      company: job.company ?? '',
      jobUrl: job.jobUrl ?? '',
      status: job.status ?? 'APPLIED',
      contractType: job.contractType ?? null,
      appliedAt,
      notes: job.notes ?? '',
      frequency,
      isReminderActive: isActive,
    });

    // Store originals for change detection
    this.existingReminder.set(job.reminder ?? null);
    this.originalFrequency.set(frequency);
    this.originalAppliedAt.set(appliedAt);

    // Sync current signals
    this.currentFrequency.set(frequency);
    this.currentAppliedAt.set(appliedAt);
    this.currentIsActive.set(isActive);
    this.currentStatus.set(job.status ?? 'APPLIED');

    // Documents
    this.existingCvFileName.set(job.cvFileName ?? null);
    this.existingLmFileName.set(job.lmFileName ?? null);
    if (job.cvFileName || job.lmFileName) {
      this.showDocuments.set(true);
    }
  }

  // ── Document handling ────────────────────────────────

  toggleDocuments(): void {
    this.showDocuments.update((v) => !v);
  }

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

    if (this.isEdit()) {
      // Edit mode: upload immediately
      const uploading = type === 'cv' ? this.cvUploading : this.lmUploading;
      uploading.set(true);

      this.uploadDocumentUseCase
        .execute(this.id()!, type, file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            uploading.set(false);
            if (type === 'cv') this.existingCvFileName.set(file.name);
            else this.existingLmFileName.set(file.name);
            const label = type === 'cv' ? 'CV' : 'Lettre de motivation';
            this.toast.success(`${label} uploadé`, `${file.name} a été enregistré`);
          },
          error: () => {
            uploading.set(false);
            this.toast.danger('Erreur', "Impossible d'uploader le fichier");
          },
        });
    } else {
      // Create mode: store file for later upload
      if (type === 'cv') this.pendingCvFile.set(file);
      else this.pendingLmFile.set(file);
    }
  }

  downloadDocument(type: DocumentType): void {
    const jobId = this.id();
    if (!jobId) return;

    this.downloadDocumentUseCase
      .execute(jobId, type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const fileName = type === 'cv' ? this.existingCvFileName() : this.existingLmFileName();
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
    const jobId = this.id();
    if (!jobId) return;

    this.downloadDocumentUseCase
      .execute(jobId, type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const fileName = type === 'cv' ? this.existingCvFileName() : this.existingLmFileName();
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
    const jobId = this.id();
    if (!jobId) return;

    const label = type === 'cv' ? 'le CV' : 'la lettre de motivation';
    const confirmed = await this.toast.confirm({
      title: 'Supprimer le document',
      message: `Voulez-vous vraiment supprimer ${label} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });

    if (!confirmed) return;

    this.deleteDocumentUseCase
      .execute(jobId, type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (type === 'cv') this.existingCvFileName.set(null);
          else this.existingLmFileName.set(null);
          this.toast.success('Document supprimé', `${label} a été supprimé`);
        },
        error: () => {
          this.toast.danger('Erreur', 'Impossible de supprimer le fichier');
        },
      });
  }

  removePendingFile(type: DocumentType): void {
    if (type === 'cv') this.pendingCvFile.set(null);
    else this.pendingLmFile.set(null);
  }

  /** Compute next reminder date: always uses max(now, appliedAt) + frequency to avoid past dates */
  private computeNextReminderAt(appliedAt: string, frequency: number): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const base = appliedAt ? new Date(appliedAt) : now;
    const candidate = new Date(base.getTime() + frequency * 24 * 60 * 60 * 1000);

    // If the candidate is in the past, recalculate from today
    if (candidate < now) {
      return new Date(now.getTime() + frequency * 24 * 60 * 60 * 1000);
    }
    return candidate;
  }

  submit(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const isTerminal = TERMINAL_STATUSES.has(value.status);
    const isActive = isTerminal ? false : value.isReminderActive;

    this.submitting.set(true);

    const jobId = this.id();
    const isEditMode = this.isEdit() && jobId;

    if (isEditMode) {
      const updatePayload: UpdateJobTrackWithReminderDto = {
        title: value.title,
        status: value.status,
        isActive,
      };

      // Send frequency + nextReminderAt when:
      // - No existing reminder and user wants one (creation)
      // - Reminder fields changed (frequency or appliedAt)
      // - Reminder is being reactivated from inactive
      const noExistingReminder = !this.existingReminder();
      const reminderChanged = this.hasReminderChanged();
      const wasInactive = !(this.existingReminder()?.isActive ?? true);
      const isReactivating = wasInactive && isActive;

      if ((noExistingReminder && isActive) || reminderChanged || isReactivating) {
        const nextDate = this.computeNextReminderAt(value.appliedAt, value.frequency);
        updatePayload.frequency = value.frequency;
        updatePayload.nextReminderAt = nextDate.toISOString();
      }

      if (value.company) updatePayload.company = value.company;
      if (value.jobUrl) updatePayload.jobUrl = value.jobUrl;
      if (value.contractType) updatePayload.contractType = value.contractType;
      if (value.appliedAt) updatePayload.appliedAt = value.appliedAt;
      if (value.notes) updatePayload.notes = value.notes;

      this.updateJobtrackUseCase.execute(jobId!, updatePayload, false).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(
            'Candidature modifiée',
            'La candidature a été mise à jour avec succès',
          );
          this.router.navigate(['/dashboard/jobtrack']);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.danger('Erreur', 'Impossible de modifier la candidature');
        },
      });
    } else {
      const nextDate = this.computeNextReminderAt(value.appliedAt, value.frequency);

      const createPayload: CreateJobTrackWithReminderDto = {
        title: value.title,
        status: value.status,
        frequency: value.frequency,
        nextReminderAt: nextDate.toISOString(),
        isActive,
      };

      if (value.company) createPayload.company = value.company;
      if (value.jobUrl) createPayload.jobUrl = value.jobUrl;
      if (value.contractType) createPayload.contractType = value.contractType;
      if (value.appliedAt) createPayload.appliedAt = value.appliedAt;
      if (value.notes) createPayload.notes = value.notes;

      this.createJobtrackUseCase.execute(createPayload).subscribe({
        next: (created) => {
          this.uploadPendingFiles(created.id);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.danger('Erreur', 'Impossible de créer la candidature');
        },
      });
    }
  }

  private uploadPendingFiles(jobTrackId: string): void {
    const cv = this.pendingCvFile();
    const lm = this.pendingLmFile();

    if (!cv && !lm) {
      this.submitting.set(false);
      this.toast.success('Candidature créée', 'La candidature a été ajoutée avec succès');
      this.router.navigate(['/dashboard/jobtrack']);
      return;
    }

    const uploads$ = [];
    if (cv) uploads$.push(this.uploadDocumentUseCase.execute(jobTrackId, 'cv', cv));
    if (lm) uploads$.push(this.uploadDocumentUseCase.execute(jobTrackId, 'lm', lm));

    forkJoin(uploads$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Candidature créée', 'La candidature et les documents ont été enregistrés');
          this.router.navigate(['/dashboard/jobtrack']);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.warning(
            'Candidature créée',
            "La candidature a été créée mais l'upload des documents a échoué. Vous pourrez les ajouter depuis la page de détail.",
          );
          this.router.navigate(['/dashboard/jobtrack']);
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/jobtrack']);
  }
}
