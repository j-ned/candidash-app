export type JobStatus = 'APPLIED' | 'PENDING' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED';

export type ContractType = 'CDI' | 'CDD' | 'INTERIM' | 'STAGE' | 'ALTERNANCE' | 'FREELANCE';

export interface Reminder {
  id: string;
  jobTrackId: string;
  frequency: number; // days
  nextReminderAt: string; // ISO date string
  lastSentAt?: string | null; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface JobTrack {
  id: string;
  userId: string;
  title: string;
  company?: string | null;
  jobUrl?: string | null;
  status: JobStatus;
  appliedAt?: string | null; // ISO date string
  contractType?: ContractType | null;
  notes?: string | null;
  attachments?: Record<string, JsonValue> | null;
  reminder?: Reminder | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobTrackDto {
  title: string;
  company?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: JobStatus;
  contractType?: ContractType;
  notes?: string;
}

export type UpdateJobTrackDto = Partial<CreateJobTrackDto>;

export interface CreateReminderDto {
  frequency: number; // >= 1 (days)
  nextReminderAt: string; // ISO date string
  isActive?: boolean; // default true
}

export type UpdateReminderDto = Partial<CreateReminderDto>;

export interface CreateJobTrackWithReminderDto {
  title: string;
  company?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: JobStatus;
  contractType?: ContractType;
  notes?: string;
  frequency: number;
  nextReminderAt: string;
  isActive?: boolean;
}

export interface UpdateJobTrackWithReminderDto {
  title?: string;
  company?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: JobStatus;
  contractType?: ContractType;
  notes?: string;
  frequency?: number;
  nextReminderAt?: string;
  isActive?: boolean;
}
