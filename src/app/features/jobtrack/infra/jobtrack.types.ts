import type {
  ContractType,
  JobStatus,
  JsonValue,
} from '../domain/models/jobtrack.model';

/** Formes brutes renvoyées par l'API. Les dates restent en ISO string
 *  (représentation domain volontaire ici : le form lit `appliedAt` en string). */
export type ReminderApi = {
  id: string;
  jobTrackId: string;
  frequency: number;
  nextReminderAt: string;
  lastSentAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobTrackApi = {
  id: string;
  userId: string;
  title: string;
  company?: string | null;
  jobUrl?: string | null;
  status: JobStatus;
  appliedAt?: string | null;
  contractType?: ContractType | null;
  notes?: string | null;
  attachments?: Record<string, JsonValue> | null;
  cvFileName?: string | null;
  lmFileName?: string | null;
  reminder?: ReminderApi | null;
  createdAt: string;
  updatedAt: string;
};
