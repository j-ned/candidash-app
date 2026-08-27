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
import { ExtensionDetection } from './service/extension-detection';

const DISMISSED_KEY = 'extension-banner-dismissed';

@Component({
  selector: 'app-extension-banner',
  imports: [Icon],
  template: `
    @if (visible()) {
      <div
        role="status"
        class="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm mb-4"
      >
        <div class="flex items-center gap-2">
          <svg
            viewBox="0 0 48 48"
            class="w-6 h-6 shrink-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="extension-banner-chrome-a" x1="3.2173" y1="15" x2="44.7812" y2="15" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#d93025" />
                <stop offset="1" stop-color="#ea4335" />
              </linearGradient>
              <linearGradient id="extension-banner-chrome-b" x1="20.7219" y1="47.6791" x2="41.5039" y2="11.6837" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#fcc934" />
                <stop offset="1" stop-color="#fbbc04" />
              </linearGradient>
              <linearGradient id="extension-banner-chrome-c" x1="26.5981" y1="46.5015" x2="5.8161" y2="10.506" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#1e8e3e" />
                <stop offset="1" stop-color="#34a853" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="23.9947" r="12" style="fill:#fff" />
            <path
              d="M24,12H44.7812a23.9939,23.9939,0,0,0-41.5639.0029L13.6079,30l.0093-.0024A11.9852,11.9852,0,0,1,24,12Z"
              style="fill:url(#extension-banner-chrome-a)"
            />
            <circle cx="24" cy="24" r="9.5" style="fill:#1a73e8" />
            <path
              d="M34.3913,30.0029,24.0007,48A23.994,23.994,0,0,0,44.78,12.0031H23.9989l-.0025.0093A11.985,11.985,0,0,1,34.3913,30.0029Z"
              style="fill:url(#extension-banner-chrome-b)"
            />
            <path
              d="M13.6086,30.0031,3.218,12.006A23.994,23.994,0,0,0,24.0025,48L34.3931,30.0029l-.0067-.0068a11.9852,11.9852,0,0,1-20.7778.007Z"
              style="fill:url(#extension-banner-chrome-c)"
            />
          </svg>
          @if (status() === 'not-installed') {
            <span class="text-text">
              Repère un poste qui te plaît en surfant ? Ajoute-le à Candidash en un clic avec l'extension Chrome !
            </span>
            @if (webStoreUrl(); as url) {
              <a
                [href]="url"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary hover:underline shrink-0 inline-flex items-center gap-1"
              >
                Installer
                <app-icon name="lucide-external-link" cssClass="w-3 h-3" />
              </a>
            }
          } @else {
            <span class="text-text">
              L'extension Chrome arrive bientôt !! tu pourras ajouter tes candidatures en un clic, sans quitter ta page.
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = this.detection.status;
  protected readonly webStoreUrl = this.detection.webStoreUrl;
  private readonly dismissed = signal(this.readDismissed());

  protected readonly visible = computed(
    () => !this.dismissed() && (this.status() === 'not-installed' || this.status() === 'unavailable'),
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
