import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import type {
  CreateJobTrackWithReminderDto,
  JobTrack,
  UpdateJobTrackWithReminderDto,
  JobStatus,
} from '../models/jobtrack';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Jobtrack {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl.replace(/\/$/, '')}/jobtrack`;

  list(): Observable<JobTrack[]> {
    return this.http.get<JobTrack[]>(this.apiBase);
  }

  listByStatus(status: JobStatus): Observable<JobTrack[]> {
    return this.http.get<JobTrack[]>(`${this.apiBase}/status/${status}`);
  }

  get(id: string): Observable<JobTrack> {
    return this.http.get<JobTrack>(`${this.apiBase}/${id}`);
  }

  createWithReminder(payload: CreateJobTrackWithReminderDto): Observable<JobTrack> {
    return this.http.post<JobTrack>(`${this.apiBase}/with-reminder`, payload);
  }

  updateWithReminder(
    id: string,
    payload: UpdateJobTrackWithReminderDto,
    upsert = false,
  ): Observable<JobTrack> {
    return this.http.put<JobTrack>(`${this.apiBase}/${id}/with-reminder?upsert=${upsert}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }
}
