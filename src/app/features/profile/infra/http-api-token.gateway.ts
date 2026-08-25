import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Config } from '@core/services/config';
import { ApiTokenGateway } from '../domain/gateways/api-token.gateway';
import type { ApiToken, ApiTokenCreated } from '../domain/models/api-token.model';
import type { ApiTokenApi, ApiTokenCreatedApi } from './api-token.types';
import { toApiToken, toApiTokenCreated } from './api-token.adapter';

@Injectable()
export class HttpApiTokenGateway extends ApiTokenGateway {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/api-tokens`;
  }

  create(nomAffiche: string): Observable<ApiTokenCreated> {
    return this.http
      .post<ApiTokenCreatedApi>(this.baseUrl, { nomAffiche })
      .pipe(map(toApiTokenCreated));
  }

  list(): Observable<ApiToken[]> {
    return this.http
      .get<ApiTokenApi[]>(this.baseUrl)
      .pipe(map((items) => items.map(toApiToken)));
  }

  revoke(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
