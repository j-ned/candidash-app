import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Config } from '@core/services/config';
import { toBrowserFamily, type BrowserFamily } from './browser-family';

export type ExtensionStatus =
  | 'unknown'
  | 'checking'
  | 'installed'
  | 'not-installed'
  | 'unavailable';

export const PING_TIMEOUT_MS = 500;

// Set on <html> at document_start by the extension's content script (Chrome and Firefox).
export const EXTENSION_MARKER_ATTRIBUTE = 'data-candidash-extension';

type ChromeRuntime = {
  sendMessage: (extensionId: string, message: unknown, callback: (reply: unknown) => void) => void;
  readonly lastError?: { message?: string };
};

function getChromeRuntime(): ChromeRuntime | undefined {
  return (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
}

function isPongReply(reply: unknown): boolean {
  return typeof reply === 'object' && reply !== null && (reply as { pong?: unknown }).pong === true;
}

@Injectable({ providedIn: 'root' })
export class ExtensionDetection {
  private readonly config = inject(Config);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly browserFamily: BrowserFamily = this.isBrowser
    ? toBrowserFamily(navigator.userAgent)
    : 'other';

  private readonly _status = signal<ExtensionStatus>('unknown');
  readonly status = this._status.asReadonly();

  readonly installUrl = computed(() => {
    if (this.browserFamily === 'firefox') return this.config.firefoxAddonUrl ?? null;
    const extensionId = this.config.extensionId;
    return extensionId ? `https://chromewebstore.google.com/detail/${extensionId}` : null;
  });

  check(): void {
    if (this._status() !== 'unknown') return;
    if (!this.isBrowser) {
      this._status.set('unavailable');
      return;
    }

    if (this.document.documentElement.hasAttribute(EXTENSION_MARKER_ATTRIBUTE)) {
      this._status.set('installed');
      return;
    }

    // Firefox has no externally_connectable: without the marker, the add-on is absent.
    if (this.browserFamily === 'firefox') {
      this._status.set(this.config.firefoxAddonUrl ? 'not-installed' : 'unavailable');
      return;
    }

    const extensionId = this.config.extensionId;
    const runtime = getChromeRuntime();

    if (!extensionId || !runtime) {
      this._status.set('unavailable');
      return;
    }

    this._status.set('checking');
    void this.ping(runtime, extensionId).then((installed) => {
      this._status.set(installed ? 'installed' : 'not-installed');
    });
  }

  private ping(runtime: ChromeRuntime, extensionId: string): Promise<boolean> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pingReply = new Promise<boolean>((resolve) => {
      try {
        runtime.sendMessage(extensionId, { type: 'PING' }, (reply) => {
          // Reading chrome.runtime.lastError inside the callback is required to suppress
          // Chrome's "Unchecked runtime.lastError" console warning when the target extension
          // doesn't exist or doesn't respond — the failure is expected and already handled by
          // resolving false below.
          void runtime.lastError;
          resolve(isPongReply(reply));
        });
      } catch {
        resolve(false);
      }
    });

    const timeout = new Promise<boolean>((resolve) => {
      timeoutId = setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    });

    return Promise.race([pingReply, timeout]).finally(() => clearTimeout(timeoutId));
  }
}
