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
import { PdfViewerModalView } from './pdf-viewer-modal-view';
import type { PdfViewerModalData } from './pdf-viewer-modal-view';

type SubscriptionLike = { unsubscribe: () => void };
interface Subscribable<T> {
  subscribe: (cb: (value: T) => void) => SubscriptionLike;
}

interface PdfViewerModalComponent {
  closed: Subscribable<void>;
  downloaded: Subscribable<void>;
}

@Injectable({
  providedIn: 'root',
})
export class PdfViewerModal {
  private modalComponentRef: ComponentRef<PdfViewerModalComponent> | null = null;
  private readonly modalStack = signal<ComponentRef<PdfViewerModalComponent>[]>([]);

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  open(data: PdfViewerModalData, onDownload: () => void): void {
    const modalRef = createComponent(PdfViewerModalView as unknown as Type<PdfViewerModalComponent>, {
      environmentInjector: this.injector,
    });

    modalRef.setInput('data', data);

    const instance = modalRef.instance;

    const closedSub = instance.closed.subscribe(() => {
      closedSub.unsubscribe();
      downloadedSub.unsubscribe();
      this.closeModal(modalRef, data.blobUrl);
    });

    const downloadedSub = instance.downloaded.subscribe(() => {
      onDownload();
    });

    this.showModal(modalRef);
    this.modalComponentRef = modalRef;
  }

  private showModal(modalRef: ComponentRef<PdfViewerModalComponent>): void {
    this.appRef.attachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    document.body.appendChild(modalElement);

    this.modalStack.update((stack) => [...stack, modalRef]);
    document.body.style.overflow = 'hidden';
  }

  private closeModal(modalRef: ComponentRef<PdfViewerModalComponent>, blobUrl: string): void {
    this.modalStack.update((stack) => stack.filter((ref) => ref !== modalRef));

    this.appRef.detachView(modalRef.hostView);

    const modalElement = modalRef.location.nativeElement as HTMLElement;
    modalElement?.parentNode?.removeChild(modalElement);

    modalRef.destroy();

    URL.revokeObjectURL(blobUrl);

    if (this.modalStack().length === 0) {
      document.body.style.overflow = '';
    }

    if (this.modalComponentRef === modalRef) {
      this.modalComponentRef = null;
    }
  }
}
