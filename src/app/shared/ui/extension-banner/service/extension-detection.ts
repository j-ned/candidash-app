import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Config } from '@core/services/config';

export type ExtensionStatus =
  | 'unknown'
  | 'checking'
  | 'installed'
  | 'not-installed'
  | 'unavailable';

export const PING_TIMEOUT_MS = 500;

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (reply: unknown) => void,
  ) => void;
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _status = signal<ExtensionStatus>('unknown');
  readonly status = this._status.asReadonly();

  check(): void {
    if (this._status() !== 'unknown') return;

    const extensionId = this.config.extensionId;
    const runtime = this.isBrowser ? getChromeRuntime() : undefined;

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
    const pingReply = new Promise<boolean>((resolve) => {
      try {
        runtime.sendMessage(extensionId, { type: 'PING' }, (reply) => {
          void runtime.lastError;
          resolve(isPongReply(reply));
        });
      } catch {
        resolve(false);
      }
    });

    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    });

    return Promise.race([pingReply, timeout]);
  }
}
