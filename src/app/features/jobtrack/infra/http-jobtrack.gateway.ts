import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Config } from '@core/services/config';
import { JobtrackGateway } from '../domain/gateways/jobtrack.gateway';
import type { JobTrackApi } from './jobtrack.types';
import { toJobTrack } from './jobtrack.adapter';
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

  listUrl(): string {
    return this.apiBase;
  }

  getUrl(id: string): string {
    return `${this.apiBase}/${id}`;
  }

  list(): Observable<JobTrack[]> {
    return this.http
      .get<JobTrackApi[]>(this.apiBase)
      .pipe(map((items) => items.map(toJobTrack)));
  }

  listByStatus(status: JobStatus): Observable<JobTrack[]> {
    return this.http
      .get<JobTrackApi[]>(`${this.apiBase}/status/${status}`)
      .pipe(map((items) => items.map(toJobTrack)));
  }

  get(id: string): Observable<JobTrack> {
    return this.http
      .get<JobTrackApi>(`${this.apiBase}/${id}`)
      .pipe(map(toJobTrack));
  }

  createWithReminder(payload: CreateJobTrackWithReminderDto): Observable<JobTrack> {
    return this.http
      .post<JobTrackApi>(`${this.apiBase}/with-reminder`, payload)
      .pipe(map(toJobTrack));
  }

  updateWithReminder(
    id: string,
    payload: UpdateJobTrackWithReminderDto,
    upsert: boolean,
  ): Observable<JobTrack> {
    return this.http
      .put<JobTrackApi>(
        `${this.apiBase}/${id}/with-reminder?upsert=${upsert}`,
        payload,
      )
      .pipe(map(toJobTrack));
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
