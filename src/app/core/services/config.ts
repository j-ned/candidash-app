import { inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export type AppConfig = {
  apiUrl: string;
  extensionId?: string;
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable({
  providedIn: 'root',
})
export class Config {
  private readonly http = inject(HttpClient);
  private readonly defaultApiUrl = inject(API_BASE_URL);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private config?: AppConfig;

  async loadConfig(): Promise<void> {
    // Runtime config = navigateur uniquement. Côté SSR, fetch `/config.json`
    // (URL relative) pollue le transfer cache d'hydratation avec le fallback,
    // et le client réutilise cette valeur figée au lieu de la config runtime.
    if (!this.isBrowser) return;

    try {
      this.config = await firstValueFrom(this.http.get<AppConfig>('/config.json').pipe(timeout(5000)));
    } catch {
      this.config = { apiUrl: this.defaultApiUrl };
    }
  }

  get apiUrl(): string {
    return this.config?.apiUrl ?? this.defaultApiUrl;
  }

  get extensionId(): string | undefined {
    return this.config?.extensionId;
  }
}
