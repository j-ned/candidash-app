import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import type { ConfirmModalData } from './confirm-modal';

@Component({
  selector: 'app-confirm-modal-view',
  imports: [NgOptimizedImage],
  template: `
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] animate-in fade-in duration-200"
      (click)="onCancel()"
      aria-hidden="true"
    ></div>
    <div
      class="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in zoom-in-95 fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        class="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-card border border-border shadow-2xl transition-all sm:w-full"
      >
        <div class="px-6 pt-6 pb-4">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              @if (data().type === 'danger') {
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                  <img
                    [ngSrc]="'/icons/alert-triangle.svg'"
                    alt="Attention"
                    class="h-6 w-6 text-error icon-error"
                    width="24"
                    height="24"
                  />
                </div>
              } @else if (data().type === 'warning') {
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                  <img
                    [ngSrc]="'/icons/alert-circle.svg'"
                    alt="Avertissement"
                    class="h-6 w-6 text-warning icon-warning"
                    width="24"
                    height="24"
                  />
                </div>
              } @else {
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <img
                    [ngSrc]="'/icons/help-circle.svg'"
                    alt="Question"
                    class="h-6 w-6 text-primary icon-primary"
                    width="24"
                    height="24"
                  />
                </div>
              }
            </div>

            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold text-text leading-6 mb-2" id="modal-title">
                {{ data().title }}
              </h2>
              <p class="text-sm text-muted leading-relaxed" id="modal-description">
                {{ data().message }}
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 pb-6 pt-2">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              (click)="onCancel()"
              class="inline-flex justify-center items-center px-4 py-2.5 text-sm font-medium text-text bg-background border border-border rounded-lg hover:bg-surface hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out active:scale-95 sm:w-auto w-full"
            >
              {{ data().cancelText ?? 'Annuler' }}
            </button>

            <button
              type="button"
              (click)="onConfirm()"
              [class]="getConfirmButtonClasses()"
              class="inline-flex justify-center items-center px-4 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-in-out active:scale-95 sm:w-auto w-full"
            >
              {{ data().confirmText ?? 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fixed inset-0 z-[1000]',
  },
})
export class ConfirmModalView {
  data = input.required<ConfirmModalData>();
  confirmed = output<boolean>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit(true);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  getConfirmButtonClasses(): string {
    const baseClasses = 'text-white border';

    switch (this.data().type) {
      case 'danger':
        return `${baseClasses} bg-error border-error hover:bg-error-600 hover:border-error-600 focus:ring-error/50`;
      case 'warning':
        return `${baseClasses} bg-warning border-warning hover:bg-warning-600 hover:border-warning-600 focus:ring-warning/50 text-text`;
      default:
        return `${baseClasses} bg-primary border-primary hover:bg-primary-600 hover:border-primary-600 focus:ring-primary/50`;
    }
  }
}
