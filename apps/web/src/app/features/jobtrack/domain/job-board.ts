import {
  ALL_STATUSES,
  type JobStatus,
  type JobTrack,
  type UpdateJobTrackWithReminderDto,
} from './models/jobtrack.model';

/** Logique pure du tableau Kanban : regroupement, déplacement optimiste, rollback, payload. */

export type BoardColumn = {
  status: JobStatus;
  title: string;
  count: number;
  jobs: JobTrack[];
};

export const COLUMN_TITLES: Record<JobStatus, string> = {
  TO_APPLY: 'Repérées',
  APPLIED: 'Envoyées',
  INTERVIEW: 'Entretiens prévus',
  ACCEPTED: 'Acceptées',
  REJECTED: 'Refusées',
};

export function groupByStatus(jobs: readonly JobTrack[]): BoardColumn[] {
  return ALL_STATUSES.map((status) => {
    const columnJobs = jobs.filter((job) => job.status === status);
    return { status, title: COLUMN_TITLES[status], count: columnJobs.length, jobs: columnJobs };
  });
}

export function moveJob(jobs: readonly JobTrack[], id: string, status: JobStatus): JobTrack[] {
  return jobs.map((job) => (job.id === id ? { ...job, status } : job));
}

/** Remplace une candidature par sa version de référence (réponse serveur, ou état d'avant en cas d'échec). */
export function replaceJob(jobs: readonly JobTrack[], replacement: JobTrack): JobTrack[] {
  return jobs.map((job) => (job.id === replacement.id ? replacement : job));
}

/**
 * Payload d'un changement de statut, envoyé au PUT `with-reminder` (mise à jour partielle) :
 * le titre et le statut, comme le formulaire d'édition. Une offre qui quitte « repérée » sans
 * date d'envoi reçoit la date du jour, comme l'ajout rapide de l'extension. Le rappel n'est pas
 * touché : l'API le programme d'elle-même au passage à « Envoyée » et le désactive sur un statut
 * terminal (acceptée, refusée).
 */
export function statusChangePayload(
  job: JobTrack,
  status: JobStatus,
  now: Date,
): UpdateJobTrackWithReminderDto {
  const payload: UpdateJobTrackWithReminderDto = { title: job.title, status };
  if (status !== 'TO_APPLY' && !job.appliedAt) payload.appliedAt = now.toISOString();
  return payload;
}

const REMINDER_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** Rappel envoyé à l'utilisateur pour relancer l'entreprise, annoncé quand l'offre passe à « Envoyée ». */
export function reminderNotice(job: JobTrack): string | null {
  if (job.status !== 'APPLIED' || !job.reminder?.isActive) return null;
  return `Rappel pour relancer le ${REMINDER_DATE_FORMAT.format(new Date(job.reminder.nextReminderAt))}`;
}

const DAYS_FORMAT = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
const UNITS_FORMAT = new Intl.RelativeTimeFormat('fr', { numeric: 'always' });

/** « aujourd'hui », « hier », « il y a 3 jours », « il y a 2 semaines », « il y a 3 mois »… */
export function relativeDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));
  if (days < 7) return DAYS_FORMAT.format(-days, 'day');
  if (days < 30) return UNITS_FORMAT.format(-Math.floor(days / 7), 'week');
  if (days < 365) return UNITS_FORMAT.format(-Math.floor(days / 30), 'month');
  return UNITS_FORMAT.format(-Math.floor(days / 365), 'year');
}
