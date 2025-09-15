import {
  Injectable,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  signal,
  ComponentRef,
  inject,
  Type,
} from '@angular/core';
import { ConfirmModalView } from './confirm-modal-view';

export interface ConfirmModalData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

type SubscriptionLike = { unsubscribe: () => void };
interface Subscribable<T> {
  subscribe: (cb: (value: T) => void) => SubscriptionLike;
}

interface ConfirmModalComponent {
  confirmed: Subscribable<boolean>;
  cancelled: Subscribable<void>;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmModalService {
  private modalComponentRef: ComponentRef<ConfirmModalComponent> | null = null;
  private readonly modalStack = signal<ComponentRef<ConfirmModalComponent>[]>([]);

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  async confirm(data: ConfirmModalData): Promise<boolean> {
    console.log('ConfirmModalService.confirm called with:', data);
    return new Promise<boolean>((resolve) => {
      const modalRef = createComponent(ConfirmModalView as unknown as Type<ConfirmModalComponent>, {
        environmentInjector: this.injector,
      });

      console.log('Modal component created:', modalRef);
      modalRef.setInput('data', data);

      const instance = modalRef.instance as ConfirmModalComponent;
      console.log('Modal instance:', instance);

      const subscription = instance.confirmed.subscribe((confirmed: boolean) => {
        console.log('Modal confirmed:', confirmed);
        subscription.unsubscribe();
        this.closeModal(modalRef);
        resolve(confirmed);
      });

      const cancelSubscription = instance.cancelled.subscribe(() => {
        console.log('Modal cancelled');
        cancelSubscription.unsubscribe();
        this.closeModal(modalRef);
        resolve(false);
      });

      this.showModal(modalRef);
      console.log('Modal shown');

      this.modalComponentRef = modalRef;
    });
  }

  private showModal(modalRef: ComponentRef<ConfirmModalComponent>): void {
    this.appRef.attachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    document.body.appendChild(modalElement);

    this.modalStack.update((stack) => [...stack, modalRef]);

    document.body.style.overflow = 'hidden';
  }

  private closeModal(modalRef: ComponentRef<ConfirmModalComponent>): void {
    this.modalStack.update((stack) => stack.filter((ref) => ref !== modalRef));

    this.appRef.detachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    modalElement?.parentNode?.removeChild(modalElement);

    modalRef.destroy();

    if (this.modalStack().length === 0) {
      document.body.style.overflow = '';
    }

    if (this.modalComponentRef === modalRef) {
      this.modalComponentRef = null;
    }
  }

  closeAllModals(): void {
    const modals = [...this.modalStack()];
    modals.forEach((modalRef) => this.closeModal(modalRef));
  }
}
