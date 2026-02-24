import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Icon } from '@shared/ui/icon/icon';

export type PdfViewerModalData = {
  blobUrl: string;
  fileName: string;
};

@Component({
  selector: 'app-pdf-viewer-modal-view',
  imports: [Icon],
  template: `
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] animate-in fade-in duration-200"
      (click)="onClose()"
      aria-hidden="true"
    ></div>
    <div
      class="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in zoom-in-95 fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div class="relative w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div class="flex items-center gap-3 min-w-0">
            <app-icon name="lucide-file-text" cssClass="w-5 h-5 text-primary flex-shrink-0" />
            <h2 id="pdf-modal-title" class="text-lg font-semibold text-text truncate">
              {{ data().fileName }}
            </h2>
          </div>
          <button
            type="button"
            class="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
            (click)="onClose()"
            aria-label="Fermer"
          >
            <app-icon name="lucide-x" cssClass="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 min-h-0">
          <iframe [src]="safeUrl()" class="w-full h-full border-0"></iframe>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            (click)="onClose()"
            class="inline-flex items-center px-4 py-2.5 text-sm font-medium text-text bg-background border border-border rounded-lg hover:bg-surface hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out active:scale-95"
          >
            Fermer
          </button>
          <button
            type="button"
            (click)="onDownload()"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary border border-primary rounded-lg hover:bg-primary-600 hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out active:scale-95"
          >
            <app-icon name="lucide-download" cssClass="w-4 h-4" />
            Telecharger
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fixed inset-0 z-[1000]',
  },
})
export class PdfViewerModalView {
  private readonly sanitizer = inject(DomSanitizer);

  data = input.required<PdfViewerModalData>();
  closed = output<void>();
  downloaded = output<void>();

  readonly safeUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.data().blobUrl),
  );

  onClose(): void {
    this.closed.emit();
  }

  onDownload(): void {
    this.downloaded.emit();
  }
}
