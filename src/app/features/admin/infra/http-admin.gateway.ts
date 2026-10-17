import { Injectable, inject } from '@angular/core';
import { Config } from '@core/services/config';
import type { AnalyticsPeriod } from '../domain/models/admin.model';

// Lecture seule et chargement par httpResource : la gateway fournit les URL.
@Injectable({ providedIn: 'root' })
export class HttpAdminGateway {
  private readonly config = inject(Config);

  usersUrl(): string {
    return `${this.config.apiUrl}/admin/users`;
  }

  analyticsUrl(days: AnalyticsPeriod): string {
    return `${this.config.apiUrl}/admin/analytics?days=${days}`;
  }
}
