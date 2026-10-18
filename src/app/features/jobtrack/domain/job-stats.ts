import { ALL_STATUSES, type JobStatus, type JobTrack } from './models/jobtrack.model';

/**
 * Statistiques personnelles dérivées de la seule liste des candidatures.
 * L'API ne garde aucun historique des changements de statut : on ne mesure que l'état courant
 * (pas de délai de réponse, pas de « passé par un entretien puis refusé »).
 */

export type WeeklyActivity = {
  /** Lundi de la semaine, date locale `YYYY-MM-DD`. */
  weekStart: string;
  count: number;
};

export type FunnelStepKey = 'SPOTTED' | 'SENT' | 'INTERVIEW' | 'ACCEPTED';

export type FunnelStep = {
  key: FunnelStepKey;
  label: string;
  count: number;
  /** Part de la première étape, en pourcentage entier. */
  share: number;
};

export type JobStats = {
  total: number;
  byStatus: Record<JobStatus, number>;
  /** Candidatures arrivées au moins au stade « envoyée ». */
  sent: number;
  /** (Entretiens prévus + acceptées) / envoyées ; `null` tant que rien n'est envoyé. */
  interviewRate: number | null;
  sentThisWeek: number;
  sentThisMonth: number;
  weekly: WeeklyActivity[];
  funnel: FunnelStep[];
};

export const ACTIVITY_WEEKS = 8;

/** Statuts qui supposent une candidature envoyée (une offre refusée a forcément été envoyée). */
const SENT_STATUSES: ReadonlySet<JobStatus> = new Set([
  'APPLIED',
  'INTERVIEW',
  'ACCEPTED',
  'REJECTED',
]);
/** Statuts qui supposent un entretien obtenu (une offre acceptée est passée par un entretien). */
const INTERVIEW_STATUSES: ReadonlySet<JobStatus> = new Set(['INTERVIEW', 'ACCEPTED']);

export function countByStatus(jobs: readonly JobTrack[]): Record<JobStatus, number> {
  const counts = Object.fromEntries(ALL_STATUSES.map((status) => [status, 0])) as Record<
    JobStatus,
    number
  >;
  for (const job of jobs) counts[job.status] += 1;
  return counts;
}

function countIn(jobs: readonly JobTrack[], statuses: ReadonlySet<JobStatus>): number {
  return jobs.filter((job) => statuses.has(job.status)).length;
}

export function interviewRate(jobs: readonly JobTrack[]): number | null {
  const sent = countIn(jobs, SENT_STATUSES);
  return sent === 0 ? null : countIn(jobs, INTERVIEW_STATUSES) / sent;
}

/**
 * Date d'envoi d'une candidature : `appliedAt`, sinon `createdAt` (candidature saisie
 * directement au statut envoyé sans date). Une offre seulement repérée n'a pas de date d'envoi.
 */
export function sentDate(job: JobTrack): Date | null {
  if (!SENT_STATUSES.has(job.status)) return null;
  return new Date(job.appliedAt ?? job.createdAt);
}

/** Lundi 00:00 (heure locale) de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** Décalage en jours calendaires (sûr au passage heure d'été / heure d'hiver). */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function sentDates(jobs: readonly JobTrack[]): Date[] {
  return jobs.map(sentDate).filter((date): date is Date => date !== null);
}

/** Candidatures envoyées par semaine, de la plus ancienne à la semaine en cours. */
export function weeklyActivity(
  jobs: readonly JobTrack[],
  now: Date,
  weeks = ACTIVITY_WEEKS,
): WeeklyActivity[] {
  const current = startOfWeek(now);
  const dates = sentDates(jobs);
  const starts = Array.from({ length: weeks }, (_, index) =>
    addDays(current, -7 * (weeks - 1 - index)),
  );
  return starts.map((start) => {
    const end = addDays(start, 7);
    return {
      weekStart: toLocalIsoDate(start),
      count: dates.filter((date) => date >= start && date < end).length,
    };
  });
}

export function conversionFunnel(jobs: readonly JobTrack[]): FunnelStep[] {
  const steps: Omit<FunnelStep, 'share'>[] = [
    { key: 'SPOTTED', label: 'Repérées', count: jobs.length },
    { key: 'SENT', label: 'Envoyées', count: countIn(jobs, SENT_STATUSES) },
    { key: 'INTERVIEW', label: 'Entretiens', count: countIn(jobs, INTERVIEW_STATUSES) },
    { key: 'ACCEPTED', label: 'Acceptées', count: countIn(jobs, new Set<JobStatus>(['ACCEPTED'])) },
  ];
  const base = jobs.length;
  return steps.map((step) => ({
    ...step,
    share: base === 0 ? 0 : Math.round((step.count / base) * 100),
  }));
}

export function computeJobStats(jobs: readonly JobTrack[], now: Date): JobStats {
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const dates = sentDates(jobs);
  return {
    total: jobs.length,
    byStatus: countByStatus(jobs),
    sent: dates.length,
    interviewRate: interviewRate(jobs),
    sentThisWeek: dates.filter((date) => date >= weekStart && date < weekEnd).length,
    sentThisMonth: dates.filter(
      (date) => date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(),
    ).length,
    weekly: weeklyActivity(jobs, now),
    funnel: conversionFunnel(jobs),
  };
}
