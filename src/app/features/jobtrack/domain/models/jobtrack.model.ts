export type JobStatus = 'APPLIED' | 'PENDING' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED';

export type ContractType = 'CDI' | 'CDD' | 'INTERIM' | 'STAGE' | 'ALTERNANCE' | 'FREELANCE';

export type Reminder = {
  id: string;
  jobTrackId: string;
  frequency: number;
  nextReminderAt: string;
  lastSentAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JobTrack = {
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
  reminder?: Reminder | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateJobTrackDto = {
  title: string;
  company?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: JobStatus;
  contractType?: ContractType;
  notes?: string;
};

export type UpdateJobTrackDto = Partial<CreateJobTrackDto>;

export type CreateReminderDto = {
  frequency: number;
  nextReminderAt: string;
  isActive?: boolean;
};

export type UpdateReminderDto = Partial<CreateReminderDto>;

export type CreateJobTrackWithReminderDto = {
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
};

export const STATUS_CONFIG: Record<JobStatus, {
  emoji: string; label: string; labelShort: string; badgeClass: string;
}> = {
  APPLIED:   { emoji: '📤', label: 'Candidature envoyée', labelShort: 'Envoyée',  badgeClass: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  PENDING:   { emoji: '⏳', label: "En cours d'examen",   labelShort: 'En cours',  badgeClass: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  INTERVIEW: { emoji: '🤝', label: 'Entretien',           labelShort: 'Entretien', badgeClass: 'bg-primary/15 text-primary border-primary/30' },
  ACCEPTED:  { emoji: '🎉', label: 'Acceptée',            labelShort: 'Acceptée',  badgeClass: 'bg-green-500/15 text-green-600 border-green-500/30' },
  REJECTED:  { emoji: '❌', label: 'Refusée',             labelShort: 'Refusée',   badgeClass: 'bg-error/15 text-error border-error/30' },
};

export const ALL_STATUSES: JobStatus[] = ['APPLIED', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];

export type DocumentType = 'cv' | 'lm';

export type UpdateJobTrackWithReminderDto = {
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
};
