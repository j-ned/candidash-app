import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

export interface FileUploadConfig {
  accept: string;
  maxSizeInMB: number;
  allowMultiple: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FileUploadEvent {
  file: File;
  isValid: boolean;
  errors: string[];
}

/**
 * Modern file upload component with drag-and-drop support
 * Follows Angular 20+ best practices with signals and standalone architecture
 */
@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        [accept]="config().accept"
        [multiple]="config().allowMultiple"
        (change)="onFileSelect($event)"
        class="hidden"
        [disabled]="disabled()"
      />

      <!-- Upload area -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 bg-white dark:bg-slate-900 border-slate-300 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800"
        [class.opacity-60]="disabled()"
        [class.cursor-not-allowed]="disabled()"
        [class.border-red-500]="hasErrors()"
        [class.bg-red-50]="hasErrors()"
        [class.dark:bg-red-900-20]="hasErrors()"
        [class.border-indigo-500]="isDragOver()"
        [class.bg-indigo-50]="isDragOver()"
        [class.dark:bg-indigo-900-20]="isDragOver()"
        (click)="triggerFileInput()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <div class="flex flex-col items-center gap-2">
          @if (isUploading()) {
            <div class="flex justify-center">
              <img
                [ngSrc]="'/icons/spinner.svg'"
                alt="Chargement en cours"
                class="w-6 h-6 animate-spin"
                fill
              />
            </div>
            <p class="font-medium text-slate-900 dark:text-slate-100">{{ uploadingText() }}</p>
          } @else {
            <img
              [ngSrc]="'/icons/upload.svg'"
              alt="Uploader un fichier"
              class="w-8 h-8 icon-invert"
              height="24"
              width="24"
            />
            <p class="font-medium text-slate-900 dark:text-slate-100">{{ uploadText() }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ hintText() }}</p>
          }
        </div>

        <!-- File preview -->
        @if (selectedFile() && !hasErrors()) {
          <div
            class="flex items-center justify-between mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md"
          >
            <div class="flex flex-col items-start">
              <span class="font-medium text-slate-900 dark:text-slate-100">{{
                selectedFile()?.name
              }}</span>
              <span class="text-sm text-slate-500 dark:text-slate-400">{{
                formatFileSize(selectedFile()?.size || 0)
              }}</span>
            </div>
            <button
              type="button"
              (click)="clearFile($event)"
              class="p-1.5 rounded bg-red-600 text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              [disabled]="disabled() || isUploading()"
            >
              <img [ngSrc]="'/icons/delete.svg'" alt="Supprimer le fichier" class="w-4 h-4" fill />
            </button>
          </div>
        }
      </div>

      <!-- Error messages -->
      @if (hasErrors()) {
        <div class="mt-2">
          @for (error of validationErrors(); track error) {
            <p class="text-sm text-red-600 dark:text-red-400 my-1">{{ error }}</p>
          }
        </div>
      }

      <!-- Progress bar -->
      @if (isUploading() && uploadProgress() > 0) {
        <div class="flex items-center gap-3 mt-4">
          <div class="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
            <div
              class="h-full bg-indigo-600 transition-[width] duration-300"
              [style.width.%]="uploadProgress()"
            ></div>
          </div>
          <span class="text-sm font-medium text-slate-900 dark:text-slate-100 min-w-12 text-right"
            >{{ uploadProgress() }}%</span
          >
        </div>
      }
    </div>
  `,
  styles: [],
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-testid]': '"file-upload"',
  },
})
export class FileUploadComponent {
  // Inputs
  readonly config = input.required<FileUploadConfig>();
  readonly disabled = input(false);
  readonly uploadText = input('Cliquez pour sélectionner ou glissez-déposez votre fichier');
  readonly uploadingText = input('Téléchargement en cours...');
  readonly hintText = computed(() => {
    const config = this.config();
    return `Formats acceptés: ${config.accept} • Taille max: ${config.maxSizeInMB}MB`;
  });

  // Outputs
  readonly fileSelected = output<FileUploadEvent>();
  readonly fileCleared = output<void>();

  // View child
  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // Signals for state management
  readonly selectedFile = signal<File | null>(null);
  readonly validationErrors = signal<string[]>([]);
  readonly isDragOver = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);

  // Computed properties
  readonly hasErrors = computed(() => this.validationErrors().length > 0);
  readonly hostClasses = computed(() => {
    const classes = ['file-upload'];
    if (this.disabled()) classes.push('file-upload--disabled');
    if (this.hasErrors()) classes.push('file-upload--error');
    return classes.join(' ');
  });

  triggerFileInput(): void {
    if (this.disabled() || this.isUploading()) return;
    this.fileInput().nativeElement.click();
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled() && !this.isUploading()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.disabled() || this.isUploading()) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  clearFile(event?: Event): void {
    event?.stopPropagation();
    this.selectedFile.set(null);
    this.validationErrors.set([]);
    this.fileInput().nativeElement.value = '';
    this.fileCleared.emit();
  }

  setUploadProgress(progress: number): void {
    this.uploadProgress.set(Math.min(100, Math.max(0, progress)));
  }

  setUploading(uploading: boolean): void {
    this.isUploading.set(uploading);
    if (!uploading) {
      this.uploadProgress.set(0);
    }
  }

  private handleFile(file: File): void {
    const validation = this.validateFile(file);
    this.validationErrors.set(validation.errors);

    if (validation.valid) {
      this.selectedFile.set(file);
      this.fileSelected.emit({
        file,
        isValid: true,
        errors: [],
      });
    } else {
      this.selectedFile.set(null);
      this.fileSelected.emit({
        file,
        isValid: false,
        errors: validation.errors,
      });
    }
  }

  private validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    const config = this.config();

    // Check file size
    const maxSizeInBytes = config.maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      errors.push(`Le fichier est trop volumineux (max: ${config.maxSizeInMB}MB)`);
    }

    // Check file type
    const acceptedTypes = config.accept.split(',').map((type) => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return mimeType.startsWith(baseType);
      }
      return mimeType === type;
    });

    if (!isAccepted) {
      errors.push(`Type de fichier non supporté (acceptés: ${config.accept})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
