import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@core/services/config';
import { JobtrackGateway } from '../domain/gateways/jobtrack.gateway';
import type {
  CreateJobTrackWithReminderDto,
  DocumentType,
  JobStatus,
  JobTrack,
  UpdateJobTrackWithReminderDto,
} from '../domain/models/jobtrack.model';

@Injectable()
export class HttpJobtrackGateway extends JobtrackGateway {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);

  private get apiBase(): string {
    return `${this.configService.apiUrl.replace(/\/$/, '')}/jobtrack`;
  }

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
    upsert: boolean,
  ): Observable<JobTrack> {
    return this.http.put<JobTrack>(
      `${this.apiBase}/${id}/with-reminder?upsert=${upsert}`,
      payload,
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }

  uploadDocument(jobTrackId: string, type: DocumentType, file: File): Observable<{ fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ fileName: string }>(`${this.apiBase}/${jobTrackId}/${type}`, formData);
  }

  downloadDocument(jobTrackId: string, type: DocumentType): Observable<Blob> {
    return this.http.get(`${this.apiBase}/${jobTrackId}/${type}`, { responseType: 'blob' });
  }

  deleteDocument(jobTrackId: string, type: DocumentType): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${jobTrackId}/${type}`);
  }
}
