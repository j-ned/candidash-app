import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  viewChild,
  inject,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FileUrlService } from '@features/dashboard/profile/services/file-url';
import {
  FileUploadComponent,
  FileUploadConfig,
  FileUploadEvent,
} from '@features/dashboard/profile/components/file-upload/file-upload';

export interface CvUploadEvent {
  file: File;
  isValid: boolean;
  errors: string[];
}

/**
 * Specialized CV/document upload component
 * Follows Angular 20+ best practices with signals and standalone architecture
 */
@Component({
  selector: 'app-cv-upload',
  imports: [CommonModule, FileUploadComponent, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 w-full">
      <!-- Current CV Display -->
      @if (currentCvPath() && !isUploading()) {
        <div class="w-full">
          <div class="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center bg-[var(--color-primary-50)] rounded-lg">
              <img
                [ngSrc]="'/icons/docs.svg'"
                alt="CV"
                width="24"
                height="24"
                class="w-6 h-6 icon-invert"
              />
            </div>
            <div class="flex-1">
              <p class="m-0 mb-1 font-semibold text-[var(--color-text)]">CV actuel</p>
              <p class="m-0 text-sm text-[var(--color-muted)]">{{ currentCvFileName() }}</p>
            </div>
            <div class="flex items-center gap-2">
              <a [href]="currentCvUrl()" target="_blank" class="inline-flex items-center text-[var(--color-accent)] px-2 py-1 hover:opacity-80 transition">
                <img
                  [ngSrc]="'/icons/eye.svg'"
                  alt="External Link"
                  width="16"
                  height="16"
                  class="w-6 h-6 mr-1 icon-invert"
                />
                Voir
              </a>
              <button
                type="button"
                (click)="removeCv()"
                [disabled]="disabled()"
                class="inline-flex items-center text-[var(--color-error)] border border-[var(--color-error)] px-2 py-1 rounded-md hover:bg-[var(--color-error)] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <img
                  [ngSrc]="'/icons/delete.svg'"
                  alt="Delete"
                  width="16"
                  height="16"
                  class="w-6 h-6 mr-1 icon-invert"
                />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Upload Section -->
      <div class="w-full">
        <div class="mb-4">
          <h3 class="m-0 mb-2 text-lg font-semibold text-[var(--color-text)]">
            {{ currentCvPath() ? 'Remplacer le CV' : 'Télécharger un CV' }}
          </h3>
          <p class="m-0 text-sm text-[var(--color-muted)]">
            Formats acceptés: PDF, DOC, DOCX • Maximum {{ cvConfig().maxSizeInMB }}MB
          </p>
        </div>

        <app-file-upload
          #uploadComponent
          [config]="cvConfig()"
          [disabled]="disabled() || isUploading()"
          [uploadText]="uploadText()"
          [uploadingText]="uploadingText()"
          (fileSelected)="onFileSelected($event)"
          (fileCleared)="onFileCleared()"
        />
      </div>

      <!-- Upload Status -->
      @if (isUploading()) {
        <div class="flex items-center gap-3 p-4 bg-[var(--color-accent-50)] border border-[var(--color-accent-200)] rounded-lg">
          <div class="shrink-0">
            <img
              [ngSrc]="'/icons/spinner.svg'"
              alt="Upload"
              width="24"
              height="24"
              class="w-6 h-6 animate-spin"
            />
          </div>
          <div class="flex-1">
            <p class="m-0 mb-1 font-medium text-[var(--color-text)]">Téléchargement en cours...</p>
            <p class="m-0 text-sm text-[var(--color-muted)]">{{ selectedFile()?.name }}</p>
          </div>
        </div>
      }

      <!-- Action Buttons for Selected File -->
      @if (selectedFile() && !isUploading() && !hasErrors()) {
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            (click)="confirmUpload()"
            [disabled]="disabled()"
            class="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <img
              [ngSrc]="'/icons/download.svg'"
              alt="Confirm"
              width="16"
              height="16"
              class="w-6 h-6 mr-1 icon-invert"
            />
            Télécharger ce CV
          </button>
          <button
            type="button"
            (click)="cancelUpload()"
            [disabled]="disabled()"
            class="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            Annuler
          </button>
        </div>
      }

      @if (hasErrors()) {
        <div class="flex items-start gap-3 p-4 bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-lg">
          <div class="shrink-0 mt-0.5">
            <img
              [ngSrc]="'/icons/error.svg'"
              alt="Error"
              width="24"
              height="24"
              class="w-6 h-6 icon-invert"
              />
          </div>
          <div class="flex-1">
            <p class="m-0 mb-2 font-semibold text-[var(--color-error)]">Erreur de téléchargement</p>
            @for (error of validationErrors(); track error) {
              <p class="my-1 text-sm text-[var(--color-error)]">{{ error }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-testid]': '"cv-upload"',
  },
})
export class CvUploadComponent {
  private readonly fileUrlService = inject(FileUrlService);

  // Inputs
  readonly currentCvPath = input<string | null | undefined>(null);
  readonly disabled = input(false);
  readonly uploadText = input('Glissez votre CV ici ou cliquez pour sélectionner');
  readonly uploadingText = input('Téléchargement de votre CV...');

  // Outputs
  readonly cvSelected = output<CvUploadEvent>();
  readonly cvRemoved = output<void>();

  // ViewChild for upload component
  readonly uploadComponent = viewChild<FileUploadComponent>('uploadComponent');

  // Signals for state management
  readonly selectedFile = signal<File | null>(null);
  readonly validationErrors = signal<string[]>([]);
  readonly isUploading = signal(false);

  // Computed properties
  readonly currentCvUrl = computed(() => {
    const cvPath = this.currentCvPath();
    return cvPath ? this.fileUrlService.getCvUrl(cvPath) : null;
  });

  readonly currentCvFileName = computed(() => {
    const cvPath = this.currentCvPath();
    return this.fileUrlService.getFileName(cvPath, 'CV.pdf');
  });

  readonly cvConfig = computed(
    (): FileUploadConfig => ({
      accept:
        '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      maxSizeInMB: 10,
      allowMultiple: false,
    }),
  );

  readonly hasErrors = computed(() => this.validationErrors().length > 0);

  readonly hostClasses = computed(() => {
    const classes = ['cv-upload'];
    if (this.disabled()) classes.push('cv-upload--disabled');
    if (this.isUploading()) classes.push('cv-upload--uploading');
    if (this.hasErrors()) classes.push('cv-upload--error');
    return classes.join(' ');
  });

  onFileSelected(event: FileUploadEvent): void {
    if (event.isValid) {
      this.selectedFile.set(event.file);
      this.validationErrors.set([]);
    } else {
      this.selectedFile.set(null);
      this.validationErrors.set(event.errors);
    }

    this.cvSelected.emit({
      file: event.file,
      isValid: event.isValid,
      errors: event.errors,
    });
  }

  onFileCleared(): void {
    this.selectedFile.set(null);
    this.validationErrors.set([]);
  }

  confirmUpload(): void {
    const file = this.selectedFile();
    if (file) {
      // Emit the final confirmation
      this.cvSelected.emit({
        file,
        isValid: true,
        errors: [],
      });
    }
  }

  cancelUpload(): void {
    this.selectedFile.set(null);
    this.validationErrors.set([]);
    this.uploadComponent()?.clearFile();
  }

  removeCv(): void {
    this.cvRemoved.emit();
  }

  setUploading(uploading: boolean): void {
    this.isUploading.set(uploading);
    this.uploadComponent()?.setUploading(uploading);
  }

  setUploadProgress(progress: number): void {
    this.uploadComponent()?.setUploadProgress(progress);
  }
}
