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
import { ForgotPasswordModalView } from '../forgot-password-modal-view';
import type { ForgotPasswordModalData } from '../forgot-password-modal';

// Minimal typings to avoid `any`
type SubscriptionLike = { unsubscribe: () => void };
interface Subscribable<T> {
  subscribe: (cb: (value: T) => void) => SubscriptionLike;
}

interface ForgotPasswordModalComponent {
  emailSubmitted: Subscribable<string>;
  cancelled: Subscribable<void>;
}

@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordModalService {
  private modalComponentRef: ComponentRef<ForgotPasswordModalComponent> | null = null;
  private readonly modalStack = signal<ComponentRef<ForgotPasswordModalComponent>[]>([]);

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  async showForgotPasswordModal(data: ForgotPasswordModalData): Promise<{
    email?: string;
    cancelled?: boolean;
  }> {
    return new Promise<{ email?: string; cancelled?: boolean }>((resolve) => {
      const modalRef = createComponent(
        ForgotPasswordModalView as unknown as Type<ForgotPasswordModalComponent>,
        {
          environmentInjector: this.injector,
        }
      );

      modalRef.setInput('data', data);
      const instance = modalRef.instance as ForgotPasswordModalComponent;

      // Handle email submission
      const emailSubscription = instance.emailSubmitted.subscribe((email: string) => {
        emailSubscription.unsubscribe();
        this.closeModal(modalRef);
        resolve({ email });
      });

      // Handle cancellation
      const cancelSubscription = instance.cancelled.subscribe(() => {
        cancelSubscription.unsubscribe();
        this.closeModal(modalRef);
        resolve({ cancelled: true });
      });

      this.showModal(modalRef);
      this.modalComponentRef = modalRef;
    });
  }

  private showModal(modalRef: ComponentRef<ForgotPasswordModalComponent>): void {
    this.appRef.attachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    document.body.appendChild(modalElement);

    this.modalStack.update((stack) => [...stack, modalRef]);
    document.body.style.overflow = 'hidden';
  }

  private closeModal(modalRef: ComponentRef<ForgotPasswordModalComponent>): void {
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