import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { JobTrack } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class ListJobtracksUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(): Observable<JobTrack[]> {
    return this.gateway.list();
  }
}
