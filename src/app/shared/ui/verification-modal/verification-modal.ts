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
import { VerificationModalView } from './verification-modal-view';

export interface VerificationModalData {
  email: string;
}

// Minimal typings to avoid `any`
type SubscriptionLike = { unsubscribe: () => void };
interface Subscribable<T> {
  subscribe: (cb: (value: T) => void) => SubscriptionLike;
}

interface VerificationModalComponent {
  verificationSubmitted: Subscribable<string>;
  resendRequested: Subscribable<void>;
  cancelled: Subscribable<void>;
}

@Injectable({
  providedIn: 'root',
})
export class VerificationModalService {
  private modalComponentRef: ComponentRef<VerificationModalComponent> | null = null;
  private readonly modalStack = signal<ComponentRef<VerificationModalComponent>[]>([]);

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  async showVerificationModal(data: VerificationModalData): Promise<{
    verificationCode?: string;
    resend?: boolean;
    cancelled?: boolean;
  }> {
    return new Promise<{ verificationCode?: string; resend?: boolean; cancelled?: boolean }>((resolve) => {
      const modalRef = createComponent(
        VerificationModalView as unknown as Type<VerificationModalComponent>,
        {
          environmentInjector: this.injector,
        }
      );

      modalRef.setInput('data', data);
      const instance = modalRef.instance as VerificationModalComponent;

      // Handle verification submission
      const verificationSubscription = instance.verificationSubmitted.subscribe((code: string) => {
        verificationSubscription.unsubscribe();
        this.closeModal(modalRef);
        resolve({ verificationCode: code });
      });

      // Handle resend request
      const resendSubscription = instance.resendRequested.subscribe(() => {
        resendSubscription.unsubscribe();
        this.closeModal(modalRef);
        resolve({ resend: true });
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

  private showModal(modalRef: ComponentRef<VerificationModalComponent>): void {
    this.appRef.attachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    document.body.appendChild(modalElement);

    this.modalStack.update((stack) => [...stack, modalRef]);
    document.body.style.overflow = 'hidden';
  }

  private closeModal(modalRef: ComponentRef<VerificationModalComponent>): void {
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