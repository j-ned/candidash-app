import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Icon } from '@shared/ui/icon/icon';
import { Config } from '@core/services/config';
import { ExtensionDetection } from './service/extension-detection';

const DISMISSED_KEY = 'extension-banner-dismissed';

@Component({
  selector: 'app-extension-banner',
  imports: [Icon],
  template: `
    @if (visible()) {
      <div
        role="status"
        class="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm mb-4"
      >
        <div class="flex items-center gap-2">
          <app-icon name="lucide-download" cssClass="w-4 h-4 text-primary shrink-0" />
          @if (status() === 'not-installed') {
            <span class="text-text">
              Ajoute une annonce en un clic pendant que tu navigues, avec l'extension Chrome Candidash.
            </span>
            <a
              [href]="webStoreUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline shrink-0 inline-flex items-center gap-1"
            >
              Installer
              <app-icon name="lucide-external-link" cssClass="w-3 h-3" />
            </a>
          } @else {
            <span class="text-text">
              L'extension Chrome Candidash arrive bientôt — ajoute une annonce en un clic pendant que tu navigues.
            </span>
          }
        </div>
        <button
          type="button"
          (click)="dismiss()"
          aria-label="Fermer ce message"
          class="text-muted hover:text-text transition-colors shrink-0"
        >
          <app-icon name="lucide-x" cssClass="w-4 h-4" />
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionBanner {
  private readonly detection = inject(ExtensionDetection);
  private readonly config = inject(Config);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = this.detection.status;
  private readonly dismissed = signal(this.readDismissed());

  protected readonly visible = computed(
    () => !this.dismissed() && (this.status() === 'not-installed' || this.status() === 'unavailable'),
  );

  protected readonly webStoreUrl = computed(
    () => `https://chromewebstore.google.com/detail/${this.config.extensionId}`,
  );

  constructor() {
    afterNextRender(() => this.detection.check());
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (this.isBrowser) {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
  }

  private readDismissed(): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  }
}
