import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ConfirmModalData } from './confirm-modal';

@Component({
  selector: 'app-confirm-modal-view',
  template: `
    <div class="cd-modal-backdrop" (click)="onCancel()"></div>
    <div class="cd-modal" role="dialog" aria-modal="true" [attr.aria-label]="data().title">
      <header class="cd-modal__header">
        <h2 class="cd-modal__title">{{ data().title }}</h2>
      </header>
      <section class="cd-modal__body">
        <p>{{ data().message }}</p>
      </section>
      <footer class="cd-modal__footer">
        <button type="button" class="cd-btn cd-btn--secondary" (click)="onCancel()">
          {{ data().cancelText ?? 'Annuler' }}
        </button>
        <button type="button" class="cd-btn" [class.cd-btn--danger]="data().type === 'danger'" [class.cd-btn--warning]="data().type === 'warning'" (click)="onConfirm()">
          {{ data().confirmText ?? 'Confirmer' }}
        </button>
      </footer>
    </div>
  `,
  // Standalone is default in Angular 20+; no need to set it explicitly
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cd-modal-host',
  },
})
export class ConfirmModalView {
  // Inputs/Outputs modern API
  data = input.required<ConfirmModalData>();
  confirmed = output<boolean>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit(true);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
