import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { Toaster } from '@shared/ui/toast/service/toast';
import { ToastData } from '@shared/ui/toast/model/toast-model';
import { Icon } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-toast',
  imports: [Icon],
  template: `
    <div
      [class]="toastClasses()"
      class="flex items-start p-4 mb-3 rounded-lg shadow-lg border-l-4 animate-slide-in-right"
      role="alert"
      [attr.aria-live]="toast().type === 'danger' ? 'assertive' : 'polite'"
    >
      <div class="flex-shrink-0 mr-3">
        @switch (toast().type) {
          @case ('success') {
            <app-icon name="lucide-circle-check" [cssClass]="'w-5 h-5 ' + iconClasses()" />
          }
          @case ('warning') {
            <app-icon name="lucide-triangle-alert" [cssClass]="'w-5 h-5 ' + iconClasses()" />
          }
          @case ('danger') {
            <app-icon name="lucide-circle-alert" [cssClass]="'w-5 h-5 ' + iconClasses()" />
          }
        }
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold mb-1" [class]="titleClasses()">
          {{ toast().title }}
        </h4>
        @if (toast().message) {
          <p class="text-sm" [class]="messageClasses()">
            {{ toast().message }}
          </p>
        }
      </div>

      @if (toast().dismissible) {
        <button
          type="button"
          (click)="onDismiss()"
          class="ml-3 flex-shrink-0 p-1 rounded-full hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
          [class]="dismissButtonClasses()"
          aria-label="Fermer la notification"
        >
          <app-icon name="lucide-x" cssClass="w-4 h-4" />
        </button>
      }
    </div>
  `,
  styles: `
    @keyframes slide-in-right {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in-right {
      animation: slide-in-right 0.3s ease-out;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  private readonly toastService = inject(Toaster);

  readonly toast = input.required<ToastData>();
  readonly dismissed = output<string>();

  readonly toastClasses = computed(() => {
    const type = this.toast().type;
    const baseClasses = 'transition-all duration-300';

    switch (type) {
      case 'success':
        return `${baseClasses} bg-background border-success`;
      case 'warning':
        return `${baseClasses} bg-background border-warning`;
      case 'danger':
        return `${baseClasses} bg-background border-error`;
      default:
        return baseClasses;
    }
  });

  readonly iconClasses = computed(() => {
    const type = this.toast().type;

    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-error';
      default:
        return 'text-gray-900';
    }
  });

  readonly titleClasses = computed(() => {
    const type = this.toast().type;

    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-error';
      default:
        return 'text-gray-900';
    }
  });

  readonly messageClasses = computed(() => {
    const type = this.toast().type;

    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-error';
      default:
        return 'text-gray-900';
    }
  });

  readonly dismissButtonClasses = computed(() => {
    const type = this.toast().type;

    switch (type) {
      case 'success':
        return 'text-success hover:text-success-700 focus:ring-success';
      case 'warning':
        return 'text-warning hover:text-warning-700 focus:ring-warning';
      case 'danger':
        return 'text-error hover:text-error-700 focus:ring-error';
      default:
        return 'text-gray-600 hover:text-gray-800 focus:ring-gray-500';
    }
  });

  onDismiss(): void {
    this.dismissed.emit(this.toast().id);
    this.toastService.dismiss(this.toast().id);
  }
}
