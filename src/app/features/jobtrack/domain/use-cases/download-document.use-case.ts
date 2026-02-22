import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { DocumentType } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class DownloadDocumentUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(jobTrackId: string, type: DocumentType): Observable<Blob> {
    return this.gateway.downloadDocument(jobTrackId, type);
  }
}
