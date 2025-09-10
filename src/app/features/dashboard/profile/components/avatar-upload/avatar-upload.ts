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
import { ImageFallbackDirective } from '@shared/directives/image-fallback.directive';
import {
  FileUploadComponent,
  FileUploadConfig,
  FileUploadEvent,
} from '@features/dashboard/profile/components/file-upload/file-upload';

export interface AvatarUploadEvent {
  file: File;
  isValid: boolean;
  errors: string[];
}

/**
 * Specialized avatar upload component with image preview
 * Follows Angular 20+ best practices with signals and standalone architecture
 */
@Component({
  selector: 'app-avatar-upload',
  imports: [CommonModule, FileUploadComponent, ImageFallbackDirective, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 w-full">
      <!-- Current Avatar Display -->
      <div class="flex items-center gap-4">
        <div class="relative w-20 h-20 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 flex-shrink-0">
          @if (currentAvatarUrl() && !isUploading()) {
            <img
              [ngSrc]="currentAvatarUrl()!"
              [alt]="avatarAlt()"
              appImageFallback
              [fallbackInitials]="userInitials()"
              class="w-full h-full object-cover"
              fill
            />
          } @else {
            <div class="w-full h-full bg-indigo-600 text-white flex items-center justify-center">
              @if (isUploading()) {
                <div class="flex items-center justify-center">
                  <img
                    [ngSrc]="'/icons/spinner.svg'"
                    alt="Chargement de l'avatar"
                    class="w-6 h-6 animate-spin"
                    fill
                  />
                </div>
              } @else {
                <span class="text-xl font-semibold">{{ userInitials() }}</span>
              }
            </div>
          }
        </div>

        <div class="flex-1">
          <p class="font-semibold text-slate-900 dark:text-slate-100 m-0 mb-1">Photo de profil</p>
          <p class="text-sm text-slate-500 dark:text-slate-400 m-0">
            JPG, PNG ou WebP • Maximum {{ avatarConfig().maxSizeInMB }}MB
          </p>
        </div>
      </div>

      <!-- Upload Component -->
      <div class="w-full">
        <app-file-upload
          #uploadComponent
          [config]="avatarConfig()"
          [disabled]="disabled() || isUploading()"
          [uploadText]="uploadText()"
          [uploadingText]="uploadingText()"
          (fileSelected)="onFileSelected($event)"
          (fileCleared)="onFileCleared()"
        />
      </div>

      <!-- Action Buttons -->
      @if (currentAvatarUrl() && !isUploading()) {
        <div class="flex gap-3 flex-wrap">
          <button
            type="button"
            (click)="removeAvatar()"
            [disabled]="disabled()"
            class="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            Supprimer l'avatar
          </button>
        </div>
      }
    </div>
  `,
  styles: [],
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-testid]': '"avatar-upload"',
  },
})
export class AvatarUploadComponent {
  private readonly fileUrlService = inject(FileUrlService);

  // Inputs
  readonly currentAvatarPath = input<string | null | undefined>(null);
  readonly userInitials = input.required<string>();
  readonly userName = input<string>('Utilisateur');
  readonly disabled = input(false);
  readonly uploadText = input('Glissez votre photo ici ou cliquez pour sélectionner');
  readonly uploadingText = input('Téléchargement de votre avatar...');

  // Outputs
  readonly avatarSelected = output<AvatarUploadEvent>();
  readonly avatarRemoved = output<void>();

  // ViewChild for upload component
  readonly uploadComponent = viewChild<FileUploadComponent>('uploadComponent');

  // Signals for state management
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isUploading = signal(false);

  // Computed properties
  readonly currentAvatarUrl = computed(() => {
    const avatarPath = this.currentAvatarPath();
    return avatarPath ? this.fileUrlService.getAvatarUrl(avatarPath) : null;
  });

  readonly avatarAlt = computed(() => `Avatar de ${this.userName()}`);

  readonly avatarConfig = computed(
    (): FileUploadConfig => ({
      accept: 'image/*,.jpg,.jpeg,.png,.webp',
      maxSizeInMB: 5,
      allowMultiple: false,
    }),
  );

  readonly hostClasses = computed(() => {
    const classes = ['avatar-upload'];
    if (this.disabled()) classes.push('avatar-upload--disabled');
    if (this.isUploading()) classes.push('avatar-upload--uploading');
    return classes.join(' ');
  });

  onFileSelected(event: FileUploadEvent): void {
    if (event.isValid) {
      this.selectedFile.set(event.file);
      // Don't create blob URL preview - will show current avatar until upload completes
      this.previewUrl.set(null);
    } else {
      this.selectedFile.set(null);
      this.previewUrl.set(null);
    }

    this.avatarSelected.emit({
      file: event.file,
      isValid: event.isValid,
      errors: event.errors,
    });
  }

  onFileCleared(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }


  removeAvatar(): void {
    this.avatarRemoved.emit();
  }

  setUploading(uploading: boolean): void {
    this.isUploading.set(uploading);
    this.uploadComponent()?.setUploading(uploading);
  }

  setUploadProgress(progress: number): void {
    this.uploadComponent()?.setUploadProgress(progress);
  }
}
