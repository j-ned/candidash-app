import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  computed,
  linkedSignal,
  DestroyRef,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FormField, FormRoot, form, hidden, minLength, required } from '@angular/forms/signals';
import { Layout } from '@shared/ui/layout/layout';
import { Button } from '@shared/ui/button/button';
import { STATUS_CONFIG, ALL_STATUSES, CONTRACT_TYPE_CONFIG, ALL_CONTRACT_TYPES } from '@features/jobtrack/domain/models/jobtrack.model';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import type {
  CreateJobTrackWithReminderDto,
  DocumentType,
  JobTrack,
  JobStatus,
  ContractType,
  UpdateJobTrackWithReminderDto,
} from '@features/jobtrack/domain/models/jobtrack.model';
import { Toaster } from '@shared/ui/toast/service/toast';
import { Icon } from '@shared/ui/icon/icon';
import { PdfViewerModal } from '@shared/ui/pdf-viewer-modal/pdf-viewer-modal';
import { FieldError } from '@shared/ui/field-error/field-error';
import { focusFirstInvalid } from '@shared/forms/focus-first-invalid';
import { dateOnlyToIso } from '@shared/utils/date-only-to-iso';

/**
 * Modèle du formulaire : défauts non-null, conversion vers le DTO uniquement à l'envoi.
 * `contractType` vide = aucun contrat ; `frequency` garde la valeur native des boutons radio
 * (chaîne), convertie en nombre dans le payload.
 */
type JobtrackDraft = {
  title: string;
  company: string;
  jobUrl: string;
  status: JobStatus;
  contractType: ContractType | '';
  appliedAt: string;
  notes: string;
  frequency: string;
  isReminderActive: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const TITLE_ERROR = 'Le titre du poste est requis (minimum 2 caractères)';

/** Statuses where reminders no longer make sense */
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(['ACCEPTED', 'REJECTED']);

function toDraft(job: JobTrack | null): JobtrackDraft {
  return {
    title: job?.title ?? '',
    company: job?.company ?? '',
    jobUrl: job?.jobUrl ?? '',
    status: job?.status ?? 'APPLIED',
    contractType: job?.contractType ?? '',
    appliedAt: job?.appliedAt ? job.appliedAt.substring(0, 10) : '',
    notes: job?.notes ?? '',
    frequency: String(job?.reminder?.frequency ?? 7),
    isReminderActive: job?.reminder?.isActive ?? true,
  };
}

@Component({
  selector: 'app-jobtrack-form-page',
  imports: [Layout, FormRoot, FormField, FieldError, Button, Icon],
  templateUrl: './jobtrack-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobtrackFormPage {
  private readonly router = inject(Router);
  private readonly jobtrackGateway = inject(JobtrackGateway);
  private readonly toast = inject(Toaster);
  private readonly pdfViewerModal = inject(PdfViewerModal);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input<string>();

  readonly isEdit = computed(() => !!this.id());
  readonly allStatuses = ALL_STATUSES;
  readonly statusConfig = STATUS_CONFIG;
  readonly allContractTypes = ALL_CONTRACT_TYPES;
  readonly contractTypeConfig = CONTRACT_TYPE_CONFIG;

  /** Candidature chargée en modification (null en création) */
  private readonly jobResource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.jobtrackGateway.get(id),
  });
  private readonly loadedJob = computed(() =>
    this.jobResource.hasValue() ? this.jobResource.value() : null,
  );

  /** Valeurs d'origine (modification), pour savoir si le rappel doit être recalculé */
  private readonly baseline = computed(() => toDraft(this.loadedJob()));

  /** Original reminder from backend (edit mode only) */
  private readonly existingReminder = computed(() => this.loadedJob()?.reminder ?? null);

  // ── Documents ────────────────────────────────────────
  readonly showDocuments = linkedSignal(() => {
    const job = this.loadedJob();
    return Boolean(job?.cvFileName) || Boolean(job?.lmFileName);
  });
  readonly cvDragOver = signal(false);
  readonly lmDragOver = signal(false);
  readonly cvUploading = signal(false);
  readonly lmUploading = signal(false);

  /** Pending files for create mode (uploaded after jobtrack creation), hors modèle du formulaire */
  readonly pendingCvFile = signal<File | null>(null);
  readonly pendingLmFile = signal<File | null>(null);

  /** Existing file names from backend (edit mode) */
  readonly existingCvFileName = linkedSignal(() => this.loadedJob()?.cvFileName ?? null);
  readonly existingLmFileName = linkedSignal(() => this.loadedJob()?.lmFileName ?? null);

  readonly reminderOptions = [
    { value: '3', label: 'Suivi rapide (3 jours)', description: 'Pour les opportunités urgentes' },
    {
      value: '7',
      label: 'Suivi standard (1 semaine)',
      description: 'Recommandé pour la plupart des candidatures',
    },
    {
      value: '14',
      label: 'Suivi patient (2 semaines)',
      description: 'Pour les grandes entreprises',
    },
    {
      value: '30',
      label: 'Suivi long terme (1 mois)',
      description: 'Pour les postes très spécifiques',
    },
  ];

  /** Brouillon édité : réinitialisé depuis la candidature chargée (création = valeurs par défaut) */
  protected readonly model = linkedSignal(() => toDraft(this.loadedJob()));

  protected readonly jobForm = form(
    this.model,
    (path) => {
      required(path.title, { message: TITLE_ERROR });
      minLength(path.title, 2, { message: TITLE_ERROR });
      required(path.status);
      // Statut terminal : plus de rappel, l'interrupteur et la fréquence disparaissent
      hidden(path.isReminderActive, {
        when: ({ valueOf }) => TERMINAL_STATUSES.has(valueOf(path.status)),
      });
      hidden(path.frequency, {
        when: ({ valueOf }) =>
          TERMINAL_STATUSES.has(valueOf(path.status)) || !valueOf(path.isReminderActive),
      });
      required(path.frequency);
    },
    {
      submission: {
        action: () => this.save(),
        // Bouton actif sur un formulaire invalide : submit() révèle les erreurs, focus sur la première
        onInvalid: (field) => focusFirstInvalid(field),
      },
    },
  );

  /** Whether the current status is terminal (ACCEPTED/REJECTED) */
  readonly isTerminalStatus = computed(() => TERMINAL_STATUSES.has(this.model().status));

  /** Computed next reminder date based on current form values */
  readonly nextReminderDate = computed(() => {
    const { isReminderActive, appliedAt, frequency } = this.model();
    if (!isReminderActive || this.isTerminalStatus()) return null;
    return this.computeNextReminderAt(appliedAt, Number(frequency));
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
    const current = this.model();
    const original = this.baseline();
    return current.frequency !== original.frequency || current.appliedAt !== original.appliedAt;
  });

  // Maps statut/contrat → classe de badge (indexées dans le template, plus de méthode).
  protected readonly statusBadgeClasses = computed(
    () =>
      Object.fromEntries(
        this.allStatuses.map((s) => [
          s,
          this.model().status === s
            ? this.statusConfig[s].badgeClass + ' cursor-default'
            : 'bg-transparent text-muted border-border/40 ' +
              this.statusConfig[s].hoverClass +
              ' cursor-pointer',
        ]),
      ) as Record<JobStatus, string>,
  );

  protected readonly contractBadgeClasses = computed(
    () =>
      Object.fromEntries(
        this.allContractTypes.map((ct) => [
          ct,
          this.model().contractType === ct
            ? this.contractTypeConfig[ct].badgeClass + ' cursor-default'
            : 'bg-transparent text-muted border-border/40 ' +
              this.contractTypeConfig[ct].hoverClass +
              ' cursor-pointer',
        ]),
      ) as Record<ContractType, string>,
  );

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

      this.jobtrackGateway.uploadDocument(this.id()!, type, file)
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

    this.jobtrackGateway.downloadDocument(jobId, type)
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

    this.jobtrackGateway.downloadDocument(jobId, type)
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

    this.jobtrackGateway.deleteDocument(jobId, type)
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

  private async save(): Promise<void> {
    const value = this.model();
    const isActive = TERMINAL_STATUSES.has(value.status) ? false : value.isReminderActive;
    const frequency = Number(value.frequency);
    const jobId = this.id();

    if (jobId) {
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
        const nextDate = this.computeNextReminderAt(value.appliedAt, frequency);
        updatePayload.frequency = frequency;
        updatePayload.nextReminderAt = nextDate.toISOString();
      }

      if (value.company) updatePayload.company = value.company;
      if (value.jobUrl) updatePayload.jobUrl = value.jobUrl;
      if (value.contractType) updatePayload.contractType = value.contractType;
      if (value.appliedAt) updatePayload.appliedAt = dateOnlyToIso(value.appliedAt);
      if (value.notes) updatePayload.notes = value.notes;

      try {
        await firstValueFrom(this.jobtrackGateway.updateWithReminder(jobId, updatePayload, false));
      } catch {
        this.toast.danger('Erreur', 'Impossible de modifier la candidature');
        return;
      }
      this.toast.success('Candidature modifiée', 'La candidature a été mise à jour avec succès');
      this.router.navigate(['/dashboard/jobtrack']);
      return;
    }

    const nextDate = this.computeNextReminderAt(value.appliedAt, frequency);

    const createPayload: CreateJobTrackWithReminderDto = {
      title: value.title,
      status: value.status,
      frequency,
      nextReminderAt: nextDate.toISOString(),
      isActive,
    };

    if (value.company) createPayload.company = value.company;
    if (value.jobUrl) createPayload.jobUrl = value.jobUrl;
    if (value.contractType) createPayload.contractType = value.contractType;
    if (value.appliedAt) createPayload.appliedAt = dateOnlyToIso(value.appliedAt);
    if (value.notes) createPayload.notes = value.notes;

    let created: JobTrack;
    try {
      created = await firstValueFrom(this.jobtrackGateway.createWithReminder(createPayload));
    } catch {
      this.toast.danger('Erreur', 'Impossible de créer la candidature');
      return;
    }
    await this.uploadPendingFiles(created.id);
  }

  private async uploadPendingFiles(jobTrackId: string): Promise<void> {
    const cv = this.pendingCvFile();
    const lm = this.pendingLmFile();

    if (!cv && !lm) {
      this.toast.success('Candidature créée', 'La candidature a été ajoutée avec succès');
      this.router.navigate(['/dashboard/jobtrack']);
      return;
    }

    const uploads$ = [];
    if (cv) uploads$.push(this.jobtrackGateway.uploadDocument(jobTrackId, 'cv', cv));
    if (lm) uploads$.push(this.jobtrackGateway.uploadDocument(jobTrackId, 'lm', lm));

    try {
      await firstValueFrom(forkJoin(uploads$));
      this.toast.success('Candidature créée', 'La candidature et les documents ont été enregistrés');
    } catch {
      this.toast.warning(
        'Candidature créée',
        "La candidature a été créée mais l'upload des documents a échoué. Vous pourrez les ajouter depuis la page de détail.",
      );
    }
    this.router.navigate(['/dashboard/jobtrack']);
  }

  selectStatus(status: JobStatus): void {
    this.model.update((draft) => ({ ...draft, status }));
  }

  toggleContractType(type: ContractType): void {
    this.model.update((draft) => ({
      ...draft,
      contractType: draft.contractType === type ? '' : type,
    }));
  }

  cancel(): void {
    this.router.navigate(['/dashboard/jobtrack']);
  }
}
