import { Observable } from 'rxjs';
import type {
  CreateJobTrackWithReminderDto,
  DocumentType,
  JobStatus,
  JobTrack,
  UpdateJobTrackWithReminderDto,
} from '../models/jobtrack.model';

export abstract class JobtrackGateway {
  abstract list(): Observable<JobTrack[]>;
  abstract listByStatus(status: JobStatus): Observable<JobTrack[]>;
  abstract get(id: string): Observable<JobTrack>;
  abstract createWithReminder(payload: CreateJobTrackWithReminderDto): Observable<JobTrack>;
  abstract updateWithReminder(
    id: string,
    payload: UpdateJobTrackWithReminderDto,
    upsert: boolean,
  ): Observable<JobTrack>;
  abstract delete(id: string): Observable<void>;
  abstract uploadDocument(jobTrackId: string, type: DocumentType, file: File): Observable<{ fileName: string }>;
  abstract downloadDocument(jobTrackId: string, type: DocumentType): Observable<Blob>;
  abstract deleteDocument(jobTrackId: string, type: DocumentType): Observable<void>;
}
