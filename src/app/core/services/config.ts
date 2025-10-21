import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class Config {
  private config?: AppConfig;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get<AppConfig>('/config.json')
      );
    } catch (error) {
      console.error('Failed to load config.json, using defaults', error);
      // Fallback to default config in case of error
      this.config = {
        apiUrl: 'http://localhost:3000/api/v1',
      };
    }
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  get apiUrl(): string {
    return this.getConfig().apiUrl;
  }
}
