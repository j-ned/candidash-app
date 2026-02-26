export type JobStatus = 'APPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED';

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
  emoji: string; label: string; labelShort: string; badgeClass: string; hoverClass: string;
}> = {
  APPLIED:   { emoji: '📤', label: 'Candidature envoyée', labelShort: 'Envoyée',        badgeClass: 'bg-blue-500/15 text-blue-600 border-blue-500/30', hoverClass: 'hover:bg-blue-500/15 hover:text-blue-500 hover:border-blue-500/40' },
  INTERVIEW: { emoji: '🤝', label: 'Entretien prévu',     labelShort: 'Entretien prévu', badgeClass: 'bg-primary/15 text-primary border-primary/30', hoverClass: 'hover:bg-primary/15 hover:text-primary hover:border-primary/40' },
  ACCEPTED:  { emoji: '🎉', label: 'Acceptée',            labelShort: 'Acceptée',  badgeClass: 'bg-green-500/15 text-green-600 border-green-500/30', hoverClass: 'hover:bg-green-500/15 hover:text-green-500 hover:border-green-500/40' },
  REJECTED:  { emoji: '❌', label: 'Refusée',             labelShort: 'Refusée',   badgeClass: 'bg-error/15 text-error border-error/30', hoverClass: 'hover:bg-error/15 hover:text-error hover:border-error/40' },
};

export const ALL_STATUSES: JobStatus[] = ['APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];

export const CONTRACT_TYPE_CONFIG: Record<ContractType, {
  label: string; badgeClass: string; hoverClass: string;
}> = {
  CDI:        { label: 'CDI',        badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', hoverClass: 'hover:bg-emerald-500/15 hover:text-emerald-500 hover:border-emerald-500/40' },
  CDD:        { label: 'CDD',        badgeClass: 'bg-sky-500/15 text-sky-600 border-sky-500/30', hoverClass: 'hover:bg-sky-500/15 hover:text-sky-500 hover:border-sky-500/40' },
  INTERIM:    { label: 'Intérim',    badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30', hoverClass: 'hover:bg-amber-500/15 hover:text-amber-500 hover:border-amber-500/40' },
  STAGE:      { label: 'Stage',      badgeClass: 'bg-violet-500/15 text-violet-600 border-violet-500/30', hoverClass: 'hover:bg-violet-500/15 hover:text-violet-500 hover:border-violet-500/40' },
  ALTERNANCE: { label: 'Alternance', badgeClass: 'bg-pink-500/15 text-pink-600 border-pink-500/30', hoverClass: 'hover:bg-pink-500/15 hover:text-pink-500 hover:border-pink-500/40' },
  FREELANCE:  { label: 'Freelance',  badgeClass: 'bg-orange-500/15 text-orange-600 border-orange-500/30', hoverClass: 'hover:bg-orange-500/15 hover:text-orange-500 hover:border-orange-500/40' },
};

export const ALL_CONTRACT_TYPES: ContractType[] = ['CDI', 'CDD', 'INTERIM', 'STAGE', 'ALTERNANCE', 'FREELANCE'];

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
