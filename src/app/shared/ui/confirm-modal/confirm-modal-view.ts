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
  styles: [`
    .cd-modal-host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cd-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    .cd-modal {
      position: relative;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 500px;
      width: 90vw;
      margin: 1rem;
      overflow: hidden;
    }

    .cd-modal__header {
      padding: 1.5rem 1.5rem 0 1.5rem;
    }

    .cd-modal__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
    }

    .cd-modal__body {
      padding: 1rem 1.5rem;
    }

    .cd-modal__body p {
      color: var(--color-muted-foreground);
      margin: 0;
      line-height: 1.5;
    }

    .cd-modal__footer {
      padding: 1rem 1.5rem 1.5rem 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .cd-btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid var(--color-border);
      background: var(--color-primary);
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cd-btn:hover {
      background: var(--color-primary-600);
    }

    .cd-btn--secondary {
      background: var(--color-background);
      color: var(--color-text);
      border-color: var(--color-border);
    }

    .cd-btn--secondary:hover {
      background: var(--color-surface-100);
    }

    .cd-btn--danger {
      background: var(--color-error);
      border-color: var(--color-error);
    }

    .cd-btn--danger:hover {
      background: var(--color-error-600);
    }

    .cd-btn--warning {
      background: var(--color-warning);
      border-color: var(--color-warning);
      color: var(--color-text);
    }

    .cd-btn--warning:hover {
      background: var(--color-warning-600);
    }
  `],
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
