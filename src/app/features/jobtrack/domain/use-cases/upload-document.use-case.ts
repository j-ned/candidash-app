import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { DocumentType } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class UploadDocumentUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(jobTrackId: string, type: DocumentType, file: File): Observable<{ fileName: string }> {
    return this.gateway.uploadDocument(jobTrackId, type, file);
  }
}
