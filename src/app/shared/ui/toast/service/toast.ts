import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastConfig, ToastData, ToastType } from '@shared/ui/toast/model/toast-model';
import { ConfirmModalService } from '@shared/ui/confirm-modal/confirm-modal';
import { ConfirmModalData } from '@shared/ui/confirm-modal/confirm-modal';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly confirmModalService = inject(ConfirmModalService);
  private readonly _toasts = signal<ToastData[]>([]);
  private readonly _config = signal<ToastConfig>({
    position: 'top-right',
    defaultDuration: 5000,
    maxToasts: 5,
  });

  readonly toasts = this._toasts.asReadonly();
  readonly config = this._config.asReadonly();

  readonly hasToasts = computed(() => this._toasts().length > 0);

  show(type: ToastType, title: string, message?: string, options?: Partial<ToastData>): void {
    const id = this.generateId();
    const duration = options?.duration ?? this._config().defaultDuration;
    const dismissible = options?.dismissible ?? true;

    const toast: ToastData = {
      id,
      type,
      title,
      message,
      duration,
      dismissible,
      ...options,
    };

    this._toasts.update((toasts) => {
      const newToasts = [...toasts, toast];
      const maxToasts = this._config().maxToasts!;

      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }

      return newToasts;
    });

    if (duration && duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(title: string, message?: string, options?: Partial<ToastData>): void {
    this.show('success', title, message, options);
  }

  warning(title: string, message?: string, options?: Partial<ToastData>): void {
    this.show('warning', title, message, options);
  }

  danger(title: string, message?: string, options?: Partial<ToastData>): void {
    this.show('danger', title, message, options);
  }

  dismiss(id: string): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  dismissAll(): void {
    this._toasts.set([]);
  }

  updateConfig(config: Partial<ToastConfig>): void {
    this._config.update((current) => ({ ...current, ...config }));
  }

  async confirm(data: ConfirmModalData): Promise<boolean> {
    return await this.confirmModalService.confirm(data);
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
