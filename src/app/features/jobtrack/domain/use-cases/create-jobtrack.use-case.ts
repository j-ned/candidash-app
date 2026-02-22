import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateJobTrackWithReminderDto, JobTrack } from '../models/jobtrack.model';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class CreateJobtrackUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(payload: CreateJobTrackWithReminderDto): Observable<JobTrack> {
    return this.gateway.createWithReminder(payload);
  }
}
