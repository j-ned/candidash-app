import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { JobTrack } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class GetJobtrackUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(id: string): Observable<JobTrack> {
    return this.gateway.get(id);
  }
}
