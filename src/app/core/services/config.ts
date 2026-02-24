import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export type AppConfig = {
  apiUrl: string;
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable({
  providedIn: 'root',
})
export class Config {
  private readonly http = inject(HttpClient);
  private readonly defaultApiUrl = inject(API_BASE_URL);

  private config?: AppConfig;

  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(this.http.get<AppConfig>('/config.json').pipe(timeout(5000)));
    } catch {
      this.config = { apiUrl: this.defaultApiUrl };
    }
  }

  get apiUrl(): string {
    return this.config?.apiUrl ?? this.defaultApiUrl;
  }
}
