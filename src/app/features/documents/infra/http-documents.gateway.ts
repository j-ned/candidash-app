import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Config } from '@core/services/config';
import type {
  CreateDocumentPayload,
  DocumentDetail,
  DuplicateDocumentPayload,
  UpdateDocumentPayload,
} from '../domain/models/document.model';
import { toDocumentDetail } from './document.adapter';
import type { DocumentDetailApi } from './document.types';

// Une seule implémentation : classe concrète. Les lectures passent par httpResource (la gateway
// fournit les URL), les écritures par des Observables.
@Injectable({ providedIn: 'root' })
export class HttpDocumentsGateway {
  private readonly http = inject(HttpClient);
  private readonly config = inject(Config);

  private get base(): string {
    return `${this.config.apiUrl.replace(/\/$/, '')}/documents`;
  }

  listUrl(): string {
    return this.base;
  }

  detailUrl(id: string): string {
    return `${this.base}/${encodeURIComponent(id)}`;
  }

  create(payload: CreateDocumentPayload): Observable<DocumentDetail> {
    return this.http.post<DocumentDetailApi>(this.base, payload).pipe(map(toDocumentDetail));
  }

  update(id: string, payload: UpdateDocumentPayload): Observable<DocumentDetail> {
    return this.http
      .put<DocumentDetailApi>(this.detailUrl(id), payload)
      .pipe(map(toDocumentDetail));
  }

  duplicate(id: string, payload: DuplicateDocumentPayload): Observable<DocumentDetail> {
    return this.http
      .post<DocumentDetailApi>(`${this.detailUrl(id)}/duplicate`, payload)
      .pipe(map(toDocumentDetail));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.detailUrl(id));
  }
}
