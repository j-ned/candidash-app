import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { JobTrack, UpdateJobTrackWithReminderDto } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class UpdateJobtrackUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(id: string, payload: UpdateJobTrackWithReminderDto, upsert = false): Observable<JobTrack> {
    return this.gateway.updateWithReminder(id, payload, upsert);
  }
}
